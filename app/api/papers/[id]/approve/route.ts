import { NextResponse } from 'next/server';
import { approveQuestions } from '@/lib/paperProcessor';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { questionIds } = body;

    await approveQuestions(params.id, questionIds);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
