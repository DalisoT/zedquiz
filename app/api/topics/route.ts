import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subject_id');

  let query = supabase.from('topics').select('*').order('name');
  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ topics: data });
}