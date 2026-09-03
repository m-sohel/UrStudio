'use client';

import React, { useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Minus, Plus } from 'lucide-react';
import { useEditorStore } from '@/store/editor-store';
import {
  PAPER_SIZES, getPaperSize, getEffectivePaperDimensions,
  getPhotoTemplate, getIDCardTemplate,
} from '@/lib/templates';
import { calculateLayout, calculateOptimalLayout } from '@/lib/layout-engine';

export function PaperSelector() {
  const {
    paperSettings, setPaperSettings,
    selectedTemplateId, selectedTemplateType,
    copies, setCopies,
    setLayoutResult,
  } = useEditorStore();

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
      maxCopies: copies,
    });

    setLayoutResult(result);
  }, [paper, templateDims, paperSettings, copies, setLayoutResult]);

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
    });
    return result.totalItems;
  }, [paper, templateDims, paperSettings]);

  return (
    <div className="space-y-4 p-4">
      {/* Paper Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Paper Size</Label>
        <Select
          value={paperSettings.paperId}
          onValueChange={(v) => { if (v) setPaperSettings({ paperId: v }); }}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAPER_SIZES.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.width}×{p.height}mm)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orientation */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Orientation</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={paperSettings.orientation === 'portrait' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => setPaperSettings({ orientation: 'portrait' })}
          >
            Portrait
          </Button>
          <Button
            variant={paperSettings.orientation === 'landscape' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => setPaperSettings({ orientation: 'landscape' })}
          >
            Landscape
          </Button>
        </div>
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
            max={maxCopies}
            value={copies}
            onChange={(e) => setCopies(Math.min(maxCopies, Math.max(1, parseInt(e.target.value) || 1)))}
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
          onClick={() => setCopies(maxCopies)}
        >
          Fill Paper ({maxCopies} copies)
        </Button>
      </div>

      <Separator />

      {/* Margins */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Margins (mm)</Label>
        <div className="grid grid-cols-2 gap-2">
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

      {/* Spacing */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Spacing (mm)</Label>
        <div className="grid grid-cols-2 gap-2">
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
    </div>
  );
}
