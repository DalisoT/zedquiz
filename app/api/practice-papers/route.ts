import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    let query = supabase
      .from('practice_papers')
      .select('*, classes(name), subjects(name), teacher:profiles(full_name)')
      .order('created_at', { ascending: false });

    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data, error } = await query;
    return NextResponse.json({ papers: data || [], error: error?.message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      teacher_id,
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

    if (!teacher_id || !title || !class_id || !subject_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the practice paper
    const { data: paper, error: paperError } = await supabase
      .from('practice_papers')
      .insert({
        teacher_id,
        title,
        description,
        class_id,
        subject_id,
        time_limit_minutes: time_limit_minutes || 30,
        question_count: question_count || 20,
        difficulty: difficulty || 'mixed',
        is_exam_simulation: is_exam_simulation || false,
        status: status || 'draft',
      })
      .select()
      .single();

    if (paperError) throw paperError;

    // Insert question links if provided
    if (question_ids && question_ids.length > 0) {
      const questionLinks = question_ids.map((qid: string, idx: number) => ({
        practice_paper_id: paper.id,
        question_id: qid,
        source_paper_id: source_paper_ids?.[idx] || null,
        order_index: idx,
      }));

      await supabase.from('practice_paper_questions').insert(questionLinks);
    }

    return NextResponse.json({ paper });
  } catch (e: any) {
    console.error('Error creating practice paper:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
