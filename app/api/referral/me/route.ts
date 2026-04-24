import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAuthClient(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  const authClient = getAuthClient(request);
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get or create referral code
  let { data: referralCode } = await authClient
    .from('referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!referralCode) {
    // Generate new code
    const { data: newCode } = await authClient
      .from('referral_codes')
      .insert({ user_id: user.id, code: user.id.replace(/-/g, '').substring(0, 8).toUpperCase() })
      .select()
      .single();
    referralCode = newCode;
  }

  // Get referrals
  const { data: referrals } = await authClient
    .from('referral_signups')
    .select('*, referred:profiles(full_name)')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    referral: {
      code: referralCode?.code,
      referrals_count: referralCode?.referrals_count || 0,
      tier_earned: referralCode?.tier_earned,
      referrals: referrals?.map(r => ({
        id: r.id,
        referred_name: r.profiles?.full_name || 'User',
        tier_at_signup: r.tier_at_signup,
        created_at: r.created_at
      })) || []
    }
  });
}
