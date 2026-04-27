import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getPaper, deleteFileFromStorage } from '@/lib/paperProcessor';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await getPaper(params.id);
    if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ paper });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const paper = await getPaper(params.id);
    if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check if user is superadmin - they can delete any paper
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
    const isSuperAdmin = profile?.role === 'super_admin';
    if (paper.uploaded_by !== user.id && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete file from storage
    if (paper.file_url) {
      await deleteFileFromStorage(paper.file_url);
    }

    // Delete paper record (cascades to paper_questions)
    const { error } = await authClient.from('papers').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
