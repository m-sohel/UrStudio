'use client';

import React from 'react';
import Link from 'next/link';
import {
  Printer, Camera, CreditCard, LayoutGrid, Settings,
  Image, FileImage, ArrowRight, Zap, Shield, Wifi, WifiOff,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useProjectStore } from '@/store/project-store';

const quickActions = [
  {
    title: 'Passport Photo',
    description: '35 × 45mm — Indian/EU standard',
    icon: Camera,
    href: '/editor?template=passport-photo-india',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'US Passport / Visa Photo',
    description: '2 × 2 inch — US standard',
    icon: Image,
    href: '/editor?template=passport-photo-us',
    color: 'from-violet-500 to-purple-500',
  },
  {
    title: 'ID Card (Sheet Print)',
    description: 'Aadhaar, PAN, DL, Voter ID',
    icon: CreditCard,
    href: '/editor?mode=id-card',
    color: 'from-amber-500 to-orange-500',
  },
  {
    title: 'PVC Card (1-by-1)',
    description: 'Direct CR80 plastic card printing',
    icon: CreditCard,
    href: '/editor?mode=id-card',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    title: 'Templates & Presets',
    description: 'Manage & create custom sizes',
    icon: LayoutGrid,
    href: '/templates',
    color: 'from-rose-500 to-pink-500',
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
        <header className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">CyberCafe Studio</h1>
                <p className="text-xs text-muted-foreground">Photo & ID Card Printing</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/templates">
                <Button variant="outline" size="sm">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link href="/editor">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
                      <div className={`
                        w-12 h-12 rounded-xl bg-gradient-to-br ${action.color}
                        flex items-center justify-center mb-4
                        group-hover:scale-110 transition-transform duration-200
                        shadow-lg
                      `}>
                        <action.icon className="w-6 h-6 text-white" />
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
                    <Image className="w-10 h-10 text-muted-foreground/30 mb-3" />
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
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <feat.icon className="w-4 h-4 text-emerald-500" />
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
        <footer className="border-t border-border mt-16 py-6 text-center text-xs text-muted-foreground">
          CyberCafe Studio — Offline-First Photo & ID Card Printing
          <span className="mx-2">•</span>
          All data processed locally
        </footer>
      </div>
    </TooltipProvider>
  );
}
