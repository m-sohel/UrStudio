'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Trash2, ShieldCheck, HardDrive, Scissors, RotateCcw, AlertTriangle, Check,
  Sun, Moon, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/store/settings-store';
import { useProjectStore } from '@/store/project-store';
import { useTemplateStore } from '@/store/template-store';
import { PAPER_SIZES } from '@/lib/templates';
import {
  clearAllData, clearProjects, clearTemplates, getStorageHealth,
  purgeAllCustomerData, type StorageHealth
} from '@/lib/storage';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { clearRecentProjects } = useProjectStore();
  const { customPhotoTemplates, customIDCardTemplates } = useTemplateStore();

  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  useEffect(() => {
    getStorageHealth().then(setStorageHealth).catch(() => {});
  }, []);

  const handlePurgeCustomerData = async () => {
    if (confirm('Purge all customer job history and cached images? Custom templates will be kept.')) {
      await purgeAllCustomerData();
      clearRecentProjects();
      const updated = await getStorageHealth();
      setStorageHealth(updated);
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-12">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Settings</h1>
              <p className="text-xs text-muted-foreground">Configure hardware alignment, printing defaults, and data security</p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Appearance & Studio Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                Appearance & Studio Theme
              </CardTitle>
              <CardDescription>Select your preferred color mode for daylight or night printing sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => settings.updateSettings({ theme: 'dark' })}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-2.5 cursor-pointer ${
                    settings.theme === 'dark'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-border flex items-center justify-center">
                      <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    {settings.theme === 'dark' && <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border border-primary/30">Active</Badge>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Dark Mode</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Deep Space Navy workspace</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => settings.updateSettings({ theme: 'light' })}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-2.5 cursor-pointer ${
                    settings.theme === 'light'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    {settings.theme === 'light' && <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border border-primary/30">Active</Badge>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Light Mode</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Crisp Ice-Blue studio workspace</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => settings.updateSettings({ theme: 'system' })}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-2.5 cursor-pointer ${
                    settings.theme === 'system'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center">
                      <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    {settings.theme === 'system' && <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border border-primary/30">Active</Badge>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">System Default</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sync with OS appearance</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Printing Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Printing Defaults</CardTitle>
              <CardDescription>Default settings for new print jobs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Default Paper Size</Label>
                  <Select
                    value={settings.defaultPaperId}
                    onValueChange={(v) => { if (v !== null) settings.updateSettings({ defaultPaperId: v }); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_SIZES.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Default Orientation</Label>
                  <Select
                    value={settings.defaultOrientation}
                    onValueChange={(v) => { if (v) settings.updateSettings({ defaultOrientation: v as 'portrait' | 'landscape' }); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* FIXED: Removed asChild prop to comply with @base-ui/react */}
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Default Margin (mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={settings.defaultMargin}
                    onChange={(e) => settings.updateSettings({ defaultMargin: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Default DPI</Label>
                  <Input
                    type="number"
                    min={72}
                    max={600}
                    value={settings.defaultDPI}
                    onChange={(e) => settings.updateSettings({ defaultDPI: parseInt(e.target.value) || 300 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hardware Alignment & Mechanical Bleed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" />
                Hardware Alignment & Cutting Guides
              </CardTitle>
              <CardDescription>Compensates for manual paper cutter, guillotine, and card punch tolerances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Mechanical Bleed Margin (mm)</Label>
                  <Input
                    type="number"
                    step={0.5}
                    min={0}
                    max={5}
                    value={settings.defaultBleedMm}
                    onChange={(e) => settings.updateSettings({ defaultBleedMm: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Adds 1.0mm–1.5mm bleed outside trim edge to prevent white borders on cutter drift.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 sm:pt-0">
                  <div>
                    <Label className="text-sm">Corner Crop Marks (Crosshairs)</Label>
                    <p className="text-xs text-muted-foreground">
                      Print L-shaped corner tick marks for trimmer alignment
                    </p>
                  </div>
                  <Switch
                    checked={settings.showCropMarks}
                    onCheckedChange={(v) => settings.updateSettings({ showCropMarks: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cybercafé Privacy & Customer Data Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Cybercafé Privacy & Data Security
              </CardTitle>
              <CardDescription>Protect customer Aadhaar, PAN, and identity documents on shared operator PCs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-Wipe Customer Data on Print</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically clears customer uploaded images from browser memory right after printing
                  </p>
                </div>
                <Switch
                  checked={settings.autoWipeOnPrint}
                  onCheckedChange={(v) => settings.updateSettings({ autoWipeOnPrint: v })}
                />
              </div>

              <Separator />

              {/* Storage Health Inspection */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">IndexedDB Storage Health</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {storageHealth
                      ? `${storageHealth.projectCount} stored customer jobs • ${storageHealth.templateCount} custom templates • ~${formatBytes(storageHealth.estimatedBytes)} used`
                      : 'Calculating storage footprint...'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePurgeCustomerData}
                  className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 text-xs"
                >
                  {purgeSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      Purged
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Purge Customer Jobs
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Data Reset
              </CardTitle>
              <CardDescription>Reset configuration and clear local storage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Reset Settings</p>
                  <p className="text-xs text-muted-foreground">Restore default printing and paper preferences</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    settings.resetSettings();
                    alert('Settings restored to defaults');
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset Defaults
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Clear All Local Data</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete all custom templates, projects, and application settings
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm('This will delete ALL local data. Are you sure?')) {
                      await clearAllData();
                      window.location.reload();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Clear Everything
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
}
