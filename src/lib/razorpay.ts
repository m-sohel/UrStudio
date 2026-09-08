/**
 * Razorpay Standard Checkout SDK Loader & Handler
 * 
 * Production client-side checkout integration.
 * Securely communicates with backend /api/razorpay/create-order and /api/razorpay/verify-payment.
 */

import { generateOfflineLicenseKey, type LicenseTier } from './license-engine';

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayCheckoutOptions {
  amount: number; // In INR (e.g. 199)
  tier: LicenseTier;
  tierName: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (paymentId: string, generatedKey: string) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

export function getRazorpayKeyId(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  }
  return 'rzp_test_TZ84iOqkSuuDUn';
}

/**
 * Dynamically loads the official Razorpay Checkout v1 script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Razorpay checkout script.');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

/**
 * Launches the official Razorpay Checkout modal
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  const keyId = getRazorpayKeyId();

  if (!isLoaded || typeof (window as any).Razorpay === 'undefined') {
    if (options.onError) {
      options.onError(new Error('Razorpay Checkout could not be loaded. Please check your internet connection.'));
    }
    return;
  }

  // Request server-side Razorpay order creation
  let orderId: string | undefined = undefined;
  let activeKeyId = keyId;
  try {
    const orderRes = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: options.amount,
        tier: options.tier,
        tierName: options.tierName,
      }),
    });

    if (orderRes.ok) {
      const orderData = await orderRes.json();
      if (orderData.success && orderData.orderId) {
        orderId = orderData.orderId;
      }
      if (orderData.keyId) {
        activeKeyId = orderData.keyId;
      }
    }
  } catch (err) {
    console.warn('Could not create server order, continuing with direct client checkout:', err);
  }

  // Amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(options.amount * 100);

  const rzpOptions: any = {
    key: activeKeyId,
    amount: amountInPaise,
    currency: 'INR',
    name: 'UrStudio Pro',
    description: `${options.tierName} License`,
    image: '/logo.png',
    order_id: orderId,
    theme: {
      color: '#1B2A4A', // UrStudio primary Ink Navy
    },
    prefill: options.prefill || {
      name: '',
      email: '',
      contact: '',
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      backdropclose: false,
    },
    handler: async (response: RazorpayPaymentSuccessResponse) => {
      const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;

      // When order was created via server, verify signature on backend
      if (response.razorpay_order_id && response.razorpay_signature) {
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              tier: options.tier,
            }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok || !verifyData.success) {
            console.error('Razorpay signature verification rejected by server:', verifyData);
            if (options.onError) {
              options.onError(new Error(verifyData.message || 'Payment signature verification failed.'));
            }
            return;
          }

          if (verifyData.success && verifyData.licenseKey) {
            options.onSuccess(verifyData.paymentId, verifyData.licenseKey);
            return;
          }
        } catch (verifyErr) {
          console.error('Payment verification request failed:', verifyErr);
          if (options.onError) {
            options.onError(verifyErr);
          }
          return;
        }
      }

      // Standalone direct checkout without backend order (fallback mode)
      const seed = paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'RZPPAY';
      const generatedKey = generateOfflineLicenseKey(
        options.tier === 'single_pass' ? 'single_pass' : options.tier === 'monthly' ? 'monthly' : 'annual',
        { seed }
      );

      options.onSuccess(paymentId, generatedKey);
    },
  };

  try {
    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.on('payment.failed', (response: any) => {
      console.error('Razorpay payment failed:', response.error);
      if (options.onError) {
        options.onError(response.error);
      }
    });
    rzp.open();
  } catch (err) {
    console.error('Failed to open Razorpay instance:', err);
    if (options.onError) {
      options.onError(err);
    }
  }
}
