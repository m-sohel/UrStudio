'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Printer, ZoomIn, ZoomOut, Maximize, ArrowLeft, Info, Eye, FileDown, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/store/editor-store';
import {
  getPaperSize, getEffectivePaperDimensions,
  getPhotoTemplate, getIDCardTemplate,
} from '@/lib/templates';
import { mapMultiCustomerSlots, type MultiCustomerPhotoItem } from '@/lib/layout-engine';
import { generatePrintHTML, printViaIframe, PRINT_INSTRUCTIONS } from '@/lib/print';
import { exportPhotoLayoutToPDF } from '@/lib/pdf-exporter';
import { useSettingsStore } from '@/store/settings-store';
import { useLicenseStore } from '@/store/license-store';
import { Crown } from 'lucide-react';

export function PrintPreview() {
  const {
    croppedImageUrl,
    images,
    layoutResult,
    paperSettings,
    selectedTemplateId,
    selectedTemplateType,
    photoBorder,
    setStep,
    colorCalibration,
    setColorCalibration,
    mixMatchMode,
    slotOverrides,
    reset,
  } = useEditorStore();

  const settings = useSettingsStore();
  const { isPro, shopBranding, tier, consumeSinglePass, openUpgradeModal } = useLicenseStore();
  const [zoom, setZoom] = useState(1);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const paper = getPaperSize(paperSettings.paperId);

  const template = useMemo(() => {
    if (!selectedTemplateId) return null;
    return selectedTemplateType === 'photo'
      ? getPhotoTemplate(selectedTemplateId)
      : getIDCardTemplate(selectedTemplateId);
  }, [selectedTemplateId, selectedTemplateType]);

  // Candidates for multi-customer sheet
  const customerItems: MultiCustomerPhotoItem[] = useMemo(() => {
    return images
      .filter((img) => img.croppedImageUrl || img.objectUrl)
      .map((img) => ({
        id: img.id,
        name: img.name.replace(/\.[^/.]+$/, ''),
        imageUrl: img.croppedImageUrl || img.objectUrl,
        copies: img.copies || 4,
      }));
  }, [images]);

  // Compute multi-customer mapped slots
  const mappedSlots = useMemo(() => {
    if (!layoutResult || customerItems.length === 0) return [];
    if (!mixMatchMode || customerItems.length <= 1) {
      return layoutResult.positions.map((pos, idx) => ({
        position: pos,
        slotIndex: idx,
        imageId: customerItems[0]?.id || 'default',
        imageName: customerItems[0]?.name || 'Photo',
        imageUrl: croppedImageUrl || customerItems[0]?.imageUrl || '',
        customerIndex: 0,
      }));
    }
    return mapMultiCustomerSlots(layoutResult.positions, customerItems, slotOverrides);
  }, [layoutResult, customerItems, mixMatchMode, croppedImageUrl, slotOverrides]);

  const handlePrint = useCallback(() => {
    if (!paper || !layoutResult || !template) return;

    const dims = getEffectivePaperDimensions(paper, paperSettings.orientation);
    const slotsPayload = mappedSlots.map((s) => ({ position: s.position, imageUrl: s.imageUrl }));

    const html = generatePrintHTML({
      paperWidth: dims.width,
      paperHeight: dims.height,
      orientation: paperSettings.orientation,
      positions: layoutResult.positions,
      imageUrl: croppedImageUrl || customerItems[0]?.imageUrl || '',
      slots: mixMatchMode ? slotsPayload : undefined,
      itemWidth: template.width,
      itemHeight: template.height,
      photoBorder,
      showCuttingMarks: true,
      bleedMm: settings.defaultBleedMm,
      showCropMarks: settings.showCropMarks,
      watermark: {
        isPro,
        shopBranding,
      },
    });

    printViaIframe(html);

    if (tier === 'single_pass') {
      consumeSinglePass();
    }

    if (settings.autoWipeOnPrint) {
      setTimeout(() => {
        reset();
      }, 500);
    }
  }, [paper, layoutResult, croppedImageUrl, paperSettings, template, photoBorder, settings, mappedSlots, mixMatchMode, customerItems, reset, isPro, shopBranding, tier, consumeSinglePass]);

  const handleSavePDF = useCallback(async () => {
    if (!paper || !layoutResult || !template) return;

    try {
      setIsExportingPdf(true);
      const slotsPayload = mappedSlots.map((s) => ({ position: s.position, imageUrl: s.imageUrl }));

      await exportPhotoLayoutToPDF({
        paperWidth: paper.width,
        paperHeight: paper.height,
        orientation: paperSettings.orientation,
        positions: layoutResult.positions,
        imageUrl: croppedImageUrl || customerItems[0]?.imageUrl || '',
        slots: mixMatchMode ? slotsPayload : undefined,
        itemWidth: template.width,
        itemHeight: template.height,
        photoBorder,
        showCuttingMarks: true,
        bleedMm: settings.defaultBleedMm,
        showCropMarks: settings.showCropMarks,
        watermark: {
          isPro,
          shopBranding,
        },
        filename: `UrStudio_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${paper.name}_${Date.now()}.pdf`,
      });

      if (tier === 'single_pass') {
        consumeSinglePass();
      }
    } catch (err) {
      console.error('Failed to export photo sheet PDF:', err);
      alert('Failed to export PDF. Please check your image data and try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [paper, layoutResult, croppedImageUrl, paperSettings, template, settings, mappedSlots, mixMatchMode, customerItems, isPro, shopBranding, tier, consumeSinglePass]);

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
          {mixMatchMode && (
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
              <Users className="w-3 h-3" /> Mix & Match ({customerItems.length} Customers)
            </Badge>
          )}
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

        <Separator orientation="vertical" className="h-6 mx-2" />

        {!isPro ? (
          <Button
            variant="3d"
            size="sm"
            onClick={() => openUpgradeModal('Watermark-Free Ultra-HD Export')}
            className="text-xs h-8 border-[#C89B4A] text-[#825F21] dark:text-[#D8A856] bg-[#C89B4A]/15 hover:bg-[#C89B4A]/25 font-bold gap-1.5 shadow-[0_3px_0_0_#825F21]"
            title="Upgrade to Pro to remove UrStudio watermark & add shop branding"
          >
            <Crown className="w-3.5 h-3.5 text-[#C89B4A]" />
            <span className="hidden md:inline">Remove Watermark</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#C89B4A] text-[#2A2013] font-bold">
              PRO
            </span>
          </Button>
        ) : (
          <div className="badge-3d text-xs h-8 px-2.5 border-[#4C7A5A] bg-[#4C7A5A]/15 text-[#4C7A5A] flex items-center font-bold gap-1 shadow-[0_2px_0_0_#33533D]">
            <Crown className="w-3.5 h-3.5 text-[#C89B4A]" />
            <span className="hidden sm:inline">Pro Active</span>
          </div>
        )}

        <Button
          variant="3d"
          size="sm"
          onClick={handleSavePDF}
          disabled={isExportingPdf}
          className="text-xs h-8 gap-1.5 font-semibold"
        >
          <FileDown className="w-4 h-4 text-[#3E6E93]" />
          {isExportingPdf ? 'Saving PDF...' : 'Save as PDF'}
        </Button>

        <Button
          variant="3d-terracotta"
          size="sm"
          onClick={handlePrint}
          className="h-8 px-3.5 text-xs font-bold gap-1.5"
        >
          <Printer className="w-4 h-4" />
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
          {mappedSlots.map((slot, i) => {
            const hasBorder = photoBorder?.enabled && photoBorder.style !== 'none';
            const borderWidthPx = hasBorder ? Math.max(1, Math.round(photoBorder.width * scale)) : 0;
            const borderCss = hasBorder
              ? `${borderWidthPx}px ${photoBorder.style} ${photoBorder.color}`
              : '1px dashed rgba(156, 163, 175, 0.4)';

            return (
              <div
                key={i}
                className="absolute overflow-hidden"
                style={{
                  left: `${slot.position.x * scale}px`,
                  top: `${slot.position.y * scale}px`,
                  width: `${slot.position.width * scale}px`,
                  height: `${slot.position.height * scale}px`,
                  border: borderCss,
                  boxSizing: 'border-box',
                  filter: colorCalibration.cmykSoftProof ? 'contrast(0.97) saturate(0.96)' : 'none',
                }}
              >
                {slot.imageUrl ? (
                  <div className="w-full h-full relative">
                    <img
                      src={slot.imageUrl}
                      alt={`Copy ${i + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    {mixMatchMode && (
                      <span className="absolute top-1 left-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        #{slot.customerIndex + 1}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Watermark / Custom Shop Branding Footer Preview on Paper */}
          {!isPro ? (
            <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-gray-400 font-sans tracking-wide select-none pointer-events-none">
              Printed via UrStudio (urstudio.app) • Free Tier
            </div>
          ) : (
            shopBranding.enabled && shopBranding.shopName ? (
              <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-gray-600 font-sans font-medium tracking-wide select-none pointer-events-none px-4 truncate">
                {shopBranding.shopName}
                {shopBranding.phone ? ` • Tel: ${shopBranding.phone}` : ''}
                {shopBranding.address ? ` • ${shopBranding.address}` : ''}
                {shopBranding.customFooter ? ` • ${shopBranding.customFooter}` : ''}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
