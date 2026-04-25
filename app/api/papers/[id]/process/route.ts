import { NextResponse } from 'next/server';
import { getPaper, updatePaperStatus, insertPaperQuestions, parseQuestionsWithAI, deleteFileFromStorage } from '@/lib/paperProcessor';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import os from 'os';

async function extractTextFromPDF(fileUrl: string): Promise<string> {
  const tempDir = os.tmpdir();
  const baseName = `paper_${Date.now()}`;
  const tempPdf = path.join(tempDir, `${baseName}.pdf`);

  const response = await fetch(fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(tempPdf, buffer);

  try {
    // Try pdftotext first (works for text-based PDFs)
    const text = execSync(`pdftotext -layout "${tempPdf}" -`, {
      maxBuffer: 50 * 1024 * 1024,
    }).toString();

    if (text && text.trim().length > 50) {
      return text;
    }

    // Fallback: image-based PDF → use Tesseract OCR
    const imagesDir = path.join(tempDir, baseName);
    mkdirSync(imagesDir, { recursive: true });

    // Convert PDF pages to images
    execSync(`pdftoppm -r 300 -png "${tempPdf}" "${imagesDir}/page"`, {
      maxBuffer: 100 * 1024 * 1024,
    });

    // Run Tesseract on each page
    const imageFiles = readdirSync(imagesDir)
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(imagesDir, f))
      .sort();

    let fullText = '';
    for (const img of imageFiles) {
      try {
        const pageText = execSync(`tesseract "${img}" -l eng --psm 6`, {
          maxBuffer: 50 * 1024 * 1024,
        }).toString();
        fullText += pageText + '\n';
      } catch {
        // Skip failed pages
      }
    }

    // Cleanup images
    for (const img of imageFiles) {
      try { unlinkSync(img); } catch {}
    }
    try { unlinkSync(imagesDir); } catch {}

    return fullText;
  } finally {
    try { unlinkSync(tempPdf); } catch {}
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await getPaper(params.id);
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 });

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
