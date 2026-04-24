import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  } else if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(0); // All time
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'week', 'month', 'all'
    const levelId = searchParams.get('level_id');
    const classId = searchParams.get('class_id');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get base profiles with class info
    let profilesQuery = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        streak_days,
        total_points,
        grade_level,
        classes(id, name, levels(id, name))
      `)
      .eq('role', 'student');

    const { data: profiles, error } = await profilesQuery;

    if (error) return NextResponse.json({ error }, { status: 500 });

    // For period-based ranking, get points from points_history
    let periodPoints: Record<string, number> = {};

    if (period !== 'all') {
      const startDate = getPeriodStart(period);

      const { data: history } = await supabase
        .from('points_history')
        .select('user_id, points')
        .gte('earned_at', startDate.toISOString());

      // Sum points by user
      (history || []).forEach(record => {
        periodPoints[record.user_id] = (periodPoints[record.user_id] || 0) + record.points;
      });
    }

    // Build leaderboard with period points
    let leaderboard = (profiles || []).map((p: any) => {
      const cls = Array.isArray(p.classes) ? p.classes[0] : p.classes;
      const points = period !== 'all' ? (periodPoints[p.id] || 0) : p.total_points;
      return {
        id: p.id,
        full_name: p.full_name,
        streak_days: p.streak_days,
        total_points: points,
        grade_level: p.grade_level,
        class_name: cls?.name,
        level_name: cls?.levels?.name,
      };
    });

    // Filter by level if specified
    if (levelId) {
      leaderboard = leaderboard.filter((p: any) => p.level_name === levelId);
    }

    // Filter by class if specified
    if (classId) {
      leaderboard = leaderboard.filter((p: any) => p.grade_level === classId);
    }

    // Sort by points descending
    leaderboard.sort((a, b) => b.total_points - a.total_points);

    // Add rank
    const ranked = leaderboard.slice(0, limit).map((profile: any, index: number) => ({
      rank: index + 1,
      ...profile,
    }));

    return NextResponse.json({
      leaderboard: ranked,
      period,
      total: ranked.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}