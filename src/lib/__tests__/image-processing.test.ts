import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceImageBackground } from '../image-processing';

// Polyfill minimal canvas for Node environment if document is missing
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
      drawImage: (src: MockCanvas) => {
        this.data.set(src.data);
      },
      getImageData: (x: number, y: number, w: number, h: number) => {
        return { data: this.data };
      },
      putImageData: (imgData: { data: Uint8ClampedArray }) => {
        this.data.set(imgData.data);
      },
    };
  }
}

test('replaceImageBackground: replaces background while protecting face and skin', () => {
  // Global document polyfill for test environment
  if (typeof (globalThis as any).document === 'undefined') {
    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return new MockCanvas(20, 20);
        return {};
      },
    };
  }

  const canvas = new MockCanvas(20, 20) as unknown as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  // Fill entire canvas with light-gray studio backdrop: rgb(240, 240, 240)
  for (let i = 0; i < 20 * 20; i++) {
    (canvas as unknown as MockCanvas).data[i * 4] = 240;
    (canvas as unknown as MockCanvas).data[i * 4 + 1] = 240;
    (canvas as unknown as MockCanvas).data[i * 4 + 2] = 240;
    (canvas as unknown as MockCanvas).data[i * 4 + 3] = 255;
  }

  // Draw subject face with skin tones: rgb(215, 155, 120) at center (8 to 13, y: 5 to 12)
  for (let y = 5; y <= 12; y++) {
    for (let x = 8; x <= 13; x++) {
      const idx = (y * 20 + x) * 4;
      (canvas as unknown as MockCanvas).data[idx] = 215;
      (canvas as unknown as MockCanvas).data[idx + 1] = 155;
      (canvas as unknown as MockCanvas).data[idx + 2] = 120;
      (canvas as unknown as MockCanvas).data[idx + 3] = 255;
    }
  }

  // Add bright highlight on forehead/nose: rgb(242, 240, 238) at (10, 8)
  const highlightIdx = (8 * 20 + 10) * 4;
  (canvas as unknown as MockCanvas).data[highlightIdx] = 242;
  (canvas as unknown as MockCanvas).data[highlightIdx + 1] = 240;
  (canvas as unknown as MockCanvas).data[highlightIdx + 2] = 238;

  // Execute replaceImageBackground with Passport Blue (#2563EB)
  const result = replaceImageBackground(canvas, {
    replacementColor: '#2563EB',
    tolerance: 30,
    feather: 0,
    protectForeground: true,
    faceBox: { x: 8, y: 5, width: 6, height: 8 },
  });

  const resData = (result as unknown as MockCanvas).data;

  // 1. Top-left corner background should be Passport Blue (R: 37, G: 99, B: 235)
  const cornerIdx = 0;
  assert.equal(resData[cornerIdx], 37, 'Background Red replaced with #2563EB');
  assert.equal(resData[cornerIdx + 1], 99, 'Background Green replaced with #2563EB');
  assert.equal(resData[cornerIdx + 2], 235, 'Background Blue replaced with #2563EB');

  // 2. Face skin pixel at (9, 7) MUST REMAIN UNTOUCHED (Skin Lock)
  const skinIdx = (7 * 20 + 9) * 4;
  assert.equal(resData[skinIdx], 215, 'Skin pixel Red untouched');
  assert.equal(resData[skinIdx + 1], 155, 'Skin pixel Green untouched');
  assert.equal(resData[skinIdx + 2], 120, 'Skin pixel Blue untouched');

  // 3. Face highlight pixel at (10, 8) inside faceBox MUST REMAIN UNTOUCHED (Face Barrier)
  assert.equal(resData[highlightIdx], 242, 'Highlight inside faceBox Red untouched');
  assert.equal(resData[highlightIdx + 1], 240, 'Highlight inside faceBox Green untouched');
  assert.equal(resData[highlightIdx + 2], 238, 'Highlight inside faceBox Blue untouched');
});
