/**
 * PDF Processing Engine
 * 
 * Renders customer PDF documents (e-Aadhaar, PAN cards, driving licences,
 * visa photos, marksheets) to high-resolution 300 DPI canvases in the browser.
 * Fully offline-first using local /cmaps and local pdf.worker.
 * 
 * Features:
 * - Two-tier lazy rendering & on-demand high-res rendering
 * - Password-protected PDF unlocking (e-Aadhaar / e-PAN)
 * - Blob URLs to minimize V8 heap memory overhead
 * - Explicit canvas disposal (canvas.width = canvas.height = 0)
 */

import type { EditorImage } from '@/store/editor-store';

export interface PdfPageResult {
  pageNumber: number;
  dataUrl: string;       // Object URL (Blob URL)
  thumbnailUrl: string;  // Low-res thumbnail URL
  width: number;
  height: number;
  name: string;
}

export class PasswordRequiredError extends Error {
  constructor(message = 'This PDF is encrypted and requires a password') {
    super(message);
    this.name = 'PasswordRequiredError';
  }
}

/** Check if a file is a PDF */
export function isPdfFile(file: File): boolean {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    type === 'application/pdf' ||
    type === 'application/x-pdf' ||
    type.includes('pdf') ||
    name.endsWith('.pdf')
  );
}

/**
 * Loads a PDF file and converts pages into images.
 * Uses local /cmaps/ for 100% offline regional script support.
 * Supports password authentication for encrypted PDFs.
 */
export async function loadPdfPages(
  file: File,
  options?: {
    dpi?: number;
    maxPages?: number;
    password?: string;
    onRequestPassword?: () => Promise<string | null>;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<PdfPageResult[]> {
  const dpi = options?.dpi || 300;
  const maxPages = options?.maxPages || 10;

  // Dynamically import pdfjs-dist on client side
  const pdfjsLib = await import('pdfjs-dist');

  // Configure worker with dual-mode support (module workerPort and workerSrc fallback)
  if (typeof window !== 'undefined') {
    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerPort && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        if ('Worker' in window) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerPort = new Worker('/pdf.worker.min.mjs', { type: 'module' });
          } catch {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
          }
        } else {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }
      }
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
  }

  const loadDocument = async (pwd?: string) => {
    // Generate fresh ArrayBuffer from the file so it can never be detached
    const freshBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(freshBuffer),
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      password: pwd,
    });

    return await loadingTask.promise;
  };

  let pdfDoc;
  let currentPassword = options?.password;

  while (!pdfDoc) {
    try {
      pdfDoc = await loadDocument(currentPassword);
    } catch (err: unknown) {
      const isPassErr =
        (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'PasswordException') ||
        (err instanceof Error && (
          err.name === 'PasswordException' ||
          err.message.toLowerCase().includes('password')
        ));

      if (isPassErr) {
        if (options?.onRequestPassword) {
          const userPassword = await options.onRequestPassword();
          if (!userPassword) {
            throw new PasswordRequiredError('Password entry cancelled');
          }
          currentPassword = userPassword;
        } else {
          throw new PasswordRequiredError('Password required to open this PDF document');
        }
      } else {
        throw err;
      }
    }
  }

  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const results: PdfPageResult[] = [];

  // PDF default standard is 72 points per inch.
  // Scale = target DPI / 72 (e.g. 300 / 72 ≈ 4.1667)
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

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;

    // Create low-res thumbnail first
    const thumbCanvas = document.createElement('canvas');
    const thumbScale = Math.min(200 / canvas.width, 200 / canvas.height);
    thumbCanvas.width = Math.round(canvas.width * thumbScale);
    thumbCanvas.height = Math.round(canvas.height * thumbScale);
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
    thumbCanvas.width = thumbCanvas.height = 0; // Release thumbnail canvas

    // Convert high-res canvas to Blob URL to prevent V8 string heap bloat
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
    );

    const dataUrl = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/jpeg', 0.95);

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const pageTitle = numPages > 1 ? `${cleanName} (Page ${pageNum})` : cleanName;

    results.push({
      pageNumber: pageNum,
      dataUrl,
      thumbnailUrl,
      width: canvas.width,
      height: canvas.height,
      name: pageTitle,
    });

    // Explicitly release large high-res canvas memory buffer
    canvas.width = canvas.height = 0;

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
    isPdf: true,
    pdfPageNumber: page.pageNumber,
  };
}
