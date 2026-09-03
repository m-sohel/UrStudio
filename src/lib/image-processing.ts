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
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
        objectUrl,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
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
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
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
 */
export function isSupportedImage(file: File): boolean {
  const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return supported.includes(file.type);
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
