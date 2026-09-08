/**
 * Print System — HTML generation & browser print trigger
 * 
 * Generates clean, isolated HTML with exact CSS millimeter units,
 * print bleed margins, corner crop marks, and zero UI clutter.
 */

import type { LayoutPosition } from './layout-engine';

export interface WatermarkPrintConfig {
  isPro?: boolean;
  shopBranding?: {
    enabled?: boolean;
    shopName?: string;
    phone?: string;
    address?: string;
    customFooter?: string;
  };
}

import type { PhotoBorderSettings } from './templates';

export interface PrintConfig {
  paperWidth: number;
  paperHeight: number;
  orientation: 'portrait' | 'landscape';
  positions: LayoutPosition[];
  imageUrl?: string;
  /** Optional per-slot specific images for multi-customer mix & match printing */
  slots?: { position: LayoutPosition; imageUrl: string }[];
  itemWidth: number;
  itemHeight: number;
  showCuttingMarks?: boolean;
  photoBorder?: PhotoBorderSettings;
  bleedMm?: number;
  showCropMarks?: boolean;
  watermark?: WatermarkPrintConfig;
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
  positions?: {
    front: { x: number; y: number; width: number; height: number };
    back?: { x: number; y: number; width: number; height: number };
  }[];
  frontRotation?: number;
  backRotation?: number;
  watermark?: WatermarkPrintConfig;
}

/**
 * Generate the HTML content for the print iframe.
 */
export function generatePrintHTML(config: PrintConfig): string {
  const {
    paperWidth, paperHeight, orientation, positions, imageUrl, slots,
    itemWidth, itemHeight, showCuttingMarks, photoBorder, bleedMm = 0, showCropMarks = true,
    watermark,
  } = config;

  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? Math.max(paperWidth, paperHeight) : Math.min(paperWidth, paperHeight);
  const pageHeight = isLandscape ? Math.min(paperWidth, paperHeight) : Math.max(paperWidth, paperHeight);

  let cellBorder = '';
  if (photoBorder?.enabled && photoBorder.style !== 'none') {
    const borderW = photoBorder.width ?? photoBorder.widthMm ?? 0.5;
    cellBorder = `border: ${borderW}mm ${photoBorder.style} ${photoBorder.color}; box-sizing: border-box;`;
  } else if (showCuttingMarks) {
    cellBorder = 'border: 0.15mm dashed rgba(0,0,0,0.35); box-sizing: border-box;';
  }

  const itemsToRender = slots && slots.length > 0
    ? slots
    : positions.map((pos) => ({ position: pos, imageUrl: imageUrl || '' }));

  const photoCells = itemsToRender.map(({ position: pos, imageUrl: cellImg }) => {
    // Expand by bleed if configured
    const renderX = pos.x - bleedMm;
    const renderY = pos.y - bleedMm;
    const cellW = pos.width || itemWidth;
    const cellH = pos.height || itemHeight;
    const renderW = cellW + (bleedMm * 2);
    const renderH = cellH + (bleedMm * 2);

    const cropMarksHtml = showCropMarks ? `
      <div class="crop-mark tl"></div>
      <div class="crop-mark tr"></div>
      <div class="crop-mark bl"></div>
      <div class="crop-mark br"></div>
    ` : '';

    const isRot = pos.rotation === 90;
    const imgStyle = isRot
      ? `width: ${renderH}mm; height: ${renderW}mm; transform: rotate(90deg); transform-origin: center center; object-fit: cover; display: block;`
      : 'width: 100%; height: 100%; object-fit: cover; display: block;';

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
        display: flex;
        align-items: center;
        justify-content: center;
        ${cellBorder}
      ">
        <img src="${cellImg}" style="${imgStyle}" />
      </div>
      ${cropMarksHtml}
    </div>`;
  }).join('\n');

  let watermarkHtml = '';
  if (watermark?.isPro) {
    if (watermark.shopBranding?.enabled && (watermark.shopBranding.shopName || watermark.shopBranding.phone)) {
      const parts = [
        watermark.shopBranding.shopName,
        watermark.shopBranding.phone,
        watermark.shopBranding.address,
        watermark.shopBranding.customFooter,
      ].filter(Boolean);
      watermarkHtml = `<div class="sheet-branding-footer shop">${parts.join(' • ')}</div>`;
    }
  } else {
    watermarkHtml = '<div class="sheet-branding-footer free">Printed with UrStudio (urstudio.app) • Free Tier</div>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print - UrStudio</title>
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

    /* Subtle Paper Sheet Branding / Watermark Footer */
    .sheet-branding-footer {
      position: absolute;
      bottom: 1.5mm;
      left: 0;
      width: 100%;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 5.2pt;
      letter-spacing: 0.15mm;
      pointer-events: none;
      z-index: 999;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4mm;
    }
    .sheet-branding-footer.free {
      color: #94A3B8;
    }
    .sheet-branding-footer.shop {
      color: #334155;
      font-weight: 600;
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
    ${watermarkHtml}
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
    bleedMm = 0, showCropMarks = true, watermark,
    positions, frontRotation = 0, backRotation = 0,
  } = config;

  const isPVC = pvcSingleSide !== undefined;
  const pageWidth = isPVC ? cardWidth : paperWidth;
  const pageHeight = isPVC ? cardHeight : paperHeight;

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
    // Paper Sheet Printing
    const borderStyle = showCuttingMarks
      ? 'border: 0.2mm dashed rgba(0,0,0,0.4); border-radius: 2mm;'
      : '';

    const cropMarksHtml = showCropMarks ? `
      <div class="crop-mark tl"></div>
      <div class="crop-mark tr"></div>
      <div class="crop-mark bl"></div>
      <div class="crop-mark br"></div>
    ` : '';

    const renderPositions = positions && positions.length > 0
      ? positions
      : [{
          front: { x: (pageWidth - cardWidth) / 2, y: (pageHeight - cardHeight * 2 - 5) / 2, width: cardWidth, height: cardHeight },
          back: backImageUrl ? { x: (pageWidth - cardWidth) / 2, y: (pageHeight - cardHeight * 2 - 5) / 2 + cardHeight + 5, width: cardWidth, height: cardHeight } : undefined,
        }];

    for (const pos of renderPositions) {
      if (frontImageUrl) {
        const renderW = pos.front.width + (bleedMm * 2);
        const renderH = pos.front.height + (bleedMm * 2);
        const fImgStyle = frontRotation === 90
          ? `width: ${renderH}mm; height: ${renderW}mm; transform: rotate(90deg); transform-origin: center center; object-fit: cover; display: block;`
          : 'width: 100%; height: 100%; object-fit: cover; display: block;';

        cardCells += `
          <div class="card-cell-wrapper" style="
            position: absolute;
            left: ${pos.front.x - bleedMm}mm;
            top: ${pos.front.y - bleedMm}mm;
            width: ${renderW}mm;
            height: ${renderH}mm;
          ">
            <div class="card-cell" style="
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              ${borderStyle}
            ">
              <img src="${frontImageUrl}" style="${fImgStyle}" />
            </div>
            ${cropMarksHtml}
          </div>`;
      }

      if (pos.back && backImageUrl) {
        const renderW = pos.back.width + (bleedMm * 2);
        const renderH = pos.back.height + (bleedMm * 2);
        const bImgStyle = backRotation === 90
          ? `width: ${renderH}mm; height: ${renderW}mm; transform: rotate(90deg); transform-origin: center center; object-fit: cover; display: block;`
          : 'width: 100%; height: 100%; object-fit: cover; display: block;';

        cardCells += `
          <div class="card-cell-wrapper" style="
            position: absolute;
            left: ${pos.back.x - bleedMm}mm;
            top: ${pos.back.y - bleedMm}mm;
            width: ${renderW}mm;
            height: ${renderH}mm;
          ">
            <div class="card-cell" style="
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              ${borderStyle}
            ">
              <img src="${backImageUrl}" style="${bImgStyle}" />
            </div>
            ${cropMarksHtml}
          </div>`;
      }
    }
  }

  let watermarkHtml = '';
  if (watermark?.isPro) {
    if (watermark.shopBranding?.enabled && (watermark.shopBranding.shopName || watermark.shopBranding.phone)) {
      const parts = [
        watermark.shopBranding.shopName,
        watermark.shopBranding.phone,
        watermark.shopBranding.address,
        watermark.shopBranding.customFooter,
      ].filter(Boolean);
      watermarkHtml = `<div class="sheet-branding-footer shop">${parts.join(' • ')}</div>`;
    }
  } else {
    watermarkHtml = '<div class="sheet-branding-footer free">Printed with UrStudio (urstudio.app) • Free Tier</div>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ID Card Print - UrStudio</title>
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

    /* Subtle Paper Sheet Branding / Watermark Footer */
    .sheet-branding-footer {
      position: absolute;
      bottom: 1.5mm;
      left: 0;
      width: 100%;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 5.2pt;
      letter-spacing: 0.15mm;
      pointer-events: none;
      z-index: 999;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4mm;
    }
    .sheet-branding-footer.free {
      color: #94A3B8;
    }
    .sheet-branding-footer.shop {
      color: #334155;
      font-weight: 600;
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
    ${!isPVC ? watermarkHtml : ''}
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
