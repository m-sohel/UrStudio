'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Printer, Camera, CreditCard, LayoutGrid, Settings,
  Image as ImageIcon, FileImage, ArrowRight, Keyboard,
  Bookmark, FileCheck2, Crown, Sparkles, Store, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { UpgradeModal } from '@/components/upgrade-modal';
import { AppTourBanner } from '@/components/app-tour-banner';
import { useProjectStore } from '@/store/project-store';
import { useLicenseStore } from '@/store/license-store';
import { useMounted } from '@/hooks/use-mounted';

const quickActions = [
  {
    title: 'Passport Photo',
    description: '35 × 45mm — Indian & Schengen',
    svg: '/svgs/passport-photo.svg',
    href: '/editor?template=passport-photo-india',
    bg: 'bg-[#4C7A5A]/15 dark:bg-[#4C7A5A]/35 border-[#4C7A5A]/30 dark:border-[#5FB47B] text-[#4C7A5A] dark:text-[#7ED097]',
    badge: 'Standard',
  },
  {
    title: 'Govt Form Exporter',
    description: 'SSC, UPSC, IBPS, NTA (<20/50KB)',
    svg: '/svgs/form.svg',
    href: '/editor?action=govt-form',
    bg: 'bg-[#C1553A]/15 dark:bg-[#C1553A]/35 border-[#C1553A]/30 dark:border-[#FFA08A] text-[#C1553A] dark:text-[#FFB2A1]',
    badge: 'CSC Ready',
    badgeColor: 'bg-[#C1553A] dark:bg-[#E05A3A] text-white border-[#85331E]',
  },
  {
    title: 'US / Visa Photo',
    description: '2 × 2 inch — US, Canada, OCI',
    svg: '/svgs/us-passport.svg',
    href: '/editor?template=passport-photo-us',
    bg: 'bg-[#3E6E93]/15 dark:bg-[#3E6E93]/35 border-[#3E6E93]/30 dark:border-[#68A5D6] text-[#3E6E93] dark:text-[#97C7F3]',
  },
  {
    title: 'ID Card (Sheet Print)',
    description: 'Aadhaar, PAN, Voter ID on 4x6 / A4',
    svg: '/svgs/id.svg',
    href: '/editor?mode=id-card',
    bg: 'bg-[#C1893A]/15 dark:bg-[#C1893A]/35 border-[#C1893A]/30 dark:border-[#EAA83B] text-[#C1893A] dark:text-[#F7D18C]',
  },
  {
    title: 'PVC Card (Direct CR80)',
    description: 'Thermal tray single card printing',
    svg: '/svgs/pvc-card.svg',
    href: '/editor?mode=id-card',
    bg: 'bg-[#B14640]/15 dark:bg-[#B14640]/35 border-[#B14640]/30 dark:border-[#E2635B] text-[#B14640] dark:text-[#FF9D98]',
    badge: 'Plastic Card',
  },
  {
    title: 'Templates & Presets',
    description: 'Custom dimensions, bleed & paper',
    svg: '/svgs/template.svg',
    href: '/templates',
    bg: 'bg-[#1B2A4A]/10 dark:bg-[#20355A]/50 border-[#1B2A4A]/25 dark:border-[#5E83C4] text-[#1B2A4A] dark:text-[#C4D7F8]',
  },
];

export default function Dashboard() {
  const mounted = useMounted();
  const { recentProjects } = useProjectStore();
  const { isPro, tier, openUpgradeModal } = useLicenseStore();

  const isClientPro = mounted && isPro;
  const clientTier = mounted ? tier : 'free';
  const clientProjects = mounted ? recentProjects : [];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b-2 border-border bg-card/90 dark:bg-[#0E1524]/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_3px_0_0_var(--shadow-3d-subtle)]">
          <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-card border-2 border-foreground/80 dark:border-white/80 flex items-center justify-center shadow-[0_3px_0_0_var(--shadow-3d)] p-1 overflow-hidden">
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
                <h1 className="text-lg font-black tracking-tight text-foreground">UrStudio</h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <ThemeToggle />

              {/* Quick Tour trigger for returning users */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('urstudio:reset-tour'))}
                className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 border border-border"
                title="Replay App Tour"
                aria-label="Replay App Tour"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C1553A] dark:text-[#E5AD35]" />
                <span className="hidden xs:inline">Tour</span>
              </Button>

              {/* Pricing & Pro Status 3D Pill */}
              {!isClientPro ? (
                <Button
                  variant="3d"
                  size="sm"
                  onClick={() => openUpgradeModal()}
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C89B4A]" />
                  <span>Pricing</span>
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-[#C89B4A] text-[#2A2013] border-none font-bold">
                    PRO
                  </Badge>
                </Button>
              ) : (
                <Button
                  variant="3d"
                  size="sm"
                  onClick={() => openUpgradeModal()}
                  className="h-8 px-3 text-xs gap-1.5 border-[#4C7A5A] text-[#4C7A5A] shadow-[0_4px_0_0_#33533D]"
                >
                  <Crown className="w-3.5 h-3.5 text-[#C89B4A]" />
                  <span>Pro Active</span>
                  <span className="text-[10px] uppercase font-bold font-mono">({clientTier})</span>
                </Button>
              )}

              {/* Standout 3D Terracotta CTA (Iconoir 3D Depth) */}
              <Link href="/editor">
                <Button variant="3d-terracotta" size="sm" className="h-8 px-3.5 text-xs">
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  New Print Job
                </Button>
              </Link>

              <Link href="/settings">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border hover:bg-muted">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* First-Time Visitor 3-Step Animated Tour Banner */}
          <AppTourBanner />

          {/* Pro Status / Upgrade SaaS Banner with 3D Depth */}
          {!isClientPro ? (
            <div className="mb-8 rounded-2xl border-2 border-foreground/30 dark:border-[#E5AD35] bg-gradient-to-r from-[#1B2A4A] via-[#203254] to-[#1B2A4A] dark:from-[#132038] dark:via-[#1A2D4E] dark:to-[#132038] text-[#F5F3EE] p-5 sm:p-6 shadow-[0_6px_0_0_#0E1726] dark:shadow-[0_8px_0_0_#61440A,0_9px_0_1.5px_#FFE082,0_20px_35px_rgba(0,0,0,0.8)] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#C89B4A] dark:bg-[#E5AD35] border-2 border-[#825F21] dark:border-[#FFE082] flex items-center justify-center text-[#2A2013] shadow-[0_3px_0_0_#5E4416] dark:shadow-[0_4px_0_0_#4D3508,0_5px_0_1px_#FFE082] shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-[#FAF8F5]">
                      Upgrade to UrStudio Pro for Print Shops & CSC Centers
                    </h3>
                    <Badge className="bg-[#C89B4A] dark:bg-[#E5AD35] text-[#2A2013] border-none text-[11px] font-bold px-2 py-0.5 shadow-sm">
                      Save 80% with Shop Pass
                    </Badge>
                  </div>
                  <p className="text-xs text-[#FAF8F5]/80 mt-1 max-w-2xl leading-relaxed">
                    Print multi-customer mix & match sheets, remove watermarks, generate 300 DPI Ultra-HD PDFs, and stamp your custom shop branding & phone on every job.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <Button
                  onClick={() => openUpgradeModal()}
                  variant="3d-terracotta"
                  size="default"
                  className="h-9 px-4 text-xs font-bold gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FBF3EE]" />
                  <span>View Plans & Upgrade</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border-2 border-[#4C7A5A] dark:border-[#5FB47B] bg-[#4C7A5A]/10 dark:bg-[#4C7A5A]/25 p-5 shadow-[0_5px_0_0_#4C7A5A] dark:shadow-[0_6px_0_0_#1E3B28,0_7px_0_1.5px_#5FB47B,0_16px_28px_rgba(0,0,0,0.7)] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#4C7A5A] dark:bg-[#5FB47B] border-2 border-[#365740] dark:border-[#8CEAB0] flex items-center justify-center text-white dark:text-[#081B10] shadow-[0_3px_0_0_#2A4432] shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      UrStudio Pro Active
                      <Badge className="bg-[#4C7A5A] text-white border-none text-[10px] font-bold font-mono">
                        {clientTier.toUpperCase()} PASS
                      </Badge>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Commercial studio license active. Multi-customer mix & match, 300 DPI watermark-free exports, and custom shop branding are unlocked.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
                <Link href="/settings">
                  <Button variant="3d" size="sm" className="h-8 text-xs gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#C1553A]" />
                    Shop Branding
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openUpgradeModal()}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Manage License
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions (3D Tactile Cards) */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Quick Actions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Launch standard studio print workflows with one click
                </p>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                6 Standard Presets
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href} className="block h-full group">
                  <div className="card-3d p-4 h-full flex flex-col justify-between cursor-pointer">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-12 h-12 perspective-800">
                          <div className={`
                            w-full h-full rounded-xl ${action.bg}
                            border-2 flex items-center justify-center p-2
                            shadow-sm overflow-hidden icon-flip-card
                          `}>
                            <Image
                              src={action.svg}
                              alt={action.title}
                              width={40}
                              height={40}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                        {action.badge && (
                          <span className={`
                            text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs
                            ${action.badgeColor || 'bg-[#C89B4A]/15 text-[#825F21] dark:text-[#D8A856] border-[#C89B4A]/30'}
                          `}>
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-[#C1553A] transition-colors leading-tight">
                        {action.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {action.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-[#1B2A4A] dark:group-hover:text-[#FAF8F5]">
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-[#C1553A] transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <Separator className="mb-10 bg-border/80" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Recent Print Jobs</h2>
                <span className="text-xs text-muted-foreground">Auto-saved locally</span>
              </div>

              {clientProjects.length === 0 ? (
                <div className="card-3d border-dashed p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-3 text-muted-foreground/50">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">No recent print projects</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Start a new print job above or drag-and-drop customer photos to begin layout.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clientProjects.map((project) => (
                    <div key={project.id} className="card-3d p-3.5 flex items-center gap-3.5 hover:-translate-y-0.5">
                      <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                        <FileImage className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{project.name}</p>
                        {project.customerName && (
                          <p className="text-xs text-muted-foreground">
                            Customer: {project.customerName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts (3D Mechanical Keycaps) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Keyboard className="w-4 h-4 text-[#C1553A]" />
                <h2 className="text-lg font-bold text-foreground">Studio Hotkeys</h2>
              </div>
              <div className="card-3d p-4">
                <div className="space-y-3 text-xs">
                  {[
                    ['Ctrl + O', 'Upload Image or PDF'],
                    ['Ctrl + Z', 'Undo Last Action'],
                    ['Ctrl + Shift + Z', 'Redo Action'],
                    ['Ctrl + P', 'Print Layout / Export'],
                    ['Esc', 'Back / Cancel Dialog'],
                  ].map(([key, action]) => (
                    <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground font-medium">{action}</span>
                      <kbd className="kbd-3d text-[10px]">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-16 py-6 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} UrStudio</span>
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
        {/* Upgrade & SaaS Billing Modal */}
        <UpgradeModal />
      </div>
    </TooltipProvider>
  );
}
