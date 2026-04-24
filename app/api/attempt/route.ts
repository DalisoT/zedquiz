import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { question_id, answer, user_id } = await request.json();
    if (!question_id || !answer || !user_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const { error } = await supabase.from('attempts').insert({ question_id, answer, user_id });
    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}