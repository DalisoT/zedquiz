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

  // If user_class_id is provided (student), get subjects for their level
  if (userClassId && userRole === 'student') {
    // First get the class to find its level
    const { data: classData } = await supabase
      .from('classes')
      .select('level_id')
      .eq('id', userClassId)
      .single();

    if (classData) {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('level_id', classData.level_id)
        .order('name');

      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ subjects: data });
    }
  }

  let query = supabase.from('subjects').select('*').order('name');
  if (levelId) {
    query = query.eq('level_id', levelId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ subjects: data });
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin', 'teacher'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, level_id, code, description } = await request.json();

    if (!name || !level_id) {
      return NextResponse.json({ error: 'Name and level are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({ name, level_id, code, description })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ subject: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
