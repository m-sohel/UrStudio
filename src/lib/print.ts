/**
 * Print System — HTML generation & browser print trigger
 * 
 * Generates clean, isolated HTML with exact CSS millimeter units,
 * print bleed margins, corner crop marks, and zero UI clutter.
 */

import type { LayoutPosition } from './layout-engine';

export interface PrintConfig {
  paperWidth: number;
  paperHeight: number;
  orientation: 'portrait' | 'landscape';
  positions: LayoutPosition[];
  imageUrl: string;
  itemWidth: number;
  itemHeight: number;
  showCuttingMarks?: boolean;
  bleedMm?: number;
  showCropMarks?: boolean;
}

export interface IDCardPrintConfig {
  paperWidth: number;
  paperHeight: number;
  orientation: 'portrait' | 'landscape';
  cardWidth: number;
  cardHeight: number;
  frontImageUrl?: string;
  backImageUrl?: string;
  showCuttingMarks?: boolean;
  bleedMm?: number;
  showCropMarks?: boolean;
  /** For PVC direct printing: print only front or back */
  pvcSingleSide?: 'front' | 'back';
}

/**
 * Generate the HTML content for the print iframe.
 */
export function generatePrintHTML(config: PrintConfig): string {
  const {
    paperWidth, paperHeight, orientation, positions, imageUrl,
    itemWidth, itemHeight, showCuttingMarks, bleedMm = 0, showCropMarks = true
  } = config;

  const pageWidth = orientation === 'landscape' ? paperHeight : paperWidth;
  const pageHeight = orientation === 'landscape' ? paperWidth : paperHeight;
  const cellBorder = showCuttingMarks ? 'border: 0.15mm dashed rgba(0,0,0,0.35);' : '';

  const photoCells = positions.map((pos) => {
    // Expand by bleed if configured
    const renderX = pos.x - bleedMm;
    const renderY = pos.y - bleedMm;
    const renderW = itemWidth + (bleedMm * 2);
    const renderH = itemHeight + (bleedMm * 2);

    const cropMarksHtml = showCropMarks ? `
      <div class="crop-mark tl"></div>
      <div class="crop-mark tr"></div>
      <div class="crop-mark bl"></div>
      <div class="crop-mark br"></div>
    ` : '';

    return `<div class="photo-cell-wrapper" style="
      position: absolute;
      left: ${renderX}mm;
      top: ${renderY}mm;
      width: ${renderW}mm;
      height: ${renderH}mm;
    ">
      <div class="photo-cell" style="
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
        ${cellBorder}
      ">
        <img src="${imageUrl}" style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        " />
      </div>
      ${cropMarksHtml}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print - CyberCafe Studio</title>
  <style>
    @page {
      size: ${pageWidth}mm ${pageHeight}mm;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: high-quality;
    }

    body {
      margin: 0;
      padding: 0;
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
    }

    .print-page {
      position: relative;
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      overflow: hidden;
      page-break-after: always;
    }

    .photo-cell {
      overflow: hidden;
    }

    .photo-cell img {
      display: block;
    }

    /* Corner Crop Marks for Precision Paper Trimmers */
    .crop-mark {
      position: absolute;
      width: 2.5mm;
      height: 2.5mm;
      pointer-events: none;
    }
    .crop-mark.tl { top: -2.5mm; left: -2.5mm; border-right: 0.2mm solid #666; border-bottom: 0.2mm solid #666; }
    .crop-mark.tr { top: -2.5mm; right: -2.5mm; border-left: 0.2mm solid #666; border-bottom: 0.2mm solid #666; }
    .crop-mark.bl { bottom: -2.5mm; left: -2.5mm; border-right: 0.2mm solid #666; border-top: 0.2mm solid #666; }
    .crop-mark.br { bottom: -2.5mm; right: -2.5mm; border-left: 0.2mm solid #666; border-top: 0.2mm solid #666; }

    @media screen {
      body {
        background: #f0f0f0;
        display: flex;
        justify-content: center;
        padding: 20px;
      }
      .print-page {
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
    }
  </style>
</head>
<body>
  <div class="print-page">
    ${photoCells}
  </div>
</body>
</html>`;
}

/**
 * Generate print HTML for ID cards.
 */
export function generateIDCardPrintHTML(config: IDCardPrintConfig): string {
  const {
    paperWidth, paperHeight, orientation, cardWidth, cardHeight,
    frontImageUrl, backImageUrl, showCuttingMarks, pvcSingleSide,
    bleedMm = 0, showCropMarks = true
  } = config;

  const isPVC = pvcSingleSide !== undefined;
  const pageWidth = isPVC ? cardWidth : (orientation === 'landscape' ? paperHeight : paperWidth);
  const pageHeight = isPVC ? cardHeight : (orientation === 'landscape' ? paperWidth : paperHeight);

  let cardCells = '';

  if (isPVC) {
    // Direct PVC Card Single-Side Printing
    const imgUrl = pvcSingleSide === 'front' ? frontImageUrl : backImageUrl;
    if (!imgUrl) return '';

    cardCells = `
      <div class="card-cell" style="
        position: absolute;
        left: 0;
        top: 0;
        width: ${cardWidth}mm;
        height: ${cardHeight}mm;
        overflow: hidden;
      ">
        <img src="${imgUrl}" style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        " />
      </div>`;
  } else {
    // Paper Sheet Printing (Stacked Layout with optional cutting guide)
    const margin = 10;
    const gap = 5;
    const borderStyle = showCuttingMarks
      ? 'border: 0.2mm dashed rgba(0,0,0,0.4); border-radius: 2mm;'
      : '';

    const renderW = cardWidth + (bleedMm * 2);
    const renderH = cardHeight + (bleedMm * 2);

    const cropMarksHtml = showCropMarks ? `
      <div class="crop-mark tl"></div>
      <div class="crop-mark tr"></div>
      <div class="crop-mark bl"></div>
      <div class="crop-mark br"></div>
    ` : '';

    if (frontImageUrl) {
      cardCells += `
        <div class="card-cell-wrapper" style="
          position: absolute;
          left: ${margin - bleedMm}mm;
          top: ${margin - bleedMm}mm;
          width: ${renderW}mm;
          height: ${renderH}mm;
        ">
          <div class="card-cell" style="
            width: 100%;
            height: 100%;
            overflow: hidden;
            ${borderStyle}
          ">
            <img src="${frontImageUrl}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            " />
          </div>
          ${cropMarksHtml}
        </div>`;
    }

    if (backImageUrl) {
      const backTop = margin + cardHeight + gap;
      cardCells += `
        <div class="card-cell-wrapper" style="
          position: absolute;
          left: ${margin - bleedMm}mm;
          top: ${backTop - bleedMm}mm;
          width: ${renderW}mm;
          height: ${renderH}mm;
        ">
          <div class="card-cell" style="
            width: 100%;
            height: 100%;
            overflow: hidden;
            ${borderStyle}
          ">
            <img src="${backImageUrl}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            " />
          </div>
          ${cropMarksHtml}
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ID Card Print - CyberCafe Studio</title>
  <style>
    @page {
      size: ${pageWidth}mm ${pageHeight}mm;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: high-quality;
      display: block;
    }

    body {
      margin: 0;
      padding: 0;
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
    }

    .print-page {
      position: relative;
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      overflow: hidden;
    }

    .card-cell img { display: block; }

    .crop-mark {
      position: absolute;
      width: 2.5mm;
      height: 2.5mm;
      pointer-events: none;
    }
    .crop-mark.tl { top: -2.5mm; left: -2.5mm; border-right: 0.2mm solid #666; border-bottom: 0.2mm solid #666; }
    .crop-mark.tr { top: -2.5mm; right: -2.5mm; border-left: 0.2mm solid #666; border-bottom: 0.2mm solid #666; }
    .crop-mark.bl { bottom: -2.5mm; left: -2.5mm; border-right: 0.2mm solid #666; border-top: 0.2mm solid #666; }
    .crop-mark.br { bottom: -2.5mm; right: -2.5mm; border-left: 0.2mm solid #666; border-top: 0.2mm solid #666; }

    @media screen {
      body {
        background: #f0f0f0;
        display: flex;
        justify-content: center;
        padding: 20px;
      }
      .print-page {
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
    }
  </style>
</head>
<body>
  <div class="print-page">
    ${cardCells}
  </div>
</body>
</html>`;
}

/**
 * Open a print dialog using an iframe.
 * Uses native onafterprint event listener to avoid premature removal.
 */
export function printViaIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Failed to access iframe document');
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  // Wait for images to load before printing
  const images = iframeDoc.querySelectorAll('img');
  const imagePromises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });

  Promise.all(imagePromises).then(() => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
      } catch {
        // ignore cross-origin if any
      }

      iframe.contentWindow?.print();

      // 60-second safety fallback cleanup in case afterprint does not fire
      setTimeout(cleanup, 60000);
    }, 250);
  });
}

/**
 * Browser print settings instructions.
 */
export const PRINT_INSTRUCTIONS = [
  'Set Scale to 100% (or "Actual Size") — do NOT choose "Fit to Page"',
  'Set Margins to "None" to preserve physical millimeter placement',
  'Select the matching Paper Size (A4, 4×6, or CR80 card)',
  'Disable "Headers and Footers"',
  'Enable "Background Graphics"',
  'Color Matching: In printer driver preferences, select "Photo Paper / Glossy" so the printer uses appropriate CMY/CMYK ink density',
  'Skin Tone Tip: Use the CMYK Soft-Proof & Skin Tone slider if prints appear too dark or reddish on paper',
];
