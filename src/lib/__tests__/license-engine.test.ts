import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() { return store.size; },
  } as Storage;
}

import {
  sha256Sync,
  generateOfflineLicenseKey,
  verifyOfflineLicenseKey,
  buildUpiPaymentUri,
  generateUpiQrSvg,
} from '../license-engine';
import { useLicenseStore } from '@/store/license-store';

test('License Engine: SHA-256 pure TypeScript computes known hashes correctly', () => {
  // Empty string
  assert.equal(sha256Sync(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  // 'hello world'
  assert.equal(sha256Sync('hello world'), 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
});

test('License Engine: built-in demo evaluation key validates offline', () => {
  const res = verifyOfflineLicenseKey('URSTUDIO-PRO-DEMO-2026');
  assert.equal(res.valid, true);
  assert.equal(res.tier, 'annual');
  assert.ok(res.expiresAt && res.expiresAt > Date.now());
});

test('License Engine: generates and validates Monthly Shop Pass key deterministically', () => {
  const key = generateOfflineLicenseKey('monthly', { daysValid: 30, seed: 'MNTH01' });
  assert.ok(key.startsWith('URSTUDIO-MNTH-'));

  const verification = verifyOfflineLicenseKey(key);
  assert.equal(verification.valid, true);
  assert.equal(verification.tier, 'monthly');
  assert.ok(verification.expiresAt && verification.expiresAt > Date.now());
});

test('License Engine: generates and validates Annual Shop Pass key deterministically', () => {
  const key = generateOfflineLicenseKey('annual', { daysValid: 365, seed: 'TEST01' });
  assert.ok(key.startsWith('URSTUDIO-ANNU-'));

  const verification = verifyOfflineLicenseKey(key);
  assert.equal(verification.valid, true);
  assert.equal(verification.tier, 'annual');
  assert.ok(verification.expiresAt && verification.expiresAt > Date.now());
});

test('License Engine: generates and validates Single-Export Pass key', () => {
  const key = generateOfflineLicenseKey('single_pass', { seed: 'PASS42' });
  assert.ok(key.startsWith('URSTUDIO-PASS-PASS1-'));

  const verification = verifyOfflineLicenseKey(key);
  assert.equal(verification.valid, true);
  assert.equal(verification.tier, 'single_pass');
});

test('License Engine: rejects tampered signature or invalid characters', () => {
  const validKey = generateOfflineLicenseKey('annual', { daysValid: 365, seed: 'SHOP02' });
  const tamperedKey = validKey.slice(0, -2) + 'XX';

  const verification = verifyOfflineLicenseKey(tamperedKey);
  assert.equal(verification.valid, false);
  assert.ok(verification.message.includes('Invalid key signature or checksum mismatch'));
});

test('License Engine: rejects malformed key format', () => {
  assert.equal(verifyOfflineLicenseKey('').valid, false);
  assert.equal(verifyOfflineLicenseKey('INVALID-KEY-FORMAT').valid, false);
  assert.equal(verifyOfflineLicenseKey('RANDOM-STRING-12345').valid, false);
});

test('License Engine: rejects expired annual licenses', () => {
  const expiredKey = generateOfflineLicenseKey('annual', { daysValid: -1, seed: 'OLD001' });
  const verification = verifyOfflineLicenseKey(expiredKey);
  assert.equal(verification.valid, false);
  assert.ok(verification.message.includes('expired'));
});

test('License Engine: builds valid Indian UPI Intent URI', () => {
  const { upiUri, qrData } = buildUpiPaymentUri({
    amount: 199,
    tierName: 'Shop Pass',
    payeeVpa: 'urstudio@upi',
    payeeName: 'UrStudio Printing Suite',
  });

  assert.ok(upiUri.includes('upi://pay?'));
  assert.ok(upiUri.includes('pa=urstudio@upi'));
  assert.ok(upiUri.includes('am=199.00'));
  assert.ok(upiUri.includes('cu=INR'));
  assert.equal(qrData, upiUri);
});

test('License Engine: generates valid scanner-ready SVG barcode without network calls', () => {
  const svg = generateUpiQrSvg('upi://pay?pa=urstudio@upi&am=199.00', 200);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('viewBox="0 0 200 200"'));
  assert.ok(svg.includes('<rect'));
  assert.ok(svg.includes('</svg>'));
});

test('License Store: offline activation, consumption, and branding state transitions', () => {
  const store = useLicenseStore.getState();
  store.deactivateLicense();

  assert.equal(useLicenseStore.getState().isPro, false);

  // 1. Activate via offline demo key
  const actRes = store.activateLicense('URSTUDIO-PRO-DEMO-2026');
  assert.equal(actRes.success, true);
  assert.equal(useLicenseStore.getState().isPro, true);
  assert.equal(useLicenseStore.getState().tier, 'annual');

  // 2. Configure shop branding
  store.updateShopBranding({
    enabled: true,
    shopName: 'Shree Krishna Studio',
    phone: '+91 98765 00000',
    address: 'MG Road, Agra',
    customFooter: 'Fast ID card printing',
  });

  const branding = useLicenseStore.getState().shopBranding;
  assert.equal(branding.enabled, true);
  assert.equal(branding.shopName, 'Shree Krishna Studio');
  assert.equal(branding.phone, '+91 98765 00000');

  // 3. Single pass consumption flow
  store.deactivateLicense();
  assert.equal(useLicenseStore.getState().isPro, false);

  store.activateSinglePass(2);
  assert.equal(useLicenseStore.getState().isPro, true);
  assert.equal(useLicenseStore.getState().singlePassCount, 2);

  // Consume 1
  assert.equal(store.consumeSinglePass(), true);
  assert.equal(useLicenseStore.getState().isPro, true);
  assert.equal(useLicenseStore.getState().singlePassCount, 1);

  // Consume 2nd
  assert.equal(store.consumeSinglePass(), true);
  assert.equal(useLicenseStore.getState().isPro, false);
  assert.equal(useLicenseStore.getState().singlePassCount, 0);
  assert.equal(useLicenseStore.getState().tier, 'free');

  // Consume 3rd when empty
  assert.equal(store.consumeSinglePass(), false);
});

test('License Store: monthly pass activation and expiration logic', () => {
  const store = useLicenseStore.getState();
  store.deactivateLicense();

  const monthlyKey = generateOfflineLicenseKey('monthly', { daysValid: 30, seed: 'MSTORE' });
  const res = store.activateLicense(monthlyKey);
  assert.equal(res.success, true);
  assert.equal(useLicenseStore.getState().isPro, true);
  assert.equal(useLicenseStore.getState().tier, 'monthly');
  assert.ok(useLicenseStore.getState().expiresAt);
  store.deactivateLicense();
});

test('License Store: background replacement allows 2 free per session then gates', () => {
  const store = useLicenseStore.getState();
  store.deactivateLicense();

  // Reset bgReplacementsUsed to 0
  useLicenseStore.setState({ bgReplacementsUsed: 0 });

  // Free user start: 2 remaining
  assert.equal(store.canUseBgReplacement(), true);

  // Use 1
  store.incrementBgReplacement();
  assert.equal(useLicenseStore.getState().bgReplacementsUsed, 1);
  assert.equal(store.canUseBgReplacement(), true);

  // Use 2
  store.incrementBgReplacement();
  assert.equal(useLicenseStore.getState().bgReplacementsUsed, 2);
  // Free tier now locked
  assert.equal(store.canUseBgReplacement(), false);

  // Once activated as Pro, unlimited BG replacements allowed
  const monthlyKey = generateOfflineLicenseKey('monthly', { daysValid: 30, seed: 'BGPRO1' });
  store.activateLicense(monthlyKey);
  assert.equal(useLicenseStore.getState().isPro, true);
  assert.equal(store.canUseBgReplacement(), true);

  store.deactivateLicense();
});

