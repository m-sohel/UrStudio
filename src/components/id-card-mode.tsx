'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import {
  CreditCard, Upload, Check, Printer, RotateCw, RotateCcw,
  FlipHorizontal, FlipVertical, Sun, Contrast, Palette,
  Layers, ArrowRight, RefreshCw, Scissors, Info, Sparkles
} from 'lucide-react';
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
import {
  getIDCardTemplate, PAPER_SIZES, getPaperSize,
  getEffectivePaperDimensions, type IDCardTemplate
} from '@/lib/templates';
import { calculateIDCardLayout } from '@/lib/layout-engine';
import { generateIDCardPrintHTML, printViaIframe, PRINT_INSTRUCTIONS } from '@/lib/print';
import { loadImage, loadImageElement, generateThumbnail, isSupportedImage } from '@/lib/image-processing';
import { isPdfFile, loadPdfPages, pdfPageToEditorImage } from '@/lib/pdf-processor';
import { applyPrintColorCalibration } from '@/lib/color-management';
import { mmToPx, DEFAULT_DPI } from '@/lib/units';

export function IDCardMode() {
  const {
    idCardState, setIDCardState,
    selectedTemplateId, setSelectedTemplate,
    paperSettings, setPaperSettings,
    copies, setCopies,
    colorCalibration,
  } = useEditorStore();

  const cropperRef = useRef<ReactCropperElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Active side in the editor
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [printTab, setPrintTab] = useState<'sheet' | 'pvc'>('sheet');
  const [showInstructions, setShowInstructions] = useState(false);

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

  // Handle uploading front or back file (supports image and PDF)
  const handleUploadSide = async (file: File, side: 'front' | 'back') => {
    if (!isSupportedImage(file) && !isPdfFile(file)) {
      alert('Please upload a JPG, PNG, WEBP image or a PDF document.');
      return;
    }

    if (isPdfFile(file)) {
      try {
        const pages = await loadPdfPages(file, { dpi: 300 });
        if (pages.length === 0) return;

        if (pages.length >= 2) {
          // Auto assign Page 1 to Front and Page 2 to Back (standard for e-Aadhaar / DL PDF)
          const frontImg = pdfPageToEditorImage(pages[0], file);
          frontImg.isPdf = true;
          frontImg.pdfPageNumber = 1;

          const backImg = pdfPageToEditorImage(pages[1], file);
          backImg.isPdf = true;
          backImg.pdfPageNumber = 2;

          setIDCardState({ frontImage: frontImg, backImage: backImg });
          setActiveSide('front');
        } else {
          const editorImg = pdfPageToEditorImage(pages[0], file);
          editorImg.isPdf = true;
          editorImg.pdfPageNumber = 1;
          if (side === 'front') {
            setIDCardState({ frontImage: editorImg });
            setActiveSide('front');
          } else {
            setIDCardState({ backImage: editorImg });
            setActiveSide('back');
          }
        }
      } catch (err) {
        alert('Failed to load PDF: ' + (err instanceof Error ? err.message : String(err)));
      }
      return;
    }

    const info = await loadImage(file);
    const imgEl = await loadImageElement(info.objectUrl);
    const thumbnailUrl = generateThumbnail(imgEl, 200);
    const editorImg: EditorImage = { ...info, thumbnailUrl };

    if (side === 'front') {
      setIDCardState({ frontImage: editorImg });
      setActiveSide('front');
    } else {
      setIDCardState({ backImage: editorImg });
      setActiveSide('back');
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
      positions: sheetLayout.positions,
      frontImageUrl: idCardState.frontCroppedUrl,
      backImageUrl: idCardState.backCroppedUrl || undefined,
      showCuttingMarks: idCardState.showCuttingMarks,
    });

    printViaIframe(html);
  }, [paperDims, paperSettings, template, sheetLayout, idCardState]);

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
      positions: [],
      frontImageUrl: imgUrl,
      pvcSingleSide: side,
    });

    printViaIframe(html);
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-semibold">{template.name} Mode</h2>
          <Badge variant="outline" className="text-xs">
            {template.width} × {template.height} mm (CR80)
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            Printer Guide
          </Button>

          <Button
            size="sm"
            onClick={printTab === 'pvc' ? () => handlePrintPVCSide('front') : handlePrintSheet}
            disabled={!idCardState.frontCroppedUrl}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
          <div className="p-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex gap-2">
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
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={frontInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadSide(e.target.files[0], 'front');
                  e.target.value = '';
                }}
              />
              <input
                ref={backInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
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
          <div className="flex-1 bg-black/40 relative overflow-hidden flex items-center justify-center">
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
              <div
                className="flex flex-col items-center justify-center p-8 text-center cursor-pointer border-2 border-dashed border-muted-foreground/30 rounded-xl m-8 hover:border-primary/50"
                onClick={() => activeSide === 'front' ? frontInputRef.current?.click() : backInputRef.current?.click()}
              >
                <CreditCard className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Click to upload {activeSide} side image or PDF</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports Photos, Scans, e-Aadhaar, PAN & DL PDFs (JPG, PNG, WEBP, PDF)
                </p>
                <p className="text-[11px] text-emerald-500 font-medium mt-2">
                  💡 Tip: Uploading a 2-page e-Aadhaar PDF automatically sets Front & Back!
                </p>
              </div>
            )}
          </div>

          {/* Cropper Toolbar */}
          {activeImage && (
            <div className="p-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRotate(-90)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRotate(90)}>
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFlipH}>
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFlipV}>
                  <FlipVertical className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleApplyCrop}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
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
            <div className="p-3 border-b border-border flex items-center justify-between bg-card">
              <TabsList className="grid grid-cols-2 w-72">
                <TabsTrigger value="sheet" className="text-xs">
                  📄 Paper Sheet (A4 / 4×6)
                </TabsTrigger>
                <TabsTrigger value="pvc" className="text-xs">
                  💳 PVC Card (1-by-1)
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 text-xs">
                {idCardState.frontCroppedUrl ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Front Cropped ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Front Pending</Badge>
                )}
                {idCardState.backCroppedUrl ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Back Cropped ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Back Optional</Badge>
                )}
              </div>
            </div>

            {/* TAB 1: Paper Sheet Layout */}
            <TabsContent value="sheet" className="flex-1 flex flex-col overflow-hidden m-0 p-4 space-y-4">
              {/* Sheet Settings Controls */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Paper Size</Label>
                  <Select
                    value={paperSettings.paperId}
                    onValueChange={(v) => { if (v) setPaperSettings({ paperId: v }); }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_SIZES.filter(p => p.id !== 'pvc-card').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.width}×{p.height}mm)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Arrangement</Label>
                  <Select
                    value={idCardState.arrangement}
                    onValueChange={(v) => {
                      if (v) setIDCardState({ arrangement: v as typeof idCardState.arrangement });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stacked">Stacked (Front Top, Back Bottom)</SelectItem>
                      <SelectItem value="side-by-side">Side-by-Side (Front Left, Back Right)</SelectItem>
                      <SelectItem value="front-only">Front Only</SelectItem>
                      <SelectItem value="back-only">Back Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Copies (Sets)</Label>
                  <Select
                    value={copies.toString()}
                    onValueChange={(v) => { if (v) setCopies(parseInt(v) || 1); }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 4, 8, 10].map(c => (
                        <SelectItem key={c} value={c.toString()}>{c} Set{c > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cutting guides toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs">Show Card Cutting Guides (Borders)</Label>
                </div>
                <Switch
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

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handlePrintSheet}
                  disabled={!idCardState.frontCroppedUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print on {paper.name} ({sheetLayout.totalSets} Set{sheetLayout.totalSets > 1 ? 's' : ''})
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: Direct PVC Card Printing (One-by-one) */}
            <TabsContent value="pvc" className="flex-1 flex flex-col overflow-auto m-0 p-5 space-y-6">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <h3 className="text-sm font-semibold text-emerald-500 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4" /> PVC Card Direct Printing (One-by-One)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Designed for plastic card printers (Zebra, Evolis, Magicard, Fargo, or Epson PVC Card Trays).
                  Cards are printed one side at a time at exact CR80 size (85.6 × 53.98 mm) without scaling.
                </p>
              </div>

              {/* Step 1: Front Side */}
              <Card className="border-border">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
                      Front Side Print
                    </CardTitle>
                    {idCardState.frontCroppedUrl && (
                      <Badge variant="secondary" className="text-[10px]">Ready to Print</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex items-center justify-between gap-4">
                  <div className="w-36 h-22 rounded bg-muted overflow-hidden border border-border flex items-center justify-center">
                    {idCardState.frontCroppedUrl ? (
                      <img src={idCardState.frontCroppedUrl} alt="Front Card" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Upload & Crop Front</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Place blank PVC card into printer tray. Ensure printer paper size is set to CR80 / Card.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handlePrintPVCSide('front')}
                      disabled={!idCardState.frontCroppedUrl}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Print Front Side Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Back Side */}
              <Card className="border-border">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
                      Back Side Print (After flipping card)
                    </CardTitle>
                    {idCardState.backCroppedUrl && (
                      <Badge variant="secondary" className="text-[10px]">Ready to Print</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex items-center justify-between gap-4">
                  <div className="w-36 h-22 rounded bg-muted overflow-hidden border border-border flex items-center justify-center">
                    {idCardState.backCroppedUrl ? (
                      <img src={idCardState.backCroppedUrl} alt="Back Card" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Upload & Crop Back</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      After front side prints, flip the card upside-down in tray, then click Print Back Side.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handlePrintPVCSide('back')}
                      disabled={!idCardState.backCroppedUrl}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Print Back Side Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
