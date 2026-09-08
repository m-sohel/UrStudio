'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import {
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Palette, RotateCcwIcon, Check, X,
  Printer, Sparkles, Sliders, ShieldAlert, Eye,
  UserCheck, ScanFace, Paintbrush, Wand2, RefreshCw, AlertCircle,
  Upload, FileCheck2, Users, RectangleHorizontal
} from 'lucide-react';
import { DigitalFormExportDialog } from '@/components/digital-form-export-dialog';
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
import {
  type CropData,
  loadImageElement,
  detectFaceBoundingBox,
  calculateBiometricCropBox,
  replaceImageBackground,
  autoEnhanceCanvas,
} from '@/lib/image-processing';
import { mmToPx, DEFAULT_DPI } from '@/lib/units';
import { getPhotoTemplate, getIDCardTemplate } from '@/lib/templates';
import { applyPrintColorCalibrationAsync } from '@/lib/color-management';
import { useLicenseStore } from '@/store/license-store';

const BG_COLOR_PRESETS = [
  { name: 'Studio White', color: '#FFFFFF', desc: 'Standard Passport/Visa' },
  { name: 'Passport Blue', color: '#2563EB', desc: 'Malaysia / Sri Lanka' },
  { name: 'Light Gray', color: '#E5E7EB', desc: 'Schengen / UK' },
  { name: 'Warm Cream', color: '#FDFBF7', desc: 'Natural Warm' },
  { name: 'Transparent', color: 'transparent', desc: 'PNG Cutout' },
];

export function ImageEditor() {
  const cropperRef = useRef<ReactCropperElement>(null);
  const {
    images, selectedImageIndex, selectImage, selectedTemplateId, selectedTemplateType,
    adjustments, setAdjustments, setCropData, setCroppedImageUrl,
    pushUndo, resetAdjustments, setStep,
    colorCalibration, setColorCalibration, resetColorCalibration,
  } = useEditorStore();

  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);
  const [activeTab, setActiveTab] = useState<'basic' | 'background' | 'color'>('basic');

  // New Studio Features State
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<string | null>(null);
  const [showBiometricGuides, setShowBiometricGuides] = useState(true);

  const [bgReplacementColor, setBgReplacementColor] = useState('#FFFFFF');
  const [bgTolerance, setBgTolerance] = useState(30);
  const [bgFeather, setBgFeather] = useState(3);
  const [bgProtectClothing, setBgProtectClothing] = useState(true);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Overridden image object URL if background or enhancement has modified it
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  // Govt Form Export Dialog State
  const [isGovtFormDialogOpen, setIsGovtFormDialogOpen] = useState(false);
  const [govtFormSourceUrl, setGovtFormSourceUrl] = useState<string | null>(null);

  const handleOpenGovtFormDialog = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
      if (canvas) {
        setGovtFormSourceUrl(canvas.toDataURL('image/jpeg', 0.95));
      } else {
        setGovtFormSourceUrl(activeImageUrl || selectedImage?.objectUrl || null);
      }
    } else {
      setGovtFormSourceUrl(activeImageUrl || selectedImage?.objectUrl || null);
    }
    setIsGovtFormDialogOpen(true);
  };

  const selectedImage = images[selectedImageIndex];

  // Sync activeImageUrl when selectedImage changes
  useEffect(() => {
    if (selectedImage) {
      setActiveImageUrl(selectedImage.objectUrl);
      if (cropperRef.current?.cropper) {
        cropperRef.current.cropper.replace(selectedImage.objectUrl);
      }
    }
  }, [selectedImage?.id, selectedImageIndex]);

  // Get active template
  const activeTemplate = selectedTemplateId
    ? (selectedTemplateType === 'photo' ? getPhotoTemplate(selectedTemplateId) : getIDCardTemplate(selectedTemplateId))
    : null;

  // Crop orientation: 'portrait' (vertical) vs 'landscape' (horizontal)
  const [cropOrientation, setCropOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Get aspect ratio from selected template with orientation support
  const getAspectRatio = useCallback((): number => {
    if (!selectedTemplateId) return NaN; // Free crop
    if (!activeTemplate) return NaN;
    return cropOrientation === 'landscape'
      ? (activeTemplate.height / activeTemplate.width)
      : (activeTemplate.width / activeTemplate.height);
  }, [selectedTemplateId, activeTemplate, cropOrientation]);

  const handleToggleCropOrientation = () => {
    const next = cropOrientation === 'portrait' ? 'landscape' : 'portrait';
    setCropOrientation(next);
    const cropper = cropperRef.current?.cropper;
    if (cropper && activeTemplate) {
      const newRatio = next === 'landscape'
        ? (activeTemplate.height / activeTemplate.width)
        : (activeTemplate.width / activeTemplate.height);
      cropper.setAspectRatio(newRatio);
    }
  };

  // 1. Biometric Face Centering (Smart Crop)
  const handleBiometricCenterFace = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    try {
      setIsDetectingFace(true);
      setBiometricFeedback('Detecting face & biometric alignment...');

      // Get image element from cropper
      const imgElement = (cropper as any).image as HTMLImageElement;
      const imgWidth = imgElement.naturalWidth || imgElement.width;
      const imgHeight = imgElement.naturalHeight || imgElement.height;

      const faceBox = await detectFaceBoundingBox(imgElement);

      if (!faceBox) {
        setBiometricFeedback('Face not detected automatically. Please adjust crop box manually.');
        setTimeout(() => setBiometricFeedback(null), 4000);
        return;
      }

      const aspectRatio = getAspectRatio() || 35 / 45;
      // Target coverage: 60% for US Passport, 75% for Indian/EU/UK standard
      const isUS = selectedTemplateId === 'passport-photo-us' || (activeTemplate as any)?.faceCoveragePercent?.includes('50–69');
      const targetCoverage = isUS ? 0.60 : 0.75;

      const cropCoords = calculateBiometricCropBox(
        imgWidth,
        imgHeight,
        faceBox,
        aspectRatio,
        targetCoverage
      );

      cropper.setData(cropCoords);
      setBiometricFeedback(`Face aligned: ${Math.round(targetCoverage * 100)}% Biometric Coverage`);
      setTimeout(() => setBiometricFeedback(null), 4000);
    } catch (err) {
      console.error('Biometric alignment error:', err);
      setBiometricFeedback('Error during face detection');
      setTimeout(() => setBiometricFeedback(null), 3000);
    } finally {
      setIsDetectingFace(false);
    }
  };

  // 2. One-Click Studio Photo Auto-Enhance
  const handleStudioAutoEnhance = () => {
    // 1-Click: apply balanced exposure lift, studio contrast, natural warmth, and shadow correction
    setAdjustments({
      brightness: 8,
      contrast: 12,
      saturation: 6,
      grayscale: false,
    });
    setColorCalibration({
      printGamma: 1.10, // lift dark shadows by 10%
      magentaGreenBalance: -3, // slight magenta reduction for natural skin
      yellowBlueBalance: 2,
    });
    setBiometricFeedback('Studio Auto-Enhance Applied (Levels, Warmth & Clarity)');
    setTimeout(() => setBiometricFeedback(null), 3500);
  };

  // 3. Client-Side Background Replacement
  const handleApplyBackground = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !selectedImage) return;

    // Check BG replacement limit for free users (2 per session)
    const licenseState = useLicenseStore.getState();
    if (!licenseState.canUseBgReplacement()) {
      licenseState.openUpgradeModal('Unlimited Background Replacements');
      return;
    }

    try {
      setIsProcessingBg(true);
      setBiometricFeedback('Processing clean background replacement with face/skin lock...');

      // ALWAYS load pristine uncorrupted original image as the base!
      const baseImg = await loadImageElement(selectedImage.objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = baseImg.naturalWidth || baseImg.width;
      canvas.height = baseImg.naturalHeight || baseImg.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(baseImg, 0, 0);

      // Detect face box for subject protection
      const faceBox = await detectFaceBoundingBox(baseImg);

      const replacedCanvas = replaceImageBackground(canvas, {
        replacementColor: bgReplacementColor,
        tolerance: bgTolerance,
        feather: bgFeather,
        protectForeground: bgProtectClothing,
        faceBox: faceBox,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        replacedCanvas.toBlob((b) => resolve(b), bgReplacementColor === 'transparent' ? 'image/png' : 'image/jpeg', 0.95)
      );

      if (blob) {
        const prevCrop = cropper.getData(true);
        const newUrl = URL.createObjectURL(blob);
        setActiveImageUrl(newUrl);
        cropper.replace(newUrl);
        setTimeout(() => {
          try {
            if (cropper) cropper.setData(prevCrop);
          } catch {}
        }, 150);
        // Track BG replacement usage for session limit
        useLicenseStore.getState().incrementBgReplacement();
        const remaining = licenseState.isPro ? '∞' : `${Math.max(0, 2 - useLicenseStore.getState().bgReplacementsUsed)}`;
        setBiometricFeedback(`Background updated cleanly (${remaining} free replacement${remaining === '1' ? '' : 's'} remaining)`);
        setTimeout(() => setBiometricFeedback(null), 3500);
      }
    } catch (err) {
      console.error('Background replacement error:', err);
      setBiometricFeedback('Failed to replace background');
      setTimeout(() => setBiometricFeedback(null), 3000);
    } finally {
      setIsProcessingBg(false);
    }
  };

  const handleRevertBackground = () => {
    if (!selectedImage) return;
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const prevCrop = cropper.getData(true);
      setActiveImageUrl(selectedImage.objectUrl);
      cropper.replace(selectedImage.objectUrl);
      setTimeout(() => {
        try {
          if (cropper) cropper.setData(prevCrop);
        } catch {}
      }, 150);
    }
    setBiometricFeedback('Reverted to original photo background');
    setTimeout(() => setBiometricFeedback(null), 2500);
  };

  const handleResetToOriginal = () => {
    if (!selectedImage) return;
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      setActiveImageUrl(selectedImage.objectUrl);
      cropper.replace(selectedImage.objectUrl);
    }
    resetAdjustments();
    resetColorCalibration();
    setBiometricFeedback('Reset to original image');
    setTimeout(() => setBiometricFeedback(null), 2500);
  };

  const handleCrop = useCallback(async (andNext: boolean = false) => {
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
        const w = cropOrientation === 'landscape' ? template.height : template.width;
        const h = cropOrientation === 'landscape' ? template.width : template.height;
        outputWidth = mmToPx(w, DEFAULT_DPI);
        outputHeight = mmToPx(h, DEFAULT_DPI);
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

    if (andNext && selectedImageIndex < images.length - 1) {
      selectImage(selectedImageIndex + 1);
      setBiometricFeedback(`Person ${selectedImageIndex + 1} cropped! Ready to crop Person ${selectedImageIndex + 2}.`);
      setTimeout(() => setBiometricFeedback(null), 3000);
    } else {
      setStep('layout');
    }
  }, [
    selectedTemplateId, selectedTemplateType, adjustments, colorCalibration,
    setCropData, setCroppedImageUrl, pushUndo, setStep, selectedImageIndex, images.length, selectImage
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
          handleCrop(false);
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
        <div className="max-w-md w-full p-8 border-2 border-dashed border-border rounded-2xl bg-card shadow-sm flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">No Image Selected</h3>
          <p className="text-xs text-muted-foreground mb-5 max-w-xs">
            Upload a photo or PDF document (e-Aadhaar, PAN card, driving licence) to crop with this template.
          </p>
          <Button
            onClick={() => setStep('upload')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload Photo / PDF
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Toolbar */}
      <div className="flex items-center gap-1.5 p-2 border-b border-border flex-wrap bg-card text-xs">
        <Button variant="ghost" size="sm" onClick={() => handleRotate(-90)} title="Rotate Left (CCW)">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleRotate(90)} title="Rotate Right (CW)">
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-5 mx-0.5" />
        <Button variant="ghost" size="sm" onClick={handleFlipH} title="Flip Horizontal">
          <FlipHorizontal className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleFlipV} title="Flip Vertical">
          <FlipVertical className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Dual Crop Orientation Choice (Vertical vs Horizontal) */}
        <Button
          variant={cropOrientation === 'landscape' ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleToggleCropOrientation}
          className="text-xs h-7 gap-1 border-primary/30"
          title={`Crop orientation: ${cropOrientation === 'portrait' ? 'Vertical (Portrait)' : 'Horizontal (Landscape)'}. Click to switch.`}
        >
          <RectangleHorizontal className="w-3.5 h-3.5" />
          <span>{cropOrientation === 'portrait' ? 'Vertical' : 'Horizontal'}</span>
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Biometric Auto Face Center Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleBiometricCenterFace}
          disabled={isDetectingFace}
          className="text-xs h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
          title="Auto-detect face and align crop box to official biometric standards"
        >
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          <span>{isDetectingFace ? 'Aligning...' : 'Auto Center Face'}</span>
        </Button>

        {/* Biometric Overlay Guides Toggle */}
        <Button
          variant={showBiometricGuides ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowBiometricGuides(!showBiometricGuides)}
          className="text-xs h-7 gap-1"
          title="Toggle Crown, Eye Level, and Chin biometric guideline overlays"
        >
          <ScanFace className="w-3.5 h-3.5" />
          <span>Guides</span>
        </Button>

        {/* Studio Auto-Enhance Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleStudioAutoEnhance}
          className="text-xs h-7 gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 shadow-xs"
          title="1-Click Studio dynamic range stretch, contrast & skin tone warmth"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Auto-Enhance</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToOriginal}
          title="Reset to Original Upload"
          className="h-7 text-xs text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>

        <div className="flex-1 min-w-[20px]" />

        {colorCalibration.cmykSoftProof && (
          <Badge variant="outline" className="text-[10px] gap-1 border-cyan-500/40 text-cyan-300 bg-cyan-500/10 h-6">
            <Eye className="w-3 h-3" /> CMYK Proof ON
          </Badge>
        )}

        <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-xs h-7">
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenGovtFormDialog}
          className="text-xs h-7 border-primary/40 text-primary hover:bg-primary/10 gap-1 font-medium"
          title="Export formatted for SSC, UPSC, IBPS, Railways & Govt Form Portals"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Govt Form</span>
        </Button>
        {images.length > 1 && selectedImageIndex < images.length - 1 ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCrop(true)}
              className="text-xs h-7 border-primary/50 text-primary hover:bg-primary/10 gap-1 font-semibold"
              title="Save crop for this person and proceed to next person"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Crop Person #{selectedImageIndex + 2} →</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleCrop(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium h-7 px-3"
            >
              Finish & Layout
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => handleCrop(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium h-7 px-3">
            <Check className="w-3.5 h-3.5 mr-1" />
            Apply Crop
          </Button>
        )}
      </div>

      {/* Multi-Person Queue Switcher Bar */}
      {images.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/70 border-b border-border text-xs overflow-x-auto">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5 text-primary" /> People Queue ({images.length}):
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {images.map((img, idx) => {
              const isSelected = idx === selectedImageIndex;
              const isCropped = !!img.croppedImageUrl;

              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => selectImage(idx)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border-border'
                  }`}
                >
                  <img
                    src={img.croppedImageUrl || img.thumbnailUrl || img.objectUrl}
                    alt={img.name}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                  />
                  <span className="truncate max-w-[100px]">#{idx + 1} {img.name.replace(/\.[^/.]+$/, '')}</span>
                  {isCropped ? (
                    <span className="text-[9px] text-emerald-400 font-bold ml-0.5" title="Cropped">✓</span>
                  ) : (
                    <span className="text-[9px] opacity-60 ml-0.5" title="Pending crop">•</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Biometric Feedback Banner */}
      {biometricFeedback && (
        <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20 text-xs text-primary flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{biometricFeedback}</span>
          </div>
          <button onClick={() => setBiometricFeedback(null)} className="text-primary/70 hover:text-primary">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cropper Canvas with Biometric Guide Overlays */}
      <div className="flex-1 bg-black/60 relative overflow-hidden flex items-center justify-center">
        <Cropper
          ref={cropperRef}
          src={activeImageUrl || selectedImage.objectUrl}
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

        {/* Biometric Guide Overlays Legend */}
        {showBiometricGuides && (
          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm border border-white/15 rounded-md px-2.5 py-1.5 text-[10px] text-white/90 pointer-events-none space-y-1 shadow-lg">
            <div className="font-semibold text-primary flex items-center gap-1">
              <ScanFace className="w-3 h-3" /> Biometric Alignment Rules
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-red-400 inline-block rounded" />
              <span>Crown / Hair Limit (~10% from top)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block rounded" />
              <span>Eye Level Line (~50% midpoint)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block rounded" />
              <span>Chin Limit (~80% lower bound)</span>
            </div>
          </div>
        )}
      </div>

      {/* Adjustments, Background Replacement & Print Calibration Panel */}
      <div className="p-3 border-t border-border bg-card">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'background' | 'color')}>
          <div className="flex items-center justify-between mb-2">
            <TabsList className="h-7">
              <TabsTrigger value="basic" className="text-xs h-6 px-3">
                <Sliders className="w-3 h-3 mr-1" /> Basic Filters
              </TabsTrigger>
              <TabsTrigger value="background" className="text-xs h-6 px-3">
                <Paintbrush className="w-3 h-3 mr-1 text-primary" /> Background Color
              </TabsTrigger>
              <TabsTrigger value="color" className="text-xs h-6 px-3">
                <Printer className="w-3 h-3 mr-1 text-cyan-400" /> Print & CMYK Calibration
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

            {activeTab === 'background' && (
              <div className="flex items-center gap-2">
                {activeImageUrl && selectedImage && activeImageUrl !== selectedImage.objectUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevertBackground}
                    disabled={isProcessingBg}
                    className="text-xs h-6 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcwIcon className="w-3 h-3 mr-1" />
                    Revert BG
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleApplyBackground}
                  disabled={isProcessingBg}
                  className="text-xs h-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  {isProcessingBg ? 'Replacing...' : 'Apply Background'}
                </Button>
              </div>
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

          {/* Tab 2: Client-Side Background Replacement */}
          <TabsContent value="background" className="m-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              {/* Color Presets */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground block mb-1">Select Replacement Color</Label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {BG_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setBgReplacementColor(p.color)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all ${
                        bgReplacementColor === p.color
                          ? 'border-primary bg-primary/15 font-semibold text-primary'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-gray-400"
                        style={{ backgroundColor: p.color === 'transparent' ? 'transparent' : p.color }}
                      />
                      <span>{p.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-1">
                    <input
                      type="color"
                      value={bgReplacementColor === 'transparent' ? '#ffffff' : bgReplacementColor}
                      onChange={(e) => setBgReplacementColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border border-border"
                      title="Pick custom color"
                    />
                  </div>
                </div>
              </div>

              {/* Tolerance & Feather */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground">Edge Tolerance</Label>
                  <span className="text-[11px] font-mono">{bgTolerance}%</span>
                </div>
                <Slider
                  min={10}
                  max={60}
                  step={1}
                  value={bgTolerance}
                  onValueChange={(v) => setBgTolerance(typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 30)}
                />
              </div>

              {/* Protect Subject & Skin Lock Toggle */}
              <div className="flex items-center justify-between px-2 pt-1 border-l border-border">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs block font-medium">Subject & Skin Lock</Label>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                      Safe
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Prevents color leaking to face/body</span>
                </div>
                <Switch
                  checked={bgProtectClothing}
                  onCheckedChange={setBgProtectClothing}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Print & CMYK Calibration */}
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

      {/* Govt Form Exporter Dialog */}
      <DigitalFormExportDialog
        isOpen={isGovtFormDialogOpen}
        onClose={() => setIsGovtFormDialogOpen(false)}
        sourceImageUrl={govtFormSourceUrl}
      />
    </div>
  );
}
