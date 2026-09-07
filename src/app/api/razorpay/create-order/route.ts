import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, tier, tierName } = body;

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, message: 'Razorpay API keys are not configured on the server.' },
        { status: 500 }
      );
    }

    // Authoritative server-side plan definitions to prevent client-side price tampering
    const AUTHORITATIVE_PLANS: Record<string, { price: number; name: string }> = {
      single_pass: { price: 29, name: 'Per-Download Pass' },
      annual: { price: 199, name: 'Shop Pass' },
      lifetime: { price: 499, name: 'Lifetime Studio' },
    };

    const targetTier = (tier && AUTHORITATIVE_PLANS[tier]) ? tier : 'annual';
    const plan = AUTHORITATIVE_PLANS[targetTier];

    // Server-enforced price in paise (1 INR = 100 paise)
    const amountInPaise = plan.price * 100;
    const receipt = `rcpt_${targetTier}_${Date.now().toString().slice(-8)}`;

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          tier: targetTier,
          tierName: plan.name,
          app: 'UrStudio Photo Suite',
        },
      }),
    });

    const orderData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      console.error('Razorpay Order API Error:', orderData);
      return NextResponse.json(
        {
          success: false,
          message: orderData.error?.description || 'Failed to create Razorpay order.',
        },
        { status: rzpResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId,
    });
  } catch (error: any) {
    console.error('Create Order Handler Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
