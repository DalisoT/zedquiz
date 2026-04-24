import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getGroqCompletion(question: string, userAnswer: string, markingScheme: any) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an AI tutor marking Zambian ECZ exam answers. Evaluate the student's answer against the marking scheme. Respond ONLY with valid JSON in this format: {"correct": true/false, "explanation": "Your feedback explanation"}`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nStudent's Answer: ${userAnswer}\n\nMarking Scheme: ${JSON.stringify(markingScheme)}\n\nEvaluate if the student's answer is correct based on the marking scheme points. Provide encouraging, educational feedback.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error('Groq API error');
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

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
      // Get question
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

    // Get topic info and record performance
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
      const pointsEarned = correct * 10;

      // Record quiz attempt
      await authClient.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        total_questions: results.length,
        time_spent_seconds: 0,
      });

      // Record points history
      try {
        await authClient.from('points_history').insert({
          user_id: user.id,
          points: pointsEarned,
          source: 'quiz',
          reference_id: quizId,
        });
      } catch {}

      // Update total points via RPC
      try {
        await authClient.rpc('increment_points', {
          user_id_input: user.id,
          points_to_add: pointsEarned
        });
      } catch (e) {
        console.error('Failed to increment points:', e);
      }

      // Record topic performance - check existing first, then upsert
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