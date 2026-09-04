'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import {
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Palette, RotateCcwIcon, Check, X,
  Printer, Sparkles, Sliders, ShieldAlert, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useEditorStore } from '@/store/editor-store';
import type { CropData } from '@/lib/image-processing';
import { mmToPx, DEFAULT_DPI } from '@/lib/units';
import { getPhotoTemplate, getIDCardTemplate } from '@/lib/templates';
import { applyPrintColorCalibration, applyPrintColorCalibrationAsync } from '@/lib/color-management';

export function ImageEditor() {
  const cropperRef = useRef<ReactCropperElement>(null);
  const {
    images, selectedImageIndex, selectedTemplateId, selectedTemplateType,
    adjustments, setAdjustments, setCropData, setCroppedImageUrl,
    pushUndo, resetAdjustments, setStep,
    colorCalibration, setColorCalibration, resetColorCalibration,
  } = useEditorStore();

  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);
  const [activeTab, setActiveTab] = useState<'basic' | 'color'>('basic');

  const selectedImage = images[selectedImageIndex];

  // Get aspect ratio from selected template
  const getAspectRatio = useCallback((): number => {
    if (!selectedTemplateId) return NaN; // Free crop
    if (selectedTemplateType === 'photo') {
      const template = getPhotoTemplate(selectedTemplateId);
      return template ? template.aspectRatio : NaN;
    } else {
      const template = getIDCardTemplate(selectedTemplateId);
      return template ? template.aspectRatio : NaN;
    }
  }, [selectedTemplateId, selectedTemplateType]);

  const handleCrop = useCallback(async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const data = cropper.getData(true);
    const cropData: CropData = {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotate: data.rotate,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
    };

    setCropData(cropData);

    // Get the template to determine output size
    let outputWidth = data.width;
    let outputHeight = data.height;

    if (selectedTemplateId) {
      const template = selectedTemplateType === 'photo'
        ? getPhotoTemplate(selectedTemplateId)
        : getIDCardTemplate(selectedTemplateId);

      if (template) {
        outputWidth = mmToPx(template.width, DEFAULT_DPI);
        outputHeight = mmToPx(template.height, DEFAULT_DPI);
      }
    }

    // Build CSS filter string for adjustments
    const filters: string[] = [];
    if (adjustments.brightness !== 0) {
      filters.push(`brightness(${1 + adjustments.brightness / 100})`);
    }
    if (adjustments.contrast !== 0) {
      filters.push(`contrast(${1 + adjustments.contrast / 100})`);
    }
    if (adjustments.saturation !== 0) {
      filters.push(`saturate(${1 + adjustments.saturation / 100})`);
    }
    if (adjustments.grayscale) {
      filters.push('grayscale(1)');
    }

    const canvas = cropper.getCroppedCanvas({
      width: outputWidth,
      height: outputHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Apply standard filters if any
      if (filters.length > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.filter = filters.join(' ');
          tempCtx.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0);
          tempCanvas.width = tempCanvas.height = 0;
        }
      }

      // 2. Apply Print Color Calibration (worker-powered with 3D LUT)
      if (
        colorCalibration.printGamma !== 1.0 ||
        colorCalibration.cyanRedBalance !== 0 ||
        colorCalibration.magentaGreenBalance !== 0 ||
        colorCalibration.yellowBlueBalance !== 0 ||
        colorCalibration.cmykSoftProof
      ) {
        await applyPrintColorCalibrationAsync(ctx, canvas.width, canvas.height, colorCalibration);
      }
    }

    // Convert to Blob URL for fast memory recycling
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
    );

    const dataUrl = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/jpeg', 0.95);
    canvas.width = canvas.height = 0; // Release canvas memory

    setCroppedImageUrl(dataUrl);
    pushUndo();
    setStep('layout');
  }, [
    selectedTemplateId, selectedTemplateType, adjustments, colorCalibration,
    setCropData, setCroppedImageUrl, pushUndo, setStep
  ]);

  // Keyboard shortcut listener for micro-nudging and quick crop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const cropper = cropperRef.current?.cropper;
      if (!cropper) return;

      const step = e.shiftKey ? 25 : 5;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          cropper.move(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          cropper.move(step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          cropper.move(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          cropper.move(0, step);
          break;
        case 'Enter':
          e.preventDefault();
          handleCrop();
          break;
        case 'Escape':
          e.preventDefault();
          setStep('upload');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCrop, setStep]);

  const handleRotate = useCallback((degrees: number) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.rotate(degrees);
  }, []);

  const handleFlipH = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const newFlip = flipH * -1;
      setFlipH(newFlip);
      cropper.scaleX(newFlip);
    }
  }, [flipH]);

  const handleFlipV = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const newFlip = flipV * -1;
      setFlipV(newFlip);
      cropper.scaleY(newFlip);
    }
  }, [flipV]);

  // One-click print optimization for photo paper
  const handleAutoPrintOptimize = () => {
    setColorCalibration({
      printGamma: 1.12, // +12% shadow lift
      magentaGreenBalance: -4, // slight magenta reduction for natural Indian skin tones
      yellowBlueBalance: 2,
      paperType: 'glossy',
    });
  };

  if (!selectedImage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select an image to edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border flex-wrap bg-card">
        <Button variant="ghost" size="sm" onClick={() => handleRotate(-90)} title="Rotate Left (CCW)">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleRotate(90)} title="Rotate Right (CW)">
          <RotateCw className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Button variant="ghost" size="sm" onClick={handleFlipH} title="Flip Horizontal">
          <FlipHorizontal className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleFlipV} title="Flip Vertical">
          <FlipVertical className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { resetAdjustments(); resetColorCalibration(); }}
          title="Reset All Adjustments"
        >
          <RotateCcwIcon className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        {colorCalibration.cmykSoftProof && (
          <Badge variant="outline" className="text-[10px] gap-1 border-cyan-500/40 text-cyan-300 bg-cyan-500/10">
            <Eye className="w-3 h-3" /> CMYK Soft-Proof ON
          </Badge>
        )}

        <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-xs">
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleCrop} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium">
          <Check className="w-4 h-4 mr-1" />
          Apply Crop
        </Button>
      </div>

      {/* Cropper Canvas */}
      <div className="flex-1 bg-black/60 relative overflow-hidden flex items-center justify-center">
        <Cropper
          ref={cropperRef}
          src={selectedImage.objectUrl}
          style={{ height: '100%', width: '100%' }}
          aspectRatio={getAspectRatio()}
          viewMode={1}
          guides={true}
          center={true}
          highlight={true}
          background={true}
          autoCropArea={0.85}
          responsive={true}
          checkOrientation={true}
          zoomOnWheel={true}
        />
      </div>

      {/* Adjustments & CMYK Calibration Panel */}
      <div className="p-3 border-t border-border bg-card">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'color')}>
          <div className="flex items-center justify-between mb-2">
            <TabsList className="h-7">
              <TabsTrigger value="basic" className="text-xs h-6 px-3">
                <Sliders className="w-3 h-3 mr-1" /> Basic Filters
              </TabsTrigger>
              <TabsTrigger value="color" className="text-xs h-6 px-3">
                <Printer className="w-3 h-3 mr-1 text-cyan-400" /> Print & CMYK Color Calibration
              </TabsTrigger>
            </TabsList>

            {activeTab === 'color' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoPrintOptimize}
                className="text-xs h-6 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <Sparkles className="w-3 h-3 mr-1 text-cyan-400" />
                Auto Print Optimize
              </Button>
            )}
          </div>

          {/* Tab 1: Basic Filters */}
          <TabsContent value="basic" className="m-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-center">
              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] flex items-center gap-1 text-muted-foreground">
                    <Sun className="w-3 h-3" /> Brightness
                  </Label>
                  <span className="text-[11px] font-mono">{adjustments.brightness}</span>
                </div>
                <Slider
                  min={-100}
                  max={100}
                  step={1}
                  value={adjustments.brightness}
                  onValueChange={(v) => setAdjustments({ brightness: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 0 })}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] flex items-center gap-1 text-muted-foreground">
                    <Contrast className="w-3 h-3" /> Contrast
                  </Label>
                  <span className="text-[11px] font-mono">{adjustments.contrast}</span>
                </div>
                <Slider
                  min={-100}
                  max={100}
                  step={1}
                  value={adjustments.contrast}
                  onValueChange={(v) => setAdjustments({ contrast: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 0 })}
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] flex items-center gap-1 text-muted-foreground">
                    <Palette className="w-3 h-3" /> Saturation
                  </Label>
                  <span className="text-[11px] font-mono">{adjustments.saturation}</span>
                </div>
                <Slider
                  min={-100}
                  max={100}
                  step={1}
                  value={adjustments.saturation}
                  onValueChange={(v) => setAdjustments({ saturation: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 0 })}
                />
              </div>

              {/* Grayscale */}
              <div className="flex items-center justify-between px-2 pt-2">
                <Label className="text-xs">Grayscale (B&W)</Label>
                <Switch
                  checked={adjustments.grayscale}
                  onCheckedChange={(v) => setAdjustments({ grayscale: v })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Print & CMYK Calibration */}
          <TabsContent value="color" className="m-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              {/* Paper Shadow Lift / Dot Gain (Gamma) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground" title="Lifts shadows to compensate for ink absorption on paper">
                    Shadow Lift (Gamma)
                  </Label>
                  <span className="text-[11px] font-mono">{colorCalibration.printGamma.toFixed(2)}x</span>
                </div>
                <Slider
                  min={0.9}
                  max={1.3}
                  step={0.01}
                  value={colorCalibration.printGamma}
                  onValueChange={(v) => setColorCalibration({ printGamma: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 1.0 })}
                />
              </div>

              {/* Skin Tone / Magenta-Green Tuning */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground" title="Reduces excess red/magenta cast on skin tones">
                    Skin Tone (Magenta/Green)
                  </Label>
                  <span className="text-[11px] font-mono">{colorCalibration.magentaGreenBalance > 0 ? `+${colorCalibration.magentaGreenBalance}` : colorCalibration.magentaGreenBalance}</span>
                </div>
                <Slider
                  min={-30}
                  max={30}
                  step={1}
                  value={colorCalibration.magentaGreenBalance}
                  onValueChange={(v) => setColorCalibration({ magentaGreenBalance: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 0 })}
                />
              </div>

              {/* Paper Type */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Target Paper</Label>
                <Select
                  value={colorCalibration.paperType}
                  onValueChange={(v) => { if (v) setColorCalibration({ paperType: v as typeof colorCalibration.paperType }); }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glossy">Glossy Photo Paper</SelectItem>
                    <SelectItem value="matte">Matte Photo Paper</SelectItem>
                    <SelectItem value="plain">Plain / Bond Paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CMYK Soft-Proof Toggle */}
              <div className="flex items-center justify-between px-2 pt-1 border-l border-border">
                <div>
                  <Label className="text-xs block font-medium">CMYK Soft-Proof</Label>
                  <span className="text-[10px] text-muted-foreground">Simulate paper ink</span>
                </div>
                <Switch
                  checked={colorCalibration.cmykSoftProof}
                  onCheckedChange={(v) => setColorCalibration({ cmykSoftProof: v })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
