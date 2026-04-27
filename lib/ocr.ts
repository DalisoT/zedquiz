import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Use the worker from the package directly (no CDN needed)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

/**
 * Extract text from a PDF file using pdfjs-dist
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Perform OCR on an image file using Tesseract.js
 */
export async function performOCR(imageFile: File): Promise<string> {
  const result = await Tesseract.recognize(imageFile, 'eng', {
    logger: (m) => console.log('[OCR]', m.status, m.progress),
  });
  return result.data.text;
}

/**
 * Extract text from any PDF - tries text extraction first,
 * falls back to OCR on canvas if needed
 */
export async function extractTextFromPDFFull(file: File): Promise<string> {
  try {
    const text = await extractTextFromPDF(file);
    if (text.length > 100) {
      return text;
    }
  } catch (e) {
    console.log('[OCR] Direct extraction failed, trying canvas OCR', e);
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    const imageDataUrl = canvas.toDataURL('image/png');
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const imageFile = new File([blob], 'page.png', { type: 'image/png' });

    const pageText = await performOCR(imageFile);
    fullText += pageText + '\n';
  }

  return fullText.trim();
}