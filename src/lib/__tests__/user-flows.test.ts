import test from 'node:test';
import assert from 'node:assert/strict';

import { useEditorStore, type EditorImage } from '../../store/editor-store';
import {
  getPhotoTemplate,
  getIDCardTemplate,
  getPaperSize,
  getEffectivePaperDimensions,
  getDefaultPaperSettings,
} from '../templates';
import {
  calculateLayout,
  calculateIDCardLayout,
  mapMultiCustomerSlots,
  type MultiCustomerPhotoItem,
} from '../layout-engine';
import { EXAM_FORM_PRESETS } from '../digital-form-exporter';
import { generatePrintHTML, generateIDCardPrintHTML } from '../print';

// Helper to create mock EditorImage objects
function createMockEditorImage(id: string, name: string): EditorImage {
  return {
    id,
    name,
    file: {} as File,
    width: 1200,
    height: 1600,
    size: 250000,
    type: 'image/jpeg',
    objectUrl: `blob:http://localhost:3000/${id}`,
    thumbnailUrl: `blob:http://localhost:3000/${id}-thumb`,
    copies: 4,
  };
}

// ============================================================
// 1. Editor Store Initialization & Default Template Tests
// ============================================================

test('User Flow: Editor store initializes with default photo template (prevents freeform crop bug)', () => {
  useEditorStore.getState().reset();
  const state = useEditorStore.getState();

  assert.equal(state.mode, 'photo');
  assert.equal(state.step, 'upload');
  assert.equal(state.selectedTemplateId, 'passport-photo-india', 'Must default to Indian Passport');
  assert.equal(state.selectedTemplateType, 'photo');

  const tmpl = getPhotoTemplate(state.selectedTemplateId!);
  assert.ok(tmpl, 'Default photo template must resolve');
  assert.equal(tmpl?.width, 35);
  assert.equal(tmpl?.height, 45);
  assert.ok(Math.abs(tmpl!.aspectRatio - 35 / 45) < 0.001);
});

test('User Flow: Template switching updates template, paper settings, and copies appropriately', () => {
  useEditorStore.getState().reset();
  const store = useEditorStore.getState();

  // Switch to US Visa 2x2 inch
  store.setSelectedTemplate('passport-photo-us', 'photo');
  let state = useEditorStore.getState();
  assert.equal(state.selectedTemplateId, 'passport-photo-us');
  let tmpl = getPhotoTemplate('passport-photo-us');
  assert.equal(tmpl?.width, 50.8);
  assert.equal(tmpl?.height, 50.8);
  assert.equal(tmpl?.aspectRatio, 1);

  // Switch to standard 4x6 Photo
  store.setSelectedTemplate('photo-4x6', 'photo');
  state = useEditorStore.getState();
  assert.equal(state.selectedTemplateId, 'photo-4x6');
  assert.equal(state.paperSettings.paperId, '4x6');
  assert.equal(state.paperSettings.orientation, 'portrait', '4x6 photo print defaults to portrait');
  assert.equal(state.copies, 1, '4x6 standard photo defaults to 1 copy');

  // Switch to Stamp Size photo
  store.setSelectedTemplate('stamp-photo', 'photo');
  state = useEditorStore.getState();
  assert.equal(state.selectedTemplateId, 'stamp-photo');
  tmpl = getPhotoTemplate('stamp-photo');
  assert.equal(tmpl?.width, 20);
  assert.equal(tmpl?.height, 25);
});

// ============================================================
// 2. Multi-Image Queue & State Synchronization Tests
// ============================================================

test('User Flow: Multi-person queue synchronizes croppedImageUrl on selection without state leakage', () => {
  useEditorStore.getState().reset();

  const img1 = createMockEditorImage('person-1', 'Alice.jpg');
  const img2 = createMockEditorImage('person-2', 'Bob.jpg');

  useEditorStore.getState().addImages([img1, img2]);
  let state = useEditorStore.getState();
  assert.equal(state.images.length, 2);
  assert.equal(state.selectedImageIndex, 0);
  assert.equal(state.croppedImageUrl, null);

  // Crop Person 1
  const cropUrl1 = 'blob:http://localhost:3000/cropped-person-1';
  useEditorStore.getState().setCroppedImageUrl(cropUrl1);
  state = useEditorStore.getState();
  assert.equal(state.croppedImageUrl, cropUrl1);
  assert.equal(state.images[0].croppedImageUrl, cropUrl1);

  // Switch to Person 2 (Bob)
  useEditorStore.getState().selectImage(1);
  state = useEditorStore.getState();
  assert.equal(state.selectedImageIndex, 1);
  assert.equal(state.croppedImageUrl, null, 'Person 2 has not been cropped yet, must NOT leak Person 1 crop URL');

  // Crop Person 2
  const cropUrl2 = 'blob:http://localhost:3000/cropped-person-2';
  useEditorStore.getState().setCroppedImageUrl(cropUrl2);
  state = useEditorStore.getState();
  assert.equal(state.croppedImageUrl, cropUrl2);
  assert.equal(state.images[1].croppedImageUrl, cropUrl2);

  // Switch back to Person 1
  useEditorStore.getState().selectImage(0);
  state = useEditorStore.getState();
  assert.equal(state.selectedImageIndex, 0);
  assert.equal(state.croppedImageUrl, cropUrl1, 'Switching back to Person 1 must restore Person 1 crop URL');
});

test('User Flow: Removing an image cleanly updates active selection and avoids orphaned cropped URLs', () => {
  useEditorStore.getState().reset();

  const img1 = createMockEditorImage('cust-1', 'Customer1.jpg');
  const img2 = createMockEditorImage('cust-2', 'Customer2.jpg');

  useEditorStore.getState().addImages([img1, img2]);
  useEditorStore.getState().setCroppedImageUrl('blob:http://localhost:3000/cust-1-cropped');

  // Remove active image (index 0)
  useEditorStore.getState().removeImage(0);
  let state = useEditorStore.getState();
  assert.equal(state.images.length, 1);
  assert.equal(state.selectedImageIndex, 0);
  assert.equal(state.images[0].id, 'cust-2');
  assert.equal(state.croppedImageUrl, null, 'Removing cropped image must reset active crop URL if new selection is uncropped');

  // Remove the remaining image
  useEditorStore.getState().removeImage(0);
  state = useEditorStore.getState();
  assert.equal(state.images.length, 0);
  assert.equal(state.croppedImageUrl, null);
});

// ============================================================
// 3. Dynamic Layout Derivation Tests (Header Print Sheet & Shortcuts)
// ============================================================

test('User Flow: Print Preview dynamically derives layout without requiring PaperSelector mount', () => {
  useEditorStore.getState().reset();

  const store = useEditorStore.getState();
  // Simulate direct navigation to editor with Indian Passport template
  store.setSelectedTemplate('passport-photo-india', 'photo');
  const paper = getPaperSize(store.paperSettings.paperId);
  const tmpl = getPhotoTemplate(store.selectedTemplateId!);

  assert.ok(paper, 'Paper A4 must exist');
  assert.ok(tmpl, 'Indian Passport template must exist');
  assert.equal(store.layoutResult, null, 'layoutResult is initially null before paper selector');

  // Dynamically derive layout (as implemented in PrintPreview & LayoutPreview)
  const dims = getEffectivePaperDimensions(paper!, store.paperSettings.orientation);
  const effectiveLayout = calculateLayout({
    paperWidth: dims.width,
    paperHeight: dims.height,
    itemWidth: tmpl!.width,
    itemHeight: tmpl!.height,
    marginTop: store.paperSettings.marginTop,
    marginRight: store.paperSettings.marginRight,
    marginBottom: store.paperSettings.marginBottom,
    marginLeft: store.paperSettings.marginLeft,
    horizontalGap: store.paperSettings.horizontalGap,
    verticalGap: store.paperSettings.verticalGap,
    maxCopies: store.copies,
  });

  assert.ok(effectiveLayout.totalItems > 0, 'Must calculate items on A4 sheet');
  assert.equal(effectiveLayout.totalItems, 8, 'Default 8 copies requested must yield 8 items');
  assert.equal(effectiveLayout.positions.length, 8);

  // Generate printable HTML to verify no exceptions
  const html = generatePrintHTML({
    paperWidth: dims.width,
    paperHeight: dims.height,
    orientation: store.paperSettings.orientation,
    positions: effectiveLayout.positions,
    imageUrl: 'blob:http://localhost:3000/test-photo',
    itemWidth: tmpl!.width,
    itemHeight: tmpl!.height,
    photoBorder: store.photoBorder,
  });

  assert.ok(html.includes('photo-cell-wrapper'));
  assert.ok(html.includes('35mm'));
  assert.ok(html.includes('45mm'));
});

// ============================================================
// 4. Multi-Customer Mix & Match Real-World Edge Cases
// ============================================================

test('User Flow: Mix & Match distributes photos across odd grid sizes and customer counts', () => {
  // 6 slots on 4x6 paper
  const mockPositions = [
    { x: 3.2, y: 4.8, width: 35, height: 45, row: 0, col: 0 },
    { x: 40.2, y: 4.8, width: 35, height: 45, row: 0, col: 1 },
    { x: 77.2, y: 4.8, width: 35, height: 45, row: 0, col: 2 },
    { x: 3.2, y: 51.8, width: 35, height: 45, row: 1, col: 0 },
    { x: 40.2, y: 51.8, width: 35, height: 45, row: 1, col: 1 },
    { x: 77.2, y: 51.8, width: 35, height: 45, row: 1, col: 2 },
  ];

  const items: MultiCustomerPhotoItem[] = [
    { id: 'c1', name: 'Cust 1', imageUrl: 'url-1', copies: 2 },
    { id: 'c2', name: 'Cust 2', imageUrl: 'url-2', copies: 4 },
  ];

  // Distribute 2 copies for c1 and 4 copies for c2 = exactly 6 slots
  const slots = mapMultiCustomerSlots(mockPositions, items);
  assert.equal(slots.length, 6);
  assert.equal(slots[0].imageId, 'c1');
  assert.equal(slots[1].imageId, 'c1');
  assert.equal(slots[2].imageId, 'c2');
  assert.equal(slots[3].imageId, 'c2');
  assert.equal(slots[4].imageId, 'c2');
  assert.equal(slots[5].imageId, 'c2');

  // Manual slot override (e.g. cybercafé operator swaps slot 0 to Cust 2)
  const overridden = mapMultiCustomerSlots(mockPositions, items, { 0: 'c2' });
  assert.equal(overridden[0].imageId, 'c2', 'Slot 0 must be overridden to c2');
  assert.equal(overridden[1].imageId, 'c1');
});

// ============================================================
// 5. ID Card & PVC Single Side Workflow Tests
// ============================================================

test('User Flow: ID Card mode calculates PVC CR80 and standard sheet layouts', () => {
  const aadhaar = getIDCardTemplate('aadhaar-card');
  assert.ok(aadhaar);
  assert.equal(aadhaar?.width, 85.6);
  assert.equal(aadhaar?.height, 53.98);

  // Standard sheet print (stacked front & back) on A4
  const a4Sheet = calculateIDCardLayout({
    paperWidth: 210,
    paperHeight: 297,
    cardWidth: aadhaar!.width,
    cardHeight: aadhaar!.height,
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
    horizontalGap: 5,
    verticalGap: 5,
    frontBackGap: 5,
    arrangement: 'stacked',
    copies: 5,
  });

  assert.ok(a4Sheet.totalSets >= 4, 'A4 sheet should fit at least 4 stacked ID card sets');
  assert.equal(a4Sheet.positions[0].front.width, 85.6);

  // Generate ID Card Print HTML
  const printHtml = generateIDCardPrintHTML({
    paperWidth: 210,
    paperHeight: 297,
    orientation: 'portrait',
    cardWidth: 85.6,
    cardHeight: 53.98,
    frontImageUrl: 'blob:http://localhost:3000/id-front',
    backImageUrl: 'blob:http://localhost:3000/id-back',
    showCuttingMarks: true,
  });

  assert.ok(printHtml.includes('card-cell-wrapper'));
  assert.ok(printHtml.includes('id-front'));
  assert.ok(printHtml.includes('id-back'));
});

// ============================================================
// 6. Online Government Form Exporter Sanity & Presets Tests
// ============================================================

test('User Flow: Government Form Exporter presets have valid dimensions and KB boundaries', () => {
  assert.ok(EXAM_FORM_PRESETS.length >= 15, 'Must provide presets for major exams');

  for (const p of EXAM_FORM_PRESETS) {
    assert.ok(p.id && p.name && p.category, `Preset ${p.id} missing basic metadata`);
    assert.ok(p.width > 50 && p.width < 1000, `Preset ${p.id} width out of reasonable range: ${p.width}`);
    assert.ok(p.height > 50 && p.height < 1000, `Preset ${p.id} height out of reasonable range: ${p.height}`);
    assert.ok(p.targetMaxKb > 0, `Preset ${p.id} targetMaxKb must be > 0`);
    assert.ok(p.targetMinKb >= 0, `Preset ${p.id} targetMinKb must be >= 0`);
    assert.ok(p.targetMaxKb >= p.targetMinKb, `Preset ${p.id} targetMaxKb must be >= targetMinKb`);
  }

  // Verify SSC CGL specific rules
  const sscPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'ssc-photo');
  assert.ok(sscPhoto);
  assert.equal(sscPhoto?.targetMaxKb, 50);
  assert.equal(sscPhoto?.targetMinKb, 20);

  const sscSig = EXAM_FORM_PRESETS.find(p => p.id === 'ssc-sign');
  assert.ok(sscSig);
  assert.equal(sscSig?.targetMaxKb, 20);
  assert.equal(sscSig?.targetMinKb, 10);
});
