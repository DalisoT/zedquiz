import Tesseract from 'tesseract.js';

// pdfjs-dist must be loaded with node compatibility settings
let pdfjsLib: any = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = (await import('pdfjs-dist')).default;
  }
  return pdfjsLib;
}

/**
 * Extract text from a PDF file using pdfjs-dist
 * Works in browser environment
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await getPdfJs();

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Load PDF document
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  // Extract text from each page
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
 * Works in browser environment - free and runs entirely client-side
 */
export async function performOCR(imageFile: File): Promise<string> {
  const result = await Tesseract.recognize(imageFile, 'eng', {
    logger: (m) => console.log('[OCR]', m.status, m.progress),
  });

  return result.data.text;
}

/**
 * Check if a PDF appears to be text-based (has extractable text)
 * vs image-based (needs OCR)
 */
export async function isTextBasedPDF(file: File): Promise<boolean> {
  try {
    const text = await extractTextFromPDF(file);
    // If we got substantial text, it's text-based
    return text.length > 100;
  } catch {
    return false;
  }
}

/**
 * Extract text from any PDF - tries text extraction first,
 * falls back to OCR on canvas if needed
 */
export async function extractTextFromPDFFull(file: File): Promise<string> {
  // First try direct text extraction
  try {
    const text = await extractTextFromPDF(file);
    if (text.length > 100) {
      return text;
    }
  } catch (e) {
    console.log('[OCR] Direct extraction failed, trying canvas OCR');
  }

  // Fall back to canvas-based OCR via pdfjs
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  // Create a canvas element for rendering
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to image and run OCR
    const imageDataUrl = canvas.toDataURL('image/png');
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const imageFile = new File([blob], 'page.png', { type: 'image/png' });

    const pageText = await performOCR(imageFile);
    fullText += pageText + '\n';
  }

  return fullText.trim();
}