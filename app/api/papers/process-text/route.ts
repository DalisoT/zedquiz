import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseQuestionsWithAI } from '@/lib/paperProcessor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function authorizeRequest(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  if (!sessionToken) return null;

  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
  if (error || !user) return null;
  return user;
}

/**
 * Process paper questions from pre-extracted OCR text.
 * Called after browser-side OCR completes.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authorizeRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role
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
      return NextResponse.json(
        { error: 'paperId and ocrText are required' },
        { status: 400 }
      );
    }

    // Verify paper ownership
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

    // Update status to processing
    await supabase.from('papers').update({ status: 'processing' }).eq('id', paperId);

    // Parse questions with AI
    const questions = await parseQuestionsWithAI(
      ocrText,
      paper.exam_year,
      paper.paper_number
    );

    // Delete existing questions and insert new ones
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

    const { error: insertError } = await supabase
      .from('paper_questions')
      .insert(questionsToInsert);

    if (insertError) {
      console.error('[process-text] Insert error:', insertError);
      throw insertError;
    }

    // Update status to processed
    await supabase.from('papers').update({ status: 'processed' }).eq('id', paperId);

    return NextResponse.json({
      success: true,
      questionsCount: questions.length,
    });

  } catch (err: any) {
    console.error('[process-text] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Processing failed' },
      { status: 500 }
    );
  }
}