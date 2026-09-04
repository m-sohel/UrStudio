'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Undo2, Redo2, Save, Printer, Eye, Home,
  Image, CreditCard, Layout, ChevronRight, Layers,
  Bookmark
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
import { useEditorStore } from '@/store/editor-store';
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
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <button
            onClick={() => setStep(s.id)}
            disabled={i > 0 && !steps[i - 1].done}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              transition-colors
              ${i === currentIdx
                ? 'bg-primary text-primary-foreground'
                : s.done
                  ? 'text-muted-foreground hover:bg-muted cursor-pointer'
                  : 'text-muted-foreground/40 cursor-not-allowed'
              }
            `}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
          {i < steps.length - 1 && (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
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

  const {
    step, setStep,
    images, selectedImageIndex,
    selectedTemplateId, setSelectedTemplate,
    croppedImageUrl,
    undo, redo, undoStack, redoStack,
    mode, setMode,
  } = useEditorStore();

  const effectiveMode = modeParam === 'id-card' || mode === 'id-card' ? 'id-card' : 'photo';

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
  }, [modeParam, templateParam, setMode, setSelectedTemplate]);

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
        <header className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-400 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Printer className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <span className="text-sm font-bold hidden sm:inline tracking-tight text-foreground">CyberCafe Studio</span>
          </Link>

          <Separator orientation="vertical" className="h-6" />

          {/* Mode Switcher: Photo Mode vs ID Card Mode */}
          <div className="flex items-center bg-card/60 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => { setMode('photo'); router.replace('/editor'); }}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                ${effectiveMode === 'photo'
                  ? 'bg-accent text-accent-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Image className="w-3.5 h-3.5 text-cyan-400" />
              Photo Mode
            </button>
            <button
              onClick={() => { setMode('id-card'); router.replace('/editor?mode=id-card'); }}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                ${effectiveMode === 'id-card'
                  ? 'bg-accent text-accent-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              ID Card & PVC
            </button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Step indicator (active in Photo Mode) */}
          {effectiveMode === 'photo' && <StepIndicator />}

          <div className="flex-1" />

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            <Link href="/templates">
              <Button variant="ghost" size="sm" className="text-xs">
                <Bookmark className="w-3.5 h-3.5 mr-1" />
                Templates
              </Button>
            </Link>

            {effectiveMode === 'photo' && (
              <>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={undo}
                      disabled={undoStack.length === 0}
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={redo}
                      disabled={redoStack.length === 0}
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('preview')}
                      disabled={!croppedImageUrl}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print Preview (Ctrl+P)</TooltipContent>
                </Tooltip>

                <Button
                  size="sm"
                  onClick={() => setStep('preview')}
                  disabled={!croppedImageUrl}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-orange-500/20 font-medium text-xs"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </>
            )}
          </div>
        </header>

        {/* ====== Main Content Area ====== */}
        {effectiveMode === 'id-card' ? (
          /* Dedicated ID Card & PVC Printing Mode */
          <IDCardMode />
        ) : (
          /* Standard Photo Printing Mode (Upload -> Crop -> Layout -> Preview) */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar — Templates & Upload */}
            <aside className="w-64 border-r border-border flex flex-col bg-card overflow-hidden flex-shrink-0">
              {step === 'upload' && images.length === 0 ? (
                <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  1. Upload Images
                </div>
              ) : step === 'upload' || step === 'crop' ? (
                <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Select Template
                </div>
              ) : (
                <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Paper & Layout
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                {step === 'upload' && images.length === 0 ? (
                  <ImageUploader />
                ) : step === 'upload' || step === 'crop' ? (
                  <TemplateSelector />
                ) : (
                  <PaperSelector />
                )}
              </div>
            </aside>

            {/* Center Canvas */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {step === 'upload' && images.length > 0 ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 text-center">
                    <h2 className="text-lg font-semibold mb-1">Select a Template</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose a photo or ID card template from the sidebar to continue
                    </p>
                  </div>
                  {/* Show selected image preview */}
                  {images[selectedImageIndex] && (
                    <div className="flex-1 flex items-center justify-center p-4">
                      <img
                        src={images[selectedImageIndex].objectUrl}
                        alt="Selected"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        style={{ maxHeight: 'calc(100vh - 250px)' }}
                      />
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
                <ImageUploader />
              </aside>
            )}
          </div>
        )}
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
