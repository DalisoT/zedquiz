import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = supabase
      .from('papers')
      .select('id, title, exam_year, paper_number, status, file_url, subjects(name), classes(name)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('uploaded_by', userId);
    }

    const { data, error } = await query;
        return NextResponse.json({ papers: data || [], error: error?.message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
