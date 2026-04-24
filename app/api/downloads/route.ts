import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const year = searchParams.get('year');
    const userClassId = searchParams.get('user_class_id');
    const userRole = searchParams.get('role');

    let query = supabase
      .from('downloads')
      .select(`
        *,
        classes(id, name, levels(id, name)),
        subjects(id, name)
      `)
      .order('created_at', { ascending: false });

    // If student, only show their grade's papers
    if (userClassId && userRole === 'student') {
      query = query.eq('class_id', userClassId);
    } else {
      if (classId) query = query.eq('class_id', classId);
    }

    if (subjectId) query = query.eq('subject_id', subjectId);
    if (year) query = query.eq('exam_year', parseInt(year));

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Transform data
    const downloads = (data || []).map((d: any) => {
      const cls = Array.isArray(d.classes) ? d.classes[0] : d.classes;
      return {
        id: d.id,
        title: d.title,
        description: d.description,
        file_url: d.file_url,
        file_name: d.file_name,
        exam_year: d.exam_year,
        paper_number: d.paper_number,
        class_id: d.class_id,
        subject_id: d.subject_id,
        class_name: cls?.name,
        level_id: cls?.levels?.id,
        level_name: cls?.levels?.name,
        subject_name: d.subjects?.name,
        uploaded_by: d.uploaded_by,
        created_at: d.created_at,
      };
    });

    return NextResponse.json({ downloads });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin', 'teacher'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, description, class_id, subject_id, exam_year, paper_number, file_url, file_name } = await request.json();

    if (!title || !class_id || !subject_id || !file_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('downloads')
      .insert({
        title,
        description,
        class_id,
        subject_id,
        exam_year,
        paper_number,
        file_url,
        file_name,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ download: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
