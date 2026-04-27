import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getGroqCompletion } from '@/lib/groq';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POINTS_PER_CORRECT = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { answers } = await request.json();
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });
    }

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

    const results = [];
    for (const answer of answers) {
      const { data: question } = await authClient
        .from('questions')
        .select('question_text, marking_scheme')
        .eq('id', answer.question_id)
        .single();

      if (!question) {
        results.push({ correct: false, explanation: 'Question not found' });
        continue;
      }

      try {
        const result = await getGroqCompletion(
          question.question_text,
          answer.answer_text,
          question.marking_scheme
        );
        results.push(result);
      } catch {
        results.push({ correct: false, explanation: 'Failed to mark answer' });
      }
    }

    const topicResults = [];
    for (const answer of answers) {
      const { data: question } = await authClient
        .from('questions')
        .select('topic_id, subject_id')
        .eq('id', answer.question_id)
        .single();

      if (question?.topic_id) {
        topicResults.push({
          topic_id: question.topic_id,
          correct: results[answers.indexOf(answer)]?.correct || false,
          marks: results[answers.indexOf(answer)]?.correct ? 1 : 0,
          total_marks: 1,
        });
      }
    }

    if (user) {
      const quizId = params.id;
      const correct = results.filter(r => r.correct).length;
      const score = Math.round((correct / results.length) * 100);
      const pointsEarned = correct * POINTS_PER_CORRECT;

      await authClient.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        total_questions: results.length,
        time_spent_seconds: 0,
      });

      try {
        await authClient.from('points_history').insert({
          user_id: user.id,
          points: pointsEarned,
          source: 'quiz',
          reference_id: quizId,
        });
      } catch (e) {
        console.error('Failed to record points history:', e);
      }

      try {
        await authClient.rpc('increment_points', {
          points_to_add: pointsEarned,
          user_id_input: user.id,
        });
      } catch (e) {
        console.error('Failed to increment points:', e);
      }

      if (topicResults.length > 0) {
        const firstTopic = topicResults[0];
        if (firstTopic) {
          const subjectId = (await authClient.from('topics').select('subject_id').eq('id', firstTopic.topic_id).single())?.data?.subject_id || null;
          const correctCount = topicResults.filter(r => r.correct).length;

          const { data: existing } = await authClient
            .from('topic_performance')
            .select('*')
            .eq('user_id', user.id)
            .eq('topic_id', firstTopic.topic_id)
            .single();

          if (existing) {
            await authClient.from('topic_performance').update({
              total_attempts: existing.total_attempts + 1,
              correct_attempts: existing.correct_attempts + correctCount,
              total_marks: existing.total_marks + topicResults.length,
              marks_obtained: existing.marks_obtained + correctCount,
              last_attempted_at: new Date().toISOString(),
            }).eq('user_id', user.id).eq('topic_id', firstTopic.topic_id);
          } else {
            await authClient.from('topic_performance').insert({
              user_id: user.id,
              topic_id: firstTopic.topic_id,
              subject_id: subjectId,
              total_attempts: 1,
              correct_attempts: correctCount,
              total_marks: topicResults.length,
              marks_obtained: correctCount,
              last_attempted_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}