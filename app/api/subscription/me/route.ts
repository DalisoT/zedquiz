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

  // Get current active subscription
  const { data: subscription, error } = await authClient
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error }, { status: 500 });
  }

  // If no subscription, return free tier
  if (!subscription) {
    return NextResponse.json({
      subscription: {
        tier_id: 'free',
        status: 'active',
        features: {
          daily_free_quiz: true,
          quizzes_per_day: 1,
          study_materials: true,
          ecz_papers: true,
          video_lessons: false,
          audio_lessons: false,
          topic_quizzes: false,
          simulated_exams: false,
          tutorial_requests: false,
          online_classes: false,
        }
      }
    });
  }

  // Get tier features
  const { data: tier } = await authClient
    .from('subscription_tiers')
    .select('features')
    .eq('id', subscription.tier_id)
    .single();

  return NextResponse.json({
    subscription: {
      ...subscription,
      features: tier?.features || {}
    }
  });
}
