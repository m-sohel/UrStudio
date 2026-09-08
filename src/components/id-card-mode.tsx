'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import {
  CreditCard, Upload, Check, Printer, RotateCw, RotateCcw,
  FlipHorizontal, FlipVertical, Sun, Contrast, Palette,
  Layers, ArrowRight, RefreshCw, Scissors, Info, Sparkles,
  FileDown, Copy, FileText, Loader2
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
    const outW = mmToPx(template.width, DEFAULT_DPI);
    const outH = mmToPx(template.height, DEFAULT_DPI);

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
      setIDCardState({ frontCroppedUrl: dataUrl });
      // If back exists and not cropped, auto switch to back
      if (idCardState.backImage && !idCardState.backCroppedUrl) {
        setActiveSide('back');
      }
    } else {
      setIDCardState({ backCroppedUrl: dataUrl });
    }
  };

  // Calculate sheet layout for preview & printing
  const paperDims = getEffectivePaperDimensions(paper, paperSettings.orientation);
  const sheetLayout = useMemo(() => {
    return calculateIDCardLayout({
      paperWidth: paperDims.width,
      paperHeight: paperDims.height,
      cardWidth: template.width,
      cardHeight: template.height,
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
  }, [paperDims, template, paperSettings, idCardState.frontBackGap, idCardState.arrangement, copies]);

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
      cardWidth: template.width,
      cardHeight: template.height,
      frontImageUrl: idCardState.frontCroppedUrl,
      backImageUrl: idCardState.backCroppedUrl || undefined,
      showCuttingMarks: idCardState.showCuttingMarks,
      bleedMm: settings.defaultBleedMm,
      showCropMarks: settings.showCropMarks,
    });

    printViaIframe(html);
  }, [paperDims, paperSettings, template, idCardState, settings]);

  // Print PVC Single Side
  const handlePrintPVCSide = useCallback((side: 'front' | 'back') => {
    const imgUrl = side === 'front' ? idCardState.frontCroppedUrl : idCardState.backCroppedUrl;
    if (!imgUrl) {
      alert(`Please crop the ${side} side first before printing.`);
      return;
    }

    const html = generateIDCardPrintHTML({
      paperWidth: template.width,
      paperHeight: template.height,
      orientation: 'landscape',
      cardWidth: template.width,
      cardHeight: template.height,
      frontImageUrl: imgUrl,
      pvcSingleSide: side,
    });

    printViaIframe(html);
  }, [idCardState, template]);

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
        cardWidth: template.width,
        cardHeight: template.height,
        positions: sheetLayout.positions,
        frontImageUrl: idCardState.frontCroppedUrl,
        backImageUrl: idCardState.backCroppedUrl || undefined,
        showCuttingMarks: idCardState.showCuttingMarks,
        bleedMm: settings.defaultBleedMm,
        showCropMarks: settings.showCropMarks,
        templateName: template.name,
      });
    } catch (err) {
      console.error('Failed to export ID card sheet PDF:', err);
      alert('Failed to export PDF. Please check your image data and try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [paperDims, paperSettings, template, sheetLayout, idCardState, settings]);

  // Export Direct CR80 PVC Card as PDF
  const handleSavePVCPDF = useCallback(async () => {
    if (!idCardState.frontCroppedUrl) {
      alert('Please crop at least the front side of the ID card first.');
      return;
    }

    try {
      setIsExportingPdf(true);
      await exportPVCCardToPDF({
        cardWidth: template.width,
        cardHeight: template.height,
        frontImageUrl: idCardState.frontCroppedUrl,
        backImageUrl: idCardState.backCroppedUrl || undefined,
        filename: `UrStudio_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_CR80_${Date.now()}.pdf`,
      });
    } catch (err) {
      console.error('Failed to export PVC card PDF:', err);
      alert('Failed to export PVC card PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [idCardState, template]);

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
            {template.width} × {template.height} mm (CR80)
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
          {/* Side Selector Tabs (Front vs Back) */}
          <div className="p-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={activeSide === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSide('front')}
                className="text-xs"
              >
                Front Side {idCardState.frontCroppedUrl && '✓'}
              </Button>
              <Button
                variant={activeSide === 'back' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSide('back')}
                className="text-xs"
              >
                Back Side {idCardState.backCroppedUrl && '✓'}
              </Button>

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
                aspectRatio={template.aspectRatio}
                viewMode={1}
                guides={true}
                center={true}
                highlight={true}
                background={true}
                autoCropArea={0.9}
                responsive={true}
                zoomOnWheel={true}
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
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => handleRotate(-90)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => handleRotate(90)}>
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleFlipH}>
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleFlipV}>
                  <FlipVertical className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleApplyCrop}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-medium"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Apply {activeSide === 'front' ? 'Front' : 'Back'} Crop
              </Button>
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

              <div className="flex items-center gap-2 text-xs">
                {idCardState.frontCroppedUrl ? (
                  <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Front Cropped ✓</Badge>
                ) : (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">Front Pending</Badge>
                )}
                {idCardState.backCroppedUrl ? (
                  <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Back Cropped ✓</Badge>
                ) : (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">Back Optional</Badge>
                )}
              </div>
            </div>

            {/* TAB 1: Paper Sheet Layout */}
            <TabsContent value="sheet" className="flex-1 flex flex-col overflow-hidden m-0 p-4 space-y-4">
              {/* Sheet Settings Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Paper Size</Label>
                  <Select
                    value={paperSettings.paperId}
                    onValueChange={(v) => { if (v) setPaperSettings({ paperId: v }); }}
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
                            className={`absolute overflow-hidden ${idCardState.showCuttingMarks ? 'border border-gray-400 rounded-sm' : ''}`}
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
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Back card */}
                          {pos.back && (
                            <div
                              className={`absolute overflow-hidden ${idCardState.showCuttingMarks ? 'border border-gray-400 rounded-sm' : ''}`}
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
                                  className="w-full h-full object-cover"
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
                  <div className="w-32 sm:w-36 aspect-[85.6/53.98] rounded-lg bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0 shadow-xs">
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
                  <div className="w-32 sm:w-36 aspect-[85.6/53.98] rounded-lg bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0 shadow-xs">
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
