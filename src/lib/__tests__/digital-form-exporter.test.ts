import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXAM_FORM_PRESETS,
  cleanSignatureCanvas,
  drawNameDateBanner,
  compressCanvasToTargetKb,
} from '../digital-form-exporter';

// Mock Canvas for Node test environment
class MockCanvas {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  getContext(type: string) {
    if (type !== '2d') return null;
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      drawImage: (src: MockCanvas) => {
        if (src.data) {
          const len = Math.min(this.data.length, src.data.length);
          for (let i = 0; i < len; i++) this.data[i] = src.data[i];
        }
      },
      getImageData: (x: number, y: number, w: number, h: number) => {
        return { data: this.data };
      },
      putImageData: (imgData: { data: Uint8ClampedArray }) => {
        this.data.set(imgData.data);
      },
    };
  }

  toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
    // Generate a mock blob whose size in KB is proportional to quality:
    // e.g. quality 0.8 => 18 KB
    const simulatedKb = Math.max(8, Math.round(quality * 24));
    const dummyBytes = new Uint8Array(simulatedKb * 1024);
    const blob = new Blob([dummyBytes], { type: 'image/jpeg' });
    callback(blob);
  }
}

// Ensure mock document.createElement for canvas is registered
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return new MockCanvas(350, 450);
      return {};
    },
  };
}

if (typeof (globalThis as any).URL === 'undefined' || !(globalThis as any).URL.createObjectURL) {
  (globalThis as any).URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {},
  };
}

test('EXAM_FORM_PRESETS: comprehensive coverage for all major government exams and documents', () => {
  // Presets database must have at least 25 official presets
  assert.ok(EXAM_FORM_PRESETS.length >= 25, `Found ${EXAM_FORM_PRESETS.length} presets, expected >= 25`);

  const photos = EXAM_FORM_PRESETS.filter(p => p.type === 'photo');
  const signatures = EXAM_FORM_PRESETS.filter(p => p.type === 'signature');
  const thumbs = EXAM_FORM_PRESETS.filter(p => p.type === 'thumb');

  assert.ok(photos.length >= 12, 'Must have at least 12 photograph presets');
  assert.ok(signatures.length >= 10, 'Must have at least 10 signature presets');
  assert.ok(thumbs.length >= 2, 'Must have thumb impression presets');

  // SSC Photo and Signature checks
  const sscPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'ssc-photo');
  assert.ok(sscPhoto, 'SSC Photo preset exists');
  assert.equal(sscPhoto?.targetMinKb, 20);
  assert.equal(sscPhoto?.targetMaxKb, 50);
  assert.equal(sscPhoto?.width, 350);
  assert.equal(sscPhoto?.height, 450);

  const sscSign = EXAM_FORM_PRESETS.find(p => p.id === 'ssc-sign');
  assert.ok(sscSign, 'SSC Signature preset exists');
  assert.equal(sscSign?.targetMinKb, 10);
  assert.equal(sscSign?.targetMaxKb, 20);
  assert.equal(sscSign?.width, 280);
  assert.equal(sscSign?.height, 120);

  // UPSC Photo and Signature checks
  const upscPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'upsc-photo');
  assert.ok(upscPhoto, 'UPSC Photo preset exists');
  assert.equal(upscPhoto?.supportsNameDate, true, 'UPSC must support Name & Date strip');
  assert.equal(upscPhoto?.targetMaxKb, 50);

  const upscSign = EXAM_FORM_PRESETS.find(p => p.id === 'upsc-sign');
  assert.ok(upscSign, 'UPSC Sign preset exists');
  assert.equal(upscSign?.targetMaxKb, 100);

  // IBPS / SBI Banking checks
  const ibpsPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'ibps-photo');
  assert.ok(ibpsPhoto, 'IBPS Photo preset exists');
  assert.equal(ibpsPhoto?.width, 200);
  assert.equal(ibpsPhoto?.height, 230);
  assert.equal(ibpsPhoto?.targetMaxKb, 50);

  const ibpsSign = EXAM_FORM_PRESETS.find(p => p.id === 'ibps-sign');
  assert.ok(ibpsSign, 'IBPS Sign preset exists');
  assert.equal(ibpsSign?.targetMinKb, 10);
  assert.equal(ibpsSign?.targetMaxKb, 20, 'IBPS strictly rejects > 20 KB signatures');

  // Sarathi Parivahan (Driving License) strict 10–20 KB requirement
  const sarathiPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'sarathi-photo');
  assert.ok(sarathiPhoto, 'Sarathi DL Photo exists');
  assert.equal(sarathiPhoto?.targetMinKb, 10);
  assert.equal(sarathiPhoto?.targetMaxKb, 20);

  const sarathiSign = EXAM_FORM_PRESETS.find(p => p.id === 'sarathi-sign');
  assert.ok(sarathiSign, 'Sarathi DL Sign exists');
  assert.equal(sarathiSign?.targetMinKb, 10);
  assert.equal(sarathiSign?.targetMaxKb, 20);

  // PAN Card (NSDL/UTIITSL) checks
  const panPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'pan-photo');
  assert.ok(panPhoto, 'PAN Photo exists');
  assert.equal(panPhoto?.width, 213);
  assert.equal(panPhoto?.height, 213);

  // NTA NEET/JEE Main checks
  const ntaPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'nta-neet-jee-photo');
  assert.ok(ntaPhoto, 'NTA Photo exists');
  assert.equal(ntaPhoto?.supportsNameDate, true);

  const ntaSign = EXAM_FORM_PRESETS.find(p => p.id === 'nta-neet-jee-sign');
  assert.ok(ntaSign, 'NTA Sign exists');
  assert.equal(ntaSign?.targetMaxKb, 50);

  // RRB Railways checks
  const rrbPhoto = EXAM_FORM_PRESETS.find(p => p.id === 'rrb-photo');
  assert.ok(rrbPhoto, 'RRB Photo exists');
  assert.equal(rrbPhoto?.targetMaxKb, 70);

  // Agniveer Defence checks
  const defencePhoto = EXAM_FORM_PRESETS.find(p => p.id === 'defence-photo');
  assert.ok(defencePhoto, 'Defence Agniveer Photo exists');

  const defenceSign = EXAM_FORM_PRESETS.find(p => p.id === 'defence-sign');
  assert.ok(defenceSign, 'Defence Agniveer Sign exists');

  // US Visa checks
  const usVisa = EXAM_FORM_PRESETS.find(p => p.id === 'us-visa-photo');
  assert.ok(usVisa, 'US Visa exists');
  assert.equal(usVisa?.width, 600);
  assert.equal(usVisa?.height, 600);
});

test('cleanSignatureCanvas: eliminates room shadows and turns paper into crisp pure white (#FFFFFF)', () => {
  const w = 40;
  const h = 20;
  const mockCanvas = new MockCanvas(w, h);

  // Fill canvas with greyish/yellowish camera room cast paper: (215, 210, 200)
  for (let i = 0; i < w * h; i++) {
    mockCanvas.data[i * 4] = 215;
    mockCanvas.data[i * 4 + 1] = 210;
    mockCanvas.data[i * 4 + 2] = 200;
    mockCanvas.data[i * 4 + 3] = 255;
  }

  // Draw signature stroke in black/blue ink at (20, 10): (30, 30, 70)
  const inkIdx = (10 * w + 20) * 4;
  mockCanvas.data[inkIdx] = 30;
  mockCanvas.data[inkIdx + 1] = 30;
  mockCanvas.data[inkIdx + 2] = 70;
  mockCanvas.data[inkIdx + 3] = 255;

  cleanSignatureCanvas(mockCanvas as unknown as HTMLCanvasElement);

  // 1. Paper background corner at (0, 0) must be converted to pure 255 white
  assert.equal(mockCanvas.data[0], 255, 'Paper Red converted to 255');
  assert.equal(mockCanvas.data[1], 255, 'Paper Green converted to 255');
  assert.equal(mockCanvas.data[2], 255, 'Paper Blue converted to 255');

  // 2. Ink pixel at (20, 10) must be preserved and deepened (darkened)
  assert.ok(mockCanvas.data[inkIdx] <= 30, 'Ink red remains dark');
  assert.ok(mockCanvas.data[inkIdx + 1] <= 30, 'Ink green remains dark');
});

test('drawNameDateBanner: executes without errors and calculates layout', () => {
  const mockCanvas = new MockCanvas(350, 450);
  const ctx = mockCanvas.getContext('2d')!;

  // Should handle both candidate name and date of photo
  drawNameDateBanner(ctx as unknown as CanvasRenderingContext2D, 350, 450, 'AMIT KUMAR', '07/09/2026');

  // Should handle name only
  drawNameDateBanner(ctx as unknown as CanvasRenderingContext2D, 350, 450, 'PRIYA VERMA', undefined);

  // Should handle date only
  drawNameDateBanner(ctx as unknown as CanvasRenderingContext2D, 350, 450, undefined, '01/01/2026');

  // Should handle empty inputs gracefully
  drawNameDateBanner(ctx as unknown as CanvasRenderingContext2D, 350, 450, undefined, undefined);
});

test('compressCanvasToTargetKb: performs binary search to achieve target KB window', async () => {
  const mockCanvas = new MockCanvas(280, 120);

  const result = await compressCanvasToTargetKb(mockCanvas as unknown as HTMLCanvasElement, {
    targetMinKb: 10,
    targetMaxKb: 20,
    width: 280,
    height: 120,
    cleanSignature: true,
  });

  assert.ok(result, 'Result is returned');
  assert.ok(result.sizeKb >= 10 && result.sizeKb <= 20, `File size ${result.sizeKb} KB is within 10–20 KB`);
  assert.equal(result.width, 280);
  assert.equal(result.height, 120);
  assert.equal(result.isCompliant, true);
  assert.ok(result.complianceNotes.length > 0);
});
