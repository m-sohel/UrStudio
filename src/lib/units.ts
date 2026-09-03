/**
 * Unit Conversion System
 * 
 * All internal measurements are in millimeters (mm).
 * Conversions to pixels use configurable DPI (default 300 for print quality).
 * CSS physical units (mm, in) are used in print stylesheets.
 */

export const DEFAULT_DPI = 300;

/** Convert millimeters to pixels at the given DPI */
export function mmToPx(mm: number, dpi: number = DEFAULT_DPI): number {
  return Math.round(mm * dpi / 25.4);
}

/** Convert pixels to millimeters at the given DPI */
export function pxToMm(px: number, dpi: number = DEFAULT_DPI): number {
  return (px * 25.4) / dpi;
}

/** Convert inches to millimeters */
export function inchToMm(inches: number): number {
  return inches * 25.4;
}

/** Convert millimeters to inches */
export function mmToInch(mm: number): number {
  return mm / 25.4;
}

/** Convert centimeters to millimeters */
export function cmToMm(cm: number): number {
  return cm * 10;
}

/** Convert millimeters to centimeters */
export function mmToCm(mm: number): number {
  return mm / 10;
}

/** Convert points to millimeters (1 pt = 1/72 inch) */
export function ptToMm(pt: number): number {
  return pt * 25.4 / 72;
}

/** Convert millimeters to points */
export function mmToPt(mm: number): number {
  return mm * 72 / 25.4;
}

/**
 * Parse a dimension string like "35mm", "2in", "5cm" into mm.
 * Returns null if parsing fails.
 */
export function parseDimension(value: string): number | null {
  const match = value.trim().match(/^([\d.]+)\s*(mm|cm|in|inch|pt|px)$/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'mm': return num;
    case 'cm': return cmToMm(num);
    case 'in':
    case 'inch': return inchToMm(num);
    case 'pt': return ptToMm(num);
    case 'px': return pxToMm(num);
    default: return null;
  }
}

/**
 * Format a mm value to a human-readable string with the specified unit.
 */
export function formatDimension(mm: number, unit: 'mm' | 'cm' | 'in' | 'px' = 'mm', dpi: number = DEFAULT_DPI): string {
  switch (unit) {
    case 'mm': return `${mm.toFixed(1)}mm`;
    case 'cm': return `${mmToCm(mm).toFixed(2)}cm`;
    case 'in': return `${mmToInch(mm).toFixed(2)}in`;
    case 'px': return `${mmToPx(mm, dpi)}px`;
  }
}

export type Unit = 'mm' | 'cm' | 'in' | 'px';

/** Convert any unit to mm */
export function toMm(value: number, unit: Unit, dpi: number = DEFAULT_DPI): number {
  switch (unit) {
    case 'mm': return value;
    case 'cm': return cmToMm(value);
    case 'in': return inchToMm(value);
    case 'px': return pxToMm(value, dpi);
  }
}

/** Convert mm to any unit */
export function fromMm(mm: number, unit: Unit, dpi: number = DEFAULT_DPI): number {
  switch (unit) {
    case 'mm': return mm;
    case 'cm': return mmToCm(mm);
    case 'in': return mmToInch(mm);
    case 'px': return mmToPx(mm, dpi);
  }
}
