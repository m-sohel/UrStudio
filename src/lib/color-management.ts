/**
 * Color Management System — RGB to CMYK / CMY Simulation & Calibration
 * 
 * Screens display in emissive additive sRGB (bright backlight, wide gamut).
 * Photo & ID card printers print in subtractive CMY/CMYK ink on reflective paper.
 * 
 * This module provides:
 * 1. Physical CMYK color conversions
 * 2. CMYK Soft-Proofing (simulates real paper print output on screen)
 * 3. Color Compensation & Print Calibration (counteracts dot gain, shadow crush, and skin-tone redness)
 * 4. Gamut warning detection (identifies colors that will shift when printed)
 */

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface CMYK {
  c: number; // 0 - 1
  m: number; // 0 - 1
  y: number; // 0 - 1
  k: number; // 0 - 1
}

export interface ColorCalibrationSettings {
  /** Enables simulated CMYK / paper print preview on screen */
  cmykSoftProof: boolean;
  /** Dot gain / paper shadow crush compensation (1.0 = normal, 1.1 - 1.2 = recommended for photo paper) */
  printGamma: number;
  /** Cyan/Red color balance (-50 to +50) */
  cyanRedBalance: number;
  /** Magenta/Green color balance (-50 to +50) — essential for skin tone calibration */
  magentaGreenBalance: number;
  /** Yellow/Blue color balance (-50 to +50) */
  yellowBlueBalance: number;
  /** Paper white simulation ('bright-white' | 'warm-white' | 'matte') */
  paperType: 'glossy' | 'matte' | 'plain';
  /** Highlight out-of-gamut colors */
  gamutWarning: boolean;
}

export const DEFAULT_COLOR_CALIBRATION: ColorCalibrationSettings = {
  cmykSoftProof: false,
  printGamma: 1.08,
  cyanRedBalance: 0,
  magentaGreenBalance: 0,
  yellowBlueBalance: 0,
  paperType: 'glossy',
  gamutWarning: false,
};

/** Convert sRGB (0-255) to CMYK (0-1) */
export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const rN = Math.max(0, Math.min(255, r)) / 255;
  const gN = Math.max(0, Math.min(255, g)) / 255;
  const bN = Math.max(0, Math.min(255, b)) / 255;

  const k = 1 - Math.max(rN, gN, bN);
  if (k >= 0.999) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }

  const c = (1 - rN - k) / (1 - k);
  const m = (1 - gN - k) / (1 - k);
  const y = (1 - bN - k) / (1 - k);

  return {
    c: Math.max(0, Math.min(1, c)),
    m: Math.max(0, Math.min(1, m)),
    y: Math.max(0, Math.min(1, y)),
    k: Math.max(0, Math.min(1, k)),
  };
}

/** Convert CMYK (0-1) back to standard sRGB (0-255) */
export function cmykToRgb(c: number, m: number, y: number, k: number): RGB {
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return {
    r: Math.round(Math.max(0, Math.min(255, r))),
    g: Math.round(Math.max(0, Math.min(255, g))),
    b: Math.round(Math.max(0, Math.min(255, b))),
  };
}

/**
 * Simulates how an sRGB pixel will look when printed using real CMYK inks on reflective paper.
 * Accounts for subtractive color mixing, physical ink gamut compression, and paper absorption.
 */
export function simulateCmykProof(r: number, g: number, b: number, paperType: 'glossy' | 'matte' | 'plain' = 'glossy'): RGB {
  // Convert to CMYK
  const { c, m, y, k } = rgbToCmyk(r, g, b);

  // Inks are non-ideal dyes:
  // Cyan absorbs a small amount of green and blue
  // Magenta absorbs some blue and green
  // Yellow is relatively pure
  let cMod = c;
  let mMod = m;
  let yMod = y;
  let kMod = k;

  // Paper reflectivity factor
  const paperDmax = paperType === 'plain' ? 0.88 : paperType === 'matte' ? 0.92 : 0.96;

  // Subtractive ink simulation:
  // Pure digital blues and greens exceed physical ink gamut
  // Real Cyan has slight redness/greyness
  const realC = cMod * 0.95 + mMod * 0.04;
  const realM = mMod * 0.93 + yMod * 0.05 + cMod * 0.02;
  const realY = yMod * 0.98 + mMod * 0.02;

  // Convert back to RGB with paper reflection damping
  let simR = 255 * (1 - Math.min(1, realC)) * (1 - kMod) * paperDmax;
  let simG = 255 * (1 - Math.min(1, realM)) * (1 - kMod) * paperDmax;
  let simB = 255 * (1 - Math.min(1, realY)) * (1 - kMod) * paperDmax;

  // Dot gain in shadows (ink spreads on paper fibers making midtones & shadows darker)
  const dotGainFactor = paperType === 'plain' ? 1.15 : 1.08;
  simR = 255 * Math.pow(simR / 255, dotGainFactor);
  simG = 255 * Math.pow(simG / 255, dotGainFactor);
  simB = 255 * Math.pow(simB / 255, dotGainFactor);

  return {
    r: Math.round(Math.max(0, Math.min(255, simR))),
    g: Math.round(Math.max(0, Math.min(255, simG))),
    b: Math.round(Math.max(0, Math.min(255, simB))),
  };
}

/**
 * Checks if an RGB color is out of typical CMYK printer gamut
 * (i.e. cannot be physically reproduced by Cyan, Magenta, Yellow inks).
 */
export function isOutOfGamut(r: number, g: number, b: number): boolean {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;

  // Extremely saturated cyans, greens, and magentas exceed CMYK gamut
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (saturation > 0.88 && (gN > 0.85 || bN > 0.85 || rN > 0.85)) {
    return true;
  }
  return false;
}

/**
 * Applies Print Calibration (tone curve lift and color balance) to an image canvas.
 * This ensures physical paper prints match the expected appearance and don't come out too dark.
 */
export function applyPrintColorCalibration(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ColorCalibrationSettings
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const {
    cmykSoftProof,
    printGamma,
    cyanRedBalance,
    magentaGreenBalance,
    yellowBlueBalance,
    paperType,
    gamutWarning,
  } = settings;

  // Pre-calculate balance factors (-50 to +50 -> 0.8 to 1.2)
  const rFactor = 1 + cyanRedBalance / 100;
  const gFactor = 1 - magentaGreenBalance / 100;
  const bFactor = 1 + yellowBlueBalance / 100;

  // Gamma lookup table (0-255)
  // Gamma > 1 lifts midtones/shadows so paper prints are vibrant and clear
  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const normalized = i / 255;
    // Invert gamma to lift shadows: output = input^(1/gamma)
    const corrected = Math.pow(normalized, 1 / printGamma);
    gammaLUT[i] = Math.round(Math.max(0, Math.min(255, corrected * 255)));
  }

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Highlight Out-of-Gamut if requested
    if (gamutWarning && isOutOfGamut(r, g, b)) {
      // Highlight in bright warning color
      data[i] = 120;
      data[i + 1] = 120;
      data[i + 2] = 120;
      continue;
    }

    // 2. Apply Tone Curve (Gamma / Shadow Lift)
    if (printGamma !== 1.0) {
      r = gammaLUT[r];
      g = gammaLUT[g];
      b = gammaLUT[b];
    }

    // 3. Color Balance Adjustments (Cyan-Red, Magenta-Green, Yellow-Blue)
    if (cyanRedBalance !== 0 || magentaGreenBalance !== 0 || yellowBlueBalance !== 0) {
      r = Math.round(Math.max(0, Math.min(255, r * rFactor)));
      g = Math.round(Math.max(0, Math.min(255, g * gFactor)));
      b = Math.round(Math.max(0, Math.min(255, b * bFactor)));
    }

    // 4. CMYK Soft-Proof Simulation (if enabled, shows real ink-on-paper look)
    if (cmykSoftProof) {
      const proof = simulateCmykProof(r, g, b, paperType);
      r = proof.r;
      g = proof.g;
      b = proof.b;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}
