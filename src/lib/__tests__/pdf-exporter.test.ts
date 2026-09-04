import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportPhotoLayoutToPDF,
  exportIDCardSheetToPDF,
  exportPVCCardToPDF,
} from '../pdf-exporter';

// 1x1 black JPEG in base64
const sampleDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

test('PDF Exporter: generates multi-photo A4 sheet PDF', async () => {
  const doc = await exportPhotoLayoutToPDF({
    paperWidth: 210,
    paperHeight: 297,
    orientation: 'portrait',
    positions: [
      { x: 10, y: 10, width: 35, height: 45, row: 0, col: 0 },
      { x: 50, y: 10, width: 35, height: 45, row: 0, col: 1 },
    ],
    imageUrl: sampleDataUrl,
    itemWidth: 35,
    itemHeight: 45,
    showCuttingMarks: true,
    showCropMarks: true,
    bleedMm: 1.0,
    filename: 'test_photos.pdf',
  });

  assert.ok(doc, 'jsPDF instance created');
  assert.equal(doc.getNumberOfPages(), 1, 'Should have 1 page');
  const pageSize = doc.internal.pageSize;
  assert.equal(Math.round(pageSize.getWidth()), 210, 'Width is 210mm');
  assert.equal(Math.round(pageSize.getHeight()), 297, 'Height is 297mm');
});

test('PDF Exporter: generates ID card sheet PDF with front and back positions', async () => {
  const doc = await exportIDCardSheetToPDF({
    paperWidth: 210,
    paperHeight: 297,
    orientation: 'portrait',
    cardWidth: 85.6,
    cardHeight: 53.98,
    positions: [
      {
        front: { x: 15, y: 15, width: 85.6, height: 53.98, row: 0, col: 0 },
        back: { x: 15, y: 75, width: 85.6, height: 53.98, row: 1, col: 0 },
      },
    ],
    frontImageUrl: sampleDataUrl,
    backImageUrl: sampleDataUrl,
    showCuttingMarks: true,
    showCropMarks: true,
    bleedMm: 0.5,
    templateName: 'Aadhaar_Card',
    filename: 'test_id_sheet.pdf',
  });

  assert.ok(doc, 'jsPDF instance created');
  assert.equal(doc.getNumberOfPages(), 1, 'Should have 1 page');
  const pageSize = doc.internal.pageSize;
  assert.equal(Math.round(pageSize.getWidth()), 210, 'Width is 210mm');
  assert.equal(Math.round(pageSize.getHeight()), 297, 'Height is 297mm');
});

test('PDF Exporter: generates 2-page CR80 PVC Card PDF', async () => {
  const doc = await exportPVCCardToPDF({
    cardWidth: 85.6,
    cardHeight: 53.98,
    frontImageUrl: sampleDataUrl,
    backImageUrl: sampleDataUrl,
    filename: 'test_pvc_card.pdf',
  });

  assert.ok(doc, 'jsPDF instance created');
  assert.equal(doc.getNumberOfPages(), 2, 'Should have 2 pages (Front and Back)');
  const pageSize = doc.internal.pageSize;
  assert.equal(Math.round(pageSize.getWidth()), 86, 'Width is ~85.6mm');
  assert.equal(Math.round(pageSize.getHeight()), 54, 'Height is ~53.98mm');
});
