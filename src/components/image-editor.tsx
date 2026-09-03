'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import {
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Palette, RotateCcwIcon, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/store/editor-store';
import type { CropData } from '@/lib/image-processing';
import { mmToPx, DEFAULT_DPI } from '@/lib/units';
import { getPhotoTemplate, getIDCardTemplate } from '@/lib/templates';

export function ImageEditor() {
  const cropperRef = useRef<ReactCropperElement>(null);
  const {
    images, selectedImageIndex, selectedTemplateId, selectedTemplateType,
    adjustments, setAdjustments, setCropData, setCroppedImageUrl,
    pushUndo, resetAdjustments, setStep,
  } = useEditorStore();

  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);

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

  const handleCrop = useCallback(() => {
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

    if (filters.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.filter = filters.join(' ');
          tempCtx.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCroppedImageUrl(dataUrl);
    pushUndo();
    setStep('layout');
  }, [selectedTemplateId, selectedTemplateType, adjustments, setCropData, setCroppedImageUrl, pushUndo, setStep]);

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

  if (!selectedImage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select an image to edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border flex-wrap">
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
        <Button variant="ghost" size="sm" onClick={resetAdjustments} title="Reset">
          <RotateCcwIcon className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleCrop} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Check className="w-4 h-4 mr-1" />
          Apply Crop
        </Button>
      </div>

      {/* Cropper */}
      <div className="flex-1 bg-black/50 relative overflow-hidden">
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

      {/* Adjustments Panel */}
      <div className="p-4 border-t border-border space-y-4 max-h-[200px] overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" /> Brightness
              </Label>
              <span className="text-xs text-muted-foreground">{adjustments.brightness}</span>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Contrast className="w-3.5 h-3.5" /> Contrast
              </Label>
              <span className="text-xs text-muted-foreground">{adjustments.contrast}</span>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Saturation
              </Label>
              <span className="text-xs text-muted-foreground">{adjustments.saturation}</span>
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
          <div className="flex items-center justify-between pt-2">
            <Label className="text-xs">Grayscale</Label>
            <Switch
              checked={adjustments.grayscale}
              onCheckedChange={(v) => setAdjustments({ grayscale: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
