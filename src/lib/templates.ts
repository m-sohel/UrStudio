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
export type RegionCategory = 'IN' | 'US' | 'EU' | 'UK' | 'CA' | 'GLOBAL';

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
  /** Country or region code */
  country?: RegionCategory;
  /** Required photo background color */
  backgroundRule?: 'white' | 'blue' | 'light-gray' | 'off-white' | 'any';
  /** Target head/face height coverage rule */
  faceCoveragePercent?: string;
  /** Visual guideline badges for UI */
  guidelineBadges?: string[];
  /** Detailed official instructions */
  officialNotes?: string;
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
  /** Country or region code */
  country?: RegionCategory;
  /** Visual guideline badges for UI */
  guidelineBadges?: string[];
  /** Detailed official instructions */
  officialNotes?: string;
}

// ============================================================
// Built-in Photo Templates
// ============================================================

export const PHOTO_TEMPLATES: PhotoTemplate[] = [
  {
    id: 'passport-photo-india',
    name: 'Indian Passport Photo',
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
    country: 'IN',
    backgroundRule: 'white',
    faceCoveragePercent: '70–80%',
    guidelineBadges: ['White BG', '70–80% Face', 'No Spectacles', 'Neutral Face'],
    officialNotes: 'Head height must measure between 31mm and 36mm from chin to crown. Light white or off-white background required.',
  },
  {
    id: 'passport-photo-us',
    name: 'US Passport & Visa Photo',
    category: 'photo',
    width: 50.8,   // 2 inches
    height: 50.8,  // 2 inches
    displayUnit: 'in',
    aspectRatio: 1,
    builtIn: true,
    description: '2 × 2 inch — US official standard',
    defaultCopies: 4,
    defaultPaperId: '4x6',
    icon: 'user',
    country: 'US',
    backgroundRule: 'white',
    faceCoveragePercent: '50–69%',
    guidelineBadges: ['White BG', '50–69% Face', 'No Eyeglasses', 'Strict 2x2 in'],
    officialNotes: 'Head must be between 1 inch and 1 3/8 inches (25 - 35 mm) from the bottom of the chin to the top of the head.',
  },
  {
    id: 'visa-schengen',
    name: 'Schengen Visa Photo',
    category: 'photo',
    width: 35,
    height: 45,
    displayUnit: 'mm',
    aspectRatio: 35 / 45,
    builtIn: true,
    description: '35 × 45 mm — 27 European Schengen nations',
    defaultCopies: 8,
    defaultPaperId: '4x6',
    icon: 'stamp',
    country: 'EU',
    backgroundRule: 'light-gray',
    faceCoveragePercent: '70–80%',
    guidelineBadges: ['Light Gray/White BG', '70–80% Face', 'No Shadows', 'Neutral Look'],
    officialNotes: 'ICAO Doc 9303 compliant. Chin to top of head must measure 32–36 mm. Light grey background preferred.',
  },
  {
    id: 'passport-uk',
    name: 'UK Passport & Driving Licence',
    category: 'photo',
    width: 35,
    height: 45,
    displayUnit: 'mm',
    aspectRatio: 35 / 45,
    builtIn: true,
    description: '35 × 45 mm — His Majesty\'s Passport Office',
    defaultCopies: 8,
    defaultPaperId: '4x6',
    icon: 'user',
    country: 'UK',
    backgroundRule: 'light-gray',
    faceCoveragePercent: '70–80%',
    guidelineBadges: ['Light Cream/Gray BG', '70–80% Face', 'No Glare', 'No Smile'],
    officialNotes: 'Plain cream or light grey background. Head height from crown to chin between 29mm and 34mm.',
  },
  {
    id: 'passport-canada',
    name: 'Canada PR & Passport Photo',
    category: 'photo',
    width: 50,
    height: 70,
    displayUnit: 'mm',
    aspectRatio: 50 / 70,
    builtIn: true,
    description: '50 × 70 mm — Canada Immigration & PR',
    defaultCopies: 2,
    defaultPaperId: '4x6',
    icon: 'stamp',
    country: 'CA',
    backgroundRule: 'white',
    faceCoveragePercent: '31–36mm head',
    guidelineBadges: ['Pure White BG', '31–36mm Head', '50×70mm Large'],
    officialNotes: 'Face length between 31mm and 36mm from chin to natural top of head. Commercial studio stamp space required on back.',
  },
  {
    id: 'passport-malaysia',
    name: 'Malaysia Passport Photo',
    category: 'photo',
    width: 35,
    height: 50,
    displayUnit: 'mm',
    aspectRatio: 35 / 50,
    builtIn: true,
    description: '35 × 50 mm — Blue Background',
    defaultCopies: 6,
    defaultPaperId: '4x6',
    icon: 'user',
    country: 'GLOBAL',
    backgroundRule: 'blue',
    faceCoveragePercent: '65–75%',
    guidelineBadges: ['Royal Blue BG', 'Dark Clothing', 'Clear Ears & Face'],
    officialNotes: 'Light blue background standard for Immigration Department of Malaysia. Must wear dark clothing covering shoulders.',
  },
  {
    id: 'visa-uae-dubai',
    name: 'UAE / Dubai Visa Photo',
    category: 'photo',
    width: 40,
    height: 60,
    displayUnit: 'mm',
    aspectRatio: 40 / 60,
    builtIn: true,
    description: '40 × 60 mm — Dubai GDRFA & UAE Visa',
    defaultCopies: 4,
    defaultPaperId: '4x6',
    icon: 'stamp',
    country: 'GLOBAL',
    backgroundRule: 'white',
    faceCoveragePercent: '70–80%',
    guidelineBadges: ['Pure White BG', '70–80% Face', 'High Resolution'],
    officialNotes: 'High clarity photo against pure white background for GDRFA and ICP portal upload and visa stamping.',
  },
  {
    id: 'ration-card-photo',
    name: 'Ration Card Photo',
    category: 'photo',
    width: 45,
    height: 35,
    displayUnit: 'mm',
    aspectRatio: 45 / 35,
    builtIn: true,
    description: '45 × 35 mm — Family / Head of Household',
    defaultCopies: 8,
    defaultPaperId: '4x6',
    icon: 'user',
    country: 'IN',
    backgroundRule: 'white',
    guidelineBadges: ['White BG', 'Horizontal 45×35mm', 'All Members Clear'],
    officialNotes: 'Standard horizontal aspect photo for State Food & Civil Supplies Department ration cards.',
  },
  {
    id: 'visa-photo',
    name: 'Standard Visa Photo',
    category: 'photo',
    width: 50.8,
    height: 50.8,
    displayUnit: 'in',
    aspectRatio: 1,
    builtIn: true,
    description: '2 × 2 inch — International Visa standard',
    defaultCopies: 4,
    defaultPaperId: '4x6',
    icon: 'stamp',
    country: 'GLOBAL',
    backgroundRule: 'white',
    faceCoveragePercent: '50–69%',
    guidelineBadges: ['White BG', '2×2 inch', 'Embassy Standard'],
  },
  {
    id: 'stamp-photo',
    name: 'Stamp Size Photo',
    category: 'photo',
    width: 20,
    height: 25,
    displayUnit: 'mm',
    aspectRatio: 20 / 25,
    builtIn: true,
    description: '20 × 25 mm — Stamp size photo',
    defaultCopies: 16,
    defaultPaperId: '4x6',
    icon: 'stamp',
    country: 'GLOBAL',
    guidelineBadges: ['Compact 20×25mm', '16+ Per 4×6 Sheet', 'Forms'],
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
    country: 'GLOBAL',
    guidelineBadges: ['Square 35mm', 'Bank / Exam Forms'],
  },
  {
    id: 'photo-25x30',
    name: 'Small Photo (25×30)',
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
    country: 'GLOBAL',
    guidelineBadges: ['Small 25×30mm', 'Admit Cards'],
  },
  {
    id: 'photo-4x6',
    name: 'Standard Print (4×6 in)',
    category: 'photo',
    width: 101.6,
    height: 152.4,
    displayUnit: 'in',
    aspectRatio: 101.6 / 152.4,
    builtIn: true,
    description: '4 × 6 inch — Standard studio postcard print',
    defaultCopies: 1,
    defaultPaperId: '4x6',
    icon: 'image',
    country: 'GLOBAL',
    guidelineBadges: ['Full 4×6 in', 'Studio Portrait'],
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
    country: 'IN',
    guidelineBadges: ['UIDAI Standard', 'CR80 PVC / Lamination', 'Front & Back'],
    officialNotes: 'Official UIDAI card dimensions for plastic PVC and paper laminated printouts.',
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
    country: 'IN',
    guidelineBadges: ['Income Tax Dept', 'CR80 Plastic Card', 'Front & Back'],
    officialNotes: 'NSDL & UTIITSL permanent account number card dimensions.',
  },
  {
    id: 'voter-id',
    name: 'Voter ID (EPIC Card)',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — New color PVC standard',
    hasBackSide: true,
    icon: 'vote',
    country: 'IN',
    guidelineBadges: ['ECI New Color EPIC', 'CR80 PVC', 'Front & Back'],
    officialNotes: 'Election Commission of India modern full-color PVC EPIC card size.',
  },
  {
    id: 'ayushman-bharat',
    name: 'Ayushman Bharat (PM-JAY)',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — PM-JAY Golden Card',
    hasBackSide: true,
    icon: 'credit-card',
    country: 'IN',
    guidelineBadges: ['National Health Authority', 'CR80 PVC', 'Front & Back'],
    officialNotes: 'Pradhan Mantri Jan Arogya Yojana golden health card standard size.',
  },
  {
    id: 'e-shram-card',
    name: 'E-Shram Card',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — Ministry of Labour',
    hasBackSide: true,
    icon: 'credit-card',
    country: 'IN',
    guidelineBadges: ['Ministry of Labour', 'CR80 Plastic', 'Front & Back'],
    officialNotes: 'Unorganised Workers National Database UAN card layout.',
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
    country: 'IN',
    guidelineBadges: ['Parivahan Standard', 'Smart Card CR80', 'Front & Back'],
    officialNotes: 'Ministry of Road Transport & Highways standard DL PVC format.',
  },
  {
    id: 'student-id-card',
    name: 'Student / Employee ID Card',
    category: 'id-card',
    width: 85.6,
    height: 53.98,
    displayUnit: 'mm',
    aspectRatio: 85.6 / 53.98,
    builtIn: true,
    description: 'CR80 standard — School, College, Office',
    hasBackSide: true,
    icon: 'id-card',
    country: 'GLOBAL',
    guidelineBadges: ['Institution Standard', 'CR80 PVC', 'Front & Back'],
    officialNotes: 'Standard horizontal card format for universities, schools, and corporate badges.',
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
    icon: 'credit-card',
    country: 'GLOBAL',
    guidelineBadges: ['CR80 Standard', 'Universal 85.6×54mm', 'Front & Back'],
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

export type PhotoBorderStyle = 'solid' | 'double' | 'dashed' | 'dotted' | 'none';

export interface PhotoBorderSettings {
  enabled: boolean;
  width: number; // 0.2, 0.5, 1.0, 1.5, etc.
  widthMm?: number; // alias
  color: string; // Hex color code: '#D1D5DB', '#000000', etc.
  style: PhotoBorderStyle;
}

export const DEFAULT_PHOTO_BORDER: PhotoBorderSettings = {
  enabled: true,
  width: 0.5,
  widthMm: 0.5,
  color: '#000000', // Crisp studio passport cutting border as seen on studio sheets
  style: 'solid',
};

// ============================================================
// Default Settings
// ============================================================

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  paperId: '4x6',
  orientation: 'landscape',
  marginTop: 4.8,
  marginRight: 3.2,
  marginBottom: 4.8,
  marginLeft: 3.2,
  horizontalGap: 2,
  verticalGap: 2,
};

export function getDefaultPaperSettings(paperId: string): PaperSettings {
  if (paperId === '4x6') {
    return {
      paperId: '4x6',
      orientation: 'landscape', // 152.4 mm x 101.6 mm
      marginTop: 4.8,
      marginRight: 3.2,
      marginBottom: 4.8,
      marginLeft: 3.2,
      horizontalGap: 2,
      verticalGap: 2,
    };
  }

  return {
    paperId,
    orientation: 'portrait',
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    horizontalGap: 3,
    verticalGap: 3,
  };
}

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
    return { width: Math.max(paper.width, paper.height), height: Math.min(paper.width, paper.height) };
  }
  return { width: Math.min(paper.width, paper.height), height: Math.max(paper.width, paper.height) };
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
