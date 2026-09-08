'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck, Lock, ArrowLeft, Printer, Sparkles,
  CheckCircle2, AlertTriangle, EyeOff, Database, HardDrive,
  CreditCard, Mail, ExternalLink, ChevronRight, Trash2, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

export default function PrivacyPage() {
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
                <span className="text-[10px] block text-muted-foreground font-mono -mt-1">Privacy Policy</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/terms">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Terms of Service
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
          <span className="text-foreground font-medium">Privacy Policy</span>
        </div>

        {/* Hero Section */}
        <div className="space-y-4 border-b border-border pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold px-2.5 py-0.5">
              Zero Data Harvesting
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono text-muted-foreground">
              Last Updated: September 2026
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
              DPDP Act & UIDAI Aligned
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
            At <strong className="text-foreground">UrStudio</strong>, privacy is not merely a policy clause — it is the fundamental technical architecture upon which the software is engineered. We adhere strictly to the principle that customer photos, government identity cards, biometric data, and personal documents belong exclusively to you and your customers.
          </p>
        </div>

        {/* 4 Core Guarantees Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">100% In-Browser Execution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Every crop, background removal, signature adjustment, and PDF render happens on your computer CPU/GPU via WebAssembly and HTML5 Canvas. No image data is transmitted across the internet.
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <EyeOff className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">Zero Document Harvesting</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Aadhaar, PAN, Voter ID, and Passport scans are never stored on any remote cloud or database. UrStudio maintains zero servers that ingest or aggregate user document imagery.
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-[#C1553A]/15 text-[#C1553A] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">No Ad Trackers or Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              We do not embed third-party surveillance scripts, behavioral tracking cookies, or advertising pixel tags. We do not sell or monetize personal browsing history.
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-bold">1-Click Local Data Purge</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
              Cybercafé and studio operators can purge all temporary cached previews and recent print jobs from browser memory instantly at any time from the Settings dashboard.
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">1</span>
              Technical Architecture & Privacy-by-Design
            </h2>
            <p className="text-muted-foreground">
              Traditional cloud web applications upload your media files to third-party cloud servers for processing. UrStudio is built differently. It operates as an <strong className="text-foreground">offline-capable Progressive Web Application (PWA)</strong> where all computing tasks are distributed directly to your local hardware runtime.
            </p>
            <p className="text-muted-foreground">
              When you drag and drop a passport photo, scan an e-Aadhaar PDF, or clean a signature for an SSC/UPSC exam form, the file is read into your browser&apos;s volatile memory via standard HTML5 File APIs. When the browser tab is closed, that volatile memory is discarded.
            </p>
          </section>

          <Separator className="border-border/60" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">2</span>
              What Information Is Processed
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">A. Customer Photographs & Scans (Processed Locally)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Images imported for cropping, resizing, background replacement, and printing are processed in memory only. UrStudio does not receive, transmit, or retain copies of these images.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">B. Local Browser Storage (Stored on Your PC)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  UrStudio utilizes your browser&apos;s <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code> and <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">IndexedDB</code> strictly to retain your customized studio preferences across sessions, including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground pl-2 mt-1">
                  <li>Selected paper size, margins, and printer orientation settings.</li>
                  <li>Custom templates you have created (e.g. specialized school badge dimensions).</li>
                  <li>Studio shop branding (Shop Name and contact number for optional receipt/guide headers).</li>
                  <li>Your cryptographically signed offline Pro license key and expiration date.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">C. Payment & Transactional Data (Processed by Razorpay)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When you purchase a Monthly Shop Pass, Annual Pass, or Single-Export Pass, the transaction is processed directly by our PCI-DSS Level 1 certified payment gateway, <strong className="text-foreground">Razorpay</strong>. UrStudio never sees, handles, or stores your debit/credit card numbers, CVV codes, or UPI PINs. We receive only transaction confirmation metadata (Payment ID, amount, timestamp) to generate your license key.
                </p>
              </div>
            </div>
          </section>

          <Separator className="border-border/60" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">3</span>
              Protection of Aadhaar, PAN & Government Identity Documents
            </h2>
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-foreground space-y-2">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                UIDAI & Government Privacy Compliance
              </span>
              <p className="text-muted-foreground">
                In adherence with the Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016 and IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                <li>UrStudio does NOT store, log, capture, or harvest Aadhaar numbers, demographic data, or customer biometric scans.</li>
                <li>Cropping tools and layout engines for Aadhaar PVC and sheet printing execute purely inside client memory.</li>
                <li>Operators are urged to mask the first 8 digits of Aadhaar numbers when printing for non-statutory purposes as recommended by UIDAI.</li>
              </ul>
            </div>
          </section>

          <Separator className="border-border/60" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">4</span>
              Digital Personal Data Protection (DPDP) Act 2023 Principles
            </h2>
            <p className="text-muted-foreground">
              UrStudio is designed in conformity with the Indian Digital Personal Data Protection Act, 2023 (DPDP):
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pl-2">
              <li>
                <strong className="text-foreground">Purpose Limitation:</strong> Software features exist solely to fulfill your specific photo formatting and printing commands.
              </li>
              <li>
                <strong className="text-foreground">Data Minimization:</strong> We collect zero personal data beyond what is strictly necessary to confirm a paid software pass.
              </li>
              <li>
                <strong className="text-foreground">Storage Limitation:</strong> Temporary canvas buffers are garbage-collected by your browser as soon as an export completes.
              </li>
              <li>
                <strong className="text-foreground">No Automated Profiling:</strong> We do not engage in behavioral user profiling, automated scoring, or cross-site tracking.
              </li>
            </ul>
          </section>

          <Separator className="border-border/60" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">5</span>
              Third-Party Integrations & Scope
            </h2>
            <p className="text-muted-foreground">
              UrStudio keeps external integrations strictly minimal:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pl-2">
              <li>
                <strong className="text-foreground">Razorpay (Payment Gateway):</strong> Used exclusively to facilitate safe UPI, Card, and Net Banking transactions when purchasing a Pro Pass. Governed by{' '}
                <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  Razorpay&apos;s Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
              <li>
                <strong className="text-foreground">No Google Analytics / Meta Pixels:</strong> UrStudio intentionally avoids third-party advertising tracking scripts to safeguard cybercafé customer confidentiality.
              </li>
            </ul>
          </section>

          <Separator className="border-border/60" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">6</span>
              Your Data Control & One-Click Storage Purge
            </h2>
            <p className="text-muted-foreground">
              You maintain total control over your local browser storage. You can purge cached job records, clear recent projects, or reset custom settings at any time:
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Link href="/settings">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border hover:bg-accent/40">
                  <HardDrive className="w-3.5 h-3.5 text-[#C1553A]" />
                  Open Storage & Purge Settings
                </Button>
              </Link>
              <span className="text-xs text-muted-foreground">
                Or clear your browser&apos;s site data via Ctrl + Shift + Delete.
              </span>
            </div>
          </section>

          <Separator className="border-border/60" />

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-primary font-bold">7</span>
              Privacy Officer & Contact Inquiries
            </h2>
            <p className="text-muted-foreground">
              For any questions regarding this Privacy Policy, data practices, or security verification, please contact our team:
            </p>
            <div className="card-3d p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Mail className="w-4 h-4 text-[#C1553A]" />
                <span>UrStudio Privacy & Data Protection Desk</span>
              </div>
              <p className="text-muted-foreground">
                Email:{' '}
                <a href="mailto:privacy@urstudio.app" className="text-foreground hover:text-primary underline">
                  privacy@urstudio.app
                </a>
              </p>
              <p className="text-muted-foreground">
                Developer Profile:{' '}
                <a href="https://github.com/m-sohel" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary underline">
                  github.com/m-sohel
                </a>
              </p>
              <p className="text-muted-foreground">
                Location: India
              </p>
            </div>
          </section>
        </div>

        {/* CTA Footer Card */}
        <div className="card-3d p-6 bg-card/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Safe, Private, Professional Printing</h3>
            <p className="text-xs text-muted-foreground">
              Experience the peace of mind of 100% offline-capable local studio tools.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/terms">
              <Button variant="outline" size="sm" className="text-xs">
                Terms of Service
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
        <Link href="/terms" className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
          Terms of Service
        </Link>
        <span className="hidden sm:inline">•</span>
        <Link href="/privacy" className="text-foreground font-medium underline underline-offset-4">
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
