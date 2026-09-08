'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck, FileText, ArrowLeft, Printer, Sparkles,
  CheckCircle2, AlertTriangle, Scale, Lock, RefreshCw,
  CreditCard, Mail, ExternalLink, ChevronRight, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-border bg-card/90 dark:bg-[#0E1524]/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-card border-2 border-foreground/80 dark:border-white/80 flex items-center justify-center shadow-[0_3px_0_0_var(--shadow-3d)] p-1 overflow-hidden group-hover:scale-105 transition-transform">
                <Image
                  src="/favicon.png"
                  alt="UrStudio Logo"
                  width={34}
                  height={34}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-foreground">UrStudio</span>
                <span className="text-[10px] block text-muted-foreground font-mono -mt-1">Terms of Service</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/privacy">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Button>
            </Link>
            <ThemeToggle />
            <Link href="/editor">
              <Button variant="3d-terracotta" size="sm" className="h-8 px-3 text-xs">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Open Studio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Terms of Service</span>
        </div>

        {/* Hero Section */}
        <div className="space-y-4 border-b border-border pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs bg-[#C1553A]/10 text-[#C1553A] border-[#C1553A]/30 font-semibold px-2.5 py-0.5">
              Legal Agreement
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono text-muted-foreground">
              Last Updated: September 2026
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              Version 2.4 (Commercial & CSC License)
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Terms of Service & Operator Agreement
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
            Welcome to <strong className="text-foreground">UrStudio</strong>. These Terms of Service constitute a legally binding agreement between you (whether an individual operator, cybercafé owner, photo studio, CSC center, or enterprise) and UrStudio regarding your access to and use of the UrStudio software platform and services.
          </p>
        </div>

        {/* Key Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">100% Client-Side Processing</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Customer photos, Aadhaar scans, and identity documents are processed strictly inside your device&apos;s browser. Nothing is ever uploaded, analyzed, or stored on our external servers.
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-[#C1553A]/15 text-[#C1553A] flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">Commercial & Studio License</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Operators are granted full commercial rights to charge customers for physical prints, laminated cards, and prepared digital application photos with zero per-print royalties.
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">Transparent Indian Pricing</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Free watermark-free Ctrl+P printing for standard setups. Flexible Pro passes available via secure UPI, Cards, and Net Banking with instant offline cryptographic unlock keys.
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">Aadhaar & Identity Law</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Shop owners are solely responsible for ensuring lawful customer consent and compliance with the Aadhaar Act, IT Act, and UIDAI printing guidelines when processing identity documents.
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">1</span>
              Acceptance of Terms & Eligibility
            </h2>
            <p className="text-muted-foreground">
              By accessing, browsing, installing as a Progressive Web Application (PWA), or using UrStudio, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these Terms, you may not use the software.
            </p>
            <p className="text-muted-foreground">
              You must be at least 18 years of age or possess the legal authority to enter into commercial contracts on behalf of a registered entity, cybercafé, Common Service Center (CSC), studio, or business.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">2</span>
              Software Nature & Local-First Processing
            </h2>
            <p className="text-muted-foreground">
              UrStudio provides offline-capable web and desktop tools for cropping, formatting, color-calibrating, and laying out passport photographs, biometric images, government examination documents, and CR80 ID cards (such as Aadhaar, PAN, and Voter ID cards).
            </p>
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Local Sandboxing Guarantee
              </span>
              <p className="text-muted-foreground">
                All image processing algorithms, including background replacement, biometric centering, color profile emulation, signature cleaning, and PDF generation, execute exclusively in the client-side JavaScript / WebAssembly runtime of your local machine. No customer photographs or document scans are transmitted to UrStudio servers.
              </p>
            </div>
          </section>

          <Separator className="border-border/60" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">3</span>
              Subscription Plans, Licenses & Commercial Usage
            </h2>
            <p className="text-muted-foreground">
              UrStudio provides both Free and Pro subscription tiers tailored for professional printing environments:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
              <li>
                <strong className="text-foreground">Free Tier:</strong> Includes standard passport photo templates, basic ID card cropping, paper layout previews, and watermark-free browser printing (<kbd className="kbd-3d text-[10px]">Ctrl + P</kbd>) for unlimited daily print runs. Allows 1–2 complimentary AI background replacements per session.
              </li>
              <li>
                <strong className="text-foreground">Monthly Shop Pass (₹49 / month):</strong> Unlocks unlimited high-resolution PDF sheet exports, direct PVC card printing, photo cutting guide borders, custom dimensions templates, advanced color calibration, and custom shop watermarking.
              </li>
              <li>
                <strong className="text-foreground">Annual Shop Pass (₹499 / year):</strong> Best value for busy photo studios and cybercafés, providing 365 days of uninterrupted Pro features, priority support, and multi-customer sheet mix-and-match.
              </li>
              <li>
                <strong className="text-foreground">Single-Export Pass (₹9 / job):</strong> Designed for occasional operators who need 1 high-resolution PDF download without recurring commitments.
              </li>
            </ul>
            <p className="text-muted-foreground text-xs">
              License keys are cryptographically generated using offline SHA-256 signatures, ensuring your studio software functions without requiring constant active internet connection once validated.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">4</span>
              Payment Processing & Billing
            </h2>
            <p className="text-muted-foreground">
              Payments for UrStudio Pro passes are processed securely through certified Indian payment gateways (including Razorpay), supporting UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard debit and credit cards, and Net Banking.
            </p>
            <p className="text-muted-foreground">
              Prices are displayed and billed in Indian Rupees (INR ₹) inclusive of applicable taxes. You agree to provide valid and authorized payment credentials when initiating a purchase.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">5</span>
              Cancellation & Refund Policy
            </h2>
            <p className="text-muted-foreground">
              Because UrStudio provides digitally delivered software licenses and instant cryptographic key unlocks:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pl-2">
              <li>
                <strong className="text-foreground">Instant Delivery:</strong> License keys and Pro activation status are applied immediately upon verified payment completion.
              </li>
              <li>
                <strong className="text-foreground">48-Hour Technical Failure Guarantee:</strong> If an issued license key fails to activate your device due to a software error and our technical support is unable to resolve the issue within 48 hours, you are entitled to a 100% full refund.
              </li>
              <li>
                <strong className="text-foreground">Non-Refundable Circumstances:</strong> Refunds cannot be issued for change of mind once a license key has been actively consumed, or for issues arising from third-party physical printer hardware incompatibility outside of our specifications.
              </li>
              <li>
                <strong className="text-foreground">Refund Requests:</strong> To request a review or refund, email support with your Razorpay Payment ID within 7 days of purchase.
              </li>
            </ul>
          </section>

          <Separator className="border-border/60" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">6</span>
              Operator Obligations & Identity Document Compliance
            </h2>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-2">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                UIDAI & Government Document Handling
              </span>
              <p className="text-muted-foreground">
                UrStudio provides layout and cropping assistance for Aadhaar, PAN, Voter ID, and Driver&apos;s License printing. You expressly agree that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                <li>You will process identity documents ONLY with the explicit consent and in the presence of the document holder.</li>
                <li>You will NOT forge, tamper with, alter, or produce fraudulent identification cards or official documents.</li>
                <li>You will adhere to all regulations set forth by the Unique Identification Authority of India (UIDAI) regarding Aadhaar card lamination, PVC printing, and masking of Aadhaar numbers where mandated by law.</li>
                <li>You will purge or delete downloaded customer files from your local downloads folder upon completion of printing.</li>
              </ul>
            </div>
          </section>

          <Separator className="border-border/60" />

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">7</span>
              Intellectual Property & User Ownership
            </h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Your Content:</strong> You and your customers retain 100% intellectual property ownership of all original photographs, scans, logos, and materials imported into UrStudio. UrStudio claims zero copyright, ownership, or licensing rights over your images.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">UrStudio IP:</strong> The UrStudio software codebase, user interface, templates, layout calculation algorithms, icons, branding, and documentation are the exclusive intellectual property of UrStudio and its creators. You may not reverse-engineer, decompile, resell, or distribute the proprietary code without written authorization.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">8</span>
              Hardware Compatibility & Disclaimers
            </h2>
            <p className="text-muted-foreground">
              UrStudio is designed for standard studio inkjet and thermal printers (such as Epson L805, L8050, L850, L1800, Canon G-Series, HP Ink Tank, and Evolis/Zebra PVC card printers). However, physical print output fidelity depends on your printer drivers, paper quality, ICC color profiles, and mechanical margins.
            </p>
            <p className="text-muted-foreground">
              THE SOFTWARE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">9</span>
              Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by applicable law, UrStudio and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, business interruption, rejected government exam applications, or printer hardware malfunction arising from your use of the service.
            </p>
            <p className="text-muted-foreground">
              Our total cumulative liability to you for any claim arising out of these terms shall not exceed the amount paid by you for the specific UrStudio Pro license during the 30 days immediately preceding the event.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">10</span>
              Governing Law & Dispute Resolution
            </h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by, interpreted, and construed in accordance with the laws of the Republic of India. Any disputes or claims arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">11</span>
              Contact & Grievance Redressal
            </h2>
            <p className="text-muted-foreground">
              If you have any questions regarding these Terms of Service, billing queries, or license activation support, please reach out to our team:
            </p>
            <div className="card-3d p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Mail className="w-4 h-4 text-[#C1553A]" />
                <span>UrStudio Developer & Support Desk</span>
              </div>
              <p className="text-muted-foreground">
                Email:{' '}
                <a href="mailto:support@urstudio.app" className="text-foreground hover:text-primary underline">
                  support@urstudio.app
                </a>
              </p>
              <p className="text-muted-foreground">
                GitHub:{' '}
                <a href="https://github.com/m-sohel" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary underline">
                  github.com/m-sohel
                </a>
              </p>
              <p className="text-muted-foreground">
                Response Time: Within 24–48 business hours.
              </p>
            </div>
          </section>
        </div>

        {/* CTA Footer Card */}
        <div className="card-3d p-6 bg-card/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Ready to start printing?</h3>
            <p className="text-xs text-muted-foreground">
              Explore our privacy-guaranteed passport and ID card printing studio.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/privacy">
              <Button variant="outline" size="sm" className="text-xs">
                Read Privacy Policy
              </Button>
            </Link>
            <Link href="/editor">
              <Button variant="3d-terracotta" size="sm" className="text-xs">
                Launch Studio
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-3">
        <span>© {new Date().getFullYear()} UrStudio</span>
        <span className="hidden sm:inline">•</span>
        <Link href="/terms" className="text-foreground font-medium underline underline-offset-4">
          Terms of Service
        </Link>
        <span className="hidden sm:inline">•</span>
        <Link href="/privacy" className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
          Privacy Policy
        </Link>
        <span className="hidden sm:inline">•</span>
        <span>
          Crafted by{' '}
          <a
            href="https://github.com/m-sohel"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
          >
            m-sohel
          </a>
        </span>
      </footer>
    </div>
  );
}
