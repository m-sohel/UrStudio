/**
 * PDF Processing Engine
 * 
 * Renders customer PDF documents (e-Aadhaar, PAN cards, driving licences,
 * visa photos, marksheets) to high-resolution 300 DPI canvases in the browser.
 * Fully offline-first using local pdf.worker.
 */

import type { EditorImage } from '@/store/editor-store';
import { generateThumbnail } from '@/lib/image-processing';

export interface PdfPageResult {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  name: string;
}

/** Check if a file is a PDF */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Loads a PDF file and converts all its pages into high-resolution images.
 * Rendered at target DPI (default 300 DPI for print quality).
 */
export async function loadPdfPages(
  file: File,
  options?: {
    dpi?: number;
    maxPages?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<PdfPageResult[]> {
  const dpi = options?.dpi || 300;
  const maxPages = options?.maxPages || 10;

  // Dynamically import pdfjs-dist on client side
  const pdfjsLib = await import('pdfjs-dist');

  // Set local worker path from public folder for 100% offline capability
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const results: PdfPageResult[] = [];

  // PDF default standard is 72 points per inch.
  // To render at target DPI (e.g. 300 DPI): scale = 300 / 72 ≈ 4.1667
  const scale = dpi / 72;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Create high-res canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    // Fill white background (PDFs often have transparent backgrounds)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };

    // Render page
    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Create thumbnail
    const thumbCanvas = document.createElement('canvas');
    const thumbScale = Math.min(200 / canvas.width, 200 / canvas.height);
    thumbCanvas.width = Math.round(canvas.width * thumbScale);
    thumbCanvas.height = Math.round(canvas.height * thumbScale);
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const pageTitle = numPages > 1 ? `${cleanName} (Page ${pageNum})` : cleanName;

    results.push({
      pageNumber: pageNum,
      canvas,
      dataUrl,
      thumbnailUrl,
      width: canvas.width,
      height: canvas.height,
      name: pageTitle,
    });

    if (options?.onProgress) {
      options.onProgress(pageNum, numPages);
    }
  }

  return results;
}

/**
 * Converts a PdfPageResult into an EditorImage ready for cropping and auto-layout.
 */
export function pdfPageToEditorImage(page: PdfPageResult, originalFile: File): EditorImage {
  return {
    id: `pdf-page-${Date.now()}-${page.pageNumber}-${Math.random().toString(36).slice(2, 7)}`,
    file: originalFile,
    name: page.name,
    width: page.width,
    height: page.height,
    size: originalFile.size,
    type: 'image/jpeg',
    objectUrl: page.dataUrl,
    thumbnailUrl: page.thumbnailUrl,
  };
}
