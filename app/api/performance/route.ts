import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getAuthClient(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const authClient = getAuthClient(request);
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');

    let topicQuery = supabase
      .from('topic_performance')
      .select(`*, topics(id, name), subjects(id, name)`)
      .eq('user_id', user.id)
      .order('total_attempts', { ascending: false });

    if (subjectId) {
      topicQuery = topicQuery.eq('subject_id', subjectId);
    }

    const { data: topicPerf, error: topicError } = await topicQuery;

    if (topicError) return NextResponse.json({ error: topicError.message }, { status: 500 });

    const { data: subjectPerf, error: subjError } = await supabase
      .from('subject_performance')
      .select('*, subjects(id, name)')
      .eq('user_id', user.id);

    if (subjError) return NextResponse.json({ error: subjError.message }, { status: 500 });

    const weakTopics = (topicPerf || [])
      .filter(t => t.total_attempts >= 2)
      .map(t => ({
        ...t,
        accuracy: t.total_attempts > 0 ? Math.round((t.correct_attempts / t.total_attempts) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const strongTopics = (topicPerf || [])
      .filter(t => t.total_attempts >= 2)
      .map(t => ({
        ...t,
        accuracy: t.total_attempts > 0 ? Math.round((t.correct_attempts / t.total_attempts) * 100) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    const subjectPerformance = (subjectPerf || []).map(s => ({
      ...s,
      accuracy: s.total_questions > 0 ? Math.round((s.correct_questions / s.total_questions) * 100) : 0,
    }));

    return NextResponse.json({
      weak_topics: weakTopics,
      strong_topics: strongTopics,
      subject_performance: subjectPerformance,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = getAuthClient(request);
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topic_results, subject_id, class_id } = await request.json();

    if (!topic_results || !Array.isArray(topic_results)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    for (const result of topic_results) {
      const { topic_id, correct, marks, total_marks } = result;

      const { data: existing } = await authClient
        .from('topic_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topic_id)
        .single();

      if (existing) {
        await authClient
          .from('topic_performance')
          .update({
            total_attempts: existing.total_attempts + 1,
            correct_attempts: existing.correct_attempts + (correct ? 1 : 0),
            total_marks: existing.total_marks + total_marks,
            marks_obtained: existing.marks_obtained + marks,
            last_attempted_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('topic_id', topic_id);
      } else {
        await authClient
          .from('topic_performance')
          .insert({
            user_id: user.id,
            topic_id,
            subject_id,
            class_id,
            total_attempts: 1,
            correct_attempts: correct ? 1 : 0,
            total_marks,
            marks_obtained: marks,
            last_attempted_at: new Date().toISOString(),
          });
      }
    }

    if (subject_id) {
      const totalQuestions = topic_results.length;
      const correctQuestions = topic_results.filter(r => r.correct).length;
      const totalMarks = topic_results.reduce((sum, r) => sum + r.total_marks, 0);
      const marksObtained = topic_results.reduce((sum, r) => sum + r.marks, 0);

      const { data: existing } = await authClient
        .from('subject_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_id', subject_id)
        .single();

      if (existing) {
        await authClient
          .from('subject_performance')
          .update({
            total_attempts: existing.total_attempts + 1,
            correct_attempts: existing.correct_attempts + (correctQuestions > 0 ? 1 : 0),
            total_questions: existing.total_questions + totalQuestions,
            correct_questions: existing.correct_questions + correctQuestions,
            last_attempted_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('subject_id', subject_id);
      } else {
        await authClient
          .from('subject_performance')
          .insert({
            user_id: user.id,
            subject_id,
            class_id,
            total_attempts: 1,
            correct_attempts: correctQuestions > 0 ? 1 : 0,
            total_questions: totalQuestions,
            correct_questions: correctQuestions,
            last_attempted_at: new Date().toISOString(),
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}