'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Undo2, Redo2, Save, Printer, Eye, Home,
  Image, CreditCard, Layout, ChevronRight, Layers,
  Bookmark, ArrowRight, FileCheck2, Crown, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ImageUploader } from '@/components/image-uploader';
import { ImageEditor } from '@/components/image-editor';
import { TemplateSelector } from '@/components/template-selector';
import { PaperSelector } from '@/components/paper-selector';
import { LayoutPreview } from '@/components/layout-preview';
import { PrintPreview } from '@/components/print-preview';
import { IDCardMode } from '@/components/id-card-mode';
import { ThemeToggle } from '@/components/theme-toggle';
import { DigitalFormExportDialog } from '@/components/digital-form-export-dialog';
import { UpgradeModal } from '@/components/upgrade-modal';
import { useEditorStore } from '@/store/editor-store';
import { useLicenseStore } from '@/store/license-store';
import { useMounted } from '@/hooks/use-mounted';
import { getPhotoTemplate, getIDCardTemplate } from '@/lib/templates';

// Step indicator component for Photo Mode
function StepIndicator() {
  const { step, setStep, images, croppedImageUrl } = useEditorStore();

  const steps = [
    { id: 'upload' as const, label: 'Upload', icon: Image, done: images.length > 0 },
    { id: 'crop' as const, label: 'Crop', icon: Layout, done: !!croppedImageUrl },
    { id: 'layout' as const, label: 'Layout', icon: Layout, done: !!croppedImageUrl },
    { id: 'preview' as const, label: 'Preview', icon: Eye, done: false },
  ];

  const currentIdx = steps.findIndex(s => s.id === step);

  return (
    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-full border-2 border-border/80">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <button
            onClick={() => setStep(s.id)}
            disabled={i > 0 && !steps[i - 1].done}
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
              transition-all
              ${i === currentIdx
                ? 'bg-[#1B2A4A] text-[#F5F3EE] dark:bg-[#FAF8F5] dark:text-[#1B2A4A] shadow-[0_2px_0_0_var(--shadow-3d)]'
                : s.done
                  ? 'text-foreground hover:bg-card hover:text-[#C1553A] cursor-pointer'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }
            `}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
          {i < steps.length - 1 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const templateParam = searchParams.get('template');
  const actionParam = searchParams.get('action');

  const {
    step, setStep,
    images, selectedImageIndex,
    selectedTemplateId, selectedTemplateType, setSelectedTemplate,
    croppedImageUrl,
    undo, redo, undoStack, redoStack,
    mode, setMode,
  } = useEditorStore();

  const mounted = useMounted();
  const { isPro, tier, openUpgradeModal } = useLicenseStore();
  const isClientPro = mounted && isPro;
  const [isFormExportOpen, setIsFormExportOpen] = useState(false);

  const effectiveMode = modeParam === 'id-card' || mode === 'id-card' ? 'id-card' : 'photo';
  const activeDoc = selectedTemplateId
    ? (selectedTemplateType === 'photo' ? getPhotoTemplate(selectedTemplateId) : getIDCardTemplate(selectedTemplateId))
    : null;

  // Read URL query params on mount
  useEffect(() => {
    if (modeParam === 'id-card') {
      setMode('id-card');
      if (templateParam) {
        setSelectedTemplate(templateParam, 'id-card');
      } else {
        setSelectedTemplate('aadhaar-card', 'id-card');
      }
    } else if (templateParam) {
      const isPhoto = getPhotoTemplate(templateParam);
      if (isPhoto) {
        setMode('photo');
        setSelectedTemplate(templateParam, 'photo');
      }
      const isID = getIDCardTemplate(templateParam);
      if (isID) {
        setMode('id-card');
        setSelectedTemplate(templateParam, 'id-card');
      }
    }

    if (actionParam === 'govt-form') {
      setIsFormExportOpen(true);
    }
  }, [modeParam, templateParam, actionParam, setMode, setSelectedTemplate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (mod && e.key === 'p') {
        e.preventDefault();
        if (effectiveMode === 'photo') setStep('preview');
      }
      if (e.key === 'Escape') {
        if (step === 'preview') setStep('layout');
        else if (step === 'crop') setStep('upload');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setStep, step, effectiveMode]);

  // Full-screen print preview mode (Photo Mode)
  if (step === 'preview' && effectiveMode === 'photo') {
    return (
      <TooltipProvider>
        <div className="h-screen flex flex-col bg-background">
          <PrintPreview />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* ====== Top Toolbar ====== */}
        <header className="flex items-center gap-2 px-4 py-2 border-b-2 border-border dark:border-[#2B3D5E] bg-card dark:bg-[#0E1626] dark:shadow-[0_3px_0_0_#070B14]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-3 group">
            <div className="w-8 h-8 rounded-lg bg-card dark:bg-[#141F33] border-2 border-border/80 dark:border-[#364C72] flex items-center justify-center shadow-[0_2px_0_0_var(--shadow-3d-card)] dark:shadow-[0_2px_0_0_#080D17,0_3px_0_1px_#364C72] p-1 overflow-hidden group-hover:scale-105 transition-transform">
              <NextImage
                src="/favicon.png"
                alt="UrStudio Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="text-sm font-bold hidden sm:inline tracking-tight text-foreground">UrStudio</span>
          </Link>

          <Separator orientation="vertical" className="h-6" />

          {/* Mode Switcher: Photo Mode vs ID Card Mode */}
          <div className="flex items-center bg-muted/40 dark:bg-[#111A2B] p-1 rounded-full border-2 border-border/80 dark:border-[#364C72] shadow-[0_2px_0_0_var(--shadow-3d-card)] dark:shadow-[0_3px_0_0_#080D17,0_4px_0_1px_#364C72]">
            <button
              onClick={() => { setMode('photo'); router.replace('/editor'); }}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all cursor-pointer
                ${effectiveMode === 'photo'
                  ? 'bg-[#1B2A4A] text-[#F5F3EE] shadow-[0_2px_0_0_#0E1726] dark:bg-[#FAF8F5] dark:text-[#0B101B] dark:shadow-[0_2px_0_0_#9E9689,0_3px_0_1px_#FAF8F5] font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
                }
              `}
            >
              <Image className="w-3.5 h-3.5" />
              Photo Mode
            </button>
            <button
              onClick={() => { setMode('id-card'); router.replace('/editor?mode=id-card'); }}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all cursor-pointer
                ${effectiveMode === 'id-card'
                  ? 'bg-[#1B2A4A] text-[#F5F3EE] shadow-[0_2px_0_0_#0E1726] dark:bg-[#FAF8F5] dark:text-[#0B101B] dark:shadow-[0_2px_0_0_#9E9689,0_3px_0_1px_#FAF8F5] font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
                }
              `}
            >
              <CreditCard className="w-3.5 h-3.5" />
              ID Card & PVC
            </button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Step indicator (active in Photo Mode) */}
          {effectiveMode === 'photo' && <StepIndicator />}

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* UrStudio Pro Upgrade / Active 3D Badge */}
            {!isClientPro ? (
              <Button
                variant="3d-gold"
                size="sm"
                onClick={() => openUpgradeModal()}
                className="text-xs h-8 gap-1.5 font-bold"
                title="Upgrade to UrStudio Pro for watermark-free prints, shop branding & multi-customer layouts"
              >
                <Sparkles className="w-3.5 h-3.5 text-current" />
                <span>Upgrade to Pro</span>
              </Button>
            ) : (
              <Button
                variant="3d"
                size="sm"
                onClick={() => openUpgradeModal()}
                className="text-xs h-8 gap-1.5 font-bold border-[#4C7A5A] text-[#4C7A5A] shadow-[0_4px_0_0_#33533D] dark:border-[#5FB47B] dark:text-[#8CEAB0] dark:shadow-[0_4px_0_0_#1E3B28,0_5px_0_1px_#5FB47B]"
                title="Pro License Active — Click to manage license or shop branding"
              >
                <Crown className="w-3.5 h-3.5 text-[#C89B4A]" />
                <span>Pro Active</span>
              </Button>
            )}

            <Button
              variant="3d-terracotta"
              size="sm"
              onClick={() => setIsFormExportOpen(true)}
              className="text-xs h-8 font-bold gap-1.5"
              title="Export photo or signature for SSC, UPSC, IBPS, NTA & Govt forms (<20KB / <50KB)"
            >
              <FileCheck2 className="w-3.5 h-3.5 mr-1" />
              <span>Govt Form Exporter</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-bold ml-0.5">
                KB
              </span>
            </Button>

            <Link href="/templates">
              <Button variant="ghost" size="sm" className="text-xs h-8">
                <Bookmark className="w-3.5 h-3.5 mr-1" />
                Templates
              </Button>
            </Link>

            {effectiveMode === 'photo' && (
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={undo}
                        disabled={undoStack.length === 0}
                      />
                    }
                  >
                    <Undo2 className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={redo}
                        disabled={redoStack.length === 0}
                      />
                    }
                  >
                    <Redo2 className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                <Button
                  variant="3d-terracotta"
                  size="sm"
                  onClick={() => setStep('preview')}
                  disabled={!croppedImageUrl}
                  className="h-8 px-3.5 text-xs font-bold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Sheet
                </Button>
              </>
            )}
          </div>
        </header>
        
        {/* Active Template Official Guidelines Strip */}
        {activeDoc && (
          <div className="bg-card/70 border-b border-border/80 px-4 py-1.5 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{activeDoc.name}</span>
              <span className="text-muted-foreground">({activeDoc.width} × {activeDoc.height} mm)</span>
            </div>
            {activeDoc.guidelineBadges && activeDoc.guidelineBadges.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeDoc.guidelineBadges.map((badge, i) => (
                  <span
                    key={i}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      badge.includes('White BG')
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : badge.includes('Blue BG')
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : badge.includes('Face')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted border border-border text-muted-foreground'
                    }`}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====== Main Content Area ====== */}
        {effectiveMode === 'id-card' ? (
          /* Dedicated ID Card & PVC Printing Mode */
          <IDCardMode />
        ) : (
          /* Standard Photo Printing Mode (Upload -> Crop -> Layout -> Preview) */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar — Templates & Upload */}
            <aside className="w-64 border-r border-border flex flex-col bg-card overflow-hidden flex-shrink-0">
              {images.length === 0 ? (
                <>
                  <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Select Template
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TemplateSelector />
                  </div>
                </>
              ) : step === 'upload' ? (
                <>
                  <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Uploaded Files ({images.length})
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ImageUploader onOpenGovtForm={() => setIsFormExportOpen(true)} />
                  </div>
                </>
              ) : step === 'crop' ? (
                <>
                  <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Select Template
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TemplateSelector />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Paper & Layout
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <PaperSelector />
                  </div>
                </>
              )}
            </aside>

            {/* Center Canvas */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {images.length === 0 ? (
                <div className="flex-1 flex flex-col p-6 bg-muted/10 overflow-auto">
                  <ImageUploader onOpenGovtForm={() => setIsFormExportOpen(true)} />
                </div>
              ) : step === 'upload' ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-border bg-card/40 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Review Uploaded Photo / Document</h2>
                      <p className="text-xs text-muted-foreground">
                        Select an image or PDF page from the left sidebar, then proceed to cropping
                      </p>
                    </div>
                    <Button
                      onClick={() => setStep('crop')}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium"
                    >
                      Continue to Crop
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                  {/* Show selected image preview */}
                  {images[selectedImageIndex] && (
                    <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
                      <div className="relative max-w-xl max-h-full flex items-center justify-center">
                        <img
                          src={images[selectedImageIndex].objectUrl}
                          alt="Selected"
                          className="max-w-full max-h-full object-contain rounded-xl shadow-xl border border-border"
                          style={{ maxHeight: 'calc(100vh - 280px)' }}
                        />
                        {images[selectedImageIndex].isPdf && (
                          <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-md font-mono font-medium shadow">
                            PDF Page {images[selectedImageIndex].pdfPageNumber || 1}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : step === 'crop' ? (
                <ImageEditor />
              ) : step === 'layout' ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-3 flex items-center justify-between border-b border-border">
                    <h3 className="text-sm font-medium">Layout Preview</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStep('crop')}
                      >
                        ← Re-crop
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setStep('preview')}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-orange-500/20 font-medium text-xs"
                      >
                        Preview & Print →
                      </Button>
                    </div>
                  </div>
                  <LayoutPreview />
                </div>
              ) : null}
            </main>

            {/* Right Sidebar — Image list (when in layout/crop step) */}
            {images.length > 0 && (step === 'upload' || step === 'layout') && (
              <aside className="w-56 border-l border-border bg-card overflow-hidden flex-shrink-0">
                <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Images ({images.length})
                </div>
                <ImageUploader onOpenGovtForm={() => setIsFormExportOpen(true)} />
              </aside>
            )}
          </div>
        )}
        {/* Online Government Form (Photo & Signature) Exporter Dialog */}
        <DigitalFormExportDialog
          isOpen={isFormExportOpen}
          onClose={() => setIsFormExportOpen(false)}
          sourceImageUrl={croppedImageUrl || images[selectedImageIndex]?.objectUrl || null}
        />
        {/* Offline License & Pro Upgrade Dialog */}
        <UpgradeModal />
      </div>
    </TooltipProvider>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-muted-foreground">Loading Studio...</div>}>
      <EditorContent />
    </Suspense>
  );
}
