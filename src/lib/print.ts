/**
 * Print Utilities
 * 
 * Handles generation of print-ready HTML with CSS physical units (mm).
 * The print system creates an iframe with a clean print-only document.
 */

import { LayoutPosition } from './layout-engine';

export interface PrintConfig {
  /** Paper width in mm */
  paperWidth: number;
  /** Paper height in mm */
  paperHeight: number;
  /** Paper orientation */
  orientation: 'portrait' | 'landscape';
  /** Layout positions from the layout engine */
  positions: LayoutPosition[];
  /** Cropped image data URL or object URL */
  imageUrl: string;
  /** Item width in mm */
  itemWidth: number;
  /** Item height in mm */
  itemHeight: number;
  /** Show subtle cutting guides around photos */
  showCuttingMarks?: boolean;
}

export interface IDCardPrintConfig {
  paperWidth: number;
  paperHeight: number;
  orientation: 'portrait' | 'landscape';
  cardWidth: number;
  cardHeight: number;
  positions: {
    front: LayoutPosition;
    back?: LayoutPosition;
  }[];
  frontImageUrl: string;
  backImageUrl?: string;
  showCuttingMarks?: boolean;
  /** For PVC direct printing: print only front or back */
  pvcSingleSide?: 'front' | 'back';
}

/**
 * Generate the HTML content for the print iframe.
 */
export function generatePrintHTML(config: PrintConfig): string {
  const { paperWidth, paperHeight, orientation, positions, imageUrl, itemWidth, itemHeight, showCuttingMarks } = config;

  const pageWidth = orientation === 'landscape' ? paperHeight : paperWidth;
  const pageHeight = orientation === 'landscape' ? paperWidth : paperHeight;
  const cellBorder = showCuttingMarks ? 'border: 0.15mm dashed rgba(0,0,0,0.35);' : '';

  const photoCells = positions.map((pos) => {
    return `<div class="photo-cell" style="
      position: absolute;
      left: ${pos.x}mm;
      top: ${pos.y}mm;
      width: ${itemWidth}mm;
      height: ${itemHeight}mm;
      overflow: hidden;
      ${cellBorder}
    ">
      <img src="${imageUrl}" style="
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      " />
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
 * Generate HTML for ID card printing (front/back or direct PVC card).
 */
export function generateIDCardPrintHTML(config: IDCardPrintConfig): string {
  const {
    paperWidth,
    paperHeight,
    orientation,
    cardWidth,
    cardHeight,
    positions,
    frontImageUrl,
    backImageUrl,
    showCuttingMarks,
    pvcSingleSide,
  } = config;

  // Handle direct PVC single-side printing (CR80 card size)
  if (pvcSingleSide) {
    const targetUrl = pvcSingleSide === 'front' ? frontImageUrl : (backImageUrl || frontImageUrl);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PVC Card ${pvcSingleSide.toUpperCase()} - CyberCafe Studio</title>
  <style>
    @page {
      size: ${cardWidth}mm ${cardHeight}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      width: ${cardWidth}mm;
      height: ${cardHeight}mm;
      overflow: hidden;
    }
    .pvc-card {
      width: ${cardWidth}mm;
      height: ${cardHeight}mm;
      overflow: hidden;
    }
    .pvc-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    @media screen {
      body { background: #f0f0f0; display: flex; justify-content: center; padding: 20px; }
      .pvc-card { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
    }
  </style>
</head>
<body>
  <div class="pvc-card">
    <img src="${targetUrl}" />
  </div>
</body>
</html>`;
  }

  // Paper sheet printing
  const pageWidth = orientation === 'landscape' ? paperHeight : paperWidth;
  const pageHeight = orientation === 'landscape' ? paperWidth : paperHeight;
  const cardBorder = showCuttingMarks ? 'border: 0.2mm solid #999; border-radius: 2mm;' : '';

  const cardCells = positions.map((pos) => {
    let html = '';
    
    html += `<div class="card-cell" style="
      position: absolute;
      left: ${pos.front.x}mm;
      top: ${pos.front.y}mm;
      width: ${cardWidth}mm;
      height: ${cardHeight}mm;
      overflow: hidden;
      ${cardBorder}
    ">
      <img src="${frontImageUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />
    </div>`;

    if (pos.back && backImageUrl) {
      html += `<div class="card-cell" style="
        position: absolute;
        left: ${pos.back.x}mm;
        top: ${pos.back.y}mm;
        width: ${cardWidth}mm;
        height: ${cardHeight}mm;
        overflow: hidden;
        ${cardBorder}
      ">
        <img src="${backImageUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>`;
    }

    return html;
  }).join('\n');

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
 * Creates a hidden iframe, writes the print HTML, and triggers print.
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
      iframe.contentWindow?.print();
      // Clean up after a delay to allow the print dialog to open
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
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
