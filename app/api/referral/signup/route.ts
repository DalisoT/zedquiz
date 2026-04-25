import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  const { referral_code, user_id } = await request.json();

  if (!referral_code || !user_id) {
    return NextResponse.json({ error: 'Missing referral code or user_id' }, { status: 400 });
  }

  // Find referral code
  const { data: codeData } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', referral_code)
    .single();

  if (!codeData) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  // Don't allow self-referral
  if (codeData.user_id === user_id) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
  }

  // Check if already referred
  const { data: existing } = await supabase
    .from('referral_signups')
    .select('*')
    .eq('referred_id', user_id)
    .single();

  if (existing) {
    return NextResponse.json({ message: 'Already referred' }, { status: 200 });
  }

  // Get referred user's tier at signup
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user_id)
    .single();

  // Record referral
  const { error } = await supabase
    .from('referral_signups')
    .insert({
      referrer_id: codeData.user_id,
      referred_id: user_id,
      referral_code_id: codeData.id,
      tier_at_signup: profile?.role || 'free'
    });

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Update referral count
  await supabase
    .from('referral_codes')
    .update({ referrals_count: codeData.referrals_count + 1 })
    .eq('id', codeData.id);

  // Check if referrer earned a reward
  const { data: rewardResult } = await supabase.rpc('check_referral_reward', {
    p_user_id: codeData.user_id
  });

  return NextResponse.json({ success: true, reward: rewardResult });
}
