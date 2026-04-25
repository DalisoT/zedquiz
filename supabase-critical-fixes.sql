-- Migration: Fix critical missing database objects
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Create missing `attempts` table for practice attempts
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Users can insert their own attempts
CREATE POLICY "Users insert own attempts" ON attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own attempts
CREATE POLICY "Users view own attempts" ON attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Create missing `increment_points` RPC function
CREATE OR REPLACE FUNCTION increment_points(user_id_input UUID, points_to_add INT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET total_points = COALESCE(total_points, 0) + points_to_add
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create `check_referral_reward` RPC if missing
CREATE OR REPLACE FUNCTION check_referral_reward(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  reward_result JSON;
  referral_count INT;
BEGIN
  SELECT COUNT(*) INTO referral_count
  FROM referral_signups
  WHERE referrer_id = p_user_id;

  -- Check if user crossed referral milestones
  IF referral_count >= 5 AND referral_count % 5 = 0 THEN
    reward_result := json_build_object(
      'milestone', referral_count,
      'reward_type', 'points',
      'reward_amount', 50
    );
  ELSE
    reward_result := json_build_object(
      'milestone', referral_count,
      'reward_type', 'none',
      'reward_amount', 0
    );
  END IF;

  RETURN reward_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix papers RLS - replace overly permissive policies
-- First drop existing policies
DROP POLICY IF EXISTS "Teachers insert papers" ON papers;
DROP POLICY IF EXISTS "Teachers manage papers" ON papers;
DROP POLICY IF EXISTS "Public read papers" ON papers;

-- Create proper RLS policies
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see imported papers
CREATE POLICY "View imported papers" ON papers
  FOR SELECT TO authenticated
  USING (status = 'imported');

-- Teachers can insert their own papers
CREATE POLICY "Teachers insert own papers" ON papers
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin', 'super_admin')
    )
  );

-- Teachers/Admins can update their own papers (or admins can update any)
CREATE POLICY "Teachers update own papers" ON papers
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can delete papers
CREATE POLICY "Admins delete papers" ON papers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 5. Paper questions RLS
DROP POLICY IF EXISTS "Teachers insert paper questions" ON paper_questions;
DROP POLICY IF EXISTS "Teachers manage paper questions" ON paper_questions;
DROP POLICY IF EXISTS "Public read paper questions" ON paper_questions;

ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View paper questions for imported papers" ON paper_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM papers
      WHERE papers.id = paper_questions.paper_id
      AND papers.status = 'imported'
    )
  );

CREATE POLICY "Teachers insert paper questions" ON paper_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM papers p
      JOIN profiles pr ON p.uploaded_by = pr.id
      WHERE p.id = paper_questions.paper_id
      AND pr.role IN ('teacher', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Teachers update paper questions" ON paper_questions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM papers p
      JOIN profiles pr ON p.uploaded_by = pr.id
      WHERE p.id = paper_questions.paper_id
      AND (
        p.uploaded_by = auth.uid()
        OR pr.role IN ('admin', 'super_admin')
      )
    )
  );

-- 6. Storage bucket RLS for papers
-- Note: Run this in Supabase Dashboard -> Storage -> policies for 'papers' bucket
-- The SQL below creates storage policies (may need adjustment based on bucket setup)

-- DROP POLICY IF EXISTS "Users upload own papers" ON storage.objects;
-- DROP POLICY IF EXISTS "Users view own papers" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins manage all papers" ON storage.objects;

-- CREATE POLICY "Users upload own papers storage" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users view own papers storage" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Admins manage all papers storage" ON storage.objects
--   FOR ALL TO authenticated
--   USING (
--     bucket_id = 'papers'
--     AND EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid()::uuid
--       AND role IN ('admin', 'super_admin')
--     )
--   );

PRINT 'Migration completed: attempts table, increment_points RPC, check_referral_reward RPC, and papers RLS policies created';
