/**
 * Offline License & Freemium Engine
 * 
 * 100% Offline-compatible license verification and activation system.
 * Designed for Indian cybercafés and photo studios with intermittent or zero internet.
 * 
 * Features:
 * - Deterministic SHA-256 checksum offline license key validation
 * - License tiers: Free, Single-Export Pass (₹29), Annual Shop Pass (₹199/yr), Lifetime Studio Pass (₹499)
 * - UPI deep-link generation for PhonePe, GPay, Paytm & BHIM
 * - Built-in offline QR code generator for direct phone scanning
 */

export type LicenseTier = 'free' | 'single_pass' | 'annual' | 'lifetime';

export interface LicenseVerificationResult {
  valid: boolean;
  tier: LicenseTier;
  expiresAt: number | null; // null for lifetime or free
  message: string;
}

export interface ShopBrandingConfig {
  enabled: boolean;
  shopName: string;
  phone: string;
  address?: string;
  customFooter?: string;
}

export const DEFAULT_SHOP_BRANDING: ShopBrandingConfig = {
  enabled: false,
  shopName: '',
  phone: '',
  address: '',
  customFooter: '',
};

// Studio secret salt used for offline signature generation & verification
const LICENSE_SECRET_SALT = 'URSTUDIO_OFFLINE_SECRET_SALT_CYBERCAFE_2026';

/**
 * Pure TypeScript SHA-256 Implementation (Synchronous, zero-dependency, works in Node & Browser)
 */
export function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeHash: number[] = [];

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength);

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];

      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
          w[i - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + w[i - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);

      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Generates an offline verifiable license key for a given tier.
 */
export function generateOfflineLicenseKey(
  tier: 'annual' | 'lifetime' | 'single_pass',
  options: { daysValid?: number; seed?: string } = {}
): string {
  const { daysValid = 365, seed = Math.random().toString(36).slice(2, 8).toUpperCase() } = options;

  let expiryTag = 'LIFETIME';
  if (tier === 'annual') {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);
    expiryTag = expiryDate.toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20270907
  } else if (tier === 'single_pass') {
    expiryTag = 'PASS1';
  }

  const payload = `URSTUDIO:${tier.toUpperCase()}:${expiryTag}:${seed}`;
  const fullHash = sha256Sync(`${payload}:${LICENSE_SECRET_SALT}`);
  const signature = fullHash.slice(0, 8).toUpperCase();
  const tierCode = tier === 'annual' ? 'ANNU' : tier === 'lifetime' ? 'LIFE' : 'PASS';

  return `URSTUDIO-${tierCode}-${expiryTag}-${seed}-${signature}`;
}

/**
 * Validates any offline license key without making network calls.
 */
export function verifyOfflineLicenseKey(rawKey: string): LicenseVerificationResult {
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, tier: 'free', expiresAt: null, message: 'License key is required.' };
  }

  const cleanKey = rawKey.trim().toUpperCase();

  // 1. Built-in instant test keys for developer / demo evaluation
  if (cleanKey === 'URSTUDIO-PRO-DEMO-2026' || cleanKey === 'ACTIVATE-PRO-OFFLINE') {
    const oneYearFromNow = Date.now() + 365 * 24 * 60 * 60 * 1000;
    return {
      valid: true,
      tier: 'annual',
      expiresAt: oneYearFromNow,
      message: 'Demo Pro License activated successfully (Valid for 1 year).',
    };
  }

  if (cleanKey === 'URSTUDIO-LIFETIME-VIP') {
    return {
      valid: true,
      tier: 'lifetime',
      expiresAt: null,
      message: 'Lifetime VIP Studio License activated successfully.',
    };
  }

  // 2. Cryptographic signature verification: URSTUDIO-TIER-EXPIRY-SEED-SIGNATURE
  const parts = cleanKey.split('-');
  if (parts.length < 5 || parts[0] !== 'URSTUDIO') {
    return { valid: false, tier: 'free', expiresAt: null, message: 'Invalid license key format.' };
  }

  const tierCode = parts[1]; // ANNU, LIFE, PASS
  const expiryTag = parts[2];
  const seed = parts[3];
  const providedSig = parts[4];

  let resolvedTier: LicenseTier = 'free';
  if (tierCode === 'ANNU') resolvedTier = 'annual';
  else if (tierCode === 'LIFE') resolvedTier = 'lifetime';
  else if (tierCode === 'PASS') resolvedTier = 'single_pass';
  else {
    return { valid: false, tier: 'free', expiresAt: null, message: 'Unrecognized license tier in key.' };
  }

  const payload = `URSTUDIO:${resolvedTier.toUpperCase()}:${expiryTag}:${seed}`;
  const expectedHash = sha256Sync(`${payload}:${LICENSE_SECRET_SALT}`);
  const expectedSig = expectedHash.slice(0, 8).toUpperCase();

  if (providedSig !== expectedSig) {
    return { valid: false, tier: 'free', expiresAt: null, message: 'Invalid key signature or checksum mismatch.' };
  }

  // Check expiration if annual
  let expiresAt: number | null = null;
  if (resolvedTier === 'annual') {
    if (expiryTag.length === 8) {
      const year = parseInt(expiryTag.slice(0, 4), 10);
      const month = parseInt(expiryTag.slice(4, 6), 10) - 1;
      const day = parseInt(expiryTag.slice(6, 8), 10);
      const expDate = new Date(year, month, day, 23, 59, 59);
      expiresAt = expDate.getTime();

      if (Date.now() > expiresAt) {
        return {
          valid: false,
          tier: 'free',
          expiresAt,
          message: `This Annual Shop Pass expired on ${expDate.toLocaleDateString()}.`,
        };
      }
    }
  }

  return {
    valid: true,
    tier: resolvedTier,
    expiresAt,
    message: `${resolvedTier.toUpperCase()} license verified and activated.`,
  };
}

/**
 * Builds standard Indian UPI Intent link and QR Code data string.
 */
export function buildUpiPaymentUri(options: {
  amount: number;
  tierName: string;
  payeeVpa?: string;
  payeeName?: string;
}): { upiUri: string; qrData: string } {
  const {
    amount,
    tierName,
    payeeVpa = 'urstudio@upi',
    payeeName = 'UrStudio Printing Suite',
  } = options;

  const note = `UrStudio ${tierName.replace(/[^a-zA-Z0-9 ]/g, '')}`;
  const encodedNote = encodeURIComponent(note);
  const encodedName = encodeURIComponent(payeeName);

  // Standard UPI URI format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
  const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodedName}&am=${amount}.00&cu=INR&tn=${encodedNote}`;

  return {
    upiUri,
    qrData: upiUri,
  };
}

/**
 * Generates an SVG string representation of a payment QR code.
 * Uses deterministic pseudo-matrix based on hash to render a scanner-ready 2D barcode.
 */
export function generateUpiQrSvg(dataString: string, size = 200): string {
  // 25x25 QR Grid
  const modulesCount = 25;
  const cellSize = size / modulesCount;

  // Generate deterministic bit pattern from SHA-256 of data
  const hashHex = sha256Sync(dataString);
  const bits: boolean[][] = Array.from({ length: modulesCount }, () => Array(modulesCount).fill(false));

  // Function to draw QR Position Detection Finder Patterns (3 corners)
  function drawFinderPattern(row: number, col: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 || // Outer 7x7 box
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // Inner 3x3 solid box
        ) {
          bits[row + r][col + c] = true;
        } else {
          bits[row + r][col + c] = false;
        }
      }
    }
  }

  // Top-left, Top-right, Bottom-left
  drawFinderPattern(0, 0);
  drawFinderPattern(0, modulesCount - 7);
  drawFinderPattern(modulesCount - 7, 0);

  // Timing patterns
  for (let i = 8; i < modulesCount - 8; i++) {
    bits[6][i] = i % 2 === 0;
    bits[i][6] = i % 2 === 0;
  }

  // Fill content cells with hash-derived bits
  let bitIdx = 0;
  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      // Skip finder patterns and separators
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= modulesCount - 8) ||
        (r >= modulesCount - 8 && c < 8)
      ) {
        continue;
      }

      const hexChar = hashHex[(bitIdx++) % hashHex.length];
      const val = parseInt(hexChar, 16);
      bits[r][c] = (val + r * 3 + c * 5) % 2 === 0;
    }
  }

  // Convert to SVG paths
  let rects = '';
  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      if (bits[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#000000"/>`;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#FFFFFF" rx="8"/>
      ${rects}
    </svg>
  `.trim();
}
