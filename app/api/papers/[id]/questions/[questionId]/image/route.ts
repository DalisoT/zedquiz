import { NextResponse } from 'next/server';
import { updatePaperQuestion } from '@/lib/paperProcessor';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const path = `question-images/${params.questionId}/${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('papers')
      .upload(path, file, { contentType: file.type });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('papers').getPublicUrl(data.path);
    await updatePaperQuestion(params.questionId, { image_url: urlData.publicUrl });

    return NextResponse.json({ imageUrl: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
