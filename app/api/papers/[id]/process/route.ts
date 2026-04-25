import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getPaper, updatePaperStatus, insertPaperQuestions, parseQuestionsWithAI, deleteFileFromStorage, extractTextFromPDF } from '@/lib/paperProcessor';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function authorizeRequest(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  if (!accessToken) return null;

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false }
    }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'teacher' || profile?.role === 'admin' || profile?.role === 'super_admin' ? user : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authorizeRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const paper = await getPaper(params.id);
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 });

    // Only paper owner or admin can process
    if (paper.uploaded_by !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await updatePaperStatus(params.id, 'processing');

    const ocrText = await extractTextFromPDF(paper.file_url);

    if (!ocrText || ocrText.trim().length < 50) {
      await updatePaperStatus(params.id, 'uploaded');
      return NextResponse.json({ error: 'Could not extract text from PDF. The file may be image-based and need a different processing approach.' }, { status: 422 });
    }

    const questions = await parseQuestionsWithAI(ocrText, paper.exam_year, paper.paper_number);

    await insertPaperQuestions(params.id, questions);

    await updatePaperStatus(params.id, 'processed');

    // Auto-delete PDF after successful processing to save storage
    if (paper.file_url) {
      await deleteFileFromStorage(paper.file_url);
      await supabase.from('papers').update({ file_url: null }).eq('id', params.id);
    }

    return NextResponse.json({
      success: true,
      questionsExtracted: questions.length,
    });
  } catch (e: any) {
    await updatePaperStatus(params.id, 'uploaded');
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
