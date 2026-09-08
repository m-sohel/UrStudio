import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mmToPx, pxToMm, inchToMm, mmToInch, cmToMm,
  parseDimension, formatDimension, DEFAULT_DPI
} from '../units';

import {
  calculateLayout, calculateOptimalLayout, calculateIDCardLayout
} from '../layout-engine';

import {
  PHOTO_TEMPLATES, ID_CARD_TEMPLATES, PAPER_SIZES,
  getPhotoTemplate, getIDCardTemplate, getPaperSize,
  getEffectivePaperDimensions, createCustomPhotoTemplate,
  createCustomIDCardTemplate, formatTemplateDimensions
} from '../templates';

import {
  centerCropForAspectRatio, formatFileSize
} from '../image-processing';

import {
  rgbToCmyk, cmykToRgb, simulateCmykProof, isOutOfGamut, getOrBuildLut3D, LUT_SIZE
} from '../color-management';

import {
  isPdfFile, PasswordRequiredError
} from '../pdf-processor';

import {
  generatePrintHTML, generateIDCardPrintHTML
} from '../print';

// ============================================================
// 1. Unit Conversion Tests
// ============================================================

test('Units: mmToPx and pxToMm at 300 DPI', () => {
  const mm = 25.4; // exactly 1 inch
  const px = mmToPx(mm, 300);
  assert.equal(px, 300);

  const backToMm = pxToMm(300, 300);
  assert.equal(backToMm, 25.4);
});

test('Units: inch to mm conversions', () => {
  assert.equal(inchToMm(1), 25.4);
  assert.equal(inchToMm(2), 50.8);
  assert.equal(mmToInch(25.4), 1);
});

test('Units: cm to mm conversions', () => {
  assert.equal(cmToMm(1), 10);
  assert.equal(cmToMm(3.5), 35);
});

test('Units: parseDimension parses valid unit strings', () => {
  assert.equal(parseDimension('35mm'), 35);
  assert.equal(parseDimension('2in'), 50.8);
  assert.equal(parseDimension('5cm'), 50);
  assert.equal(parseDimension('invalid'), null);
});

test('Units: formatDimension returns readable strings', () => {
  assert.equal(formatDimension(35, 'mm'), '35.0mm');
  assert.equal(formatDimension(50.8, 'in'), '2.00in');
});

// ============================================================
// 2. Layout Engine Tests
// ============================================================

test('Layout Engine: Passport photos (35x45mm) on A4 paper (210x297mm)', () => {
  // A4: 210 x 297 mm
  // Photo: 35 x 45 mm, Gap: 3mm, Margins: 5mm
  // Available W = 210 - 10 = 200mm. Fits: floor((200-35)/38) + 1 = 4 + 1 = 5 columns.
  // Available H = 297 - 10 = 287mm. Fits: floor((287-45)/48) + 1 = 5 + 1 = 6 rows.
  // Total: 5 x 6 = 30 photos.
  const layout = calculateLayout({
    paperWidth: 210,
    paperHeight: 297,
    itemWidth: 35,
    itemHeight: 45,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    horizontalGap: 3,
    verticalGap: 3,
  });

  assert.equal(layout.columns, 5);
  assert.equal(layout.rows, 6);
  assert.equal(layout.totalItems, 30);
  assert.equal(layout.positions.length, 30);

  // Ensure no photos overflow the paper
  for (const pos of layout.positions) {
    assert.ok(pos.x >= 5, `x position ${pos.x} is before margin`);
    assert.ok(pos.x + pos.width <= 210 - 5 + 0.1, `photo overflows right paper edge`);
    assert.ok(pos.y >= 5, `y position ${pos.y} is before top margin`);
    assert.ok(pos.y + pos.height <= 297 - 5 + 0.1, `photo overflows bottom paper edge`);
  }
});

test('Layout Engine: Passport photos on 4x6 inch paper (101.6x152.4mm) portrait', () => {
  const layout = calculateLayout({
    paperWidth: 101.6,
    paperHeight: 152.4,
    itemWidth: 35,
    itemHeight: 45,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    horizontalGap: 3,
    verticalGap: 3,
    maxCopies: 8,
  });

  assert.equal(layout.totalItems, 6, 'Physical limit of 4x6 in portrait is 6 photos without overflow');
  assert.equal(layout.positions.length, 6);
});

test('Layout Engine: 8 Passport photos on 4x6 inch paper (152.4x101.6mm) horizontal landscape', () => {
  const layout = calculateLayout({
    paperWidth: 152.4,
    paperHeight: 101.6,
    itemWidth: 35,
    itemHeight: 45,
    marginTop: 4.8,
    marginRight: 3.2,
    marginBottom: 4.8,
    marginLeft: 3.2,
    horizontalGap: 2,
    verticalGap: 2,
    maxCopies: 8,
  });

  assert.equal(layout.columns, 4, 'Must have exactly 4 columns horizontally');
  assert.equal(layout.rows, 2, 'Must have exactly 2 rows vertically');
  assert.equal(layout.totalItems, 8, 'Must have exactly 8 passport photos per 4x6 sheet');
  assert.equal(layout.positions.length, 8);

  // Verify none of the 8 photos overflow the 4x6 paper
  for (const pos of layout.positions) {
    assert.ok(pos.x >= 0, `x position ${pos.x} is off paper`);
    assert.ok(pos.x + pos.width <= 152.4 + 0.1, `photo overflows 152.4mm width`);
    assert.ok(pos.y >= 0, `y position ${pos.y} is off paper`);
    assert.ok(pos.y + pos.height <= 101.6 + 0.1, `photo overflows 101.6mm height`);
  }
});

test('Layout Engine: 4x6 standard photo print (101.6x152.4mm) on 4x6 inch paper yields 1 full copy in portrait & landscape', () => {
  // Portrait orientation
  const layoutPortrait = calculateLayout({
    paperWidth: 101.6,
    paperHeight: 152.4,
    itemWidth: 101.6,
    itemHeight: 152.4,
    marginTop: 4.8,
    marginRight: 3.2,
    marginBottom: 4.8,
    marginLeft: 3.2,
    horizontalGap: 2,
    verticalGap: 2,
    maxCopies: 1,
  });

  assert.equal(layoutPortrait.totalItems, 1, 'Standard 4x6 print must yield 1 copy on 4x6 portrait paper');
  assert.equal(layoutPortrait.columns, 1);
  assert.equal(layoutPortrait.rows, 1);
  assert.equal(layoutPortrait.positions.length, 1);
  assert.equal(layoutPortrait.positions[0].width, 101.6);
  assert.equal(layoutPortrait.positions[0].height, 152.4);

  // Landscape orientation (auto-rotates to fit 152.4x101.6 paper)
  const layoutLandscape = calculateLayout({
    paperWidth: 152.4,
    paperHeight: 101.6,
    itemWidth: 101.6,
    itemHeight: 152.4,
    marginTop: 4.8,
    marginRight: 3.2,
    marginBottom: 4.8,
    marginLeft: 3.2,
    horizontalGap: 2,
    verticalGap: 2,
    maxCopies: 1,
  });

  assert.equal(layoutLandscape.totalItems, 1, 'Standard 4x6 print must yield 1 copy on 4x6 landscape paper');
  assert.equal(layoutLandscape.columns, 1);
  assert.equal(layoutLandscape.rows, 1);
  assert.equal(layoutLandscape.positions.length, 1);
});

test('Layout Engine: 2x2 inch US Passport photos on 4x6 paper yields at least 4 copies', () => {
  const layout = calculateLayout({
    paperWidth: 152.4,
    paperHeight: 101.6,
    itemWidth: 50.8,
    itemHeight: 50.8,
    marginTop: 4.8,
    marginRight: 3.2,
    marginBottom: 4.8,
    marginLeft: 3.2,
    horizontalGap: 2,
    verticalGap: 2,
    maxCopies: 4,
  });

  assert.ok(layout.totalItems >= 4, `US passport photos should fit at least 4 copies on 4x6 sheet, got ${layout.totalItems}`);
});

test('Layout Engine: Overflow prevention when item is larger than paper', () => {
  const layout = calculateLayout({
    paperWidth: 50,
    paperHeight: 50,
    itemWidth: 100, // larger than paper
    itemHeight: 100,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    horizontalGap: 3,
    verticalGap: 3,
  });

  assert.equal(layout.totalItems, 0);
  assert.equal(layout.positions.length, 0);
});

test('Layout Engine: MaxCopies limit respected', () => {
  const layout = calculateLayout({
    paperWidth: 210,
    paperHeight: 297,
    itemWidth: 35,
    itemHeight: 45,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    horizontalGap: 3,
    verticalGap: 3,
    maxCopies: 12,
  });

  assert.equal(layout.totalItems, 12);
  assert.equal(layout.positions.length, 12);
});

test('Layout Engine: ID Card layout stacked vs side-by-side', () => {
  // CR80: 85.6 x 53.98mm
  const stacked = calculateIDCardLayout({
    paperWidth: 210,
    paperHeight: 297,
    cardWidth: 85.6,
    cardHeight: 53.98,
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
    horizontalGap: 5,
    verticalGap: 5,
    frontBackGap: 5,
    arrangement: 'stacked',
    copies: 4,
  });

  assert.ok(stacked.positions.length <= 4);
  assert.ok(stacked.positions[0].front.y < stacked.positions[0].back!.y, 'Front is above back in stacked');

  const sideBySide = calculateIDCardLayout({
    paperWidth: 210,
    paperHeight: 297,
    cardWidth: 85.6,
    cardHeight: 53.98,
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
    horizontalGap: 5,
    verticalGap: 5,
    frontBackGap: 5,
    arrangement: 'side-by-side',
    copies: 2,
  });

  assert.ok(sideBySide.positions[0].front.x < sideBySide.positions[0].back!.x, 'Front is left of back in side-by-side');
});

test('Layout Engine: ID Card PVC single-side layout', () => {
  const pvc = calculateIDCardLayout({
    paperWidth: 85.6,
    paperHeight: 53.98,
    cardWidth: 85.6,
    cardHeight: 53.98,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    horizontalGap: 0,
    verticalGap: 0,
    frontBackGap: 0,
    arrangement: 'front-only',
    copies: 1,
  });

  assert.equal(pvc.totalSets, 1);
  assert.equal(pvc.positions[0].front.width, 85.6);
  assert.equal(pvc.positions[0].front.height, 53.98);
});

// ============================================================
// 3. Templates System Tests
// ============================================================

test('Templates: Built-in Photo and ID card presets are defined', () => {
  const passport = getPhotoTemplate('passport-photo-india');
  assert.ok(passport, 'Indian Passport template should exist');
  assert.equal(passport?.width, 35);
  assert.equal(passport?.height, 45);

  const usVisa = getPhotoTemplate('passport-photo-us');
  assert.ok(usVisa, 'US Passport template should exist');
  assert.equal(usVisa?.width, 50.8);
  assert.equal(usVisa?.height, 50.8);

  const aadhaar = getIDCardTemplate('aadhaar-card');
  assert.ok(aadhaar, 'Aadhaar Card template should exist');
  assert.equal(aadhaar?.width, 85.6);
  assert.equal(aadhaar?.height, 53.98);

  const pvcPaper = getPaperSize('pvc-card');
  assert.ok(pvcPaper, 'PVC Card paper size should exist');
});

test('Templates: Custom template creation', () => {
  const custom = createCustomPhotoTemplate('Canada Visa', 50, 70, 'mm');
  assert.equal(custom.name, 'Canada Visa');
  assert.equal(custom.width, 50);
  assert.equal(custom.height, 70);
  assert.equal(custom.builtIn, false);
  assert.equal(custom.category, 'custom');
});

// ============================================================
// 4. Image Processing Helpers Tests
// ============================================================

test('Image Processing: centerCropForAspectRatio maintains target ratio', () => {
  // Source is 1000 x 1000 (1:1), Target is 35/45 (0.777)
  const crop = centerCropForAspectRatio(1000, 1000, 35 / 45);
  assert.equal(crop.height, 1000);
  assert.ok(Math.abs(crop.width / crop.height - 35 / 45) < 0.001);
  assert.ok(crop.x > 0, 'Crop is horizontally centered');
  assert.equal(crop.y, 0);
});

test('Image Processing: formatFileSize returns human readable string', () => {
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1024 * 50), '50.0 KB');
  assert.equal(formatFileSize(1024 * 1024 * 2.5), '2.5 MB');
});

// ============================================================
// 5. Color Management (RGB to CMYK / CMY) Tests
// ============================================================

test('Color Management: rgbToCmyk converts primary colors accurately', () => {
  // Pure White (255, 255, 255) -> C:0, M:0, Y:0, K:0
  const white = rgbToCmyk(255, 255, 255);
  assert.equal(white.c, 0);
  assert.equal(white.m, 0);
  assert.equal(white.y, 0);
  assert.equal(white.k, 0);

  // Pure Black (0, 0, 0) -> K: 1
  const black = rgbToCmyk(0, 0, 0);
  assert.equal(black.k, 1);

  // Pure Red (255, 0, 0) -> Cyan: 0, Magenta: 1, Yellow: 1, Black: 0
  const red = rgbToCmyk(255, 0, 0);
  assert.equal(red.c, 0);
  assert.equal(red.m, 1);
  assert.equal(red.y, 1);
  assert.equal(red.k, 0);

  // Pure Cyan (0, 255, 255) -> Cyan: 1, Magenta: 0, Yellow: 0, Black: 0
  const cyan = rgbToCmyk(0, 255, 255);
  assert.equal(cyan.c, 1);
  assert.equal(cyan.m, 0);
  assert.equal(cyan.y, 0);
  assert.equal(cyan.k, 0);
});

test('Color Management: cmykToRgb converts back to sRGB accurately', () => {
  const red = cmykToRgb(0, 1, 1, 0);
  assert.equal(red.r, 255);
  assert.equal(red.g, 0);
  assert.equal(red.b, 0);

  const white = cmykToRgb(0, 0, 0, 0);
  assert.equal(white.r, 255);
  assert.equal(white.g, 255);
  assert.equal(white.b, 255);
});

test('Color Management: simulateCmykProof simulates reflective paper output', () => {
  // Pure bright RGB blue (0, 0, 255) on paper prints darker due to CMY ink absorption
  const proof = simulateCmykProof(0, 0, 255, 'glossy');
  assert.ok(proof.b < 255, 'Blue is compressed to physical ink gamut');
  assert.ok(proof.r >= 0 && proof.g >= 0 && proof.b >= 0);
});

test('Color Management: isOutOfGamut detects ultra-saturated digital colors', () => {
  assert.equal(isOutOfGamut(0, 255, 255), true, 'Hyper-saturated digital cyan is out of CMYK gamut');
  assert.equal(isOutOfGamut(180, 140, 120), false, 'Natural skin tone is inside gamut');
});

// ============================================================
// 6. PDF Processor Tests
// ============================================================

test('PDF Processor: isPdfFile identifies PDF files correctly', () => {
  const pdfMime = { type: 'application/pdf', name: 'eaadhaar.pdf' } as File;
  const pdfExt = { type: '', name: 'pancard.PDF' } as File;
  const jpgFile = { type: 'image/jpeg', name: 'photo.jpg' } as File;

  assert.equal(isPdfFile(pdfMime), true);
  assert.equal(isPdfFile(pdfExt), true);
  assert.equal(isPdfFile(jpgFile), false);
});

test('PDF Processor: PasswordRequiredError is defined and has correct message', () => {
  const err = new PasswordRequiredError();
  assert.equal(err.name, 'PasswordRequiredError');
  assert.ok(err.message.includes('encrypted'));
});

// ============================================================
// 7. 3D LUT & Optimization Tests
// ============================================================

test('Color Management: 3D LUT generates correct array size for 33x33x33 grid', () => {
  const lut = getOrBuildLut3D('glossy');
  const expectedLength = LUT_SIZE * LUT_SIZE * LUT_SIZE * 3;
  assert.equal(lut.length, expectedLength);
  assert.ok(lut[0] >= 0, 'First byte is non-negative');
});

// ============================================================
// 8. Print Engine Hardware Alignment & Bleed Tests
// ============================================================

test('Print Engine: generatePrintHTML renders bleed wrapper and corner crop marks', () => {
  const html = generatePrintHTML({
    paperWidth: 210,
    paperHeight: 297,
    orientation: 'portrait',
    positions: [{ x: 10, y: 10, width: 35, height: 45, row: 0, col: 0 }],
    imageUrl: 'data:image/jpeg;base64,test',
    itemWidth: 35,
    itemHeight: 45,
    bleedMm: 1.5,
    showCropMarks: true,
  });

  assert.ok(html.includes('photo-cell-wrapper'), 'Contains photo cell wrapper for bleed');
  assert.ok(html.includes('crop-mark tl'), 'Contains top-left corner crop mark');
  assert.ok(html.includes('crop-mark br'), 'Contains bottom-right corner crop mark');
  assert.ok(html.includes('38mm'), 'Renders width expanded by 2 x 1.5mm bleed (35 + 3 = 38mm)');
});

test('Print Engine: generateIDCardPrintHTML renders bleed and crop marks on sheet', () => {
  const html = generateIDCardPrintHTML({
    paperWidth: 210,
    paperHeight: 297,
    orientation: 'portrait',
    cardWidth: 85.6,
    cardHeight: 53.98,
    frontImageUrl: 'data:image/jpeg;base64,front',
    bleedMm: 1.0,
    showCropMarks: true,
  });

  assert.ok(html.includes('card-cell-wrapper'), 'Contains card cell wrapper for bleed');
  assert.ok(html.includes('crop-mark tl'), 'Contains corner crop mark');
});

test('Templates: getDefaultPaperSettings for 4x6 defaults to horizontal landscape for 8 photos', () => {
  const { getDefaultPaperSettings, DEFAULT_PHOTO_BORDER } = require('../templates');
  const settings = getDefaultPaperSettings('4x6');
  assert.equal(settings.orientation, 'landscape');
  assert.equal(settings.horizontalGap, 2);
  assert.equal(settings.verticalGap, 2);
  assert.equal(settings.marginLeft, 3.2);
  assert.equal(settings.marginRight, 3.2);

  assert.equal(DEFAULT_PHOTO_BORDER.enabled, true);
  assert.equal(DEFAULT_PHOTO_BORDER.width, 0.5);
  assert.equal(DEFAULT_PHOTO_BORDER.style, 'solid');
  assert.equal(DEFAULT_PHOTO_BORDER.color, '#000000');
});

test('Print Engine: generatePrintHTML generates passport cutting border when photoBorder is configured', () => {
  const html = generatePrintHTML({
    paperWidth: 152.4,
    paperHeight: 101.6,
    orientation: 'landscape',
    positions: [{ x: 3.2, y: 4.8, width: 35, height: 45, row: 0, col: 0 }],
    imageUrl: 'data:image/jpeg;base64,sample',
    itemWidth: 35,
    itemHeight: 45,
    photoBorder: {
      enabled: true,
      width: 0.5,
      style: 'solid',
      color: '#000000',
    },
  });

  assert.ok(html.includes('border: 0.5mm solid #000000; box-sizing: border-box;'), 'Contains CSS border style for photo');
});

test('Print Engine: generatePrintHTML supports dashed and double photo border styles', () => {
  const html = generatePrintHTML({
    paperWidth: 152.4,
    paperHeight: 101.6,
    orientation: 'landscape',
    positions: [{ x: 3.2, y: 4.8, width: 35, height: 45, row: 0, col: 0 }],
    imageUrl: 'data:image/jpeg;base64,sample',
    itemWidth: 35,
    itemHeight: 45,
    photoBorder: {
      enabled: true,
      width: 1.0,
      style: 'dashed',
      color: '#E05A47',
    },
  });

  assert.ok(html.includes('border: 1mm dashed #E05A47; box-sizing: border-box;'), 'Contains custom dashed border');
});


