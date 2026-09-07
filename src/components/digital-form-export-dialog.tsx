'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileCheck2, Download, Copy, Check, Upload, Sparkles, AlertCircle,
  FileText, ShieldCheck, HelpCircle, RefreshCw, Sliders, Image as ImageIcon,
  PenTool, Fingerprint, Search, Info, ArrowRight, ExternalLink
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  EXAM_FORM_PRESETS,
  type ExamFormPreset,
  type CompressResult,
  compressCanvasToTargetKb,
} from '@/lib/digital-form-exporter';

const CATEGORIES = [
  { id: 'all', label: 'All Exams' },
  { id: 'ssc', label: 'SSC' },
  { id: 'upsc', label: 'UPSC' },
  { id: 'banking', label: 'Banking' },
  { id: 'railway', label: 'Railways' },
  { id: 'nta', label: 'NTA NEET/JEE' },
  { id: 'document', label: 'DL / PAN' },
  { id: 'defence', label: 'Defence' },
  { id: 'state_psc', label: 'State PSC' },
  { id: 'custom', label: 'Custom' },
];

interface DigitalFormExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImageUrl?: string | null;
}

export function DigitalFormExportDialog({
  isOpen,
  onClose,
  sourceImageUrl,
}: DigitalFormExportDialogProps) {
  // Source image state: either passed from editor or uploaded directly here
  const [activeImage, setActiveImage] = useState<string | null>(sourceImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when prop changes
  useEffect(() => {
    if (sourceImageUrl) {
      setActiveImage(sourceImageUrl);
    }
  }, [sourceImageUrl]);

  // Presets filtering state
  const [selectedType, setSelectedType] = useState<'all' | 'photo' | 'signature' | 'thumb'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ssc-photo');

  // Active preset
  const activePreset = useMemo(() => {
    return EXAM_FORM_PRESETS.find(p => p.id === selectedPresetId) || EXAM_FORM_PRESETS[0];
  }, [selectedPresetId]);

  // Compression configuration state
  const [targetMaxKb, setTargetMaxKb] = useState<number>(50);
  const [targetMinKb, setTargetMinKb] = useState<number>(20);
  const [targetWidth, setTargetWidth] = useState<number>(350);
  const [targetHeight, setTargetHeight] = useState<number>(450);

  // Signature clean filter state
  const [cleanSignature, setCleanSignature] = useState<boolean>(false);

  // Photo Name & Date state
  const [addNameDate, setAddNameDate] = useState<boolean>(false);
  const [candidateName, setCandidateName] = useState<string>('');
  const [dateOfPhoto, setDateOfPhoto] = useState<string>(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });

  // Compression Output Result
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update configuration when active preset changes
  useEffect(() => {
    if (!activePreset) return;
    setTargetMaxKb(activePreset.targetMaxKb);
    setTargetMinKb(activePreset.targetMinKb);
    setTargetWidth(activePreset.width);
    setTargetHeight(activePreset.height);

    // Auto-enable smart defaults based on type
    if (activePreset.type === 'signature' || activePreset.type === 'thumb') {
      setCleanSignature(true);
      setAddNameDate(false);
    } else {
      setCleanSignature(false);
      setAddNameDate(!!activePreset.supportsNameDate);
    }
  }, [activePreset]);

  // Execute binary compression whenever configuration or source changes
  const runCompression = useCallback(async () => {
    if (!activeImage) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      // Load image onto a source canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Unable to read the image file'));
        img.src = activeImage;
      });

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.naturalWidth || img.width;
      srcCanvas.height = img.naturalHeight || img.height;
      const ctx = srcCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.drawImage(img, 0, 0);

      const result = await compressCanvasToTargetKb(srcCanvas, {
        targetMaxKb,
        targetMinKb,
        width: targetWidth,
        height: targetHeight,
        cleanSignature,
        addNameDateBanner: addNameDate,
        candidateName,
        dateOfPhoto,
      });

      setCompressResult(result);
    } catch (err: any) {
      console.error('Error during government form compression:', err);
      setErrorMsg(err?.message || 'Failed to compress image to target KB');
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeImage,
    targetMaxKb,
    targetMinKb,
    targetWidth,
    targetHeight,
    cleanSignature,
    addNameDate,
    candidateName,
    dateOfPhoto,
  ]);

  // Auto-run compression with debounce
  useEffect(() => {
    if (!isOpen || !activeImage) return;
    const timer = setTimeout(() => {
      runCompression();
    }, 180);
    return () => clearTimeout(timer);
  }, [isOpen, activeImage, runCompression]);

  // Filtered presets list
  const filteredPresets = useMemo(() => {
    return EXAM_FORM_PRESETS.filter(p => {
      // Type filter
      if (selectedType !== 'all' && p.type !== selectedType) return false;
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedType, selectedCategory, searchQuery]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPEG, PNG, WEBP)');
      return;
    }

    const url = URL.createObjectURL(file);
    setActiveImage(url);
  };

  // Download compressed file
  const handleDownload = () => {
    if (!compressResult) return;

    const safeName = activePreset.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
    const fileName = `${safeName}_${compressResult.sizeKb}KB_UrStudio.jpg`;

    const a = document.createElement('a');
    a.href = compressResult.dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy to clipboard
  const handleCopyClipboard = async () => {
    if (!compressResult) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        // ClipboardItem requires image/png in some browsers, so convert blob to png or copy directly
        const pngBlob = await new Promise<Blob | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob(resolve, 'image/png');
          };
          img.src = compressResult.dataUrl;
        });

        if (pngBlob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-5xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] max-h-[850px] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl">
        {/* Top Header */}
        <div className="p-4 sm:px-6 border-b border-border bg-card/60 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-cyan-500/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-xs text-primary shrink-0">
              <FileCheck2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Online Form Photo & Signature Exporter
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  100% Client-Side
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Target KB compressor & compliance engine for SSC, UPSC, IBPS, Railways, NTA, Sarathi DL & Govt Portals.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8 gap-1.5 border-border hover:bg-muted"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>{activeImage ? 'Change Image' : 'Upload Image / Sign'}</span>
            </Button>
          </div>
        </div>

        {/* Main Content Area: 2-Column Desktop Grid with Independent Scroll */}
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
          
          {/* Left / Middle: Preset Selector & Controls (7 cols) */}
          <div className="md:col-span-7 p-4 sm:p-5 border-r border-border flex flex-col gap-4 overflow-y-auto min-h-0">
            
            {/* Filter Tabs & Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Type tabs */}
                <div className="inline-flex bg-muted p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      selectedType === 'all'
                        ? 'bg-card text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Formats
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('photo')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-all ${
                      selectedType === 'photo'
                        ? 'bg-card text-foreground shadow-xs font-semibold text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Photographs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('signature')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-all ${
                      selectedType === 'signature'
                        ? 'bg-card text-foreground shadow-xs font-semibold text-cyan-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Signatures
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('thumb')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-all ${
                      selectedType === 'thumb'
                        ? 'bg-card text-foreground shadow-xs font-semibold text-purple-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Thumb
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative flex-1 min-w-[140px] max-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search exam (e.g. UPSC)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md bg-muted/60 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Category Pills for 1-Click Filtering */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredPresets.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  const isSign = preset.type === 'signature' || preset.type === 'thumb';
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                          : 'border-border/80 hover:border-border hover:bg-muted/40 bg-card/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className={`text-xs font-semibold line-clamp-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {preset.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 shrink-0 ${
                            isSign ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {preset.badge || `${preset.targetMinKb}–${preset.targetMaxKb} KB`}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-mono">{preset.displayDimensions}</span>
                        <span className="text-[10px] font-medium text-emerald-500">
                          {preset.targetMinKb}–{preset.targetMaxKb} KB
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Preset Information Note */}
            <div className="bg-muted/50 border border-border/80 rounded-lg p-2.5 flex items-start gap-2 text-xs">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-medium text-foreground">
                  Portal Rules for {activePreset.name}
                </div>
                <div className="text-muted-foreground text-[11px] leading-relaxed">
                  {activePreset.notes}
                </div>
              </div>
            </div>

            {/* Target Size & Dimensions Adjustments */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  Target Compression Parameters
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Target: <strong className="text-foreground">{targetMinKb} KB – {targetMaxKb} KB</strong>
                </span>
              </div>

              {/* Slider for Target Max KB */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Strict Upper Limit (Max KB)</span>
                  <span className="font-mono font-bold text-primary">{targetMaxKb} KB</span>
                </div>
                <Slider
                  min={10}
                  max={300}
                  step={1}
                  value={targetMaxKb}
                  onValueChange={(v) => setTargetMaxKb(typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 50)}
                />
              </div>

              {/* Pixel Dimensions Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Width (px)</Label>
                  <Input
                    type="number"
                    value={targetWidth}
                    onChange={(e) => setTargetWidth(Number(e.target.value) || 100)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Height (px)</Label>
                  <Input
                    type="number"
                    value={targetHeight}
                    onChange={(e) => setTargetHeight(Number(e.target.value) || 100)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Specialized Features: Signature Cleaner or Candidate Name Banner */}
            {(activePreset.type === 'signature' || activePreset.type === 'thumb') ? (
              /* Signature Paper Cleaner Tool */
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <div>
                      <Label className="text-xs font-semibold text-foreground block">
                        Signature Paper Cleaner & Ink Enhancer
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Converts mobile shadows/yellow paper to #FFFFFF crisp white and darkens ink
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={cleanSignature}
                    onCheckedChange={setCleanSignature}
                  />
                </div>
              </div>
            ) : (
              /* Candidate Name & Date Banner Tool */
              <div className="bg-card border border-border rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <Label className="text-xs font-semibold text-foreground block">
                        Candidate Name & Date of Photo (DOP) Strip
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Mandatory official bottom strip for UPSC, SSC & NTA forms
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={addNameDate}
                    onCheckedChange={setAddNameDate}
                  />
                </div>

                {addNameDate && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Candidate Full Name</Label>
                      <Input
                        type="text"
                        placeholder="e.g. AMIT KUMAR"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Date of Photo (DD/MM/YYYY)</Label>
                      <Input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={dateOfPhoto}
                        onChange={(e) => setDateOfPhoto(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Live Preview & Compliance Gauge (5 cols) */}
          <div className="md:col-span-5 p-4 sm:p-5 bg-muted/20 flex flex-col justify-between gap-4 overflow-y-auto min-h-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  Live Compressed Preview
                </span>
                {isProcessing && (
                  <span className="text-[11px] text-primary flex items-center gap-1 animate-pulse font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Compressing...
                  </span>
                )}
              </div>

              {/* Preview Window */}
              <div className="w-full h-52 sm:h-56 rounded-lg border border-border bg-black/40 flex items-center justify-center p-3 relative overflow-hidden group">
                {compressResult ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={compressResult.dataUrl}
                    alt="Target Output Preview"
                    className="max-h-full max-w-full object-contain rounded shadow-lg"
                  />
                ) : activeImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeImage}
                    alt="Active Source"
                    className="max-h-full max-w-full object-contain opacity-50"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Upload an image or signature to start</p>
                  </div>
                )}

                {/* Dimension Overlay */}
                {compressResult && (
                  <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded font-mono border border-white/10">
                    {compressResult.width} × {compressResult.height} px
                  </div>
                )}
              </div>

              {/* Real-time Compliance Result Card */}
              {compressResult && (
                <div className={`p-3 rounded-lg border transition-all ${
                  compressResult.isCompliant
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground">File Size Verification:</span>
                    <span className={`text-sm font-bold font-mono ${
                      compressResult.isCompliant ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {compressResult.sizeKb} KB
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    {compressResult.isCompliant ? (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={`font-medium ${compressResult.isCompliant ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {compressResult.isCompliant
                        ? `✔ 100% Compliant for ${activePreset.name}`
                        : `Target range is ${targetMinKb}–${targetMaxKb} KB`
                      }
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5 border-t border-border/40 pt-1.5">
                    <div className="flex justify-between">
                      <span>Target Band:</span>
                      <span className="font-mono text-foreground">{targetMinKb} KB – {targetMaxKb} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>JPEG Quality:</span>
                      <span className="font-mono text-foreground">{Math.round(compressResult.quality * 100)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                variant="3d-terracotta"
                onClick={handleDownload}
                disabled={!compressResult || isProcessing}
                className="w-full text-xs h-9 gap-2 font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Form-Ready JPG ({compressResult?.sizeKb || targetMaxKb} KB)</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyClipboard}
                  disabled={!compressResult}
                  className="flex-1 text-xs h-8 gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-xs h-8 text-muted-foreground"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
