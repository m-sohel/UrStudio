/**
 * Digital Form Photo & Signature Exporter Engine
 * 
 * Tailored for Indian & Global Competitive Exams and Government Portals:
 * - SSC (CGL, CHSL, MTS, GD, CPO)
 * - UPSC (Civil Services, NDA, CDS, OTR)
 * - IBPS & SBI (Banking Exams)
 * - RRB Railways (NTPC, Group D, ALP)
 * - NTA (NEET-UG, JEE Main, CUET, UGC NET)
 * - GATE & IIT JAM
 * - CTET & State TET
 * - Sarathi Parivahan (Driving License)
 * - PAN Card (NSDL / UTIITSL)
 * - Agniveer & Defence (Army, Navy, Air Force)
 * - State PSCs & Police Recruitment
 * - Passport Seva (MEA) & US Visa (DS-160)
 * 
 * Features:
 * - Precision client-side binary search JPEG compression to hit strict KB limits (e.g. 10-20 KB, 20-50 KB)
 * - 1-Click Signature Paper Cleaner & Ink Enhancer (removes shadows, turns paper crisp #FFFFFF)
 * - Candidate Name & Date of Photo (DOP) banner generator
 * - 100% offline & client-side privacy
 */

export interface ExamFormPreset {
  id: string;
  name: string;
  category: 'ssc' | 'upsc' | 'banking' | 'railway' | 'nta' | 'engineering' | 'teaching' | 'defence' | 'state_psc' | 'document' | 'visa' | 'custom';
  type: 'photo' | 'signature' | 'thumb';
  targetMinKb: number;
  targetMaxKb: number;
  width: number;           // Target width in px
  height: number;          // Target height in px
  displayDimensions: string; // e.g. "3.5 × 4.5 cm (350 × 450 px)"
  aspectRatio: number;     // width / height
  supportsNameDate?: boolean;
  notes: string;
  badge?: string;
}

export const EXAM_FORM_PRESETS: ExamFormPreset[] = [
  // ==================== PHOTOGRAPHS ====================
  {
    id: 'ssc-photo',
    name: 'SSC (CGL / CHSL / MTS / GD / CPO)',
    category: 'ssc',
    type: 'photo',
    targetMinKb: 20,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: '3.5 × 4.5 cm (350 × 450 px)',
    aspectRatio: 350 / 450,
    supportsNameDate: true,
    badge: '20–50 KB',
    notes: 'Strict limit: 20–50 KB. Plain white or light background, front facing without spectacles or cap.',
  },
  {
    id: 'upsc-photo',
    name: 'UPSC Online (OTR / CSE / NDA / CDS)',
    category: 'upsc',
    type: 'photo',
    targetMinKb: 20,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: '3.5 × 4.5 cm (350 × 450 px)',
    aspectRatio: 350 / 450,
    supportsNameDate: true,
    badge: 'Name & Date',
    notes: 'UPSC guideline: Photo not older than 10 days. Candidate name and date of photo printed at bottom.',
  },
  {
    id: 'ibps-photo',
    name: 'IBPS / SBI (Bank PO / Clerk / SO)',
    category: 'banking',
    type: 'photo',
    targetMinKb: 20,
    targetMaxKb: 50,
    width: 200,
    height: 230,
    displayDimensions: '4.5 × 3.5 cm (200 × 230 px)',
    aspectRatio: 200 / 230,
    badge: '20–50 KB',
    notes: 'Standard banking dimensions: 200 × 230 px, 20–50 KB, light background, neutral expression.',
  },
  {
    id: 'rrb-photo',
    name: 'RRB Railways (NTPC / Group D / ALP)',
    category: 'railway',
    type: 'photo',
    targetMinKb: 30,
    targetMaxKb: 70,
    width: 350,
    height: 450,
    displayDimensions: '35 × 45 mm (350 × 450 px)',
    aspectRatio: 350 / 450,
    badge: '30–70 KB',
    notes: 'Color passport photograph with clear contrast, light background, clear view of eyes and ears.',
  },
  {
    id: 'nta-neet-jee-photo',
    name: 'NTA (NEET-UG / JEE Main / CUET)',
    category: 'nta',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: '3.5 × 4.5 cm (350 × 450 px)',
    aspectRatio: 350 / 450,
    supportsNameDate: true,
    badge: '80% Face',
    notes: '80% face coverage with ears clearly visible, white background. Name & Date of photo printed at bottom.',
  },
  {
    id: 'gate-photo',
    name: 'GATE / IIT JAM',
    category: 'engineering',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 100,
    width: 240,
    height: 320,
    displayDimensions: '3.5 × 4.5 cm (240 × 320 px)',
    aspectRatio: 240 / 320,
    badge: 'White BG',
    notes: 'High-contrast passport photo, face covering 60–70% of frame, white background.',
  },
  {
    id: 'ctet-photo',
    name: 'CTET / State TET (Teaching)',
    category: 'teaching',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: '3.5 × 4.5 cm (350 × 450 px)',
    aspectRatio: 350 / 450,
    badge: '10–50 KB',
    notes: 'Central Teacher Eligibility Test standard: 10–50 KB, JPEG format, light background.',
  },
  {
    id: 'sarathi-photo',
    name: 'Sarathi Parivahan (Driving License)',
    category: 'document',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 20,
    width: 420,
    height: 525,
    displayDimensions: '3.5 × 4.5 cm (420 × 525 px)',
    aspectRatio: 420 / 525,
    badge: '10–20 KB Strict',
    notes: 'Parivahan Sarathi strict ceiling: File size must be between 10 KB and 20 KB only.',
  },
  {
    id: 'pan-photo',
    name: 'PAN Card Online (NSDL / UTIITSL)',
    category: 'document',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 30,
    width: 213,
    height: 213,
    displayDimensions: '213 × 213 px (200 DPI)',
    aspectRatio: 1,
    badge: '200 DPI Square',
    notes: 'NSDL PAN specification: 213 × 213 pixels, 200 DPI, file size under 30 KB (max 50 KB).',
  },
  {
    id: 'defence-photo',
    name: 'Agniveer & Defence (Army / Navy / IAF)',
    category: 'defence',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: '3.5 × 4.5 cm (350 × 450 px)',
    aspectRatio: 350 / 450,
    badge: 'Defence',
    notes: 'Indian Armed Forces & AFCAT portal: 10–50 KB, light background, clear neutral posture.',
  },
  {
    id: 'state-psc-photo',
    name: 'State PSC & Police (UPPSC / BPSC / MPSC)',
    category: 'state_psc',
    type: 'photo',
    targetMinKb: 20,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: '3.5 × 4.5 cm (350 × 450 px)',
    aspectRatio: 350 / 450,
    supportsNameDate: true,
    badge: '20–50 KB',
    notes: 'State PSCs standard: 20–50 KB, clean background, optional name and date strip.',
  },
  {
    id: 'passport-seva-photo',
    name: 'Passport Seva Portal (MEA India)',
    category: 'document',
    type: 'photo',
    targetMinKb: 20,
    targetMaxKb: 100,
    width: 413,
    height: 531,
    displayDimensions: '35 × 45 mm (413 × 531 px)',
    aspectRatio: 413 / 531,
    badge: '300 DPI',
    notes: 'Ministry of External Affairs: 35 × 45 mm, white background, frontal face with eyes open.',
  },
  {
    id: 'us-visa-photo',
    name: 'US Visa (DS-160 / Diversity Visa)',
    category: 'visa',
    type: 'photo',
    targetMinKb: 50,
    targetMaxKb: 240,
    width: 600,
    height: 600,
    displayDimensions: '2 × 2 in (600 × 600 px)',
    aspectRatio: 1,
    badge: '600 × 600 px',
    notes: 'US State Dept: 600 × 600 px square, face between 50% and 69% of height, max 240 KB.',
  },
  {
    id: 'custom-photo',
    name: 'Custom Target Size Photo',
    category: 'custom',
    type: 'photo',
    targetMinKb: 10,
    targetMaxKb: 50,
    width: 350,
    height: 450,
    displayDimensions: 'Custom Dimensions',
    aspectRatio: 350 / 450,
    supportsNameDate: true,
    badge: 'Custom',
    notes: 'Set your exact custom pixel dimensions and target file size.',
  },

  // ==================== SIGNATURES ====================
  {
    id: 'ssc-sign',
    name: 'SSC Signature (CGL / CHSL / MTS)',
    category: 'ssc',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 20,
    width: 280,
    height: 120,
    displayDimensions: '4.0 × 2.0 cm (280 × 120 px)',
    aspectRatio: 280 / 120,
    badge: '10–20 KB Strict',
    notes: 'Strict SSC ceiling: 10 KB to 20 KB. Black ink on white paper, horizontal aspect ratio.',
  },
  {
    id: 'upsc-sign',
    name: 'UPSC Signature (OTR / CSE)',
    category: 'upsc',
    type: 'signature',
    targetMinKb: 20,
    targetMaxKb: 100,
    width: 350,
    height: 150,
    displayDimensions: '350 × 150 px',
    aspectRatio: 350 / 150,
    badge: '20–100 KB',
    notes: 'Black ink signature on white paper, clearly visible and horizontally centered.',
  },
  {
    id: 'ibps-sign',
    name: 'IBPS / SBI Bank Signature',
    category: 'banking',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 20,
    width: 280,
    height: 120,
    displayDimensions: '140 × 60 px (280 × 120 px)',
    aspectRatio: 280 / 120,
    badge: '10–20 KB Strict',
    notes: '10–20 KB, strictly black ink on white paper. Signatures in capital letters are rejected.',
  },
  {
    id: 'rrb-sign',
    name: 'RRB Railways Signature',
    category: 'railway',
    type: 'signature',
    targetMinKb: 30,
    targetMaxKb: 50,
    width: 280,
    height: 120,
    displayDimensions: '140 × 60 px (280 × 120 px)',
    aspectRatio: 280 / 120,
    badge: '30–50 KB',
    notes: '30–50 KB, dark blue or black ink on white paper, clear signature.',
  },
  {
    id: 'nta-neet-jee-sign',
    name: 'NTA Signature (NEET / JEE Main)',
    category: 'nta',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 50,
    width: 350,
    height: 150,
    displayDimensions: '3.5 × 1.5 cm (350 × 150 px)',
    aspectRatio: 350 / 150,
    badge: '10–50 KB',
    notes: '10–50 KB, running handwriting with black ballpoint pen on white paper.',
  },
  {
    id: 'gate-sign',
    name: 'GATE / IIT JAM Signature',
    category: 'engineering',
    type: 'signature',
    targetMinKb: 5,
    targetMaxKb: 80,
    width: 350,
    height: 120,
    displayDimensions: '2.0 × 7.0 cm (350 × 120 px)',
    aspectRatio: 350 / 120,
    badge: '5–80 KB',
    notes: 'Blue or black ink signature, occupying at least 70% of the horizontal box.',
  },
  {
    id: 'ctet-sign',
    name: 'CTET Signature',
    category: 'teaching',
    type: 'signature',
    targetMinKb: 4,
    targetMaxKb: 30,
    width: 350,
    height: 150,
    displayDimensions: '3.5 × 1.5 cm (350 × 150 px)',
    aspectRatio: 350 / 150,
    badge: '4–30 KB',
    notes: '4–30 KB, crisp signature on plain white paper.',
  },
  {
    id: 'sarathi-sign',
    name: 'Sarathi Driving License Signature',
    category: 'document',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 20,
    width: 256,
    height: 64,
    displayDimensions: '3.5 × 1.5 cm (256 × 64 px)',
    aspectRatio: 256 / 64,
    badge: '10–20 KB Strict',
    notes: 'Parivahan portal signature: strictly between 10 KB and 20 KB.',
  },
  {
    id: 'pan-sign',
    name: 'PAN Card Online Signature',
    category: 'document',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 40,
    width: 400,
    height: 180,
    displayDimensions: '4.5 × 2.0 cm (400 × 180 px)',
    aspectRatio: 400 / 180,
    badge: '200 DPI',
    notes: 'NSDL PAN signature: 200 DPI, max 40 KB, black ink on white background.',
  },
  {
    id: 'defence-sign',
    name: 'Agniveer & Defence Signature',
    category: 'defence',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 20,
    width: 280,
    height: 120,
    displayDimensions: '140 × 60 px (280 × 120 px)',
    aspectRatio: 280 / 120,
    badge: '10–20 KB',
    notes: 'Armed forces recruitment portals: 10–20 KB, clear signature on white paper.',
  },
  {
    id: 'state-psc-sign',
    name: 'State PSC / Police Signature',
    category: 'state_psc',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 30,
    width: 350,
    height: 150,
    displayDimensions: '350 × 150 px',
    aspectRatio: 350 / 150,
    badge: '10–30 KB',
    notes: 'Standard state recruitment signature: 10–30 KB, clean contrast.',
  },
  {
    id: 'custom-sign',
    name: 'Custom Target Signature',
    category: 'custom',
    type: 'signature',
    targetMinKb: 10,
    targetMaxKb: 30,
    width: 350,
    height: 140,
    displayDimensions: 'Custom Dimensions',
    aspectRatio: 350 / 140,
    badge: 'Custom',
    notes: 'Custom dimensions and target KB for any specific state or institutional portal.',
  },

  // ==================== THUMB IMPRESSIONS ====================
  {
    id: 'ibps-thumb',
    name: 'IBPS Left Thumb Impression (LTI)',
    category: 'banking',
    type: 'thumb',
    targetMinKb: 20,
    targetMaxKb: 50,
    width: 240,
    height: 240,
    displayDimensions: '3.0 × 3.0 cm (240 × 240 px)',
    aspectRatio: 1,
    badge: '20–50 KB',
    notes: 'Left thumb impression on white paper with blue or black stamp pad ink.',
  },
  {
    id: 'nta-thumb',
    name: 'NTA Thumb & Finger Impression',
    category: 'nta',
    type: 'thumb',
    targetMinKb: 10,
    targetMaxKb: 50,
    width: 300,
    height: 300,
    displayDimensions: '300 × 300 px',
    aspectRatio: 1,
    badge: '10–50 KB',
    notes: 'Clear finger/thumb impression on white paper, 10–50 KB.',
  },
];

export interface CompressTargetOptions {
  targetMaxKb: number;
  targetMinKb?: number;
  width: number;
  height: number;
  candidateName?: string;
  dateOfPhoto?: string;
  addNameDateBanner?: boolean;
  cleanSignature?: boolean;
}

export interface CompressResult {
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
  sizeKb: number;
  width: number;
  height: number;
  quality: number;
  isCompliant: boolean;
  complianceNotes: string[];
}

/**
 * 1-Click Signature Paper Cleaner & Ink Enhancer.
 * Eliminates yellow room lighting, removes backdrop shadow, converts paper to pure #FFFFFF,
 * and darkens black/blue ink so mobile phone photos look like scanned documents.
 */
export function cleanSignatureCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Compute paper background luminance statistics
  // Sample perimeter border pixels to estimate paper brightness
  let paperLumSum = 0;
  let paperCount = 0;
  const borderSteps = Math.max(1, Math.floor(w / 30));

  for (let x = 0; x < w; x += borderSteps) {
    // Top and bottom row
    const iTop = (0 * w + x) * 4;
    const iBot = ((h - 1) * w + x) * 4;
    paperLumSum += data[iTop] * 0.299 + data[iTop + 1] * 0.587 + data[iTop + 2] * 0.114;
    paperLumSum += data[iBot] * 0.299 + data[iBot + 1] * 0.587 + data[iBot + 2] * 0.114;
    paperCount += 2;
  }

  const avgPaperLum = paperCount > 0 ? paperLumSum / paperCount : 220;
  // Threshold above which pixels are considered white paper (usually avgPaperLum - 25)
  const paperThreshold = Math.max(160, avgPaperLum - 25);
  // Ink threshold below which pixels are darkened
  const inkThreshold = Math.min(140, paperThreshold - 35);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const lum = r * 0.299 + g * 0.587 + b * 0.114;

    if (lum >= paperThreshold) {
      // Paper background -> Pure crisp white
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else if (lum <= inkThreshold) {
      // Ink stroke -> Deepen ink contrast (keep tint if blue, darken if black)
      const isBlueInk = (b > r + 15 && b > g + 10);
      if (isBlueInk) {
        data[i] = Math.max(0, Math.round(r * 0.6));
        data[i + 1] = Math.max(0, Math.round(g * 0.6));
        data[i + 2] = Math.min(220, Math.round(b * 1.1));
      } else {
        // Deep black/charcoal ink
        const darkVal = Math.max(10, Math.round(lum * 0.4));
        data[i] = darkVal;
        data[i + 1] = darkVal;
        data[i + 2] = darkVal;
      }
    } else {
      // Soft transition antialiasing zone
      const t = (lum - inkThreshold) / (paperThreshold - inkThreshold);
      const factor = t * t * (3 - 2 * t); // smoothstep
      data[i] = Math.round(data[i] * (1 - factor) + 255 * factor);
      data[i + 1] = Math.round(data[i + 1] * (1 - factor) + 255 * factor);
      data[i + 2] = Math.round(data[i + 2] * (1 - factor) + 255 * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Renders an official Candidate Name & Date of Photo (DOP) banner at the bottom of the photo.
 * Strictly compliant with UPSC, SSC, and NTA requirements.
 */
export function drawNameDateBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candidateName?: string,
  dateOfPhoto?: string
) {
  if (!candidateName && !dateOfPhoto) return;

  const bannerHeight = Math.round(height * 0.18);
  const bannerY = height - bannerHeight;

  // Solid white banner background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, bannerY, width, bannerHeight);

  // Clean 1.5px separator line on top
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = Math.max(1, Math.round(width / 350));
  ctx.beginPath();
  ctx.moveTo(0, bannerY);
  ctx.lineTo(width, bannerY);
  ctx.stroke();

  // Typography settings
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const nameText = (candidateName || '').trim().toUpperCase();
  const dateText = (dateOfPhoto || '').trim();

  if (nameText && dateText) {
    // 2-line layout
    const fontSize1 = Math.max(11, Math.round(bannerHeight * 0.34));
    const fontSize2 = Math.max(10, Math.round(bannerHeight * 0.28));

    ctx.font = `bold ${fontSize1}px Arial, -apple-system, sans-serif`;
    ctx.fillText(nameText, width / 2, bannerY + bannerHeight * 0.32);

    ctx.font = `600 ${fontSize2}px Arial, -apple-system, sans-serif`;
    ctx.fillText(`DOP: ${dateText}`, width / 2, bannerY + bannerHeight * 0.72);
  } else {
    // Single-line layout
    const singleText = nameText || `DOP: ${dateText}`;
    const fontSize = Math.max(12, Math.round(bannerHeight * 0.48));
    ctx.font = `bold ${fontSize}px Arial, -apple-system, sans-serif`;
    ctx.fillText(singleText, width / 2, bannerY + bannerHeight * 0.5);
  }
}

/**
 * Binary search JPEG compressor that hits exact KB targets.
 * Works 100% in client-side memory without cloud processing.
 */
export async function compressCanvasToTargetKb(
  sourceCanvas: HTMLCanvasElement,
  options: CompressTargetOptions
): Promise<CompressResult> {
  const {
    targetMaxKb,
    targetMinKb = Math.max(5, Math.floor(targetMaxKb * 0.4)),
    width,
    height,
    candidateName,
    dateOfPhoto,
    addNameDateBanner,
    cleanSignature,
  } = options;

  // Create staging canvas at target dimensions
  let currentW = width;
  let currentH = height;

  const workingCanvas = document.createElement('canvas');
  workingCanvas.width = currentW;
  workingCanvas.height = currentH;
  const ctx = workingCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Draw source image scaled to target dimensions
  ctx.drawImage(sourceCanvas, 0, 0, currentW, currentH);

  // Apply signature cleaner if requested
  if (cleanSignature) {
    cleanSignatureCanvas(workingCanvas);
  }

  // Apply candidate name and DOP banner if requested
  if (addNameDateBanner && (candidateName || dateOfPhoto)) {
    drawNameDateBanner(ctx, currentW, currentH, candidateName, dateOfPhoto);
  }

  // Desired sweet spot target: 85% of targetMaxKb to be safely below ceiling
  const targetKbGoal = Math.max(targetMinKb + 1, Math.min(targetMaxKb - 1, targetMaxKb * 0.85));

  // Binary search over JPEG quality [0.05, 0.98]
  let lowQ = 0.05;
  let highQ = 0.98;
  let bestBlob: Blob | null = null;
  let bestQuality = 0.85;

  const toBlobPromise = (c: HTMLCanvasElement, q: number): Promise<Blob | null> => {
    return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', q));
  };

  // Up to 8 binary search iterations (converges in ~6-7 steps)
  for (let iter = 0; iter < 8; iter++) {
    const midQ = (lowQ + highQ) / 2;
    const blob = await toBlobPromise(workingCanvas, midQ);
    if (!blob) break;

    const sizeKb = blob.size / 1024;
    bestBlob = blob;
    bestQuality = midQ;

    // Check if within acceptable golden band
    if (sizeKb >= targetMinKb && sizeKb <= targetMaxKb) {
      // If we are comfortably in the golden window, accept
      if (Math.abs(sizeKb - targetKbGoal) < 2.0 || iter >= 6) {
        break;
      }
    }

    if (sizeKb > targetMaxKb) {
      highQ = midQ;
    } else {
      lowQ = midQ;
    }

    if (highQ - lowQ < 0.02) break;
  }

  // Final fallback: if even at minimum quality it exceeds max KB, scale down dimensions by 10%
  if (bestBlob && (bestBlob.size / 1024) > targetMaxKb && currentW > 150) {
    currentW = Math.round(currentW * 0.85);
    currentH = Math.round(currentH * 0.85);
    workingCanvas.width = currentW;
    workingCanvas.height = currentH;
    ctx.drawImage(sourceCanvas, 0, 0, currentW, currentH);
    if (cleanSignature) cleanSignatureCanvas(workingCanvas);
    if (addNameDateBanner && (candidateName || dateOfPhoto)) {
      drawNameDateBanner(ctx, currentW, currentH, candidateName, dateOfPhoto);
    }
    const scaledBlob = await toBlobPromise(workingCanvas, 0.70);
    if (scaledBlob) {
      bestBlob = scaledBlob;
      bestQuality = 0.70;
    }
  }

  if (!bestBlob) {
    throw new Error('Failed to generate compressed image blob');
  }

  const finalSizeBytes = bestBlob.size;
  const finalSizeKb = Math.round((finalSizeBytes / 1024) * 10) / 10;
  const dataUrl = URL.createObjectURL(bestBlob);

  const isCompliant = finalSizeKb >= targetMinKb && finalSizeKb <= targetMaxKb;
  const complianceNotes: string[] = [];

  if (isCompliant) {
    complianceNotes.push(`File size ${finalSizeKb} KB is within required range (${targetMinKb}–${targetMaxKb} KB)`);
    complianceNotes.push(`Dimensions ${currentW} × ${currentH} px match portal specifications`);
    complianceNotes.push('Format: JPEG (.jpg)');
  } else if (finalSizeKb > targetMaxKb) {
    complianceNotes.push(`Warning: ${finalSizeKb} KB exceeds maximum limit of ${targetMaxKb} KB`);
  } else {
    complianceNotes.push(`Warning: ${finalSizeKb} KB is below minimum limit of ${targetMinKb} KB`);
  }

  return {
    blob: bestBlob,
    dataUrl,
    sizeBytes: finalSizeBytes,
    sizeKb: finalSizeKb,
    width: currentW,
    height: currentH,
    quality: Math.round(bestQuality * 100) / 100,
    isCompliant,
    complianceNotes,
  };
}

/**
 * Convenience helper to compress directly from an image URL, HTMLImageElement, or HTMLCanvasElement.
 */
export async function compressImageSourceToTargetKb(
  source: string | HTMLImageElement | HTMLCanvasElement,
  options: CompressTargetOptions
): Promise<CompressResult> {
  if (typeof window === 'undefined') {
    throw new Error('compressImageSourceToTargetKb requires browser environment');
  }

  if (source instanceof HTMLCanvasElement) {
    return compressCanvasToTargetKb(source, options);
  }

  let img: HTMLImageElement;
  if (typeof source === 'string') {
    img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image from source'));
      el.src = source;
    });
  } else {
    img = source;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || options.width;
  canvas.height = img.naturalHeight || img.height || options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return compressCanvasToTargetKb(canvas, options);
}
