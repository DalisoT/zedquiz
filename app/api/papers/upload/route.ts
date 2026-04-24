import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaper, uploadPaperFile } from '@/lib/paperProcessor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const subjectId = formData.get('subjectId') as string;
    const classId = formData.get('classId') as string;
    const title = formData.get('title') as string;
    const examYear = parseInt(formData.get('examYear') as string);
    const paperNumber = parseInt(formData.get('paperNumber') as string);

    if (!file || !subjectId || !classId || !title || !examYear || !paperNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get access token from cookie and create auth-aware client
    const accessToken = request.cookies.get('sb-access-token')?.value;
    console.log('[upload] cookies:', request.cookies.getAll().map(c => c.name));
    console.log('[upload] accessToken present:', !!accessToken);
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    console.log('[upload] authErr:', authErr, 'user:', user?.id);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const fileUrl = await uploadPaperFile(file, user.id);
    const paper = await createPaper(subjectId, classId, title, examYear, paperNumber, fileUrl, user.id);

    return NextResponse.json({ paper });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Failed to upload paper' }, { status: 500 });
  }
}
