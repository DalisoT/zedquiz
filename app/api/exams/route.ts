import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createExamSchema, validateSchema } from '@/lib/validation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  let query = supabase
    .from('exams')
    .select('*, classes(name), subjects(name)')
    .order('created_at', { ascending: false });

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ exams: data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createExamSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    }
    const examData = result.data;

    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false },
      }
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('exams')
      .insert({
        teacher_id: user.id,
        title: examData.title,
        description: examData.description,
        class_id: examData.class_id,
        subject_id: examData.subject_id,
        time_limit_seconds: examData.time_limit_seconds,
        question_count: examData.question_count,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ exam: data });
  } catch (e) {
    console.error('Create exam error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
