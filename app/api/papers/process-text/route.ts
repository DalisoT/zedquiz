import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseQuestionsWithAI } from '@/lib/paperProcessor';

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

export async function POST(request: NextRequest) {
  try {
    const authClient = getAuthClient(request);
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !['teacher', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { paperId, ocrText } = body;

    if (!paperId || !ocrText) {
      return NextResponse.json({ error: 'paperId and ocrText are required' }, { status: 400 });
    }

    const { data: paper } = await supabase
      .from('papers')
      .select('id, exam_year, paper_number, uploaded_by')
      .eq('id', paperId)
      .single();

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    if (paper.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Not your paper' }, { status: 403 });
    }

    await supabase.from('papers').update({ status: 'processing' }).eq('id', paperId);

    const questions = await parseQuestionsWithAI(ocrText, paper.exam_year, paper.paper_number);

    await supabase.from('paper_questions').delete().eq('paper_id', paperId);

    const questionsToInsert = questions.map((q: any) => ({
      paper_id: paperId,
      question_number: q.question_number,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      topic_name: q.topic_name || null,
      difficulty: q.difficulty,
      needs_image: q.needs_image || false,
    }));

    const { error: insertError } = await supabase.from('paper_questions').insert(questionsToInsert);

    if (insertError) {
      console.error('[process-text] Insert error:', insertError);
      throw insertError;
    }

    await supabase.from('papers').update({ status: 'processed' }).eq('id', paperId);

    return NextResponse.json({ success: true, questionsCount: questions.length });

  } catch (err: any) {
    console.error('[process-text] Error:', err);
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 });
  }
}