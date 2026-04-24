import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

  if (!response.ok) {
    throw new Error('Groq API error');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function POST(request: Request) {
  try {
    const { question_id, user_answer } = await request.json();

    if (!question_id || !user_answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get question with marking scheme
    const { data: question, error } = await supabase
      .from('questions')
      .select('question_text, marking_scheme')
      .eq('id', question_id)
      .single();

    if (error || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Get AI feedback
    const result = await getGroqCompletion(
      question.question_text,
      user_answer,
      question.marking_scheme
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error('Marking error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}