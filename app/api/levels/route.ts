import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const userRole = searchParams.get('role');
  const userClassId = searchParams.get('user_class_id');

  // If class_id is provided, return only the level for that class
  if (classId) {
    const { data: classData } = await supabase
      .from('classes')
      .select('level_id')
      .eq('id', classId)
      .single();

    if (classData) {
      const { data, error } = await supabase
        .from('levels')
        .select('*, classes(*)')
        .eq('id', classData.level_id)
        .order('name');

      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ levels: data });
    }
  }

  // If user_class_id is provided (student), return only their level
  if (userClassId && userRole === 'student') {
    const { data: classData } = await supabase
      .from('classes')
      .select('level_id')
      .eq('id', userClassId)
      .single();

    if (classData) {
      const { data, error } = await supabase
        .from('levels')
        .select('*, classes(*)')
        .eq('id', classData.level_id)
        .order('name');

      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ levels: data });
    }
  }

  // Otherwise return all levels (for teachers/admins)
  const { data, error } = await supabase
    .from('levels')
    .select('*, classes(*)')
    .order('name');

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ levels: data });
}
