-- =============================================
-- REFERRAL SYSTEM
-- =============================================

-- Referral codes
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  tier_earned TEXT,
  referrals_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
  tier_at_signup TEXT DEFAULT 'free',
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add yearly price column to tiers (optional, or calculate dynamically)
ALTER TABLE subscription_tiers ADD COLUMN yearly_price_kwacha DECIMAL(10,2);

-- Update existing tiers with yearly prices (10% discount)
UPDATE subscription_tiers SET yearly_price_kwacha = price_kwacha * 12 * 0.90 WHERE id != 'free';
UPDATE subscription_tiers SET yearly_price_kwacha = 0 WHERE id = 'free';

-- INDEXES
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_signups_referrer ON referral_signups(referrer_id);
CREATE INDEX idx_referral_signups_referred ON referral_signups(referred_id);

-- RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own referral code" ON referral_codes FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users view own referrals" ON referral_signups FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "Admins manage referrals" ON referral_codes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Admins manage referral signups" ON referral_signups FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- FUNCTION: Generate unique referral code for user
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN := TRUE;
BEGIN
  -- Generate 8-char code from user ID
  v_code := upper(substr(replace(p_user_id::TEXT, '-', ''), 1, 8));

  -- Ensure uniqueness
  WHILE v_exists LOOP
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
    IF v_exists THEN
      v_code := v_code || floor(random() * 10)::TEXT;
    END IF;
  END LOOP;

  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code);
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: Check and award referral rewards
CREATE OR REPLACE FUNCTION check_referral_reward(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referral_count INT;
  v_tier_earned TEXT;
  v_next_tier TEXT;
BEGIN
  -- Count successful referrals (where referred user has an active subscription)
  SELECT COUNT(*) INTO v_referral_count
  FROM referral_signups rs
  JOIN user_subscriptions us ON us.user_id = rs.referred_id AND us.status = 'active'
  WHERE rs.referrer_id = p_user_id AND rs.reward_claimed = FALSE;

  -- Determine next tier based on referrals
  IF v_referral_count >= 5 THEN
    -- Get current user tier
    SELECT tier_id INTO v_next_tier FROM user_subscriptions WHERE user_id = p_user_id AND status = 'active';

    -- Upgrade to next tier (free -> starter -> pro -> premium)
    IF v_next_tier = 'free' THEN v_tier_earned := 'starter';
    ELSIF v_next_tier = 'starter' THEN v_tier_earned := 'pro';
    ELSIF v_next_tier = 'pro' THEN v_tier_earned := 'premium';
    ELSE v_tier_earned := NULL;
    END IF;

    -- Mark reward as claimed and update referral code
    IF v_tier_earned IS NOT NULL THEN
      UPDATE referral_signups SET reward_claimed = TRUE WHERE referrer_id = p_user_id AND reward_claimed = FALSE;
      UPDATE referral_codes SET tier_earned = v_tier_earned WHERE user_id = p_user_id;

      -- Award subscription
      INSERT INTO user_subscriptions (user_id, tier_id, status, started_at)
      VALUES (p_user_id, v_tier_earned, 'active', NOW())
      ON CONFLICT (user_id) DO UPDATE SET tier_id = v_tier_earned, status = 'active';
    END IF;

    RETURN jsonb_build_object('rewarded', TRUE, 'tier', v_tier_earned, 'referrals', v_referral_count);
  END IF;

  RETURN jsonb_build_object('rewarded', FALSE, 'referrals', v_referral_count, 'needed', 5 - v_referral_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
