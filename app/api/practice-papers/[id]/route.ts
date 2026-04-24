import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: paper, error } = await supabase
      .from('practice_papers')
      .select('*, classes(name), subjects(name), teacher:profiles(full_name)')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Get questions for this practice paper
    const { data: questions } = await supabase
      .from('practice_paper_questions')
      .select(`
        id,
        order_index,
        question:questions(
          id,
          question_text,
          options,
          image_url,
          difficulty,
          topics(name)
        ),
        source_paper:papers(title, exam_year)
      `)
      .eq('practice_paper_id', id)
      .order('order_index');

    return NextResponse.json({ paper, questions: questions || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;
    const {
      title,
      description,
      class_id,
      subject_id,
      time_limit_minutes,
      question_count,
      difficulty,
      is_exam_simulation,
      status,
      question_ids,
      source_paper_ids,
    } = body;

    // Update the practice paper
    const { error: updateError } = await supabase
      .from('practice_papers')
      .update({
        title,
        description,
        class_id,
        subject_id,
        time_limit_minutes,
        question_count,
        difficulty,
        is_exam_simulation,
        status,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // If question_ids provided, replace all questions
    if (question_ids) {
      // Delete existing
      await supabase.from('practice_paper_questions').delete().eq('practice_paper_id', id);

      // Insert new
      if (question_ids.length > 0) {
        const questionLinks = question_ids.map((qid: string, idx: number) => ({
          practice_paper_id: id,
          question_id: qid,
          source_paper_id: source_paper_ids?.[idx] || null,
          order_index: idx,
        }));
        await supabase.from('practice_paper_questions').insert(questionLinks);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await supabase.from('practice_papers').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
