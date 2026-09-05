'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Edit2, Copy, Image,
  CreditCard, Check, Sparkles, LayoutGrid, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTemplateStore } from '@/store/template-store';
import { useEditorStore } from '@/store/editor-store';
import {
  PHOTO_TEMPLATES, ID_CARD_TEMPLATES, PAPER_SIZES,
  formatTemplateDimensions, type PhotoTemplate, type IDCardTemplate,
  createCustomPhotoTemplate, createCustomIDCardTemplate
} from '@/lib/templates';

export default function TemplatesPage() {
  const router = useRouter();
  const {
    customPhotoTemplates, customIDCardTemplates,
    addPhotoTemplate, deletePhotoTemplate,
    addIDCardTemplate, deleteIDCardTemplate,
  } = useTemplateStore();

  const { setSelectedTemplate, setMode, setStep } = useEditorStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateType, setTemplateType] = useState<'photo' | 'id-card'>('photo');

  // Form State
  const [name, setName] = useState('');
  const [width, setWidth] = useState(35);
  const [height, setHeight] = useState(45);
  const [unit, setUnit] = useState<'mm' | 'in'>('mm');
  const [copies, setCopies] = useState(8);
  const [paperId, setPaperId] = useState('a4');
  const [hasBackSide, setHasBackSide] = useState(true);

  const handleCreateTemplate = () => {
    if (!name.trim()) {
      alert('Please enter a template name.');
      return;
    }
    const wMm = unit === 'in' ? width * 25.4 : width;
    const hMm = unit === 'in' ? height * 25.4 : height;

    if (templateType === 'photo') {
      const newT: PhotoTemplate = {
        ...createCustomPhotoTemplate(name.trim(), wMm, hMm, unit),
        defaultCopies: copies,
        defaultPaperId: paperId,
      };
      addPhotoTemplate(newT);
    } else {
      const newID: IDCardTemplate = createCustomIDCardTemplate(name.trim(), wMm, hMm, hasBackSide, unit);
      addIDCardTemplate(newID);
    }

    // Reset & close
    setName('');
    setWidth(35);
    setHeight(45);
    setIsDialogOpen(false);
  };

  const handleUseTemplate = (id: string, type: 'photo' | 'id-card') => {
    setSelectedTemplate(id, type);
    setMode(type);
    setStep('upload');
    router.push(`/editor?template=${id}&mode=${type}`);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold">Template Manager</h1>
                <p className="text-xs text-muted-foreground">Browse standard and custom photo & ID card presets</p>
              </div>
            </div>

            {/* Create Custom Template Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-orange-500/20 font-medium">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Custom Template
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>New Custom Template</DialogTitle>
                  <DialogDescription>
                    Define custom dimensions and printing settings for photos or cards.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Template Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={templateType === 'photo' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setTemplateType('photo'); setWidth(35); setHeight(45); }}
                        className="text-xs"
                      >
                        <Image className="w-3.5 h-3.5 mr-1" />
                        Photo Preset
                      </Button>
                      <Button
                        type="button"
                        variant={templateType === 'id-card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setTemplateType('id-card'); setWidth(85.6); setHeight(53.98); }}
                        className="text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        ID Card Preset
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Template Name</Label>
                    <Input
                      placeholder="e.g. Canada Visa Photo, College Student ID"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={width}
                        onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={height}
                        onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Unit</Label>
                      <Select value={unit} onValueChange={(v) => { if (v) setUnit(v as 'mm' | 'in'); }}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="in">inch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {templateType === 'photo' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Default Copies</Label>
                        <Input
                          type="number"
                          value={copies}
                          onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Default Paper</Label>
                        <Select value={paperId} onValueChange={(v) => { if (v) setPaperId(v); }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAPER_SIZES.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreateTemplate} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium">
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
          <Tabs defaultValue="photos" className="space-y-6">
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="photos" className="text-xs">
                <Image className="w-3.5 h-3.5 mr-1.5" />
                Photos ({PHOTO_TEMPLATES.length + customPhotoTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="id-cards" className="text-xs">
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                ID Cards ({ID_CARD_TEMPLATES.length + customIDCardTemplates.length})
              </TabsTrigger>
            </TabsList>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Built-in Photo Presets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {PHOTO_TEMPLATES.map((t) => (
                    <Card key={t.id} className="border-border hover:border-primary/40 transition-colors">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                          <Badge variant="secondary" className="text-[10px]">Built-in</Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatTemplateDimensions(t)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{t.defaultCopies} copies default</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseTemplate(t.id, 'photo')}
                          className="text-xs h-7"
                        >
                          Use Preset →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {customPhotoTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">
                    Your Custom Photo Templates
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {customPhotoTemplates.map((t) => (
                      <Card key={t.id} className="border-cyan-500/30 bg-cyan-500/5">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => deletePhotoTemplate(t.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <CardDescription className="text-xs">
                            {formatTemplateDimensions(t)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{t.defaultCopies} copies default</span>
                          <Button
                            size="sm"
                            onClick={() => handleUseTemplate(t.id, 'photo')}
                            className="text-xs h-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                          >
                            Use Preset →
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ID Cards Tab */}
            <TabsContent value="id-cards" className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Standard ID Card Presets (CR80)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ID_CARD_TEMPLATES.map((t) => (
                    <Card key={t.id} className="border-border hover:border-primary/40 transition-colors">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                          <Badge variant="secondary" className="text-[10px]">Standard</Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatTemplateDimensions(t)} • Front & Back
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">CR80 Plastic Card</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseTemplate(t.id, 'id-card')}
                          className="text-xs h-7"
                        >
                          Print Card →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {customIDCardTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">
                    Your Custom ID Card Templates
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {customIDCardTemplates.map((t) => (
                      <Card key={t.id} className="border-cyan-500/30 bg-cyan-500/5">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteIDCardTemplate(t.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <CardDescription className="text-xs">
                            {formatTemplateDimensions(t)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Custom</span>
                          <Button
                            size="sm"
                            onClick={() => handleUseTemplate(t.id, 'id-card')}
                            className="text-xs h-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                          >
                            Print Card →
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}
