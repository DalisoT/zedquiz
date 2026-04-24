import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const BADGE_CRITERIA = [
  { name: 'First Steps', description: 'Complete your first quiz', icon: '🎯', trigger: 'quiz_count', threshold: 1 },
  { name: 'Dedicated', description: 'Maintain a 7 day streak', icon: '🔥', trigger: 'streak_days', threshold: 7 },
  { name: 'Scholar', description: 'Complete 10 quizzes', icon: '📚', trigger: 'quiz_count', threshold: 10 },
  { name: 'Perfect Score', description: 'Get 100% on any quiz', icon: '💯', trigger: 'perfect_score', threshold: 1 },
  { name: 'Bookworm', description: 'Complete 50 quizzes', icon: '📖', trigger: 'quiz_count', threshold: 50 },
  { name: 'Point Master', description: 'Earn 1000 points', icon: '⭐', trigger: 'total_points', threshold: 1000 },
  { name: 'Overachiever', description: 'Earn 10000 points', icon: '🌟', trigger: 'total_points', threshold: 10000 },
];

export async function POST(request: Request) {
  try {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false },
      }
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user stats
    const { data: profile } = await authClient
      .from('profiles')
      .select('streak_days, total_points')
      .eq('id', user.id)
      .single();

    const { data: quizAttempts } = await authClient
      .from('quiz_attempts')
      .select('score, total_questions')
      .eq('user_id', user.id);

    const { data: examAttempts } = await authClient
      .from('exam_attempts')
      .select('score, total_questions')
      .eq('user_id', user.id);

    // Get existing user badges
    const { data: existingBadges } = await authClient
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user.id);

    const existingBadgeIds = (existingBadges || []).map((b: any) => b.badge_id);

    // Calculate stats
    const quizCount = (quizAttempts?.length || 0) + (examAttempts?.length || 0);
    const perfectScore = [...(quizAttempts || []), ...(examAttempts || [])]
      .some(a => a.score === 100);

    const stats = {
      quiz_count: quizCount,
      streak_days: profile?.streak_days || 0,
      total_points: profile?.total_points || 0,
      perfect_score: perfectScore ? 1 : 0,
    };

    // Check each badge criterion
    const newBadges = [];
    for (const criteria of BADGE_CRITERIA) {
      const value = stats[criteria.trigger as keyof typeof stats] || 0;
      if (value >= criteria.threshold) {
        // Find the badge
        const { data: badge } = await authClient
          .from('badges')
          .select('id')
          .eq('name', criteria.name)
          .single();

        if (badge && !existingBadgeIds.includes(badge.id)) {
          await authClient.from('user_badges').insert({
            user_id: user.id,
            badge_id: badge.id,
          });
          newBadges.push(criteria.name);
        }
      }
    }

    return NextResponse.json({ new_badges: newBadges });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}