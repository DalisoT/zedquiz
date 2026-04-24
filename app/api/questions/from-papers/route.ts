import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paperIds = searchParams.get('paperIds')?.split(',') || [];
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!paperIds.length && !classId && !subjectId) {
      return NextResponse.json({ error: 'Provide paperIds or classId+subjectId' }, { status: 400 });
    }

    let query = supabase
      .from('questions')
      .select(`
        id,
        question_text,
        options,
        difficulty,
        topics(name),
        source_paper:papers(id, title, exam_year)
      `)
      .eq('is_approved', true)
      .limit(limit);

    if (paperIds.length > 0) {
      // Get questions from specific papers via paper_questions junction
      const { data: paperQs } = await supabase
        .from('paper_questions')
        .select('question_id')
        .in('paper_id', paperIds);

      const questionIds = paperQs?.map(pq => pq.question_id) || [];
      if (questionIds.length > 0) {
        query = query.in('id', questionIds);
      }
    } else if (classId && subjectId) {
      query = query.eq('class_id', classId).eq('subject_id', subjectId);
    }

    const { data, error } = await query;
    return NextResponse.json({ questions: data || [], error: error?.message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
