import { test } from 'node:test';
import assert from 'node:assert';
import {
  PHOTO_TEMPLATES,
  ID_CARD_TEMPLATES,
  getPhotoTemplate,
  getIDCardTemplate,
} from '../templates';
import {
  calculateBiometricCropBox,
  type DetectedFaceBox,
} from '../image-processing';
import {
  mapMultiCustomerSlots,
  type MultiCustomerPhotoItem,
  type LayoutPosition,
} from '../layout-engine';

test('Expanded Presets: Indian and International photo presets exist with biometric metadata', () => {
  const indianPassport = getPhotoTemplate('passport-photo-india');
  assert.ok(indianPassport, 'Indian passport template must exist');
  assert.strictEqual(indianPassport.country, 'IN');
  assert.strictEqual(indianPassport.width, 35);
  assert.strictEqual(indianPassport.height, 45);
  assert.strictEqual(indianPassport.backgroundRule, 'white');
  assert.ok(indianPassport.guidelineBadges?.includes('White BG'));
  assert.ok(indianPassport.guidelineBadges?.includes('70–80% Face'));

  const usPassport = getPhotoTemplate('passport-photo-us');
  assert.ok(usPassport, 'US passport template must exist');
  assert.strictEqual(usPassport.country, 'US');
  assert.strictEqual(usPassport.width, 50.8);
  assert.strictEqual(usPassport.height, 50.8);
  assert.ok(usPassport.guidelineBadges?.includes('50–69% Face'));

  const schengen = getPhotoTemplate('visa-schengen');
  assert.ok(schengen, 'Schengen visa template must exist');
  assert.strictEqual(schengen.country, 'EU');
  assert.strictEqual(schengen.backgroundRule, 'light-gray');

  const canada = getPhotoTemplate('passport-canada');
  assert.ok(canada, 'Canada PR template must exist');
  assert.strictEqual(canada.width, 50);
  assert.strictEqual(canada.height, 70);

  const malaysia = getPhotoTemplate('passport-malaysia');
  assert.ok(malaysia, 'Malaysia passport template must exist');
  assert.strictEqual(malaysia.backgroundRule, 'blue');
});

test('Expanded Presets: Ayushman Bharat, E-Shram, and Voter ID exist with CR80 dimensions', () => {
  const ayushman = getIDCardTemplate('ayushman-bharat');
  assert.ok(ayushman, 'Ayushman Bharat card preset must exist');
  assert.strictEqual(ayushman.width, 85.6);
  assert.strictEqual(ayushman.height, 53.98);
  assert.strictEqual(ayushman.country, 'IN');
  assert.ok(ayushman.guidelineBadges?.includes('CR80 PVC'));

  const eshram = getIDCardTemplate('e-shram-card');
  assert.ok(eshram, 'E-Shram card preset must exist');
  assert.strictEqual(eshram.country, 'IN');

  const voter = getIDCardTemplate('voter-id');
  assert.ok(voter, 'Voter ID card preset must exist');
  assert.strictEqual(voter.country, 'IN');
});

test('Biometric Alignment: calculateBiometricCropBox centers face and adheres to coverage ratio', () => {
  const imageWidth = 1000;
  const imageHeight = 1200;
  const faceBox: DetectedFaceBox = {
    x: 400,
    y: 300,
    width: 200,
    height: 250,
  };

  const targetAspectRatio = 35 / 45;
  const crop = calculateBiometricCropBox(imageWidth, imageHeight, faceBox, targetAspectRatio, 0.75);

  assert.ok(crop.width > 0, 'Crop width must be positive');
  assert.ok(crop.height > 0, 'Crop height must be positive');
  assert.ok(crop.x >= 0, 'Crop X must not be negative');
  assert.ok(crop.y >= 0, 'Crop Y must not be negative');
  assert.ok(crop.x + crop.width <= imageWidth, 'Crop must fit horizontally');
  assert.ok(crop.y + crop.height <= imageHeight, 'Crop must fit vertically');

  // Verify aspect ratio precision
  const ratio = crop.width / crop.height;
  assert.ok(Math.abs(ratio - targetAspectRatio) < 0.02, 'Crop aspect ratio must match target');

  // Verify horizontal centering over face
  const faceCenterX = faceBox.x + faceBox.width / 2;
  const cropCenterX = crop.x + crop.width / 2;
  assert.ok(Math.abs(cropCenterX - faceCenterX) < 5, 'Crop box must be horizontally centered over face');
});

test('Multi-Customer Mix & Match: mapMultiCustomerSlots distributes photos accurately', () => {
  const positions: LayoutPosition[] = [
    { x: 10, y: 10, width: 35, height: 45, row: 0, col: 0 },
    { x: 50, y: 10, width: 35, height: 45, row: 0, col: 1 },
    { x: 90, y: 10, width: 35, height: 45, row: 0, col: 2 },
    { x: 130, y: 10, width: 35, height: 45, row: 0, col: 3 },
    { x: 10, y: 60, width: 35, height: 45, row: 1, col: 0 },
    { x: 50, y: 60, width: 35, height: 45, row: 1, col: 1 },
    { x: 90, y: 60, width: 35, height: 45, row: 1, col: 2 },
    { x: 130, y: 60, width: 35, height: 45, row: 1, col: 3 },
  ]; // 8 slots

  const customers: MultiCustomerPhotoItem[] = [
    { id: 'cust-1', name: 'Alice', imageUrl: 'blob:cust-1', copies: 4 },
    { id: 'cust-2', name: 'Bob', imageUrl: 'blob:cust-2', copies: 4 },
  ];

  const slots = mapMultiCustomerSlots(positions, customers);
  assert.strictEqual(slots.length, 8, 'Must map all 8 slots');

  // First 4 slots should be Alice
  for (let i = 0; i < 4; i++) {
    assert.strictEqual(slots[i].imageId, 'cust-1');
    assert.strictEqual(slots[i].imageName, 'Alice');
  }

  // Next 4 slots should be Bob
  for (let i = 4; i < 8; i++) {
    assert.strictEqual(slots[i].imageId, 'cust-2');
    assert.strictEqual(slots[i].imageName, 'Bob');
  }

  // Test slot manual override
  const slotsWithOverride = mapMultiCustomerSlots(positions, customers, { 0: 'cust-2' });
  assert.strictEqual(slotsWithOverride[0].imageId, 'cust-2', 'Slot 0 should respect manual override');
});
