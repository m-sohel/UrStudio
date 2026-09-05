'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Printer, Camera, CreditCard, LayoutGrid, Settings,
  Image as ImageIcon, FileImage, ArrowRight, Zap, Shield, Wifi, WifiOff,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { useProjectStore } from '@/store/project-store';

const quickActions = [
  {
    title: 'Passport Photo',
    description: '35 × 45mm — Indian/EU standard',
    svg: '/svgs/passport-photo.svg',
    href: '/editor?template=passport-photo-india',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25',
  },
  {
    title: 'US Passport / Visa Photo',
    description: '2 × 2 inch — US standard',
    svg: '/svgs/us-passport.svg',
    href: '/editor?template=passport-photo-us',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/25',
  },
  {
    title: 'ID Card (Sheet Print)',
    description: 'Aadhaar, PAN, DL, Voter ID',
    svg: '/svgs/id.svg',
    href: '/editor?mode=id-card',
    bg: 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/25',
  },
  {
    title: 'PVC Card (1-by-1)',
    description: 'Direct CR80 plastic card printing',
    svg: '/svgs/pvc-card.svg',
    href: '/editor?mode=id-card',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/25',
  },
  {
    title: 'Templates & Presets',
    description: 'Manage & create custom sizes',
    svg: '/svgs/template.svg',
    href: '/templates',
    bg: 'bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/25',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'Upload → Crop → Print in seconds',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    desc: 'All processing happens locally',
  },
  {
    icon: WifiOff,
    title: 'Works Offline',
    desc: 'No internet needed for core features',
  },
];

export default function Dashboard() {
  const { recentProjects } = useProjectStore();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Printer className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">UrStudio</h1>
                <p className="text-xs text-muted-foreground">Photo & ID Card Printing</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/templates">
                <Button variant="outline" size="sm">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link href="/editor">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-orange-500/20 font-medium">
                  <Printer className="w-4 h-4 mr-2" />
                  New Print Job
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Quick Actions */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-1">Quick Actions</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Start a common print job with one click
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Card className="group cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 hover:-translate-y-0.5 h-full border-border/50">
                    <CardContent className="p-5">
                      <div className="w-12 h-12 mb-4 perspective-800">
                        <div className={`
                          w-full h-full rounded-xl ${action.bg}
                          flex items-center justify-center p-2
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
                      <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                      <ArrowRight className="w-4 h-4 mt-3 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <Separator className="mb-10" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
              {recentProjects.length === 0 ? (
                <Card className="border-dashed border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <ImageIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">No recent projects</p>
                    <p className="text-xs text-muted-foreground/60">
                      Your print jobs will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((project) => (
                    <Card key={project.id} className="border-border/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileImage className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          {project.customerName && (
                            <p className="text-xs text-muted-foreground">
                              {project.customerName}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Features / Info */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Features</h2>
              <div className="space-y-3">
                {features.map((feat) => (
                  <Card key={feat.title} className="border-border/50">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 border border-cyan-500/20">
                        <feat.icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{feat.title}</p>
                        <p className="text-xs text-muted-foreground">{feat.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator className="my-6" />

              {/* Keyboard shortcuts quick ref */}
              <h3 className="text-sm font-semibold mb-3">Keyboard Shortcuts</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  ['Ctrl+O', 'Upload'],
                  ['Ctrl+Z', 'Undo'],
                  ['Ctrl+Shift+Z', 'Redo'],
                  ['Ctrl+P', 'Print'],
                  ['Esc', 'Back / Cancel'],
                ].map(([key, action]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{action}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-16 py-6 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} UrStudio — Offline-First Photo & ID Card Printing</span>
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
          <span className="hidden sm:inline">•</span>
          <span>All data processed locally</span>
        </footer>
      </div>
    </TooltipProvider>
  );
}
