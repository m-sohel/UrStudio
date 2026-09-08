'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import {
  CreditCard, Upload, Check, Printer, RotateCw, RotateCcw,
  FlipHorizontal, FlipVertical, Sun, Contrast, Palette,
  Layers, ArrowRight, RefreshCw, Scissors, Info, Sparkles,
  FileDown, Copy, FileText, Loader2, AlertTriangle, Wand2,
  Lock, Unlock, Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useEditorStore, type EditorImage } from '@/store/editor-store';
import { useSettingsStore } from '@/store/settings-store';
import {
  getIDCardTemplate, PAPER_SIZES, getPaperSize,
  getEffectivePaperDimensions, type IDCardTemplate
} from '@/lib/templates';
import { calculateIDCardLayout } from '@/lib/layout-engine';
import { generateIDCardPrintHTML, printViaIframe, PRINT_INSTRUCTIONS } from '@/lib/print';
import { exportIDCardSheetToPDF, exportPVCCardToPDF } from '@/lib/pdf-exporter';
import { loadImage, loadImageElement, generateThumbnail, isSupportedImage } from '@/lib/image-processing';
import { isPdfFile, loadPdfPages, pdfPageToEditorImage } from '@/lib/pdf-processor';
import { applyPrintColorCalibration } from '@/lib/color-management';
import { mmToPx, DEFAULT_DPI } from '@/lib/units';
import { PdfPasswordDialog } from '@/components/pdf-password-dialog';

export function IDCardMode() {
  const {
    idCardState, setIDCardState,
    selectedTemplateId, setSelectedTemplate,
    paperSettings, setPaperSettings,
    copies, setCopies,
    colorCalibration,
  } = useEditorStore();

  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    fileName: string;
    resolve?: (pwd: string) => void;
    reject?: () => void;
  }>({ isOpen: false, fileName: '' });

  const cropperRef = useRef<ReactCropperElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Active side in the editor
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  // Card Crop Orientation: 'horizontal' (85.6 × 54 mm) vs 'vertical' (54 × 85.6 mm)
  const [cropOrientation, setCropOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [frontCardOrientation, setFrontCardOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [backCardOrientation, setBackCardOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  // Crop aspect ratio lock: false = Static/Free Corners (dragging one edge keeps other sides static)
  // true = Proportional lock (85.6×54 or 54×85.6)
  const [isAspectLocked, setIsAspectLocked] = useState<boolean>(false);

  const [printTab, setPrintTab] = useState<'sheet' | 'pvc'>('sheet');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('Processing...');
  const [isDragging, setIsDragging] = useState(false);

  // Cached PDF session so all pages from uploaded PDF remain available across front and back
  const [loadedPdfSession, setLoadedPdfSession] = useState<{
    fileName: string;
    file: File;
    pages: EditorImage[];
  } | null>(null);

  // Adjustments per side
  const [frontAdjustments, setFrontAdjustments] = useState({ brightness: 0, contrast: 0, saturation: 0, grayscale: false });
  const [backAdjustments, setBackAdjustments] = useState({ brightness: 0, contrast: 0, saturation: 0, grayscale: false });

  // Flips
  const [frontFlipH, setFrontFlipH] = useState(1);
  const [frontFlipV, setFrontFlipV] = useState(1);
  const [backFlipH, setBackFlipH] = useState(1);
  const [backFlipV, setBackFlipV] = useState(1);

  // Active adjustments based on side
  const adjustments = activeSide === 'front' ? frontAdjustments : backAdjustments;
  const setAdjustments = (patch: Partial<typeof frontAdjustments>) => {
    if (activeSide === 'front') {
      setFrontAdjustments(prev => ({ ...prev, ...patch }));
    } else {
      setBackAdjustments(prev => ({ ...prev, ...patch }));
    }
  };

  const template: IDCardTemplate = useMemo(() => {
    const found = selectedTemplateId ? getIDCardTemplate(selectedTemplateId) : null;
    return found || {
      id: 'aadhaar-card',
      name: 'Standard ID Card (CR80)',
      category: 'id-card',
      width: 85.6,
      height: 53.98,
      displayUnit: 'mm',
      aspectRatio: 85.6 / 53.98,
      builtIn: true,
      hasBackSide: true,
    };
  }, [selectedTemplateId]);

  // Determine effective card dimensions for cropping
  const isCardVertical = (idCardState.frontCroppedUrl ? frontCardOrientation : cropOrientation) === 'vertical';
  const cardWidth = isCardVertical ? 53.98 : 85.6;
  const cardHeight = isCardVertical ? 85.6 : 53.98;

  // Card output orientation on the printed paper sheet: 'horizontal' (85.6x54) vs 'vertical' (54x85.6)
  const [sheetCardOrientation, setSheetCardOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Effective dimensions for each card on the paper sheet
  const sheetCardWidth = sheetCardOrientation === 'vertical' ? 53.98 : 85.6;
  const sheetCardHeight = sheetCardOrientation === 'vertical' ? 85.6 : 53.98;

  // Determine if card image needs 90deg rotation when rendered on sheet
  const frontNeedsRotation = (frontCardOrientation === 'vertical') !== (sheetCardOrientation === 'vertical');
  const backNeedsRotation = (backCardOrientation === 'vertical') !== (sheetCardOrientation === 'vertical');

  // Toggle crop orientation between Horizontal and Vertical
  const handleToggleOrientation = (orientation: 'horizontal' | 'vertical') => {
    setCropOrientation(orientation);
    if (activeSide === 'front') {
      setFrontCardOrientation(orientation);
    } else {
      setBackCardOrientation(orientation);
    }
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const targetRatio = orientation === 'vertical' ? 53.98 / 85.6 : 85.6 / 53.98;
    if (isAspectLocked) {
      cropper.setAspectRatio(targetRatio);
    } else {
      // In free/independent mode, swap width & height around current center while keeping aspect ratio unlocked (NaN)
      const cropBox = cropper.getCropBoxData();
      const containerData = cropper.getContainerData();
      const centerX = cropBox.left + cropBox.width / 2;
      const centerY = cropBox.top + cropBox.height / 2;

      let newW = cropBox.width;
      let newH = cropBox.height;
      if (orientation === 'vertical' && cropBox.width > cropBox.height) {
        newW = cropBox.height;
        newH = cropBox.width;
      } else if (orientation === 'horizontal' && cropBox.height > cropBox.width) {
        newW = cropBox.height;
        newH = cropBox.width;
      }

      const newLeft = Math.max(0, Math.min(containerData.width - newW, centerX - newW / 2));
      const newTop = Math.max(0, Math.min(containerData.height - newH, centerY - newH / 2));

      cropper.setCropBoxData({
        left: newLeft,
        top: newTop,
        width: newW,
        height: newH,
      });
      // Ensure aspect ratio stays unlocked (NaN) so other corners stay static
      (cropper as any).options.aspectRatio = NaN;
    }
  };

  // Switch between front and back sides while keeping orientation synced
  const handleSelectSide = (side: 'front' | 'back') => {
    setActiveSide(side);
    const sideOrientation = side === 'front' ? frontCardOrientation : backCardOrientation;
    setCropOrientation(sideOrientation);
  };

  // Toggle Aspect Ratio Lock (Static / Free Corner Adjust vs Strict Ratio)
  const handleToggleAspectLock = () => {
    const nextLocked = !isAspectLocked;
    setIsAspectLocked(nextLocked);
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    if (nextLocked) {
      const targetRatio = cropOrientation === 'vertical' ? 53.98 / 85.6 : 85.6 / 53.98;
      cropper.setAspectRatio(targetRatio);
    } else {
      (cropper as any).options.aspectRatio = NaN;
    }
  };

  // Reset crop box to standard centered card dimensions
  const handleResetCropBox = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const targetRatio = cropOrientation === 'vertical' ? 53.98 / 85.6 : 85.6 / 53.98;
    cropper.setAspectRatio(targetRatio);
    if (!isAspectLocked) {
      (cropper as any).options.aspectRatio = NaN;
    }
  };

  // 1-Click rotate 90° for already-cropped cards
  const handleRotateCropped = async (side: 'front' | 'back') => {
    const targetUrl = side === 'front' ? idCardState.frontCroppedUrl : idCardState.backCroppedUrl;
    if (!targetUrl) return;

    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for rotation'));
        img.src = targetUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const newUrl = canvas.toDataURL('image/jpeg', 0.95);
      if (side === 'front') {
        const next = frontCardOrientation === 'vertical' ? 'horizontal' : 'vertical';
        setFrontCardOrientation(next);
        setCropOrientation(next);
        setIDCardState({ frontCroppedUrl: newUrl });
      } else {
        const next = backCardOrientation === 'vertical' ? 'horizontal' : 'vertical';
        setBackCardOrientation(next);
        setCropOrientation(next);
        setIDCardState({ backCroppedUrl: newUrl });
      }
    } catch (err) {
      console.error('Error rotating cropped card:', err);
    }
  };

  const activeImage = activeSide === 'front' ? idCardState.frontImage : idCardState.backImage;
  const paper = getPaperSize(paperSettings.paperId) || PAPER_SIZES[0];

  // Handle drag and drop on upload card
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadSide(file, side);
    }
  }, []);

  // Handle uploading front or back file (supports image and PDF)
  const handleUploadSide = async (file: File, side: 'front' | 'back') => {
    if (!isSupportedImage(file) && !isPdfFile(file)) {
      alert('Please upload a JPG, PNG, WEBP image or a PDF document.');
      return;
    }

    setIsUploading(true);
    setUploadStatusText('Processing document...');

    try {
      if (isPdfFile(file)) {
        setUploadStatusText(`Rendering PDF at 300 DPI (${file.name})...`);
        const pages = await loadPdfPages(file, {
          dpi: 300,
          onProgress: (curr, total) => {
            setUploadStatusText(`Rendering PDF page ${curr}/${total}...`);
          },
          onRequestPassword: () => {
            return new Promise<string | null>((resolve) => {
              setPasswordPrompt({
                isOpen: true,
                fileName: file.name,
                resolve: (pwd) => {
                  setPasswordPrompt({ isOpen: false, fileName: '' });
                  resolve(pwd);
                },
                reject: () => {
                  setPasswordPrompt({ isOpen: false, fileName: '' });
                  resolve(null);
                },
              });
            });
          },
        });
        if (pages.length === 0) return;

        const editorPages: EditorImage[] = pages.map((p, idx) => {
          const img = pdfPageToEditorImage(p, file);
          img.isPdf = true;
          img.pdfPageNumber = idx + 1;
          return img;
        });

        // Retain the entire PDF session so user never needs to re-upload for other sides
        setLoadedPdfSession({
          fileName: file.name,
          file,
          pages: editorPages,
        });

        if (editorPages.length >= 2) {
          // Auto assign Page 1 to Front and Page 2 to Back (standard for e-Aadhaar / DL PDF)
          setIDCardState({ frontImage: editorPages[0], backImage: editorPages[1] });
          setActiveSide(side);
        } else {
          // Single-page PDF (like MahaSarathi, Voter ID, Aadhaar slip, PAN card)
          // Pre-populate both Front and Back with this page so user never needs to re-upload to crop the other side!
          setIDCardState({
            frontImage: editorPages[0],
            backImage: editorPages[0],
          });
          setActiveSide(side);
        }
        return;
      }

      setUploadStatusText(`Loading image (${file.name})...`);
      const info = await loadImage(file);
      const imgEl = await loadImageElement(info.objectUrl);
      const thumbnailUrl = generateThumbnail(imgEl, 200);
      const editorImg: EditorImage = { ...info, thumbnailUrl };

      if (side === 'front') {
        setIDCardState({
          frontImage: editorImg,
          // If back image is not set yet, share the same image so user can crop back side without re-uploading
          backImage: idCardState.backImage || editorImg,
        });
        setActiveSide('front');
      } else {
        setIDCardState({ backImage: editorImg });
        setActiveSide('back');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        return;
      }
      console.error('Upload Error:', err);
      alert('Failed to load file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  // Crop the active side
  const handleApplyCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const data = cropper.getData(true);
    const targetCardW = cropOrientation === 'vertical' ? 53.98 : 85.6;
    const targetCardH = cropOrientation === 'vertical' ? 85.6 : 53.98;
    const outW = mmToPx(targetCardW, DEFAULT_DPI);
    const outH = mmToPx(targetCardH, DEFAULT_DPI);

    const canvas = cropper.getCroppedCanvas({
      width: outW,
      height: outH,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    const activeAdj = activeSide === 'front' ? frontAdjustments : backAdjustments;
    const filters: string[] = [];
    if (activeAdj.brightness !== 0) filters.push(`brightness(${1 + activeAdj.brightness / 100})`);
    if (activeAdj.contrast !== 0) filters.push(`contrast(${1 + activeAdj.contrast / 100})`);
    if (activeAdj.saturation !== 0) filters.push(`saturate(${1 + activeAdj.saturation / 100})`);
    if (activeAdj.grayscale) filters.push('grayscale(1)');

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (filters.length > 0) {
        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tCtx = temp.getContext('2d');
        if (tCtx) {
          tCtx.filter = filters.join(' ');
          tCtx.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(temp, 0, 0);
        }
      }

      // Apply Print Color Calibration (Shadow Lift & CMYK Simulation)
      if (
        colorCalibration.printGamma !== 1.0 ||
        colorCalibration.cyanRedBalance !== 0 ||
        colorCalibration.magentaGreenBalance !== 0 ||
        colorCalibration.yellowBlueBalance !== 0 ||
        colorCalibration.cmykSoftProof
      ) {
        applyPrintColorCalibration(ctx, canvas.width, canvas.height, colorCalibration);
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    if (activeSide === 'front') {
      setFrontCardOrientation(cropOrientation);
      setIDCardState({ frontCroppedUrl: dataUrl });
      // If back exists and not cropped, auto switch to back
      if (idCardState.backImage && !idCardState.backCroppedUrl) {
        handleSelectSide('back');
      }
    } else {
      setBackCardOrientation(cropOrientation);
      setIDCardState({ backCroppedUrl: dataUrl });
    }
  };

  // Calculate sheet layout for preview & printing
  const paperDims = getEffectivePaperDimensions(paper, paperSettings.orientation);
  const sheetLayout = useMemo(() => {
    return calculateIDCardLayout({
      paperWidth: paperDims.width,
      paperHeight: paperDims.height,
      cardWidth: sheetCardWidth,
      cardHeight: sheetCardHeight,
      marginTop: paperSettings.marginTop,
      marginRight: paperSettings.marginRight,
      marginBottom: paperSettings.marginBottom,
      marginLeft: paperSettings.marginLeft,
      horizontalGap: paperSettings.horizontalGap,
      verticalGap: paperSettings.verticalGap,
      frontBackGap: idCardState.frontBackGap || 5,
      arrangement: idCardState.arrangement,
      copies: copies,
    });
  }, [paperDims, sheetCardWidth, sheetCardHeight, paperSettings, idCardState.frontBackGap, idCardState.arrangement, copies]);

  // Check if current configuration physically exceeds printable area
  const isSheetOverflowing = useMemo(() => {
    const pairW = idCardState.arrangement === 'side-by-side'
      ? sheetCardWidth * 2 + (idCardState.frontBackGap || 5)
      : sheetCardWidth;
    const pairH = idCardState.arrangement === 'stacked'
      ? sheetCardHeight * 2 + (idCardState.frontBackGap || 5)
      : sheetCardHeight;
    return pairW > paperDims.width || pairH > paperDims.height;
  }, [idCardState.arrangement, idCardState.frontBackGap, sheetCardWidth, sheetCardHeight, paperDims]);

  // 1-Click Auto-Fit layout to paper to eliminate any leaking
  const handleAutoFitToSheet = useCallback(() => {
    if (paperSettings.paperId === '4x6') {
      if (sheetCardOrientation === 'vertical') {
        // Vertical cards fit best in Landscape with side-by-side arrangement
        setPaperSettings({ orientation: 'landscape' });
        setIDCardState({ arrangement: 'side-by-side' });
      } else {
        // Horizontal cards fit best in Portrait with stacked arrangement
        setPaperSettings({ orientation: 'portrait' });
        setIDCardState({ arrangement: 'stacked' });
      }
    } else {
      setIDCardState({ arrangement: 'stacked' });
    }
  }, [paperSettings.paperId, sheetCardOrientation, setPaperSettings, setIDCardState]);

  const settings = useSettingsStore();

  // Print Sheet
  const handlePrintSheet = useCallback(() => {
    if (!idCardState.frontCroppedUrl) {
      alert('Please crop at least the front side of the ID card.');
      return;
    }

    const html = generateIDCardPrintHTML({
      paperWidth: paperDims.width,
      paperHeight: paperDims.height,
      orientation: paperSettings.orientation,
      cardWidth: sheetCardWidth,
      cardHeight: sheetCardHeight,
      frontImageUrl: idCardState.frontCroppedUrl,
      backImageUrl: idCardState.backCroppedUrl || undefined,
      showCuttingMarks: idCardState.showCuttingMarks,
      bleedMm: settings.defaultBleedMm,
      showCropMarks: settings.showCropMarks,
      positions: sheetLayout.positions,
      frontRotation: frontNeedsRotation ? 90 : 0,
      backRotation: backNeedsRotation ? 90 : 0,
    });

    printViaIframe(html);
  }, [paperDims, paperSettings, sheetCardWidth, sheetCardHeight, sheetLayout.positions, frontNeedsRotation, backNeedsRotation, idCardState, settings]);

  // Print PVC Single Side
  const handlePrintPVCSide = useCallback((side: 'front' | 'back') => {
    const imgUrl = side === 'front' ? idCardState.frontCroppedUrl : idCardState.backCroppedUrl;
    if (!imgUrl) {
      alert(`Please crop the ${side} side first before printing.`);
      return;
    }

    const html = generateIDCardPrintHTML({
      paperWidth: cardWidth,
      paperHeight: cardHeight,
      orientation: isCardVertical ? 'portrait' : 'landscape',
      cardWidth,
      cardHeight,
      frontImageUrl: imgUrl,
      pvcSingleSide: side,
    });

    printViaIframe(html);
  }, [idCardState, cardWidth, cardHeight, isCardVertical]);

  // Export Sheet as PDF
  const handleSaveSheetPDF = useCallback(async () => {
    if (!idCardState.frontCroppedUrl) {
      alert('Please crop at least the front side of the ID card.');
      return;
    }

    try {
      setIsExportingPdf(true);
      await exportIDCardSheetToPDF({
        paperWidth: paperDims.width,
        paperHeight: paperDims.height,
        orientation: paperSettings.orientation,
        cardWidth: sheetCardWidth,
        cardHeight: sheetCardHeight,
        positions: sheetLayout.positions,
        frontImageUrl: idCardState.frontCroppedUrl,
        backImageUrl: idCardState.backCroppedUrl || undefined,
        showCuttingMarks: idCardState.showCuttingMarks,
        bleedMm: settings.defaultBleedMm,
        showCropMarks: settings.showCropMarks,
        templateName: template.name,
        frontRotation: frontNeedsRotation ? 90 : 0,
        backRotation: backNeedsRotation ? 90 : 0,
      });
    } catch (err) {
      console.error('Failed to export ID card sheet PDF:', err);
      alert('Failed to export PDF. Please check your image data and try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [paperDims, paperSettings, sheetCardWidth, sheetCardHeight, template.name, sheetLayout, frontNeedsRotation, backNeedsRotation, idCardState, settings]);

  // Export Direct CR80 PVC Card as PDF
  const handleSavePVCPDF = useCallback(async () => {
    if (!idCardState.frontCroppedUrl) {
      alert('Please crop at least the front side of the ID card first.');
      return;
    }

    try {
      setIsExportingPdf(true);
      await exportPVCCardToPDF({
        cardWidth,
        cardHeight,
        frontImageUrl: idCardState.frontCroppedUrl,
        backImageUrl: idCardState.backCroppedUrl || undefined,
        filename: `UrStudio_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${isCardVertical ? 'Vertical' : 'Horizontal'}_${Date.now()}.pdf`,
      });
    } catch (err) {
      console.error('Failed to export PVC card PDF:', err);
      alert('Failed to export PVC card PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [idCardState, cardWidth, cardHeight, template.name, isCardVertical]);

  // Rotate
  const handleRotate = (deg: number) => {
    cropperRef.current?.cropper?.rotate(deg);
  };

  // Flip
  const handleFlipH = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    if (activeSide === 'front') {
      const next = frontFlipH * -1;
      setFrontFlipH(next);
      cropper.scaleX(next);
    } else {
      const next = backFlipH * -1;
      setBackFlipH(next);
      cropper.scaleX(next);
    }
  };

  const handleFlipV = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    if (activeSide === 'front') {
      const next = frontFlipV * -1;
      setFrontFlipV(next);
      cropper.scaleY(next);
    } else {
      const next = backFlipV * -1;
      setBackFlipV(next);
      cropper.scaleY(next);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-tight">{template.name} Mode</h2>
          <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
            {isCardVertical ? '54 × 85.6 mm (Vertical CR80)' : '85.6 × 54 mm (Horizontal CR80)'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs hover:bg-accent/40"
          >
            <Info className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Printer Guide
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={printTab === 'pvc' ? handleSavePVCPDF : handleSaveSheetPDF}
            disabled={!idCardState.frontCroppedUrl || isExportingPdf}
            className="text-xs sm:text-sm border-border hover:bg-accent/40"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-cyan-400" />
            {isExportingPdf ? 'Saving PDF...' : 'Save as PDF'}
          </Button>

          <Button
            size="sm"
            onClick={printTab === 'pvc' ? () => handlePrintPVCSide('front') : handlePrintSheet}
            disabled={!idCardState.frontCroppedUrl}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-orange-500/20 font-medium text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            {printTab === 'pvc' ? 'Print PVC (Front)' : 'Print Sheet'}
          </Button>
        </div>
      </div>

      {showInstructions && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-muted-foreground flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-semibold text-amber-500">Browser Print Settings: </span>
            {PRINT_INSTRUCTIONS.join(' • ')}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowInstructions(false)} className="text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Upload & Cropping (50%) */}
        <div className="w-1/2 border-r border-border flex flex-col bg-card overflow-hidden">
          {/* Side Selector Tabs (Front vs Back) & Crop Orientation Toggle */}
          <div className="p-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={activeSide === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectSide('front')}
                className="text-xs"
              >
                Front Side {idCardState.frontCroppedUrl && '✓'}
              </Button>
              <Button
                variant={activeSide === 'back' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectSide('back')}
                className="text-xs"
              >
                Back Side {idCardState.backCroppedUrl && '✓'}
              </Button>

              {/* Crop Orientation Segmented Control (Horizontal vs Vertical) */}
              <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => handleToggleOrientation('horizontal')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    cropOrientation === 'horizontal'
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Crop as Horizontal CR80 Card (85.6 × 54 mm)"
                >
                  <span className="w-3.5 h-2.5 rounded-[2px] border-2 border-current block" />
                  <span>Horizontal (85.6×54)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOrientation('vertical')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    cropOrientation === 'vertical'
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Crop as Vertical Card (54 × 85.6 mm) - e.g. Vertical Aadhaar, Student ID, Employee Badge"
                >
                  <span className="w-2.5 h-3.5 rounded-[2px] border-2 border-current block" />
                  <span>Vertical (54×85.6)</span>
                </button>
              </div>

              {/* Quick page switcher if uploaded PDF has multiple pages */}
              {loadedPdfSession && loadedPdfSession.pages.length > 1 && (
                <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md border border-border text-xs">
                  <span className="text-[11px] text-muted-foreground font-medium">PDF Page:</span>
                  {loadedPdfSession.pages.map((p, idx) => {
                    const isCurrent = activeImage?.pdfPageNumber === idx + 1;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (activeSide === 'front') {
                            setIDCardState({ frontImage: p });
                          } else {
                            setIDCardState({ backImage: p });
                          }
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-card hover:bg-accent text-muted-foreground border border-border/60"
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.jfif,.pjpeg,.pjp,.bmp,.tif,.tiff,.avif,.pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadSide(e.target.files[0], 'front');
                  e.target.value = '';
                }}
              />
              <input
                ref={backInputRef}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.jfif,.pjpeg,.pjp,.bmp,.tif,.tiff,.avif,.pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadSide(e.target.files[0], 'back');
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => activeSide === 'front' ? frontInputRef.current?.click() : backInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload {activeSide === 'front' ? 'Front' : 'Back'} (Image / PDF)
              </Button>
            </div>
          </div>

          {/* Active Side Cropper or Upload Prompt */}
          <div className="flex-1 bg-muted/40 dark:bg-black/40 relative overflow-hidden flex items-center justify-center p-4">
            {activeImage ? (
              <Cropper
                key={`${activeSide}-${activeImage.id}`}
                ref={cropperRef}
                src={activeImage.objectUrl}
                style={{ height: '100%', width: '100%' }}
                aspectRatio={isAspectLocked ? (cropOrientation === 'vertical' ? 53.98 / 85.6 : 85.6 / 53.98) : NaN}
                initialAspectRatio={cropOrientation === 'vertical' ? 53.98 / 85.6 : 85.6 / 53.98}
                viewMode={1}
                guides={true}
                center={true}
                highlight={true}
                background={true}
                autoCropArea={0.88}
                responsive={true}
                zoomOnWheel={true}
                cropBoxMovable={true}
                cropBoxResizable={true}
              />
            ) : (
              <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-4">
                {activeSide === 'back' && idCardState.frontImage && (
                  <div className="p-4 rounded-xl bg-card border border-primary/30 shadow-sm w-full space-y-2.5">
                    <p className="text-xs font-semibold text-foreground">Front document already uploaded!</p>
                    <p className="text-[11px] text-muted-foreground">
                      You can crop the back side directly from the uploaded document without re-uploading.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIDCardState({ backImage: idCardState.frontImage })}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium w-full sm:w-auto"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Crop Back Side from Front Document
                    </Button>
                  </div>
                )}

                {loadedPdfSession && loadedPdfSession.pages.length > 1 && (
                  <div className="p-4 rounded-xl bg-card border border-border shadow-sm w-full space-y-2.5">
                    <p className="text-xs font-semibold text-foreground">
                      Select page from uploaded PDF ({loadedPdfSession.fileName}):
                    </p>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {loadedPdfSession.pages.map((p, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (activeSide === 'front') {
                              setIDCardState({ frontImage: p });
                            } else {
                              setIDCardState({ backImage: p });
                            }
                          }}
                          className="text-xs"
                        >
                          Page {idx + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "w-full flex flex-col items-center justify-center p-8 text-center cursor-pointer border-2 border-dashed rounded-xl transition-all bg-card/30",
                    isDragging
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border/70 hover:border-primary/60 hover:bg-muted/40"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, activeSide)}
                  onClick={() => !isUploading && (activeSide === 'front' ? frontInputRef.current?.click() : backInputRef.current?.click())}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm font-semibold text-foreground">{uploadStatusText}</p>
                      <p className="text-xs text-muted-foreground">Rendering offline at 300 DPI</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                        <CreditCard className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {isDragging ? `Drop ${activeSide} document here` : `Click or drag & drop ${activeSide} image or PDF here`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Supports Photos, Scans, e-Aadhaar, PAN & DL PDFs (JPG, PNG, WEBP, PDF) • Max 50MB
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            activeSide === 'front' ? frontInputRef.current?.click() : backInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Browse Files
                        </Button>
                      </div>
                      <p className="text-[11px] text-amber-400 font-medium mt-3 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        💡 Tip: Uploading any PDF or scan lets you crop both sides instantly!
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cropper Toolbar */}
          {activeImage && (
            <div className="p-3 border-t border-border bg-card/50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => handleRotate(-90)} title="Rotate Left -90°">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => handleRotate(90)} title="Rotate Right +90°">
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleFlipH} title="Flip Horizontal">
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleFlipV} title="Flip Vertical">
                    <FlipVertical className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleOrientation(cropOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="h-8 text-xs gap-1.5 font-medium border-primary/40 hover:bg-primary/10 cursor-pointer"
                  title="Switch between Horizontal (85.6×54) and Vertical (54×85.6) card crop box"
                >
                  {cropOrientation === 'vertical' ? (
                    <span className="w-2.5 h-3.5 rounded-[2px] border-2 border-primary block" />
                  ) : (
                    <span className="w-3.5 h-2.5 rounded-[2px] border-2 border-primary block" />
                  )}
                  <span>Crop: {cropOrientation === 'vertical' ? 'Vertical (54×85.6)' : 'Horizontal (85.6×54)'}</span>
                </Button>

                {/* Free / Static Corner Adjust Toggle */}
                <Button
                  variant={isAspectLocked ? "outline" : "secondary"}
                  size="sm"
                  onClick={handleToggleAspectLock}
                  className={cn(
                    "h-8 text-xs gap-1.5 font-medium cursor-pointer transition-colors",
                    !isAspectLocked
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25"
                      : "border-border text-muted-foreground hover:bg-accent/40"
                  )}
                  title={isAspectLocked
                    ? "Aspect ratio is locked proportionally. Click to switch to Static / Free Corners."
                    : "Static Corners Active: Resizing one side leaves all other sides static. Click to lock aspect ratio."
                  }
                >
                  {!isAspectLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Static / Free Corners</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Locked Ratio</span>
                    </>
                  )}
                </Button>

                {/* Reset Crop Box Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetCropBox}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  title="Reset crop box to standard card size in center"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Reset Box</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {!isAspectLocked && (
                  <span className="text-[11px] text-muted-foreground hidden lg:inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Each corner moves independently (others stay static)
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handleApplyCrop}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Apply {activeSide === 'front' ? 'Front' : 'Back'} Crop ({cropOrientation === 'vertical' ? 'Vertical' : 'Horizontal'})
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Layout & Print Output Options (50%) */}
        <div className="w-1/2 flex flex-col bg-background overflow-hidden">
          {/* Printing Options Tabs: Sheet vs Direct PVC */}
          <Tabs value={printTab} onValueChange={(v) => setPrintTab(v as 'sheet' | 'pvc')} className="flex flex-col h-full">
            <div className="p-3 border-b border-border flex items-center justify-between bg-card/60 backdrop-blur-sm">
              <TabsList className="grid grid-cols-2 w-72 bg-muted/50">
                <TabsTrigger value="sheet" className="text-xs data-[state=active]:bg-card data-[state=active]:text-primary font-medium">
                  📄 Paper Sheet (A4 / 4×6)
                </TabsTrigger>
                <TabsTrigger value="pvc" className="text-xs data-[state=active]:bg-card data-[state=active]:text-cyan-400 font-medium">
                  💳 PVC Card (1-by-1)
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 text-xs flex-wrap">
                {idCardState.frontCroppedUrl ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Front ({frontCardOrientation === 'vertical' ? 'Vertical' : 'Horizontal'}) ✓
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleRotateCropped('front')}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title="Rotate Front Card 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">Front Pending</Badge>
                )}
                {idCardState.backCroppedUrl ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Back ({backCardOrientation === 'vertical' ? 'Vertical' : 'Horizontal'}) ✓
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleRotateCropped('back')}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title="Rotate Back Card 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">Back Optional</Badge>
                )}
              </div>
            </div>

            {/* TAB 1: Paper Sheet Layout */}
            <TabsContent value="sheet" className="flex-1 flex flex-col overflow-hidden m-0 p-4 space-y-4">
              {/* Sheet Settings Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Paper Size</Label>
                  <Select
                    value={paperSettings.paperId}
                    onValueChange={(v) => {
                      if (v) {
                        if (v === '4x6') {
                          // Automatically set the optimal orientation that fits on 4x6 without leaking
                          if (sheetCardOrientation === 'vertical') {
                            setPaperSettings({ paperId: v, orientation: 'landscape' });
                            setIDCardState({ arrangement: 'side-by-side' });
                          } else {
                            setPaperSettings({ paperId: v, orientation: 'portrait' });
                            setIDCardState({ arrangement: 'stacked' });
                          }
                        } else {
                          setPaperSettings({ paperId: v });
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[240px]">
                      {PAPER_SIZES.filter(p => p.id !== 'pvc-card').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.width}×{p.height}mm)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Paper Orientation</Label>
                  <Select
                    value={paperSettings.orientation}
                    onValueChange={(v) => {
                      if (v) {
                        setPaperSettings({ orientation: v as 'portrait' | 'landscape' });
                        if (paperSettings.paperId === '4x6') {
                          if (v === 'landscape' && sheetCardOrientation === 'horizontal') {
                            // On 4x6 landscape, switch card to vertical side-by-side to fit without leaking
                            setSheetCardOrientation('vertical');
                            setIDCardState({ arrangement: 'side-by-side' });
                          } else if (v === 'portrait' && sheetCardOrientation === 'vertical') {
                            // On 4x6 portrait, switch card to horizontal stacked to fit without leaking
                            setSheetCardOrientation('horizontal');
                            setIDCardState({ arrangement: 'stacked' });
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait (Vertical)</SelectItem>
                      <SelectItem value="landscape">Landscape (Horizontal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Card Output Orientation on Sheet: Horizontal (85.6x54) vs Vertical (54x85.6) */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Card Output</Label>
                  <Select
                    value={sheetCardOrientation}
                    onValueChange={(v) => {
                      if (v) {
                        const newOri = v as 'horizontal' | 'vertical';
                        setSheetCardOrientation(newOri);
                        if (paperSettings.paperId === '4x6') {
                          if (newOri === 'vertical') {
                            setPaperSettings({ orientation: 'landscape' });
                            setIDCardState({ arrangement: 'side-by-side' });
                          } else {
                            setPaperSettings({ orientation: 'portrait' });
                            setIDCardState({ arrangement: 'stacked' });
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal (85.6×54)</SelectItem>
                      <SelectItem value="vertical">Vertical (54×85.6)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Arrangement</Label>
                  <Select
                    value={idCardState.arrangement}
                    onValueChange={(v) => {
                      if (v) setIDCardState({ arrangement: v as typeof idCardState.arrangement });
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[270px]">
                      <SelectItem value="stacked">Stacked (Front Top, Back Bottom)</SelectItem>
                      <SelectItem value="side-by-side">Side-by-Side (Front Left, Back Right)</SelectItem>
                      <SelectItem value="front-only">Front Only (Single Side)</SelectItem>
                      <SelectItem value="back-only">Back Only (Single Side)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Copies (Sets)</Label>
                  <Select
                    value={copies.toString()}
                    onValueChange={(v) => { if (v) setCopies(parseInt(v) || 1); }}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[140px]">
                      {[1, 2, 4, 8, 10].map(c => (
                        <SelectItem key={c} value={c.toString()}>{c} Set{c > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Overflow warning banner with Auto-Fit action */}
              {isSheetOverflowing && (
                <div className="flex items-center justify-between p-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      {paperSettings.paperId === '4x6'
                        ? (sheetCardOrientation === 'horizontal'
                            ? 'Stacked horizontal cards (113mm) exceed 4x6 Landscape height (101.6mm).'
                            : 'Stacked vertical cards (176mm) exceed 4x6 Portrait height (152.4mm).')
                        : 'Selected card arrangement exceeds paper printable area.'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoFitToSheet}
                    className="h-6 text-[11px] px-2.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 font-medium shrink-0 ml-2"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Auto-Fit
                  </Button>
                </div>
              )}

              {/* Cutting guides toggle */}
              <div className="flex items-center justify-between py-1 px-1 bg-card/40 rounded-lg border border-border/40">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  <Label className="text-xs cursor-pointer" htmlFor="cutting-guide-toggle">Show Card Cutting Guides (Borders)</Label>
                </div>
                <Switch
                  id="cutting-guide-toggle"
                  checked={idCardState.showCuttingMarks}
                  onCheckedChange={(v) => setIDCardState({ showCuttingMarks: v })}
                />
              </div>

              {/* Visual Sheet Canvas Preview */}
              <div className="flex-1 border border-border rounded-lg bg-muted/20 overflow-auto flex items-center justify-center p-4">
                {idCardState.frontCroppedUrl ? (
                  sheetLayout.positions.length > 0 ? (
                    <div
                      className="relative bg-white shadow-xl border border-gray-300"
                      style={{
                        width: `${paperDims.width * 1.5}px`,
                        height: `${paperDims.height * 1.5}px`,
                        maxHeight: '100%',
                        maxWidth: '100%',
                        aspectRatio: `${paperDims.width} / ${paperDims.height}`,
                      }}
                    >
                      {sheetLayout.positions.map((pos, idx) => {
                        const scale = 1.5;
                        return (
                          <React.Fragment key={idx}>
                            {/* Front card */}
                            <div
                              className={`absolute overflow-hidden flex items-center justify-center ${idCardState.showCuttingMarks ? 'border border-gray-400 rounded-sm' : ''}`}
                              style={{
                                left: `${pos.front.x * scale}px`,
                                top: `${pos.front.y * scale}px`,
                                width: `${pos.front.width * scale}px`,
                                height: `${pos.front.height * scale}px`,
                              }}
                            >
                              <img
                                src={idCardState.frontCroppedUrl!}
                                alt="Front"
                                className="object-cover"
                                style={frontNeedsRotation ? {
                                  width: `${pos.front.height * scale}px`,
                                  height: `${pos.front.width * scale}px`,
                                  transform: 'rotate(90deg)',
                                  transformOrigin: 'center center',
                                } : {
                                  width: '100%',
                                  height: '100%',
                                }}
                              />
                            </div>

                            {/* Back card */}
                            {pos.back && (
                              <div
                                className={`absolute overflow-hidden flex items-center justify-center ${idCardState.showCuttingMarks ? 'border border-gray-400 rounded-sm' : ''}`}
                                style={{
                                  left: `${pos.back.x * scale}px`,
                                  top: `${pos.back.y * scale}px`,
                                  width: `${pos.back.width * scale}px`,
                                  height: `${pos.back.height * scale}px`,
                                }}
                              >
                                {idCardState.backCroppedUrl ? (
                                  <img
                                    src={idCardState.backCroppedUrl}
                                    alt="Back"
                                    className="object-cover"
                                    style={backNeedsRotation ? {
                                      width: `${pos.back.height * scale}px`,
                                      height: `${pos.back.width * scale}px`,
                                      transform: 'rotate(90deg)',
                                      transformOrigin: 'center center',
                                    } : {
                                      width: '100%',
                                      height: '100%',
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 border border-dashed border-gray-300">
                                    Back Side
                                  </div>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Cards Exceed Printable Area</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        {idCardState.arrangement === 'stacked'
                          ? `Stacked cards exceed the ${paperDims.height}mm paper height.`
                          : `Side-by-side cards exceed the ${paperDims.width}mm paper width.`}
                      </p>
                      <Button
                        size="sm"
                        onClick={handleAutoFitToSheet}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-sm"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Auto-Fit Paper & Card Orientation</span>
                      </Button>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">Crop Front Side to preview sheet layout</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveSheetPDF}
                  disabled={!idCardState.frontCroppedUrl || isExportingPdf}
                  className="w-full sm:w-auto"
                >
                  <FileDown className="w-4 h-4 mr-2 text-cyan-400" />
                  {isExportingPdf ? 'Generating PDF...' : 'Save Sheet as PDF'}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrintSheet}
                  disabled={!idCardState.frontCroppedUrl}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-orange-500/20 font-medium w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print on {paper.name} ({sheetLayout.totalSets} Set{sheetLayout.totalSets > 1 ? 's' : ''})
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: Direct PVC Card Printing (One-by-one) */}
            <TabsContent value="pvc" className="flex-1 flex flex-col overflow-auto m-0 p-5 space-y-6">
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/25">
                <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> PVC Card Direct Printing (One-by-One)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Designed for plastic card printers (Zebra, Evolis, Magicard, Fargo, or Epson PVC Card Trays).
                  Cards are printed one side at a time at exact CR80 size (85.6 × 53.98 mm) without scaling.
                </p>
              </div>

              {/* Step 1: Front Side */}
              <Card className="border-border bg-card/60 shadow-xs">
                <CardHeader className="py-3 px-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
                      Front Side Print
                    </CardTitle>
                    {idCardState.frontCroppedUrl && (
                      <Badge variant="secondary" className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Ready to Print</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className={cn(
                    "rounded-lg bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0 shadow-xs",
                    isCardVertical ? "w-24 sm:w-28 aspect-[53.98/85.6]" : "w-32 sm:w-36 aspect-[85.6/53.98]"
                  )}>
                    {idCardState.frontCroppedUrl ? (
                      <img src={idCardState.frontCroppedUrl} alt="Front Card" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground p-2 text-center">Upload & Crop Front</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Place blank PVC card into printer tray. Ensure printer paper size is set to CR80 / Card.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handlePrintPVCSide('front')}
                      disabled={!idCardState.frontCroppedUrl}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium h-8"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Print Front Side Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Back Side */}
              <Card className="border-border bg-card/60 shadow-xs">
                <CardHeader className="py-3 px-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</span>
                      Back Side Print (After flipping card)
                    </CardTitle>
                    {idCardState.backCroppedUrl && (
                      <Badge variant="secondary" className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Ready to Print</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className={cn(
                    "rounded-lg bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0 shadow-xs",
                    isCardVertical ? "w-24 sm:w-28 aspect-[53.98/85.6]" : "w-32 sm:w-36 aspect-[85.6/53.98]"
                  )}>
                    {idCardState.backCroppedUrl ? (
                      <img src={idCardState.backCroppedUrl} alt="Back Card" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground p-2 text-center">Upload & Crop Back</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      After front side prints, flip the card upside-down in tray, then click Print Back Side.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handlePrintPVCSide('back')}
                      disabled={!idCardState.backCroppedUrl}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium h-8"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Print Back Side Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Full CR80 Card PDF Export */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/60 gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-foreground">Digital PVC Card Document</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Save both front and back sides as an exact 85.6 × 53.98 mm PDF for digital delivery or card printing software
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSavePVCPDF}
                  disabled={!idCardState.frontCroppedUrl || isExportingPdf}
                  className="text-xs shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  {isExportingPdf ? 'Saving PDF...' : 'Save CR80 PDF'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PdfPasswordDialog
        isOpen={passwordPrompt.isOpen}
        fileName={passwordPrompt.fileName}
        onUnlock={(pwd) => passwordPrompt.resolve?.(pwd)}
        onCancel={() => passwordPrompt.reject?.()}
      />
    </div>
  );
}
