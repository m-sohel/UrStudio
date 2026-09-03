/**
 * Template System
 * 
 * Defines all photo/ID card/paper templates.
 * Templates are the core data model for the application.
 */

// ============================================================
// Types
// ============================================================

export type TemplateCategory = 'photo' | 'id-card' | 'custom';

export interface PhotoTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
  /** Display unit for the UI */
  displayUnit: 'mm' | 'in';
  aspectRatio: number;
  /** Whether this is a built-in (non-deletable) template */
  builtIn: boolean;
  /** Description shown to operator */
  description?: string;
  /** Default number of copies */
  defaultCopies?: number;
  /** Default paper size ID */
  defaultPaperId?: string;
  /** Icon name for UI */
  icon?: string;
}

export interface PaperSize {
  id: string;
  name: string;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
  /** Display unit */
  displayUnit: 'mm' | 'in';
  builtIn: boolean;
}

export interface PaperSettings {
  paperId: string;
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  horizontalGap: number;
  verticalGap: number;
}

export interface IDCardTemplate {
  id: string;
  name: string;
  category: 'id-card';
  /** Card width in mm */
  width: number;
  /** Card height in mm */
  height: number;
  displayUnit: 'mm' | 'in';
  aspectRatio: number;
  builtIn: boolean;
  description?: string;
  /** Whether this card typically has a back side */
  hasBackSide: boolean;
  icon?: string;
}

// ============================================================
// Built-in Photo Templates
// ============================================================

export const PHOTO_TEMPLATES: PhotoTemplate[] = [
  {
    id: 'passport-photo-india',
    name: 'Passport Photo',
    category: 'photo',
    width: 35,
    height: 45,
    displayUnit: 'mm',
    aspectRatio: 35 / 45,
    builtIn: true,
    description: '35 × 45 mm — Indian/UK/EU standard',
    defaultCopies: 8,
    defaultPaperId: '4x6',
    icon: 'user',
  },
  {
    id: 'passport-photo-us',
    name: 'US Passport Photo',
    category: 'photo',
    width: 50.8,   // 2 inches
    height: 50.8,  // 2 inches
    displayUnit: 'in',
    aspectRatio: 1,
    builtIn: true,
    description: '2 × 2 inch — US standard',
    defaultCopies: 4,
    defaultPaperId: '4x6',
    icon: 'user',
  },
  {
    id: 'visa-photo',
    name: 'Visa Photo',
    category: 'photo',
    width: 50.8,
    height: 50.8,
    displayUnit: 'in',
    aspectRatio: 1,
    builtIn: true,
    description: '2 × 2 inch — Visa standard',
    defaultCopies: 4,
    defaultPaperId: '4x6',
    icon: 'stamp',
  },
  {
    id: 'stamp-photo',
    name: 'Stamp Photo',
    category: 'photo',
    width: 20,
    height: 25,
    displayUnit: 'mm',
    aspectRatio: 20 / 25,
    builtIn: true,
    description: '20 × 25 mm — Stamp size',
    defaultCopies: 12,
    defaultPaperId: '4x6',
    icon: 'stamp',
  },
  {
    id: 'photo-35x35',
    name: 'Square Photo (35mm)',
    category: 'photo',
    width: 35,
    height: 35,
    displayUnit: 'mm',
    aspectRatio: 1,
    builtIn: true,
    description: '35 × 35 mm — Square format',
    defaultCopies: 8,
    defaultPaperId: '4x6',
    icon: 'square',
  },
  {
    id: 'photo-25x30',
    name: 'Small Photo',
    category: 'photo',
    width: 25,
    height: 30,
    displayUnit: 'mm',
    aspectRatio: 25 / 30,
    builtIn: true,
    description: '25 × 30 mm — Application form size',
    defaultCopies: 12,
    defaultPaperId: '4x6',
    icon: 'image',
  },
  {
    id: 'photo-4x6',
    name: 'Standard Print (4×6)',
    category: 'photo',
    width: 101.6,
    height: 152.4,
    displayUnit: 'in',
    aspectRatio: 101.6 / 152.4,
    builtIn: true,
    description: '4 × 6 inch — Standard print',
    defaultCopies: 1,
    defaultPaperId: '4x6',
    icon: 'image',
  },
];

// ============================================================
// Built-in ID Card Templates
// ============================================================

export const ID_CARD_TEMPLATES: IDCardTemplate[] = [
  {
    id: 'aadhaar-card',
    name: 'Aadhaar Card',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — 85.6 × 54 mm',
    hasBackSide: true,
    icon: 'credit-card',
  },
  {
    id: 'pan-card',
    name: 'PAN Card',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — 85.6 × 54 mm',
    hasBackSide: true,
    icon: 'credit-card',
  },
  {
    id: 'driving-licence',
    name: 'Driving Licence',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — 85.6 × 54 mm',
    hasBackSide: true,
    icon: 'car',
  },
  {
    id: 'voter-id',
    name: 'Voter ID (EPIC)',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — 85.6 × 54 mm',
    hasBackSide: true,
    icon: 'vote',
  },
  {
    id: 'generic-id-card',
    name: 'Generic ID Card',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — 85.6 × 54 mm',
    hasBackSide: true,
    icon: 'id-card',
  },
];

// ============================================================
// Paper Sizes
// ============================================================

export const PAPER_SIZES: PaperSize[] = [
  {
    id: 'a4',
    name: 'A4',
    width: 210,
    height: 297,
    displayUnit: 'mm',
    builtIn: true,
  },
  {
    id: 'a5',
    name: 'A5',
    width: 148,
    height: 210,
    displayUnit: 'mm',
    builtIn: true,
  },
  {
    id: '4x6',
    name: '4×6 inch',
    width: 101.6,
    height: 152.4,
    displayUnit: 'in',
    builtIn: true,
  },
  {
    id: '5x7',
    name: '5×7 inch',
    width: 127,
    height: 177.8,
    displayUnit: 'in',
    builtIn: true,
  },
  {
    id: 'letter',
    name: 'Letter',
    width: 215.9,
    height: 279.4,
    displayUnit: 'in',
    builtIn: true,
  },
  {
    id: 'legal',
    name: 'Legal',
    width: 215.9,
    height: 355.6,
    displayUnit: 'in',
    builtIn: true,
  },
  {
    id: 'pvc-card',
    name: 'PVC Card (CR80)',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    builtIn: true,
  },
];

// ============================================================
// Default Settings
// ============================================================

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  paperId: 'a4',
  orientation: 'portrait',
  marginTop: 5,
  marginRight: 5,
  marginBottom: 5,
  marginLeft: 5,
  horizontalGap: 3,
  verticalGap: 3,
};

// ============================================================
// Helpers
// ============================================================

export function getPhotoTemplate(id: string): PhotoTemplate | undefined {
  return PHOTO_TEMPLATES.find(t => t.id === id);
}

export function getIDCardTemplate(id: string): IDCardTemplate | undefined {
  return ID_CARD_TEMPLATES.find(t => t.id === id);
}

export function getPaperSize(id: string): PaperSize | undefined {
  return PAPER_SIZES.find(p => p.id === id);
}

/**
 * Get effective paper dimensions considering orientation.
 */
export function getEffectivePaperDimensions(
  paper: PaperSize,
  orientation: 'portrait' | 'landscape'
): { width: number; height: number } {
  if (orientation === 'landscape') {
    return { width: paper.height, height: paper.width };
  }
  return { width: paper.width, height: paper.height };
}

/**
 * Format template dimensions for display.
 */
export function formatTemplateDimensions(template: PhotoTemplate | IDCardTemplate): string {
  if (template.displayUnit === 'in') {
    const wIn = (template.width / 25.4).toFixed(template.width % 25.4 === 0 ? 0 : 1);
    const hIn = (template.height / 25.4).toFixed(template.height % 25.4 === 0 ? 0 : 1);
    return `${wIn} × ${hIn} in`;
  }
  return `${template.width} × ${template.height} mm`;
}

/**
 * Create a custom photo template.
 */
export function createCustomPhotoTemplate(
  name: string,
  width: number,
  height: number,
  displayUnit: 'mm' | 'in' = 'mm',
): PhotoTemplate {
  return {
    id: `custom-${Date.now()}`,
    name,
    category: 'custom',
    width,
    height,
    displayUnit,
    aspectRatio: width / height,
    builtIn: false,
    description: `${width} × ${height} ${displayUnit}`,
    defaultCopies: 1,
    defaultPaperId: 'a4',
  };
}

/**
 * Create a custom ID card template.
 */
export function createCustomIDCardTemplate(
  name: string,
  width: number,
  height: number,
  hasBackSide: boolean = true,
  displayUnit: 'mm' | 'in' = 'mm',
): IDCardTemplate {
  return {
    id: `custom-id-${Date.now()}`,
    name,
    category: 'id-card',
    width,
    height,
    displayUnit,
    aspectRatio: width / height,
    builtIn: false,
    description: `${width} × ${height} ${displayUnit}`,
    hasBackSide,
  };
}
