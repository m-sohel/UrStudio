'use client';

/**
 * UrStudio Pro Pricing & Billing Modal
 * 
 * Professional SaaS billing flow integrated with Razorpay Checkout.
 * Instant activation for UPI (PhonePe, Google Pay, Paytm, BHIM), Cards, and Netbanking.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Sparkles,
  Check,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Store,
  Copy,
  Zap,
  Lock,
} from 'lucide-react';
import { useLicenseStore } from '@/store/license-store';
import { openRazorpayCheckout } from '@/lib/razorpay';
import Link from 'next/link';

interface SaaSPlan {
  id: 'annual' | 'monthly' | 'single_pass';
  name: string;
  badge?: string;
  isPopular?: boolean;
  price: number;
  periodText: string;
  subtext: string;
  description: string;
  ctaText: string;
  features: string[];
}

const SAAS_PLANS: SaaSPlan[] = [
  {
    id: 'annual',
    name: 'Annual Shop Pass',
    badge: 'Best Value',
    isPopular: true,
    price: 149,
    periodText: '/ year',
    subtext: '₹12/month • Save 60% vs Monthly',
    description: 'The smart choice for studios, CSC centers & print shops.',
    ctaText: 'Get Annual Pass',
    features: [
      'Multi-Customer Mix & Match sheets (save photo paper)',
      'Custom Shop Branding on print footers',
      'Unlimited 300 DPI Ultra-HD PDF sheet exports',
      'Govt Form Exporter (<20KB / <50KB compression)',
      'Photo Border Controls (color, thickness, style)',
      'Advanced Paper Settings (margins, gaps, orientation)',
      'Custom Photo Templates (any dimensions)',
      'Unlimited Background Replacements',
      '100% Offline-enabled — zero internet needed',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly Shop Pass',
    badge: 'Try Pro',
    price: 29,
    periodText: '/ month',
    subtext: 'Cancel anytime',
    description: 'Try Pro risk-free for one month.',
    ctaText: 'Start Monthly',
    features: [
      'All Pro features unlocked for 30 days',
      'Multi-Customer Mix & Match sheets',
      'Watermark-free 300 DPI PDF exports',
      'Shop Branding & Custom Templates',
      'Upgrade to Annual anytime & save 60%',
    ],
  },
  {
    id: 'single_pass',
    name: 'Per-Download Pass',
    price: 19,
    periodText: 'one-time',
    subtext: '1 Watermark-free job',
    description: 'For walk-in customers wanting a single clean print.',
    ctaText: 'Get 1-Time Pass',
    features: [
      '1 Watermark-Free Sheet Export',
      '300 DPI Ultra-HD PDF generation',
      'Standard passport & ID card sizes',
    ],
  },
];

export function UpgradeModal() {
  const {
    isPro,
    tier,
    licenseKey,
    expiresAt,
    singlePassCount,
    shopBranding,
    isUpgradeModalOpen,
    modalHighlightFeature,
    closeUpgradeModal,
    activateLicense,
    deactivateLicense,
  } = useLicenseStore();

  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    paymentId: string;
    key: string;
    tier: string;
  } | null>(null);

  // Discreet Offline Key Drawer
  const [showOfflineInput, setShowOfflineInput] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePlanCheckout = async (plan: SaaSPlan) => {
    setLoadingPlanId(plan.id);

    try {
      await openRazorpayCheckout({
        amount: plan.price,
        tier: plan.id,
        tierName: plan.name,
        prefill: {
          name: shopBranding?.shopName || '',
          contact: shopBranding?.phone || '',
        },
        onSuccess: (paymentId, generatedKey) => {
          setLoadingPlanId(null);
          const res = activateLicense(generatedKey);
          if (res.success) {
            setPaymentSuccessData({
              paymentId,
              key: generatedKey,
              tier: plan.name,
            });
          }
        },
        onDismiss: () => {
          setLoadingPlanId(null);
        },
        onError: (err) => {
          setLoadingPlanId(null);
          console.warn('Checkout note:', err);
        },
      });
    } catch (err) {
      setLoadingPlanId(null);
      console.error('Failed to initiate checkout:', err);
    }
  };

  const handleManualKeyActivate = (keyToActivate?: string) => {
    const targetKey = keyToActivate || inputKey;
    if (!targetKey.trim()) {
      setActivationResult({ success: false, message: 'Please enter a valid license key.' });
      return;
    }

    const res = activateLicense(targetKey);
    setActivationResult(res);
    if (res.success) {
      setInputKey('');
    }
  };

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) return null;
    return new Date(expiresAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [expiresAt]);

  const handleCloseModal = () => {
    setPaymentSuccessData(null);
    closeUpgradeModal();
  };

  return (
    <Dialog open={isUpgradeModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl">
        {/* Payment Success View */}
        {paymentSuccessData ? (
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <Badge variant="outline" className="mb-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                Payment Confirmed
              </Badge>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome to UrStudio Pro!</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Your license is active on this device. Watermarks are removed and commercial features are unlocked.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="w-full max-w-md p-4 rounded-xl bg-card border border-border text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activated Plan</span>
                <span className="font-semibold text-foreground">{paymentSuccessData.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-mono text-foreground">{paymentSuccessData.paymentId}</span>
              </div>
              <div className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground block mb-1">Offline License Key (Backup)</span>
                <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg border border-border">
                  <code className="font-mono text-[11px] text-primary select-all">
                    {paymentSuccessData.key}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard?.writeText(paymentSuccessData.key)}
                    className="h-6 text-[10px] px-2 text-primary hover:text-primary"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap justify-center gap-3 pt-2">
              <Button
                onClick={() => setPaymentSuccessData(null)}
                variant="ghost"
                size="sm"
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                View Plans & Status
              </Button>
              <Link href="/settings">
                <Button
                  onClick={handleCloseModal}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-9 border-border"
                >
                  <Store className="w-3.5 h-3.5 text-primary" />
                  Configure Shop Branding
                </Button>
              </Link>
              <Button
                onClick={handleCloseModal}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 shadow-md shadow-orange-500/20"
              >
                Start Printing
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="border-b border-border bg-card/60 px-6 py-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                    <Crown className="w-4 h-4" />
                  </div>
                  <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                    UrStudio Pro
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Choose the plan that fits your studio. Instant activation across all payment methods.
                </DialogDescription>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border w-fit mx-auto sm:mx-0">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>256-bit Secure Checkout</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalHighlightFeature && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-primary">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    Unlocking <strong>{modalHighlightFeature}</strong> requires an active UrStudio Pro license.
                  </span>
                </div>
              )}

              {/* Active License Banner */}
              {isPro && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>UrStudio Pro is Active ({tier.toUpperCase()})</span>
                      {tier === 'single_pass' && (
                        <Badge variant="secondary" className="text-[10px]">
                          {singlePassCount} print{singlePassCount > 1 ? 's' : ''} remaining
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formattedExpiry ? `Valid until ${formattedExpiry}` : 'Permanent VIP studio license active'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href="/settings">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={closeUpgradeModal}
                        className="text-xs h-7 gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Store className="w-3 h-3" />
                        Shop Branding
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={deactivateLicense}
                      className="text-xs h-7 text-muted-foreground hover:text-destructive"
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              )}

              {/* 3 SaaS Pricing Cards (3D Tactile Layout) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {SAAS_PLANS.map((plan) => {
                  const isLoading = loadingPlanId === plan.id;
                  const isShopPass = plan.id === 'annual';
                  const isMonthly = plan.id === 'monthly';

                  return (
                    <div
                      key={plan.id}
                      className={`
                        relative rounded-2xl p-5 flex flex-col justify-between transition-all
                        ${isShopPass
                          ? 'border-2 border-[#C1553A] dark:border-[#FFA08A] bg-card dark:bg-gradient-to-b dark:from-[#1A263D] dark:to-[#121B2C] shadow-[0_6px_0_0_#85331E] dark:shadow-[0_8px_0_0_#7A2612,0_9px_0_1.5px_#FFA08A,0_20px_35px_rgba(224,90,58,0.25)]'
                          : isMonthly
                          ? 'border-2 border-[#C89B4A] dark:border-[#FFE082] bg-card dark:bg-gradient-to-b dark:from-[#1C2538] dark:to-[#121B2C] shadow-[0_6px_0_0_#825F21] dark:shadow-[0_8px_0_0_#61440A,0_9px_0_1.5px_#FFE082,0_20px_35px_rgba(229,173,53,0.25)]'
                          : 'border-2 border-border dark:border-[#5E83C4] bg-card dark:bg-gradient-to-b dark:from-[#162238] dark:to-[#111A2B] shadow-[0_6px_0_0_var(--shadow-3d-card)] dark:shadow-[0_8px_0_0_#0D1624,0_9px_0_1.5px_#5E83C4,0_20px_35px_rgba(0,0,0,0.7)]'
                        }
                      `}
                    >
                      {plan.badge && (
                        <span className={`
                          absolute -top-3 right-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs
                          ${isShopPass
                            ? 'bg-[#C89B4A] dark:bg-[#E5AD35] text-[#2A2013] border-[#825F21] dark:border-[#FFE082]'
                            : 'bg-[#1B2A4A] dark:bg-[#FAF8F5] text-[#F5F3EE] dark:text-[#0B101B] border-[#0E1726]'
                          }
                        `}>
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <div className="mb-2">
                          <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 min-h-[32px] leading-snug">
                            {plan.description}
                          </p>
                        </div>

                        <div className="my-3 pb-3 border-b border-border/60">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-foreground tracking-tight">₹{plan.price}</span>
                            <span className="text-xs text-muted-foreground font-semibold">{plan.periodText}</span>
                          </div>
                          <p className={`text-[11px] font-semibold mt-0.5 ${isShopPass ? 'text-[#C1553A]' : isMonthly ? 'text-[#C89B4A]' : 'text-muted-foreground'}`}>
                            {plan.subtext}
                          </p>
                        </div>

                        <div className="space-y-2 text-xs mb-6">
                          {plan.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-foreground/90">
                              <Check className="w-3.5 h-3.5 text-[#4C7A5A] shrink-0 mt-0.5 font-bold" />
                              <span className="leading-snug text-[11px]">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3D Tactile CTA Button inside each card */}
                      <Button
                        onClick={() => handlePlanCheckout(plan)}
                        disabled={isLoading}
                        variant={isShopPass ? '3d-terracotta' : isMonthly ? '3d-gold' : '3d'}
                        className="w-full text-xs h-10 gap-1.5 font-bold"
                      >
                        {isLoading ? 'Opening Checkout...' : plan.ctaText}
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Security & Payment Methods Strip */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground border-t border-border/60 gap-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Instant activation • 100% money-back guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-medium">
                  <span>UPI (PhonePe, GPay, Paytm)</span>
                  <span>•</span>
                  <span>Cards</span>
                  <span>•</span>
                  <span>Netbanking</span>
                </div>
              </div>

              {/* Discreet Offline Key Entry */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowOfflineInput(!showOfflineInput)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500/80" />
                  <span>{showOfflineInput ? 'Hide Offline Key Input' : 'Have an offline license key?'}</span>
                </button>

                {showOfflineInput && (
                  <div className="mt-3 p-3.5 rounded-xl border border-border bg-card/60 max-w-lg mx-auto text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Activate 24-Character Offline Key</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManualKeyActivate('URSTUDIO-PRO-DEMO-2026')}
                        className="text-[10px] h-6 px-2 text-amber-500 hover:text-amber-400 gap-1 bg-amber-500/10"
                      >
                        <Zap className="w-2.5 h-2.5" /> Demo Key
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="URSTUDIO-ANNU-20270907-XXXX-YYYY"
                        value={inputKey}
                        onChange={(e) => {
                          setInputKey(e.target.value.toUpperCase());
                          setActivationResult(null);
                        }}
                        className="text-xs font-mono uppercase h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleManualKeyActivate()}
                        disabled={!inputKey.trim()}
                        className="text-xs h-8 bg-primary text-primary-foreground font-semibold px-3"
                      >
                        Activate
                      </Button>
                    </div>

                    {activationResult && (
                      <div
                        className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 ${
                          activationResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-destructive/10 border-destructive/30 text-destructive'
                        }`}
                      >
                        {activationResult.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{activationResult.message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border px-6 py-3 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>Encrypted local storage • No monthly subscription lock-in</span>
              <Button variant="ghost" size="sm" onClick={closeUpgradeModal} className="text-xs h-7">
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
