'use client';

import React, { useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Minus, Plus, Square, Palette, Crown, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editor-store';
import { useLicenseStore } from '@/store/license-store';
import {
  PAPER_SIZES, getPaperSize, getEffectivePaperDimensions,
  getPhotoTemplate, getIDCardTemplate, getDefaultPaperSettings,
} from '@/lib/templates';
import { calculateLayout, calculateOptimalLayout } from '@/lib/layout-engine';

export function PaperSelector() {
  const {
    paperSettings, setPaperSettings,
    photoBorder, setPhotoBorder,
    selectedTemplateId, selectedTemplateType,
    copies, setCopies,
    setLayoutResult,
    rotation, setRotation,
  } = useEditorStore();

  const { isPro, openUpgradeModal } = useLicenseStore();

  const paper = getPaperSize(paperSettings.paperId);

  // Get template dimensions
  const templateDims = useMemo(() => {
    if (!selectedTemplateId) return null;
    const template = selectedTemplateType === 'photo'
      ? getPhotoTemplate(selectedTemplateId)
      : getIDCardTemplate(selectedTemplateId);
    return template ? { width: template.width, height: template.height } : null;
  }, [selectedTemplateId, selectedTemplateType]);

  // Calculate layout whenever relevant settings change
  useEffect(() => {
    if (!paper || !templateDims) return;

    const dims = getEffectivePaperDimensions(paper, paperSettings.orientation);

    const result = calculateLayout({
      paperWidth: dims.width,
      paperHeight: dims.height,
      itemWidth: templateDims.width,
      itemHeight: templateDims.height,
      marginTop: paperSettings.marginTop,
      marginRight: paperSettings.marginRight,
      marginBottom: paperSettings.marginBottom,
      marginLeft: paperSettings.marginLeft,
      horizontalGap: paperSettings.horizontalGap,
      verticalGap: paperSettings.verticalGap,
      rotation: (rotation === 90 || rotation === 270) ? 90 : 0,
      maxCopies: copies,
    });

    setLayoutResult(result);
  }, [paper, templateDims, paperSettings, copies, rotation, setLayoutResult]);

  // Max copies based on layout
  const maxCopies = useMemo(() => {
    if (!paper || !templateDims) return 100;
    const dims = getEffectivePaperDimensions(paper, paperSettings.orientation);
    const result = calculateLayout({
      paperWidth: dims.width,
      paperHeight: dims.height,
      itemWidth: templateDims.width,
      itemHeight: templateDims.height,
      marginTop: paperSettings.marginTop,
      marginRight: paperSettings.marginRight,
      marginBottom: paperSettings.marginBottom,
      marginLeft: paperSettings.marginLeft,
      horizontalGap: paperSettings.horizontalGap,
      verticalGap: paperSettings.verticalGap,
      rotation: (rotation === 90 || rotation === 270) ? 90 : 0,
    });
    return result.totalItems;
  }, [paper, templateDims, paperSettings, rotation]);

  // Ensure copies does not exceed maxCopies when template changes to a smaller sheet layout
  useEffect(() => {
    if (maxCopies > 0 && copies > maxCopies) {
      setCopies(maxCopies);
    }
  }, [maxCopies, copies, setCopies]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4 pb-20">
        {/* Paper Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Paper Size</Label>
        <Select
          value={paperSettings.paperId}
          onValueChange={(v) => {
            if (v) {
              setPaperSettings({ paperId: v });
            }
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[240px]">
            {PAPER_SIZES.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.width}×{p.height}mm)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orientation — Available to all users */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Paper Orientation</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={paperSettings.orientation === 'portrait' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs px-1.5 font-medium"
            onClick={() => setPaperSettings({ orientation: 'portrait' })}
          >
            Portrait (Vertical)
          </Button>
          <Button
            variant={paperSettings.orientation === 'landscape' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs px-1.5 font-medium"
            onClick={() => setPaperSettings({ orientation: 'landscape' })}
          >
            Landscape (Horizontal)
          </Button>
        </div>
      </div>

      {/* Photo Layout Orientation — Upright vs Rotated 90° */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Photo Layout Orientation</Label>
          <span className="text-[10px] text-muted-foreground">
            {rotation === 90 ? 'Rotated 90° (Sideways)' : 'Upright (0°)'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={rotation !== 90 ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setRotation(0)}
          >
            Upright (0°)
          </Button>
          <Button
            variant={rotation === 90 ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setRotation(90)}
          >
            Rotate 90° {paperSettings.paperId === '4x6' && paperSettings.orientation === 'portrait' ? '(8 Photos)' : ''}
          </Button>
        </div>
        {paperSettings.paperId === '4x6' && paperSettings.orientation === 'portrait' && (
          <p className="text-[10px] text-muted-foreground">
            {rotation === 90
              ? '✓ Fits studio standard 8 passport photos on vertical 4x6 sheet (2 cols × 4 rows)'
              : 'Upright fits up to 6 passport photos on vertical 4x6 sheet (2 cols × 3 rows)'}
          </p>
        )}
      </div>

      <Separator />

      {/* Copies */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Copies</Label>
          <span className="text-xs text-muted-foreground">
            Max: {maxCopies}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCopies(Math.max(1, copies - 1))}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            min={1}
            max={Math.max(1, maxCopies)}
            value={copies}
            onChange={(e) => setCopies(Math.min(Math.max(1, maxCopies), Math.max(1, parseInt(e.target.value) || 1)))}
            className="h-9 text-center"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCopies(Math.min(maxCopies, copies + 1))}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setCopies(Math.max(1, maxCopies))}
          disabled={maxCopies === 0}
        >
          Fill Paper ({maxCopies} {maxCopies === 1 ? 'copy' : 'copies'})
        </Button>
      </div>

      <Separator />

      {/* Margins — Pro Feature */}
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Margins (mm)</Label>
          {!isPro && (
            <button
              type="button"
              onClick={() => openUpgradeModal('Custom Paper Margins')}
              className="flex items-center gap-1 text-[10px] font-bold text-[#C89B4A] hover:text-[#E5AD35] transition-colors cursor-pointer"
            >
              <Crown className="w-3 h-3" />
              <span>PRO</span>
            </button>
          )}
        </div>
        <div className={`grid grid-cols-2 gap-2 ${!isPro ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <Label className="text-[10px] text-muted-foreground">Top</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={paperSettings.marginTop}
              onChange={(e) => setPaperSettings({ marginTop: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Bottom</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={paperSettings.marginBottom}
              onChange={(e) => setPaperSettings({ marginBottom: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Left</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={paperSettings.marginLeft}
              onChange={(e) => setPaperSettings({ marginLeft: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Right</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={paperSettings.marginRight}
              onChange={(e) => setPaperSettings({ marginRight: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Spacing — Pro Feature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Spacing (mm)</Label>
          {!isPro && (
            <button
              type="button"
              onClick={() => openUpgradeModal('Custom Photo Spacing')}
              className="flex items-center gap-1 text-[10px] font-bold text-[#C89B4A] hover:text-[#E5AD35] transition-colors cursor-pointer"
            >
              <Crown className="w-3 h-3" />
              <span>PRO</span>
            </button>
          )}
        </div>
        <div className={`grid grid-cols-2 gap-2 ${!isPro ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <Label className="text-[10px] text-muted-foreground">Horizontal</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={paperSettings.horizontalGap}
              onChange={(e) => setPaperSettings({ horizontalGap: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Vertical</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={paperSettings.verticalGap}
              onChange={(e) => setPaperSettings({ verticalGap: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Passport Photo Border & Frame — Pro Feature */}
      <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4 text-primary" />
            <div>
              <Label className="text-xs font-semibold leading-none">Photo Cut Border</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Passport cut guide & studio border</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isPro && (
              <button
                type="button"
                onClick={() => openUpgradeModal('Photo Border Controls')}
                className="flex items-center gap-1 text-[10px] font-bold text-[#C89B4A] hover:text-[#E5AD35] transition-colors cursor-pointer"
              >
                <Crown className="w-3 h-3" />
                <span>PRO</span>
              </button>
            )}
            <Switch
              checked={photoBorder.enabled}
              onCheckedChange={(checked) => {
                if (!isPro) {
                  openUpgradeModal('Photo Border Controls');
                  return;
                }
                setPhotoBorder({ enabled: checked });
              }}
            />
          </div>
        </div>

        {photoBorder.enabled && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            {/* Live Border Sample Swatch */}
            <div className="p-2 bg-background rounded border border-border flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">Border Preview:</span>
              <div
                className="w-16 h-8 bg-white flex items-center justify-center rounded shadow-xs"
                style={{
                  border: `${Math.max(1, photoBorder.width * 2)}px ${photoBorder.style} ${photoBorder.color}`,
                  boxSizing: 'border-box',
                }}
              >
                <span className="text-[8px] text-gray-400 font-mono">35×45</span>
              </div>
            </div>

            {/* Thickness / Width (mm) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium">Border Thickness</Label>
                <span className="text-[11px] font-mono font-semibold text-primary">{photoBorder.width} mm</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '0.2 mm', val: 0.2, desc: 'Hairline' },
                  { label: '0.5 mm', val: 0.5, desc: 'Standard' },
                  { label: '1.0 mm', val: 1.0, desc: 'Medium' },
                  { label: '1.5 mm', val: 1.5, desc: 'Bold' },
                ].map((item) => (
                  <Button
                    key={item.val}
                    type="button"
                    variant={photoBorder.width === item.val ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-[10px] px-1 font-medium"
                    onClick={() => setPhotoBorder({ width: item.val })}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Custom width:</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={5}
                  value={photoBorder.width}
                  onChange={(e) => setPhotoBorder({ width: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="h-6 text-[11px] w-20"
                />
                <span className="text-[10px] text-muted-foreground">mm</span>
              </div>
            </div>

            {/* Border Style */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">Border Style</Label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'Solid', val: 'solid' },
                  { label: 'Double', val: 'double' },
                  { label: 'Dashed', val: 'dashed' },
                  { label: 'Dotted', val: 'dotted' },
                ].map((st) => (
                  <Button
                    key={st.val}
                    type="button"
                    variant={photoBorder.style === st.val ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-[10px] px-1 font-medium capitalize"
                    onClick={() => setPhotoBorder({ style: st.val as any })}
                  >
                    {st.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Border Color */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium">Border Color</Label>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-border shadow-xs inline-block"
                    style={{ backgroundColor: photoBorder.color }}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{photoBorder.color}</span>
                </div>
              </div>

              {/* Color chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { name: 'Classic Gray', hex: '#D1D5DB' },
                  { name: 'Crisp Black', hex: '#000000' },
                  { name: 'Pure White', hex: '#FFFFFF' },
                  { name: 'Slate', hex: '#64748B' },
                  { name: 'Navy Blue', hex: '#1E3A8A' },
                  { name: 'Terracotta', hex: '#E05A47' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setPhotoBorder({ color: c.hex })}
                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                      photoBorder.color.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-primary ring-offset-1 border-primary scale-110'
                        : 'border-border/80 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {photoBorder.color.toLowerCase() === c.hex.toLowerCase() && (
                      <span className={`text-[9px] font-bold ${c.hex === '#FFFFFF' || c.hex === '#D1D5DB' ? 'text-black' : 'text-white'}`}>✓</span>
                    )}
                  </button>
                ))}

                {/* Custom Color Picker input */}
                <label
                  title="Pick custom color"
                  className="w-6 h-6 rounded-full border border-border overflow-hidden cursor-pointer relative hover:scale-105 transition-transform flex items-center justify-center bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500"
                >
                  <input
                    type="color"
                    value={photoBorder.color}
                    onChange={(e) => setPhotoBorder({ color: e.target.value })}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ScrollArea>
  );
}
