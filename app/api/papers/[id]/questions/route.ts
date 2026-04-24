import { NextResponse } from 'next/server';
import { getPaperQuestions, updatePaperQuestion } from '@/lib/paperProcessor';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const questions = await getPaperQuestions(params.id);
    return NextResponse.json({ questions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { questionId, ...updates } = body;
    if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 });

    await updatePaperQuestion(questionId, updates);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
