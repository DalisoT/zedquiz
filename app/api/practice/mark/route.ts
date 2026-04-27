import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGroqCompletion } from '@/lib/groq';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { question_id, user_answer } = await request.json();

    if (!question_id || !user_answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: question, error } = await supabase
      .from('questions')
      .select('question_text, marking_scheme')
      .eq('id', question_id)
      .single();

    if (error || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

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