import test from 'node:test';
import assert from 'node:assert/strict';
import { isPdfFile, pdfPageToEditorImage, type PdfPageResult } from '../pdf-processor';

test('isPdfFile: correctly identifies standard application/pdf file', () => {
  const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
  assert.equal(isPdfFile(file), true);
});

test('isPdfFile: identifies PDF with uppercase extension .PDF', () => {
  const file = new File(['dummy content'], 'EAADHAAR_SAMPLE.PDF', { type: '' });
  assert.equal(isPdfFile(file), true);
});

test('isPdfFile: identifies PDF with application/x-pdf MIME type', () => {
  const file = new File(['dummy content'], 'pan_card.bin', { type: 'application/x-pdf' });
  assert.equal(isPdfFile(file), true);
});

test('isPdfFile: identifies PDF with generic octet-stream MIME but .pdf extension', () => {
  const file = new File(['dummy content'], 'driving_licence.pdf', { type: 'application/octet-stream' });
  assert.equal(isPdfFile(file), true);
});

test('isPdfFile: rejects non-PDF image and text files', () => {
  const jpgFile = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
  const pngFile = new File(['dummy'], 'scan.png', { type: 'image/png' });
  const txtFile = new File(['dummy'], 'notes.txt', { type: 'text/plain' });

  assert.equal(isPdfFile(jpgFile), false);
  assert.equal(isPdfFile(pngFile), false);
  assert.equal(isPdfFile(txtFile), false);
});

test('pdfPageToEditorImage: correctly maps PdfPageResult to EditorImage', () => {
  const dummyFile = new File(['pdf data'], 'aadhaar_card.pdf', { type: 'application/pdf' });
  const pageResult: PdfPageResult = {
    pageNumber: 2,
    dataUrl: 'blob:http://localhost:3000/test-uuid-blob',
    thumbnailUrl: 'data:image/jpeg;base64,samplethumb',
    width: 2480,
    height: 3508,
    name: 'aadhaar_card (Page 2)',
  };

  const editorImg = pdfPageToEditorImage(pageResult, dummyFile);

  assert.equal(editorImg.name, 'aadhaar_card (Page 2)');
  assert.equal(editorImg.isPdf, true);
  assert.equal(editorImg.pdfPageNumber, 2);
  assert.equal(editorImg.width, 2480);
  assert.equal(editorImg.height, 3508);
  assert.equal(editorImg.objectUrl, 'blob:http://localhost:3000/test-uuid-blob');
  assert.equal(editorImg.thumbnailUrl, 'data:image/jpeg;base64,samplethumb');
  assert.ok(editorImg.id.startsWith('pdf-page-'));
});
