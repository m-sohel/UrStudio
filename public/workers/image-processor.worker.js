/**
 * Web Worker — Image Processor & Color Calibration Engine
 * 
 * Performs 300 DPI high-resolution pixel adjustments, gamma correction,
 * and 3D LUT CMYK soft-proofing in the background without freezing the UI.
 * Uses Transferable ArrayBuffers for 0ms zero-copy memory transfer.
 */

// 3D LUT cache per paper type: 33 x 33 x 33 entries
const LUT_SIZE = 33;
const lutCache = new Map();

function rgbToCmyk(r, g, b) {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const k = 1 - Math.max(rN, gN, bN);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 1 };
  return {
    c: Math.max(0, Math.min(1, (1 - rN - k) / (1 - k))),
    m: Math.max(0, Math.min(1, (1 - gN - k) / (1 - k))),
    y: Math.max(0, Math.min(1, (1 - bN - k) / (1 - k))),
    k: Math.max(0, Math.min(1, k)),
  };
}

function computeCmykProof(r, g, b, paperType) {
  const { c, m, y, k } = rgbToCmyk(r, g, b);
  const paperDmax = paperType === 'plain' ? 0.88 : paperType === 'matte' ? 0.92 : 0.96;
  const realC = c * 0.95 + m * 0.04;
  const realM = m * 0.93 + y * 0.05 + c * 0.02;
  const realY = y * 0.98 + m * 0.02;

  let simR = 255 * (1 - Math.min(1, realC)) * (1 - k) * paperDmax;
  let simG = 255 * (1 - Math.min(1, realM)) * (1 - k) * paperDmax;
  let simB = 255 * (1 - Math.min(1, realY)) * (1 - k) * paperDmax;

  const dotGain = paperType === 'plain' ? 1.15 : 1.08;
  simR = 255 * Math.pow(Math.max(0, simR) / 255, dotGain);
  simG = 255 * Math.pow(Math.max(0, simG) / 255, dotGain);
  simB = 255 * Math.pow(Math.max(0, simB) / 255, dotGain);

  return [
    Math.round(Math.max(0, Math.min(255, simR))),
    Math.round(Math.max(0, Math.min(255, simG))),
    Math.round(Math.max(0, Math.min(255, simB))),
  ];
}

function getOrBuildLut(paperType) {
  if (lutCache.has(paperType)) {
    return lutCache.get(paperType);
  }

  // Float array: 33 * 33 * 33 * 3 bytes
  const lut = new Uint8Array(LUT_SIZE * LUT_SIZE * LUT_SIZE * 3);
  const step = 255 / (LUT_SIZE - 1);

  let idx = 0;
  for (let r = 0; r < LUT_SIZE; r++) {
    const rVal = Math.round(r * step);
    for (let g = 0; g < LUT_SIZE; g++) {
      const gVal = Math.round(g * step);
      for (let b = 0; b < LUT_SIZE; b++) {
        const bVal = Math.round(b * step);
        const [oR, oG, oB] = computeCmykProof(rVal, gVal, bVal, paperType);
        lut[idx++] = oR;
        lut[idx++] = oG;
        lut[idx++] = oB;
      }
    }
  }

  lutCache.set(paperType, lut);
  return lut;
}

function isOutOfGamut(r, g, b) {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat > 0.88 && (gN > 0.85 || bN > 0.85 || rN > 0.85);
}

self.onmessage = function (e) {
  const { id, buffer, width, height, settings } = e.data;
  const data = new Uint8ClampedArray(buffer);

  const {
    cmykSoftProof,
    printGamma,
    cyanRedBalance,
    magentaGreenBalance,
    yellowBlueBalance,
    paperType,
    gamutWarning,
  } = settings;

  const rFactor = 1 + cyanRedBalance / 100;
  const gFactor = 1 - magentaGreenBalance / 100;
  const bFactor = 1 + yellowBlueBalance / 100;

  // Pre-calculate Gamma LUT
  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const normalized = i / 255;
    const corrected = Math.pow(normalized, 1 / printGamma);
    gammaLUT[i] = Math.round(Math.max(0, Math.min(255, corrected * 255)));
  }

  const lut = cmykSoftProof ? getOrBuildLut(paperType || 'glossy') : null;
  const lutStep = 255 / (LUT_SIZE - 1);

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (gamutWarning && isOutOfGamut(r, g, b)) {
      data[i] = 120;
      data[i + 1] = 120;
      data[i + 2] = 120;
      continue;
    }

    if (printGamma !== 1.0) {
      r = gammaLUT[r];
      g = gammaLUT[g];
      b = gammaLUT[b];
    }

    if (cyanRedBalance !== 0 || magentaGreenBalance !== 0 || yellowBlueBalance !== 0) {
      r = Math.round(Math.max(0, Math.min(255, r * rFactor)));
      g = Math.round(Math.max(0, Math.min(255, g * gFactor)));
      b = Math.round(Math.max(0, Math.min(255, b * bFactor)));
    }

    if (lut) {
      // 3D LUT fast indexing
      const rIdx = Math.round(r / lutStep);
      const gIdx = Math.round(g / lutStep);
      const bIdx = Math.round(b / lutStep);
      const lutOffset = (rIdx * LUT_SIZE * LUT_SIZE + gIdx * LUT_SIZE + bIdx) * 3;
      r = lut[lutOffset];
      g = lut[lutOffset + 1];
      b = lut[lutOffset + 2];
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // Transfer buffer back to main thread (0ms transfer)
  self.postMessage({ id, buffer }, [buffer]);
};
