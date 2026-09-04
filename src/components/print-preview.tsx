'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Printer, ZoomIn, ZoomOut, Maximize, ArrowLeft, Info, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/store/editor-store';
import {
  getPaperSize, getEffectivePaperDimensions,
  getPhotoTemplate, getIDCardTemplate,
} from '@/lib/templates';
import { generatePrintHTML, printViaIframe, PRINT_INSTRUCTIONS } from '@/lib/print';

import { useSettingsStore } from '@/store/settings-store';

export function PrintPreview() {
  const {
    croppedImageUrl,
    layoutResult,
    paperSettings,
    selectedTemplateId,
    selectedTemplateType,
    setStep,
    colorCalibration,
    setColorCalibration,
    reset,
  } = useEditorStore();

  const settings = useSettingsStore();
  const [zoom, setZoom] = useState(1);
  const [showInstructions, setShowInstructions] = useState(false);

  const paper = getPaperSize(paperSettings.paperId);

  const template = useMemo(() => {
    if (!selectedTemplateId) return null;
    return selectedTemplateType === 'photo'
      ? getPhotoTemplate(selectedTemplateId)
      : getIDCardTemplate(selectedTemplateId);
  }, [selectedTemplateId, selectedTemplateType]);

  const handlePrint = useCallback(() => {
    if (!paper || !layoutResult || !croppedImageUrl || !template) return;

    const dims = getEffectivePaperDimensions(paper, paperSettings.orientation);

    const html = generatePrintHTML({
      paperWidth: dims.width,
      paperHeight: dims.height,
      orientation: paperSettings.orientation,
      positions: layoutResult.positions,
      imageUrl: croppedImageUrl,
      itemWidth: template.width,
      itemHeight: template.height,
      showCuttingMarks: true,
      bleedMm: settings.defaultBleedMm,
      showCropMarks: settings.showCropMarks,
    });

    printViaIframe(html);

    if (settings.autoWipeOnPrint) {
      setTimeout(() => {
        reset();
      }, 500);
    }
  }, [paper, layoutResult, croppedImageUrl, paperSettings, template, settings, reset]);

  if (!paper || !layoutResult || !template) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Generate a layout first to see the print preview</p>
      </div>
    );
  }

  const dims = getEffectivePaperDimensions(paper, paperSettings.orientation);

  // Scale for screen display (base: 2px per mm)
  const baseScale = 2;
  const scale = baseScale * zoom;
  const paperW = dims.width * scale;
  const paperH = dims.height * scale;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap bg-card">
        <Button variant="ghost" size="sm" onClick={() => setStep('layout')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Editor
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{paper.name}</Badge>
          <Badge variant="secondary">{paperSettings.orientation}</Badge>
          <Badge variant="secondary">
            {template.width}×{template.height}mm
          </Badge>
          <Badge variant="secondary">
            {layoutResult.totalItems} copies
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* CMYK Soft-Proof Toggle */}
        <Button
          variant={colorCalibration.cmykSoftProof ? 'default' : 'outline'}
          size="sm"
          onClick={() => setColorCalibration({ cmykSoftProof: !colorCalibration.cmykSoftProof })}
          className="text-xs h-8"
          title="Preview physical CMY ink on reflective paper"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          {colorCalibration.cmykSoftProof ? 'CMYK Proof ON' : 'CMYK Proof'}
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Zoom controls */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)}>
          <Maximize className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-2" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-xs"
        >
          <Info className="w-4 h-4 mr-1" />
          Print Tips
        </Button>

        <Button
          size="sm"
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Print Now
        </Button>
      </div>

      {/* Instructions panel */}
      {showInstructions && (
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
          <h4 className="text-sm font-semibold text-amber-500 mb-2">⚠️ Printer Calibration & Settings for Highest Accuracy</h4>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            {PRINT_INSTRUCTIONS.map((inst, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{inst}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-8">
        <div
          className="relative shadow-2xl transition-colors duration-200"
          style={{
            width: `${paperW}px`,
            height: `${paperH}px`,
            minWidth: `${paperW}px`,
            minHeight: `${paperH}px`,
            backgroundColor: colorCalibration.cmykSoftProof ? '#faf7f2' : '#ffffff',
            border: colorCalibration.cmykSoftProof ? '1px solid #e0dbd1' : '1px solid #e5e7eb',
          }}
        >
          {layoutResult.positions.map((pos, i) => (
            <div
              key={i}
              className="absolute overflow-hidden border border-dashed border-gray-400/40"
              style={{
                left: `${pos.x * scale}px`,
                top: `${pos.y * scale}px`,
                width: `${pos.width * scale}px`,
                height: `${pos.height * scale}px`,
                filter: colorCalibration.cmykSoftProof ? 'contrast(0.97) saturate(0.96)' : 'none',
              }}
            >
              {croppedImageUrl ? (
                <img
                  src={croppedImageUrl}
                  alt={`Copy ${i + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-400">{i + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
