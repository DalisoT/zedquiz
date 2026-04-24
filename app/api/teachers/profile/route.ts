import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { full_name, subject_ids } = await request.json();

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

    // Update profile
    const { error: profileError } = await authClient
      .from('profiles')
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) return NextResponse.json({ error: profileError }, { status: 500 });

    // Update teacher subjects
    if (subject_ids && Array.isArray(subject_ids)) {
      await authClient.from('teacher_subjects').delete().eq('teacher_id', user.id);
      const inserts = subject_ids.map((sid: string) => ({ teacher_id: user.id, subject_id: sid }));
      await authClient.from('teacher_subjects').insert(inserts);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}