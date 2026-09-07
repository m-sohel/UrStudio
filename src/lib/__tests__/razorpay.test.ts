import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { getRazorpayKeyId } from '../razorpay';
import { generateOfflineLicenseKey } from '../license-engine';

test('Razorpay: returns configured Key ID', () => {
  const keyId = getRazorpayKeyId();
  assert.equal(keyId, 'rzp_test_TZ84iOqkSuuDUn');
});

test('Razorpay: verifies cryptographic payment signature with Key Secret', () => {
  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_sample_secret_key_mock_123';
  const orderId = 'order_test_12345';
  const paymentId = 'pay_test_67890';

  // Compute official Razorpay signature
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Verify signature matches
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(validSignature, expectedSignature);

  // Constant-time timingSafeEqual test
  const validBuf = Buffer.from(validSignature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');
  assert.equal(crypto.timingSafeEqual(validBuf, expBuf), true);

  // Tampered signature is rejected
  const tamperedSignature = validSignature.slice(0, -4) + 'abcd';
  assert.notEqual(tamperedSignature, expectedSignature);
});

test('Razorpay: generates verifiable offline license key from payment ID', () => {
  const paymentId = 'pay_P1A2B3C4';
  const seed = paymentId.slice(-6).toUpperCase();
  const key = generateOfflineLicenseKey('annual', { seed });

  assert.ok(key.startsWith('URSTUDIO-ANNU-'));
  assert.ok(key.includes(seed));
});
