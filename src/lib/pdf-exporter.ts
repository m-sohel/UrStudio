/**
 * PDF Exporter — High-Resolution 300 DPI Client-Side PDF Generation
 * 
 * Generates millimeter-accurate print-ready PDF documents directly in the browser
 * using jsPDF. Supports multi-photo sheets, ID card sheets, and direct CR80 PVC cards.
 */

import jsPDF from 'jspdf';
import type { LayoutPosition } from './layout-engine';

export type IDCardPositionPair = {
  front: LayoutPosition;
  back?: LayoutPosition;
};

export interface BasePDFConfig {
  paperWidth: number;
  paperHeight: number;
  orientation?: 'portrait' | 'landscape';
  showCuttingMarks?: boolean;
  bleedMm?: number;
  showCropMarks?: boolean;
  filename?: string;
}

export interface PhotoSheetPDFConfig extends BasePDFConfig {
  positions: LayoutPosition[];
  imageUrl: string;
  itemWidth: number;
  itemHeight: number;
}

export interface IDCardSheetPDFConfig extends BasePDFConfig {
  cardWidth: number;
  cardHeight: number;
  positions: IDCardPositionPair[];
  frontImageUrl: string;
  backImageUrl?: string;
  templateName?: string;
}

export interface PVCCardPDFConfig {
  cardWidth?: number; // default 85.6 mm
  cardHeight?: number; // default 53.98 mm
  frontImageUrl: string;
  backImageUrl?: string;
  filename?: string;
}

/**
 * Ensure image source is resolved to a usable data URL for jsPDF.
 */
export async function resolveImageDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    return url;
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.98));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    };
    img.src = url;
  });
}

/**
 * Draw corner crosshair marks for precision paper trimmers / guillotines.
 */
function drawCropMarks(doc: jsPDF, x: number, y: number, width: number, height: number, markLen = 2.5) {
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.18);
  doc.setLineDashPattern([], 0);

  // Top-left
  doc.line(x - markLen, y, x, y);
  doc.line(x, y - markLen, x, y);
  // Top-right
  doc.line(x + width, y, x + width + markLen, y);
  doc.line(x + width, y - markLen, x + width, y);
  // Bottom-left
  doc.line(x - markLen, y + height, x, y + height);
  doc.line(x, y + height, x, y + height + markLen);
  // Bottom-right
  doc.line(x + width, y + height, x + width + markLen, y + height);
  doc.line(x + width, y + height, x + width, y + height + markLen);
}

/**
 * Export a multi-copy photo layout sheet as a high-resolution PDF document.
 */
export async function exportPhotoLayoutToPDF(config: PhotoSheetPDFConfig): Promise<jsPDF> {
  const {
    paperWidth,
    paperHeight,
    orientation = 'portrait',
    positions,
    imageUrl,
    itemWidth,
    itemHeight,
    showCuttingMarks = false,
    bleedMm = 0,
    showCropMarks = true,
    filename,
  } = config;

  const isLandscape = orientation === 'landscape';
  const pWidth = isLandscape ? Math.max(paperWidth, paperHeight) : Math.min(paperWidth, paperHeight);
  const pHeight = isLandscape ? Math.min(paperWidth, paperHeight) : Math.max(paperWidth, paperHeight);

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pWidth, pHeight],
    compress: true,
  });

  doc.setDocumentProperties({
    title: 'CyberCafe Studio — Photo Print Sheet',
    subject: 'Photo Print Sheet',
    author: 'CyberCafe Studio / iPrint',
    creator: 'iPrint SaaS Platform',
  });

  const resolvedDataUrl = await resolveImageDataUrl(imageUrl);

  for (const pos of positions) {
    const renderX = pos.x - bleedMm;
    const renderY = pos.y - bleedMm;
    const renderW = itemWidth + bleedMm * 2;
    const renderH = itemHeight + bleedMm * 2;

    // Render photo
    doc.addImage(resolvedDataUrl, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');

    // Cutting border
    if (showCuttingMarks) {
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.15);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.rect(pos.x, pos.y, itemWidth, itemHeight);
    }

    // Corner crop marks
    if (showCropMarks) {
      drawCropMarks(doc, pos.x, pos.y, itemWidth, itemHeight);
    }
  }

  const exportName = filename || `iPrint_Photos_${Math.round(pWidth)}x${Math.round(pHeight)}mm_${Date.now()}.pdf`;
  if (typeof window !== 'undefined') {
    doc.save(exportName);
  }

  return doc;
}

/**
 * Export an ID Card Sheet (A4 / 4×6) with front and back arrangements to PDF.
 */
export async function exportIDCardSheetToPDF(config: IDCardSheetPDFConfig): Promise<jsPDF> {
  const {
    paperWidth,
    paperHeight,
    orientation = 'portrait',
    cardWidth,
    cardHeight,
    positions,
    frontImageUrl,
    backImageUrl,
    showCuttingMarks = true,
    bleedMm = 0,
    showCropMarks = true,
    filename,
    templateName = 'ID_Card',
  } = config;

  const isLandscape = orientation === 'landscape';
  const pWidth = isLandscape ? Math.max(paperWidth, paperHeight) : Math.min(paperWidth, paperHeight);
  const pHeight = isLandscape ? Math.min(paperWidth, paperHeight) : Math.max(paperWidth, paperHeight);

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pWidth, pHeight],
    compress: true,
  });

  doc.setDocumentProperties({
    title: `CyberCafe Studio — ${templateName} Sheet`,
    subject: `${templateName} Sheet`,
    author: 'CyberCafe Studio / iPrint',
    creator: 'iPrint SaaS Platform',
  });

  const resolvedFront = await resolveImageDataUrl(frontImageUrl);
  const resolvedBack = backImageUrl ? await resolveImageDataUrl(backImageUrl) : null;

  for (const pos of positions) {
    // 1. Front Card
    const fX = pos.front.x - bleedMm;
    const fY = pos.front.y - bleedMm;
    const fW = pos.front.width + bleedMm * 2;
    const fH = pos.front.height + bleedMm * 2;

    doc.addImage(resolvedFront, 'JPEG', fX, fY, fW, fH, undefined, 'FAST');

    if (showCuttingMarks) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.18);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.rect(pos.front.x, pos.front.y, pos.front.width, pos.front.height);
    }

    if (showCropMarks) {
      drawCropMarks(doc, pos.front.x, pos.front.y, pos.front.width, pos.front.height);
    }

    // 2. Back Card (if present)
    if (pos.back && resolvedBack) {
      const bX = pos.back.x - bleedMm;
      const bY = pos.back.y - bleedMm;
      const bW = pos.back.width + bleedMm * 2;
      const bH = pos.back.height + bleedMm * 2;

      doc.addImage(resolvedBack, 'JPEG', bX, bY, bW, bH, undefined, 'FAST');

      if (showCuttingMarks) {
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.18);
        doc.setLineDashPattern([1.5, 1], 0);
        doc.rect(pos.back.x, pos.back.y, pos.back.width, pos.back.height);
      }

      if (showCropMarks) {
        drawCropMarks(doc, pos.back.x, pos.back.y, pos.back.width, pos.back.height);
      }
    }
  }

  const exportName = filename || `iPrint_${templateName.replace(/[^a-zA-Z0-9]/g, '_')}_Sheet_${Date.now()}.pdf`;
  if (typeof window !== 'undefined') {
    doc.save(exportName);
  }

  return doc;
}

/**
 * Export a direct CR80 PVC Card as a 1 or 2-page exact-size (85.6 × 53.98 mm) PDF.
 */
export async function exportPVCCardToPDF(config: PVCCardPDFConfig): Promise<jsPDF> {
  const {
    cardWidth = 85.6,
    cardHeight = 53.98,
    frontImageUrl,
    backImageUrl,
    filename,
  } = config;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [cardWidth, cardHeight],
    compress: true,
  });

  doc.setDocumentProperties({
    title: 'CyberCafe Studio — CR80 PVC Card',
    subject: 'CR80 PVC Card',
    author: 'CyberCafe Studio / iPrint',
    creator: 'iPrint SaaS Platform',
  });

  const resolvedFront = await resolveImageDataUrl(frontImageUrl);
  doc.addImage(resolvedFront, 'JPEG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');

  // If back image exists, add as page 2
  if (backImageUrl) {
    const resolvedBack = await resolveImageDataUrl(backImageUrl);
    doc.addPage([cardWidth, cardHeight], 'landscape');
    doc.addImage(resolvedBack, 'JPEG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
  }

  const exportName = filename || `iPrint_CR80_PVC_Card_${Date.now()}.pdf`;
  if (typeof window !== 'undefined') {
    doc.save(exportName);
  }

  return doc;
}
