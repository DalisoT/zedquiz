import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get quiz attempts
    const { data: quizAttempts } = await authClient
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id);

    // Get exam attempts
    const { data: examAttempts } = await authClient
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id);

    const totalQuizzes = (quizAttempts?.length || 0) + (examAttempts?.length || 0);

    // Calculate total questions and accuracy
    let totalQuestions = 0;
    let correctAnswers = 0;

    quizAttempts?.forEach((a: any) => {
      totalQuestions += a.total_questions || 0;
      correctAnswers += (a.score || 0) * (a.total_questions || 0) / 100;
    });

    examAttempts?.forEach((a: any) => {
      totalQuestions += a.total_questions || 0;
      correctAnswers += (a.score || 0) * (a.total_questions || 0) / 100;
    });

    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Get profile for streak
    const { data: profile } = await authClient
      .from('profiles')
      .select('streak_days, total_points')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      totalQuizzes,
      totalQuestions,
      accuracy,
      streak: profile?.streak_days || 0,
      points: profile?.total_points || 0,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}