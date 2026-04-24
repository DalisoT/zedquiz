import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const levelId = searchParams.get('level_id');
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const source = searchParams.get('source'); // 'bank' = all questions

    let query = supabase
      .from('questions')
      .select(`
        *,
        topics(name),
        classes(name, levels(name))
      `)
      .order('created_at', { ascending: false });

    if (source === 'bank') {
      // Get all questions in the question bank
      // Already filtered by whatever is passed
    }

    if (classId) {
      query = query.eq('class_id', classId);
    } else if (levelId) {
      // Get classes for this level first
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('level_id', levelId);

      if (classes && classes.length > 0) {
        query = query.in('class_id', classes.map(c => c.id));
      }
    }

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ questions: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
