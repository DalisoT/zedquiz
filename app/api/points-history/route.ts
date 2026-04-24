import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Record points earned
export async function POST(request: NextRequest) {
  try {
    const { user_id, points, source, reference_id } = await request.json();

    if (!user_id || !points || !source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('points_history')
      .insert({
        user_id,
        points,
        source, // 'quiz', 'exam', 'practice', 'daily_streak', 'badge'
        reference_id, // quiz_id, exam_id, etc.
        earned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update total points in profile
    await supabase.rpc('increment_points', {
      user_id_input: user_id,
      points_to_add: points,
    });

    return NextResponse.json({ record: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Get user's points history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const period = searchParams.get('period') || 'all'; // 'week', 'month', 'all'
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    let query = supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Filter by period if needed
    let filtered = data || [];
    if (period !== 'all') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(r => {
        const earned = new Date(r.earned_at);
        if (period === 'week') {
          return earned >= startOfWeek;
        } else if (period === 'month') {
          return earned >= startOfMonth;
        }
        return true;
      });
    }

    // Calculate total for period
    const totalPoints = filtered.reduce((sum, r) => sum + r.points, 0);

    return NextResponse.json({
      history: filtered,
      total_points: totalPoints,
      period,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
