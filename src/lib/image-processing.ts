/**
 * Client-side Image Processing
 * 
 * All image manipulation happens in the browser using Canvas API.
 * No server-side processing required.
 */

export interface ImageInfo {
  id: string;
  file: File;
  name: string;
  width: number;
  height: number;
  size: number;
  type: string;
  objectUrl: string;
  thumbnailUrl?: string;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

export interface AdjustmentSettings {
  brightness: number;   // -100 to 100, default 0
  contrast: number;     // -100 to 100, default 0
  saturation: number;   // -100 to 100, default 0
  grayscale: boolean;   // default false
}

export const DEFAULT_ADJUSTMENTS: AdjustmentSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  grayscale: false,
};

/**
 * Load an image file and return its metadata.
 */
export async function loadImage(file: File): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      resolve({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        width: img.naturalWidth || img.width || 1000,
        height: img.naturalHeight || img.height || 1000,
        size: file.size,
        type: file.type || 'image/jpeg',
        objectUrl,
      });
    };

    img.onerror = () => {
      // Fallback: try FileReader readAsDataURL if createObjectURL had an issue
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = () => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              file,
              name: file.name,
              width: fallbackImg.naturalWidth || fallbackImg.width || 1000,
              height: fallbackImg.naturalHeight || fallbackImg.height || 1000,
              size: file.size,
              type: file.type || 'image/jpeg',
              objectUrl: reader.result as string,
            });
          };
          fallbackImg.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to load image: ${file.name}. Format may be corrupted or unsupported.`));
          };
          fallbackImg.src = reader.result as string;
        };
        reader.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`Failed to read file: ${file.name}`));
        };
        reader.readAsDataURL(file);
      } else {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load image: ${file.name}`));
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Generate a thumbnail for display in the UI.
 */
export function generateThumbnail(
  img: HTMLImageElement,
  maxSize: number = 200
): string {
  const width = img.naturalWidth || img.width || 200;
  const height = img.naturalHeight || img.height || 200;
  const scale = Math.min(maxSize / width, maxSize / height) || 1;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  try {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return img.src;
  }
}

/**
 * Apply crop data to an image and return a new canvas at the specified output dimensions.
 * 
 * @param img Source image element
 * @param crop Crop coordinates (in source image pixels)
 * @param outputWidth Output width in pixels
 * @param outputHeight Output height in pixels
 * @param adjustments Optional image adjustments
 */
export function applyCrop(
  img: HTMLImageElement,
  crop: CropData,
  outputWidth: number,
  outputHeight: number,
  adjustments?: AdjustmentSettings
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Apply adjustments via CSS filter on canvas context
  if (adjustments) {
    const filters: string[] = [];
    if (adjustments.brightness !== 0) {
      filters.push(`brightness(${1 + adjustments.brightness / 100})`);
    }
    if (adjustments.contrast !== 0) {
      filters.push(`contrast(${1 + adjustments.contrast / 100})`);
    }
    if (adjustments.saturation !== 0) {
      filters.push(`saturate(${1 + adjustments.saturation / 100})`);
    }
    if (adjustments.grayscale) {
      filters.push('grayscale(1)');
    }
    if (filters.length > 0) {
      ctx.filter = filters.join(' ');
    }
  }

  // Draw the cropped region scaled to output size
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return canvas;
}

/**
 * Rotate an image canvas by the given degrees (90, 180, 270).
 */
export function rotateCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  degrees: 90 | 180 | 270
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const sw = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
  const sh = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;

  if (degrees === 90 || degrees === 270) {
    canvas.width = sh;
    canvas.height = sw;
  } else {
    canvas.width = sw;
    canvas.height = sh;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -sw / 2, -sh / 2);

  return canvas;
}

/**
 * Flip an image horizontally or vertically.
 */
export function flipCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  direction: 'horizontal' | 'vertical'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const sw = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
  const sh = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;

  canvas.width = sw;
  canvas.height = sh;

  if (direction === 'horizontal') {
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, sh);
    ctx.scale(1, -1);
  }

  ctx.drawImage(source, 0, 0);
  return canvas;
}

/**
 * Convert a canvas to a Blob for download or further processing.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/jpeg',
  quality: number = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      type,
      quality
    );
  });
}

/**
 * Convert canvas to data URL.
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  type: string = 'image/jpeg',
  quality: number = 0.95
): string {
  return canvas.toDataURL(type, quality);
}

/**
 * Load an image element from a URL (object URL or data URL).
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from: ${src.slice(0, 50)}...`));
    img.src = src;
  });
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a file is a supported image type.
 * Robust against Windows empty MIME types and supports all standard photo formats.
 */
export function isSupportedImage(file: File): boolean {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  const supportedExtensions = [
    '.jpg', '.jpeg', '.png', '.webp', '.jfif', '.pjpeg', '.pjp',
    '.bmp', '.tif', '.tiff', '.avif', '.gif', '.svg'
  ];
  return supportedExtensions.some(ext => name.endsWith(ext));
}

/**
 * Center crop coordinates for a given aspect ratio.
 */
export function centerCropForAspectRatio(
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: number
): CropData {
  const imageAspect = imageWidth / imageHeight;
  let cropWidth: number;
  let cropHeight: number;

  if (imageAspect > targetAspectRatio) {
    // Image is wider than target — crop horizontally
    cropHeight = imageHeight;
    cropWidth = imageHeight * targetAspectRatio;
  } else {
    // Image is taller than target — crop vertically
    cropWidth = imageWidth;
    cropHeight = imageWidth / targetAspectRatio;
  }

  return {
    x: (imageWidth - cropWidth) / 2,
    y: (imageHeight - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

// ============================================================
// One-Click Studio Photo Auto-Enhance
// ============================================================

export interface AutoEnhanceOptions {
  intensity?: number;     // 0.0 to 1.0 (default 1.0)
  unsharpMask?: boolean;  // crisp edge sharpening
  warmth?: number;        // subtle skin tone warmth boost
}

/**
 * Apply client-side studio auto-enhancement to an image canvas.
 * - Dynamic histogram percentile stretch (recovers dull contrast)
 * - Intelligent indoor white-balance neutralization
 * - Studio skin warmth tone optimization
 * - 3x3 unsharp mask edge enhancement
 */
export function autoEnhanceCanvas(
  sourceCanvas: HTMLCanvasElement,
  options: AutoEnhanceOptions = {}
): HTMLCanvasElement {
  const { intensity = 1.0, unsharpMask = true } = options;
  if (intensity <= 0) return sourceCanvas;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  // 1. Compute histogram of luminance to find 1st and 99th percentiles
  const hist = new Uint32Array(256);
  let sumR = 0, sumG = 0, sumB = 0, midCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    hist[lum]++;

    // Midtones for white balance estimation
    if (lum > 35 && lum < 220) {
      sumR += r;
      sumG += g;
      sumB += b;
      midCount++;
    }
  }

  // Find 1st percentile (shadow black point) and 99th percentile (highlight white point)
  const p1Target = Math.floor(totalPixels * 0.01);
  const p99Target = Math.floor(totalPixels * 0.99);

  let cum = 0;
  let p1 = 0;
  let p99 = 255;

  for (let l = 0; l < 256; l++) {
    cum += hist[l];
    if (cum >= p1Target && p1 === 0) {
      p1 = l;
    }
    if (cum >= p99Target) {
      p99 = l;
      break;
    }
  }

  if (p99 <= p1) {
    p1 = 0;
    p99 = 255;
  }

  const range = p99 - p1;
  const gain = 255 / range;

  // 2. White Balance Correction: Neutralize indoor tungsten/yellow cast
  let rGain = 1.0, bGain = 1.0;
  if (midCount > 0) {
    const avgR = sumR / midCount;
    const avgG = sumG / midCount;
    const avgB = sumB / midCount;
    const targetMid = (avgR + avgG + avgB) / 3;

    // Gentle WB factor capped to avoid excessive cooling of skin
    rGain = 1.0 + Math.max(-0.15, Math.min(0.15, (targetMid / (avgR || 1) - 1) * 0.5));
    bGain = 1.0 + Math.max(-0.15, Math.min(0.15, (targetMid / (avgB || 1) - 1) * 0.5));
  }

  // 3. Apply levels stretch + subtle WB + skin warmth
  for (let i = 0; i < data.length; i += 4) {
    const origR = data[i];
    const origG = data[i + 1];
    const origB = data[i + 2];

    // Levels stretch
    let r = Math.max(0, Math.min(255, (origR - p1) * gain));
    let g = Math.max(0, Math.min(255, (origG - p1) * gain));
    let b = Math.max(0, Math.min(255, (origB - p1) * gain));

    // White balance correction
    r = Math.max(0, Math.min(255, r * rGain));
    b = Math.max(0, Math.min(255, b * bGain));

    // Studio skin warmth: subtle warmth in midtones (healthy complexion)
    if (r > b + 15 && g > b) {
      r = Math.min(255, r * 1.02);
      b = Math.max(0, b * 0.98);
    }

    // Blend with original by intensity
    data[i] = Math.round(origR + (r - origR) * intensity);
    data[i + 1] = Math.round(origG + (g - origG) * intensity);
    data[i + 2] = Math.round(origB + (b - origB) * intensity);
  }

  // 4. Unsharp Mask: 3x3 convolution for studio clarity
  if (unsharpMask && intensity > 0.3) {
    const copy = new Uint8ClampedArray(data);
    const sharpenFactor = 0.35 * intensity;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const top = copy[((y - 1) * width + x) * 4 + c];
          const bottom = copy[((y + 1) * width + x) * 4 + c];
          const left = copy[(y * width + (x - 1)) * 4 + c];
          const right = copy[(y * width + (x + 1)) * 4 + c];

          const edge = center * 4 - top - bottom - left - right;
          const sharpened = center + edge * sharpenFactor;
          data[idx + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

// ============================================================
// Auto-Face Centering & Biometric Alignment (Smart Crop)
// ============================================================

export interface DetectedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect face bounding box using browser native FaceDetector API,
 * with skin-tone chrominance cluster fallback if unavailable.
 */
export async function detectFaceBoundingBox(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<DetectedFaceBox | null> {
  // Check for native Chromium FaceDetector API
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(source);
      if (faces && faces.length > 0) {
        const b = faces[0].boundingBox;
        return {
          x: Math.round(b.x),
          y: Math.round(b.y),
          width: Math.round(b.width),
          height: Math.round(b.height),
        };
      }
    } catch {
      // Fallback if permission/feature restricted
    }
  }

  // Offline Fallback Heuristic: Skin-tone chrominance centroid
  try {
    const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const sh = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (sw === 0 || sh === 0) return null;

    const scale = Math.min(1, 240 / Math.max(sw, sh));
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);

    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(source, 0, 0, dw, dh);
    const imgData = ctx.getImageData(0, 0, dw, dh);
    const data = imgData.data;

    let minX = dw, maxX = 0, minY = dh, maxY = 0;
    let skinPixelCount = 0;

    // Examine upper 75% of image for face/head
    const maxYSearch = Math.floor(dh * 0.75);

    for (let y = 0; y < maxYSearch; y++) {
      for (let x = 0; x < dw; x++) {
        const idx = (y * dw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // RGB to YCbCr conversion
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Human skin tone cluster
        if (Y > 50 && Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173) {
          skinPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (skinPixelCount > (dw * dh * 0.02)) {
      const origScale = 1 / scale;
      const detectedW = (maxX - minX) * origScale;
      const detectedH = (maxY - minY) * origScale;
      return {
        x: Math.round(minX * origScale),
        y: Math.round(minY * origScale),
        width: Math.round(detectedW),
        height: Math.round(detectedH),
      };
    }
  } catch {
    // Return null if fallback fails
  }

  return null;
}

/**
 * Calculate biometric crop coordinates from detected face box.
 * Standardizes headroom (top margin) and biometric coverage height:
 * - 70–80% for India, EU Schengen, UK Passport (target 75%)
 * - 50–69% for US Passport (target 60%)
 */
export function calculateBiometricCropBox(
  imageWidth: number,
  imageHeight: number,
  faceBox: DetectedFaceBox,
  targetAspectRatio: number,
  targetCoveragePercent: number = 0.75
): CropData {
  // Estimated head height (chin to top of hair)
  // Face detector typically detects forehead to chin, hair adds ~15% on top
  const estimatedHeadHeight = faceBox.height * 1.15;
  const faceCenterX = faceBox.x + faceBox.width / 2;

  // Target crop height based on required coverage percentage
  let cropHeight = estimatedHeadHeight / targetCoveragePercent;
  let cropWidth = cropHeight * targetAspectRatio;

  // Ensure crop box fits inside image dimensions
  if (cropWidth > imageWidth) {
    cropWidth = imageWidth;
    cropHeight = cropWidth / targetAspectRatio;
  }
  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * targetAspectRatio;
  }

  // Center horizontally over face
  let cropX = faceCenterX - cropWidth / 2;

  // Position vertically: headroom (distance above top of hair to top border) should be ~10% of photo
  const estimatedCrownY = faceBox.y - (faceBox.height * 0.15);
  const desiredHeadroom = cropHeight * 0.10;
  let cropY = estimatedCrownY - desiredHeadroom;

  // Clamp within image bounds
  cropX = Math.max(0, Math.min(imageWidth - cropWidth, cropX));
  cropY = Math.max(0, Math.min(imageHeight - cropHeight, cropY));

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

// ============================================================
// Client-Side Background Removal & Studio Color Replacement
// ============================================================

export interface BackgroundReplaceOptions {
  replacementColor: string; // Hex color e.g. '#FFFFFF', '#2563EB', '#F3F4F6' or 'transparent'
  tolerance?: number;        // 10 to 80 (default 30)
  feather?: number;          // 0 to 10 pixels (default 3)
  sampleX?: number;          // Optional custom pick coordinate
  sampleY?: number;
  protectForeground?: boolean; // Protect subject/skin using flood fill and skin tone lock
  faceBox?: DetectedFaceBox | null; // Optional detected face box for subject protection
}

/**
 * Replace background color directly on client-side canvas with zero cloud uploads.
 * Uses YCbCr skin tone protection, face bounding barrier, Sobel edge protection,
 * and edge-connected region growing so foreground (face, skin, clothing) is NEVER ruined.
 */
export function replaceImageBackground(
  sourceCanvas: HTMLCanvasElement,
  options: BackgroundReplaceOptions
): HTMLCanvasElement {
  const {
    replacementColor = '#FFFFFF',
    tolerance = 30,
    feather = 3,
    sampleX,
    sampleY,
    protectForeground = true,
    faceBox = null,
  } = options;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Parse replacement color
  const isTransparent = replacementColor === 'transparent';
  let repR = 255, repG = 255, repB = 255;
  if (!isTransparent && replacementColor.startsWith('#')) {
    const hex = replacementColor.slice(1);
    if (hex.length === 6) {
      repR = parseInt(hex.substring(0, 2), 16) || 255;
      repG = parseInt(hex.substring(2, 4), 16) || 255;
      repB = parseInt(hex.substring(4, 6), 16) || 255;
    } else if (hex.length === 3) {
      repR = parseInt(hex[0] + hex[0], 16) || 255;
      repG = parseInt(hex[1] + hex[1], 16) || 255;
      repB = parseInt(hex[2] + hex[2], 16) || 255;
    }
  }

  // 1. Build Protected Foreground Mask (Skin & Face Barrier)
  // Ensures skin highlights, cheeks, forehead, neck, and clothing are NEVER painted
  const isProtectedForeground = new Uint8Array(width * height);

  if (protectForeground) {
    for (let p = 0; p < width * height; p++) {
      const idx = p * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Convert to YCbCr color space
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Human skin chrominance cluster across all skin tones
      const isSkin = Y >= 30 && Cb >= 75 && Cb <= 135 && Cr >= 130 && Cr <= 180;
      if (isSkin) {
        isProtectedForeground[p] = 1;
      }
    }

    // If face box is available, protect the entire head & neck ellipse
    if (faceBox) {
      const centerX = faceBox.x + faceBox.width / 2;
      const centerY = faceBox.y + faceBox.height / 2;
      const rx = faceBox.width * 0.65;
      const ry = faceBox.height * 0.75;

      const minY = Math.max(0, Math.floor(faceBox.y - faceBox.height * 0.1));
      const maxY = Math.min(height, Math.ceil(faceBox.y + faceBox.height * 1.25));
      const minX = Math.max(0, Math.floor(faceBox.x - faceBox.width * 0.15));
      const maxX = Math.min(width, Math.ceil(faceBox.x + faceBox.width * 1.15));

      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          const dx = (x - centerX) / rx;
          const dy = (y - centerY) / ry;
          if (dx * dx + dy * dy <= 1.0) {
            isProtectedForeground[y * width + x] = 1;
          }
        }
      }

      // Torso & Neck protection column below face
      const neckTop = Math.floor(faceBox.y + faceBox.height * 0.7);
      const neckBottom = Math.min(height, Math.floor(faceBox.y + faceBox.height * 2.0));
      const torsoLeft = Math.max(0, Math.floor(centerX - faceBox.width * 0.7));
      const torsoRight = Math.min(width - 1, Math.ceil(centerX + faceBox.width * 0.7));

      for (let y = neckTop; y < neckBottom; y++) {
        for (let x = torsoLeft; x <= torsoRight; x++) {
          isProtectedForeground[y * width + x] = 1;
        }
      }
    }
  }

  // 2. Identify Reference Background Color via Adaptive Multi-Region Sampling
  let refR = 240, refG = 240, refB = 240;

  if (sampleX !== undefined && sampleY !== undefined && sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
    const idx = (sampleY * width + sampleX) * 4;
    refR = data[idx];
    refG = data[idx + 1];
    refB = data[idx + 2];
  } else {
    // Sample outer perimeter (top corners and edges, strictly excluding protected skin)
    const samples: [number, number, number][] = [];

    // Sample top corners (10% x 10%)
    const sampleBoxW = Math.max(2, Math.floor(width * 0.12));
    const sampleBoxH = Math.max(2, Math.floor(height * 0.10));

    // Top-left corner
    for (let y = 0; y < sampleBoxH; y++) {
      for (let x = 0; x < sampleBoxW; x++) {
        const p = y * width + x;
        if (isProtectedForeground[p] === 0) {
          const idx = p * 4;
          samples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
    }
    // Top-right corner
    for (let y = 0; y < sampleBoxH; y++) {
      for (let x = width - sampleBoxW; x < width; x++) {
        const p = y * width + x;
        if (isProtectedForeground[p] === 0) {
          const idx = p * 4;
          samples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
    }

    if (samples.length > 0) {
      // Calculate median background color
      samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
      const mid = Math.floor(samples.length / 2);
      refR = samples[mid][0];
      refG = samples[mid][1];
      refB = samples[mid][2];
    }
  }

  // Helper: perceptual color distance
  const colorDist = (r: number, g: number, b: number): number => {
    const dr = r - refR;
    const dg = g - refG;
    const db = b - refB;
    return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
  };

  // 3. Compute Luminance Edge Barrier (Sobel gradient) to halt flood fill at subject boundaries
  const edgeBarrier = new Uint8Array(width * height);
  const step = 1;
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      // Luminance of neighbors
      const lum = (px: number, py: number) => {
        const i = (py * width + px) * 4;
        return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      };

      const gx = -lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1)
                 + lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1);
      const gy = -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1)
                 + lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1);

      const grad = Math.abs(gx) + Math.abs(gy);
      if (grad > 75) {
        edgeBarrier[y * width + x] = 1;
      }
    }
  }

  // 4. Edge-Connected Region Growing (BFS Flood Fill)
  // Background in a portrait MUST be connected to outer borders.
  // Isolated islands inside the body/face can NEVER be marked as background.
  const bgMask = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed top edge
  for (let x = 0; x < width; x++) {
    if (isProtectedForeground[x] === 0 && colorDist(data[x * 4], data[x * 4 + 1], data[x * 4 + 2]) <= tolerance * 1.25) {
      bgMask[x] = 1;
      queue.push(x);
    }
  }
  // Seed left and right edges (top 70% of image height)
  const maxSideY = Math.floor(height * 0.75);
  for (let y = 1; y < maxSideY; y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);

    if (isProtectedForeground[leftIdx] === 0 && colorDist(data[leftIdx * 4], data[leftIdx * 4 + 1], data[leftIdx * 4 + 2]) <= tolerance * 1.25) {
      bgMask[leftIdx] = 1;
      queue.push(leftIdx);
    }
    if (isProtectedForeground[rightIdx] === 0 && colorDist(data[rightIdx * 4], data[rightIdx * 4 + 1], data[rightIdx * 4 + 2]) <= tolerance * 1.25) {
      bgMask[rightIdx] = 1;
      queue.push(rightIdx);
    }
  }

  // BFS propagation
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1,
    ];

    for (const n of neighbors) {
      if (n !== -1 && bgMask[n] === 0 && isProtectedForeground[n] === 0) {
        const nDataIdx = n * 4;
        const dist = colorDist(data[nDataIdx], data[nDataIdx + 1], data[nDataIdx + 2]);

        // Stop if distance exceeds tolerance or if hitting a strong silhouette boundary
        if (dist <= tolerance) {
          if (edgeBarrier[n] === 1 && dist > tolerance * 0.5) {
            // Edge barrier halts leakage into subject contour
            continue;
          }
          bgMask[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // 5. Replace background with smooth edge feathering
  const lowerThresh = tolerance * 0.65;

  for (let p = 0; p < width * height; p++) {
    if (bgMask[p] === 1 && isProtectedForeground[p] === 0) {
      const idx = p * 4;
      const dist = colorDist(data[idx], data[idx + 1], data[idx + 2]);

      let alpha = 1.0;
      if (dist > lowerThresh && feather > 0) {
        // Soft Hermite feathering
        const t = Math.min(1, Math.max(0, (dist - lowerThresh) / (tolerance - lowerThresh + 1e-5)));
        alpha = 1.0 - (t * t * (3 - 2 * t));
      }

      if (isTransparent) {
        data[idx + 3] = Math.round(data[idx + 3] * (1 - alpha));
      } else {
        data[idx] = Math.round(data[idx] * (1 - alpha) + repR * alpha);
        data[idx + 1] = Math.round(data[idx + 1] * (1 - alpha) + repG * alpha);
        data[idx + 2] = Math.round(data[idx + 2] * (1 - alpha) + repB * alpha);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}
