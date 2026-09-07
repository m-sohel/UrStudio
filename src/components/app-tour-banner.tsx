'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2,
  Layers, Sliders, Printer, Play, Pause, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMounted } from '@/hooks/use-mounted';

interface TourStep {
  stepNumber: number;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref?: string;
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    stepNumber: 1,
    badge: 'Step 1 • Standard & Custom Formats',
    badgeColor: 'bg-[#1B2A4A] text-[#FAF8F5] dark:bg-[#5E83C4] dark:text-[#0B101B]',
    title: 'Pick a Standard Preset or Upload',
    subtitle: 'Zero setup required — instant layout generation for all print formats',
    description:
      'Choose from official Indian Passport (35×45mm), SSC/UPSC/IBPS Govt Forms (<20KB/50KB), US Visa (2×2"), or multi-card Aadhaar/PAN sheets. Drag-and-drop single or multiple photos.',
    features: [
      '1-Click Indian & International Passport Presets',
      'SSC, UPSC & IBPS Government Exam Form Exporter',
      'Dual-Sided CR80 ID Card & PVC Thermal Sheet Layouts',
    ],
    ctaText: 'Next: Smart Face Tuning',
    icon: Layers,
  },
  {
    stepNumber: 2,
    badge: 'Step 2 • Intelligent Biometrics',
    badgeColor: 'bg-[#C1553A] text-white dark:bg-[#E05A3A] dark:text-white',
    title: 'Smart Biometric Alignment & Image Tuning',
    subtitle: 'Automatic face centering, shadow removal & multi-customer layouts',
    description:
      'Official 70–80% biometric head coverage guidelines ensure instant exam & passport compliance. Clean camera room shadows from signatures to pure #FFFFFF white and stamp Name/Date on photos.',
    features: [
      'Biometric Head & Eye Alignment Guide',
      '1-Click Signature Shadow Cleaner (Pure White)',
      'Multi-Customer Mix & Match on a Single Paper Sheet',
    ],
    ctaText: 'Next: Studio-Grade Printing',
    icon: Sliders,
  },
  {
    stepNumber: 3,
    badge: 'Step 3 • Print & Export',
    badgeColor: 'bg-[#C89B4A] text-[#2A2013] dark:bg-[#E5AD35] dark:text-[#1A1203]',
    title: 'Studio-Grade 300 DPI Export & Direct Print',
    subtitle: 'Zero paper waste, corner crop marks & 100% offline client-side safety',
    description:
      'Send directly to your shop printer with millimeter-accurate corner crop marks, or download 300 DPI Ultra-HD PDFs. All image processing stays private and offline in your browser.',
    features: [
      'Accurate Bleed Margins & Corner Cutting Crop Marks',
      'High-Speed 300 DPI Ultra-HD PDF Generation',
      '100% Offline-First: Customer photos never leave your device',
    ],
    ctaText: 'Start Creating Now',
    ctaHref: '/editor',
    icon: Printer,
  },
];

const AUTOPLAY_INTERVAL = 7000; // 7 seconds per slide

export function AppTourBanner() {
  const mounted = useMounted();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch gesture support for mobile swiping
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Initialize visibility from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const dismissed = localStorage.getItem('urstudio_tour_dismissed');
      if (dismissed !== 'true') {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, [mounted]);

  // Global event listener to replay the tour from Settings or Header
  useEffect(() => {
    const handleResetTour = () => {
      try {
        localStorage.removeItem('urstudio_tour_dismissed');
      } catch {}
      setCurrentStep(0);
      setProgress(0);
      setIsDismissed(false);
      setIsPaused(false);
      const el = document.getElementById('urstudio-tour-banner');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('urstudio:reset-tour', handleResetTour);
    return () => window.removeEventListener('urstudio:reset-tour', handleResetTour);
  }, []);

  // Autoplay progress ticker
  useEffect(() => {
    if (isDismissed || isPaused) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const stepDuration = 50;
    const totalTicks = AUTOPLAY_INTERVAL / stepDuration;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((curr) => (curr + 1) % TOUR_STEPS.length);
          return 0;
        }
        return prev + 100 / totalTicks;
      });
    }, stepDuration);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isDismissed, isPaused, currentStep]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('urstudio_tour_dismissed', 'true');
    } catch {}
  };

  const handleNext = () => {
    setProgress(0);
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectStep = (idx: number) => {
    setProgress(0);
    setCurrentStep(idx);
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // Minimum px distance for swipe detection

    if (diff > minSwipeDistance) {
      // Swiped Left -> Go Next
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Go Prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!mounted || isDismissed) {
    return null;
  }

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <section
      id="urstudio-tour-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border-2 border-[#1B2A4A]/25 dark:border-[#C89B4A]/50 bg-gradient-to-br from-[#FAF8F5] via-[#F4EFEA] to-[#EFE8DF] dark:from-[#0E1524] dark:via-[#131F35] dark:to-[#0A101C] p-4 sm:p-6 md:p-7 shadow-[0_6px_0_0_#1B2A4A] sm:shadow-[0_8px_0_0_#1B2A4A] dark:shadow-[0_6px_0_0_#4D3508,0_7px_0_1.5px_#FFE082,0_16px_32px_rgba(0,0,0,0.85)] sm:dark:shadow-[0_8px_0_0_#4D3508,0_9px_0_1.5px_#FFE082,0_20px_40px_rgba(0,0,0,0.85)] overflow-hidden transition-all"
      aria-label="UrStudio Quick Tour"
    >
      {/* Decorative subtle background elements */}
      <div className="absolute -top-24 -right-24 w-60 sm:w-72 h-60 sm:h-72 rounded-full bg-[#C1553A]/10 dark:bg-[#C1553A]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-52 sm:w-64 h-52 sm:h-64 rounded-full bg-[#C89B4A]/10 dark:bg-[#C89B4A]/15 blur-3xl pointer-events-none" />

      {/* Top Bar: Responsive Step Navigation & Controls */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-[#1B2A4A]/15 dark:border-white/10 relative z-10">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#1B2A4A] dark:text-[#FAF8F5]">
            <Sparkles className="w-3.5 h-3.5 text-[#C1553A] dark:text-[#E5AD35] animate-pulse" />
            <span className="hidden xs:inline">Quick</span> Tour
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold font-mono">
            {currentStep + 1}/{TOUR_STEPS.length}
          </span>
        </div>

        {/* Interactive Step Progress Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {TOUR_STEPS.map((s, idx) => {
            const isActive = idx === currentStep;
            return (
              <button
                key={s.stepNumber}
                onClick={() => handleSelectStep(idx)}
                className={`relative h-2 sm:h-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C1553A] cursor-pointer ${
                  isActive
                    ? 'w-7 sm:w-10 bg-[#1B2A4A]/20 dark:bg-white/20 overflow-hidden'
                    : 'w-2 sm:w-2.5 bg-foreground/20 hover:bg-foreground/40 dark:bg-white/30'
                }`}
                title={`Jump to Step ${s.stepNumber}`}
                aria-label={`Jump to Step ${s.stepNumber}: ${s.title}`}
              >
                {isActive && (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#C1553A] dark:bg-[#E5AD35] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="ml-1 sm:ml-2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            title={isPaused ? 'Resume tour autoplay' : 'Pause tour autoplay'}
            aria-label={isPaused ? 'Resume tour autoplay' : 'Pause tour autoplay'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>

        {/* Dismiss / Skip */}
        <button
          onClick={handleDismiss}
          className="text-[11px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/10 transition-colors"
          title="Dismiss tour"
        >
          <span className="hidden sm:inline">Skip Tour</span>
          <span className="sm:hidden">Skip</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Tour Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center relative z-10">
        {/* Step Details Column */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3 sm:space-y-4 order-1">
          <div>
            <Badge className={`${step.badgeColor} border-none font-bold text-[10px] sm:text-[11px] px-2 py-0.5 mb-2 shadow-xs`}>
              {step.badge}
            </Badge>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground leading-snug">
              {step.title}
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[#C1553A] dark:text-[#FFA08A] mt-1">
              {step.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-foreground/80 dark:text-[#FAF8F5]/80 mt-2 leading-relaxed max-w-xl">
              {step.description}
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
            {step.features.map((feat, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-xl bg-card/60 dark:bg-[#15233C]/80 border border-border/70 text-[11px] sm:text-xs font-medium text-foreground shadow-xs"
              >
                <div className="w-4 h-4 rounded-full bg-[#4C7A5A] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons: Responsive for Mobile Viewports */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {step.ctaHref ? (
                <Link href={step.ctaHref} onClick={handleDismiss} className="w-full sm:w-auto">
                  <Button
                    variant="3d-terracotta"
                    size="sm"
                    className="w-full sm:w-auto h-10 sm:h-9 px-5 text-xs font-black gap-2"
                  >
                    <StepIcon className="w-4 h-4" />
                    <span>{step.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="3d-terracotta"
                  size="sm"
                  onClick={handleNext}
                  className="w-full sm:w-auto h-10 sm:h-9 px-5 text-xs font-black gap-2"
                >
                  <span>{step.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {currentStep > 0 && (
                <Button
                  variant="3d"
                  size="sm"
                  onClick={handlePrev}
                  className="w-full sm:w-auto h-10 sm:h-9 px-4 text-xs font-bold gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous Step</span>
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-4 mt-2.5">
              <button
                onClick={handleDismiss}
                className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Don&apos;t show again
              </button>
              <span className="text-[10px] text-muted-foreground sm:hidden font-mono">
                Swipe left/right to browse
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Step Visual Simulation */}
        <div className="lg:col-span-5 flex items-center justify-center order-2 mt-1 lg:mt-0">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#1B2A4A]/30 dark:border-white/20 bg-card/90 dark:bg-[#101B2E] p-3 sm:p-4 shadow-[0_5px_0_0_#1B2A4A] dark:shadow-[0_5px_0_0_#090E17,0_6px_0_1px_#5E83C4] transition-all">
            {/* Step 1 Visual Simulation: Preset Cards Grid */}
            {currentStep === 0 && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#1B2A4A] dark:text-[#C4D7F8]">
                    <Layers className="w-3.5 h-3.5 text-[#C1553A]" /> Preset Showcase
                  </span>
                  <Badge className="bg-[#4C7A5A] text-white text-[9px] sm:text-[10px] px-1.5 py-0 h-4">
                    Instant Auto-Fit
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 sm:p-2.5 rounded-xl border-2 border-[#4C7A5A]/50 bg-[#4C7A5A]/10 text-left shadow-xs">
                    <div className="text-[10px] sm:text-[11px] font-black text-[#4C7A5A] dark:text-[#7ED097]">
                      Indian Passport
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">35 × 45 mm</div>
                    <div className="mt-1.5 sm:mt-2 w-full h-7 sm:h-8 rounded bg-white dark:bg-card border border-dashed border-[#4C7A5A]/40 flex items-center justify-center text-[9px] font-mono text-[#4C7A5A]">
                      8 on 4×6&quot;
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl border-2 border-[#C1553A]/50 bg-[#C1553A]/10 text-left shadow-xs">
                    <div className="text-[10px] sm:text-[11px] font-black text-[#C1553A] dark:text-[#FFA08A]">
                      Govt Form Exporter
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">SSC, UPSC, NTA</div>
                    <div className="mt-1.5 sm:mt-2 w-full h-7 sm:h-8 rounded bg-white dark:bg-card border border-dashed border-[#C1553A]/40 flex items-center justify-center text-[9px] font-mono text-[#C1553A]">
                      &lt;20KB / 50KB
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl border border-border bg-muted/40 text-left shadow-xs">
                    <div className="text-[10px] sm:text-[11px] font-bold text-foreground">US / Visa Photo</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">2 × 2 Inch</div>
                    <div className="mt-1.5 sm:mt-2 w-full h-7 sm:h-8 rounded bg-card border border-dashed border-border flex items-center justify-center text-[9px] font-mono text-muted-foreground">
                      6 on 4×6&quot;
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl border border-border bg-muted/40 text-left shadow-xs">
                    <div className="text-[10px] sm:text-[11px] font-bold text-foreground">ID Card Sheet</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">CR80 & PVC</div>
                    <div className="mt-1.5 sm:mt-2 w-full h-7 sm:h-8 rounded bg-card border border-dashed border-border flex items-center justify-center text-[9px] font-mono text-muted-foreground">
                      Front & Back
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 Visual Simulation: Biometric Alignment Reticle */}
            {currentStep === 1 && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#C1553A] dark:text-[#FFA08A]">
                    <UserCheck className="w-3.5 h-3.5" /> Biometric Face Reticle
                  </span>
                  <Badge className="bg-[#C89B4A] text-[#2A2013] text-[9px] sm:text-[10px] px-1.5 py-0 h-4">
                    70-80% Ratio
                  </Badge>
                </div>

                <div className="relative h-28 sm:h-36 rounded-xl border-2 border-dashed border-[#C1553A]/40 bg-muted/30 flex items-center justify-center overflow-hidden">
                  {/* Biometric Oval Guide */}
                  <div className="w-20 sm:w-24 h-24 sm:h-30 rounded-[50%] border-2 border-[#C1553A] dark:border-[#FFA08A] flex flex-col items-center justify-center relative shadow-sm">
                    <span className="absolute top-1 text-[8px] sm:text-[9px] font-mono font-bold text-[#C1553A] dark:text-[#FFA08A]">
                      Crown
                    </span>
                    <div className="w-12 sm:w-16 h-0.5 bg-[#C1553A]/60 my-auto" />
                    <span className="absolute bottom-1 text-[8px] sm:text-[9px] font-mono font-bold text-[#C1553A] dark:text-[#FFA08A]">
                      Chin Guide
                    </span>
                  </div>

                  {/* Badges on corner */}
                  <div className="absolute top-2 left-2 bg-card/90 border border-border text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xs">
                    Eye Level ✓
                  </div>
                  <div className="absolute bottom-2 right-2 bg-[#4C7A5A] text-white text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xs">
                    Sig Cleaned #FFF
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 Visual Simulation: 300 DPI Print Sheet with Crop Marks */}
            {currentStep === 2 && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#C89B4A] dark:text-[#E5AD35]">
                    <Printer className="w-3.5 h-3.5" /> Sheet Layout & Crop Marks
                  </span>
                  <Badge className="bg-[#1B2A4A] text-white dark:bg-[#5E83C4] text-[9px] sm:text-[10px] px-1.5 py-0 h-4">
                    300 DPI Ultra-HD
                  </Badge>
                </div>

                <div className="relative h-28 sm:h-36 rounded-xl border-2 border-foreground/20 bg-[#FAF8F5] dark:bg-[#0B101B] p-2 sm:p-2.5 flex flex-col justify-between shadow-inner">
                  {/* Simulated 4x6 Sheet with 8 Passport Photos and corner marks */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5 h-full">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="rounded border border-[#1B2A4A]/40 dark:border-white/40 bg-[#1B2A4A]/10 dark:bg-white/10 flex items-center justify-center relative group"
                      >
                        <span className="absolute -top-1 -left-1 text-[6px] sm:text-[7px] text-muted-foreground font-mono">
                          +
                        </span>
                        <span className="text-[7px] sm:text-[8px] font-mono font-bold text-foreground/70">
                          P{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-muted-foreground border-t border-border pt-1">
                    <span>Paper: 4×6&quot; Sheet</span>
                    <span className="text-[#4C7A5A] font-bold">Zero Waste</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
