import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  // Require authentication
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

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const subjectId = searchParams.get('subject_id');

  let query = authClient
    .from('questions')
    .select('id, question_text, image_url, answer_type, marks, difficulty, marking_scheme, model_answer, topics(name), subjects(name), classes(name)')
    .eq('is_approved', true);

  if (classId) query = query.eq('class_id', classId);
  if (subjectId) query = query.eq('subject_id', subjectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });

  // Calculate total size estimate
  const totalSize = new Blob([JSON.stringify(data)]).size;

  return NextResponse.json({
    pack: {
      question_count: data?.length || 0,
      size_bytes: totalSize,
      downloaded_at: new Date().toISOString(),
    },
    questions: data
  });
}