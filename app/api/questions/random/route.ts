import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const subjectId = searchParams.get('subject_id');
  const topicId = searchParams.get('topic_id');
  const limit = parseInt(searchParams.get('limit') || '5');

  try {
    let query = supabase
      .from('questions')
      .select(`
        id,
        question_text,
        image_url,
        answer_type,
        marks,
        difficulty,
        topics (name)
      `)
      .eq('is_approved', true)
      .limit(limit);

    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (topicId) {
      query = query.eq('topic_id', topicId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Remove marking_scheme from response (don't give away answers)
    const safeQuestions = (data || []).map(q => ({
      id: q.id,
      question_text: q.question_text,
      image_url: q.image_url,
      answer_type: q.answer_type,
      marks: q.marks,
      difficulty: q.difficulty,
      topic_name: (q.topics as any)?.name
    }));

    return NextResponse.json({ questions: safeQuestions });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}