import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('*, subjects(name), classes(name)')
    .eq('teacher_id', params.id);

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ subjects: data });
}
