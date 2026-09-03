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

test('Layout Engine: Passport photos on 4x6 inch paper (101.6x152.4mm)', () => {
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
