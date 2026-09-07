import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateOfflineLicenseKey, type LicenseTier } from '@/lib/license-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId, signature, tier } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { success: false, message: 'Razorpay secret is not configured on the server.' },
        { status: 500 }
      );
    }

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { success: false, message: 'orderId, paymentId, and signature are required.' },
        { status: 400 }
      );
    }

    // Official Razorpay HMAC-SHA256 signature verification:
    // generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret);
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(String(signature), 'utf8');

    // Constant-time comparison to prevent timing attacks
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      console.error('Razorpay signature verification failed');
      return NextResponse.json(
        { success: false, message: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      );
    }

    // Payment is authentic & confirmed by Razorpay!
    // Resolve authoritative tier: check order notes from Razorpay API if available
    let authoritativeTier: LicenseTier = tier === 'single_pass' ? 'single_pass' : tier === 'lifetime' ? 'lifetime' : 'annual';
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (keyId && keySecret) {
      try {
        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
          headers: { Authorization: authHeader },
        });

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const orderTier = orderData?.notes?.tier;
          if (orderTier === 'single_pass' || orderTier === 'annual' || orderTier === 'lifetime') {
            authoritativeTier = orderTier;
          }
        }
      } catch (err) {
        console.warn('Could not re-fetch order notes from Razorpay, falling back to payload tier:', err);
      }
    }

    // Deterministically generate authentic offline license key
    const finalTier: 'annual' | 'lifetime' | 'single_pass' =
      authoritativeTier === 'single_pass' || authoritativeTier === 'lifetime'
        ? authoritativeTier
        : 'annual';

    const seed = paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'RZPPAY';

    const licenseKey = generateOfflineLicenseKey(
      finalTier,
      { daysValid: finalTier === 'annual' ? 365 : undefined, seed }
    );

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId,
      licenseKey,
      tier: finalTier,
      message: 'Payment verified successfully. UrStudio Pro is activated.',
    });
  } catch (error: any) {
    console.error('Verify Payment Handler Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
