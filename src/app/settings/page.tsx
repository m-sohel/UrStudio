'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Download, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { clearAllData, clearProjects, clearTemplates } from '@/lib/storage';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { clearRecentProjects } = useProjectStore();
  const { customPhotoTemplates, customIDCardTemplates } = useTemplateStore();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
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
              <p className="text-xs text-muted-foreground">Configure defaults and preferences</p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
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

          {/* Photo Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photo Defaults</CardTitle>
              <CardDescription>Default settings for photo printing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Default Spacing (mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={settings.defaultSpacing}
                    onChange={(e) => settings.updateSettings({ defaultSpacing: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Default Copies</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.defaultCopies}
                    onChange={(e) => settings.updateSettings({ defaultCopies: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application</CardTitle>
              <CardDescription>General application preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Autosave</Label>
                  <p className="text-xs text-muted-foreground">Automatically save projects</p>
                </div>
                <Switch
                  checked={settings.autosave}
                  onCheckedChange={(v) => settings.updateSettings({ autosave: v })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(v) => {
                    if (!v) return;
                    settings.updateSettings({ theme: v as 'dark' | 'light' | 'system' });
                    if (v === 'dark') document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Data Management</CardTitle>
              <CardDescription>Manage locally stored data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Custom Templates</p>
                  <p className="text-xs text-muted-foreground">
                    {customPhotoTemplates.length + customIDCardTemplates.length} custom templates
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Delete all custom templates?')) {
                      await clearTemplates();
                      window.location.reload();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Recent Projects</p>
                  <p className="text-xs text-muted-foreground">Clear project history</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Clear all recent projects?')) {
                      clearRecentProjects();
                      await clearProjects();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Clear All Data</p>
                  <p className="text-xs text-muted-foreground">
                    Remove all templates, projects, and settings
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
                  Clear All
                </Button>
              </div>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                onClick={() => settings.resetSettings()}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Settings to Defaults
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
}
