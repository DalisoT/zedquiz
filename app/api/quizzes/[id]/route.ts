import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, classes(name), subjects(name), quiz_questions(*, questions(*))')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ quiz: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json();

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

    const { data: quiz } = await authClient.from('quizzes').select('teacher_id').eq('id', params.id).single();
    if (quiz?.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await authClient
      .from('quizzes')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ quiz: data });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

  const { data: quiz } = await authClient.from('quizzes').select('teacher_id').eq('id', params.id).single();
  if (quiz?.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await authClient.from('quizzes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}