import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const levelId = searchParams.get('level_id');
  const userClassId = searchParams.get('user_class_id');
  const userRole = searchParams.get('role');

  // If user_class_id is provided (student), return only their class
  if (userClassId && userRole === 'student') {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', userClassId)
      .order('order_index');

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ classes: data });
  }

  let query = supabase.from('classes').select('*').order('order_index');
  if (levelId) {
    query = query.eq('level_id', levelId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ classes: data });
}
