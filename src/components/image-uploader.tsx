'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, Camera, Image as ImageIcon, X, Copy, FileText, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadImage, isSupportedImage, formatFileSize, generateThumbnail, loadImageElement } from '@/lib/image-processing';
import { isPdfFile, loadPdfPages, pdfPageToEditorImage } from '@/lib/pdf-processor';
import { useEditorStore, type EditorImage } from '@/store/editor-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PdfPasswordDialog } from '@/components/pdf-password-dialog';

export function ImageUploader() {
  const { addImages, images, removeImage, selectImage, selectedImageIndex, duplicateImage } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    fileName: string;
    resolve?: (pwd: string) => void;
    reject?: () => void;
  }>({ isOpen: false, fileName: '' });

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setIsLoading(true);
    setLoadingText('Processing uploaded files...');

    const validFiles = Array.from(files).filter(f => {
      if (!isSupportedImage(f) && !isPdfFile(f)) {
        setError(`Unsupported format: ${f.name}. Use JPG, PNG, WEBP, or PDF.`);
        return false;
      }
      if (f.size > 50 * 1024 * 1024) {
        setError(`File too large: ${f.name}. Maximum 50MB.`);
        return false;
      }
      return true;
    });

    try {
      const loadedImages: EditorImage[] = [];

      for (const file of validFiles) {
        if (isPdfFile(file)) {
          setLoadingText(`Rendering PDF at 300 DPI (${file.name})...`);
          const pages = await loadPdfPages(file, {
            dpi: 300,
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
            onProgress: (curr, total) => {
              setLoadingText(`Rendering PDF page ${curr}/${total}...`);
            }
          });

          for (const p of pages) {
            const editorImg = pdfPageToEditorImage(p, file);
            editorImg.isPdf = true;
            editorImg.pdfPageNumber = p.pageNumber;
            loadedImages.push(editorImg);
          }
        } else {
          setLoadingText(`Loading image (${file.name})...`);
          const info = await loadImage(file);
          const imgEl = await loadImageElement(info.objectUrl);
          const thumbnailUrl = generateThumbnail(imgEl, 200);
          loadedImages.push({ ...info, thumbnailUrl });
        }
      }

      if (loadedImages.length > 0) {
        addImages(loadedImages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsLoading(false);
    }
  }, [addImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/') || items[i].type === 'application/pdf') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) processFiles(files);
    };
    input.click();
  }, [processFiles]);

  return (
    <div className="flex flex-col h-full" onPaste={handlePaste}>
      {/* Upload Zone */}
      {images.length === 0 ? (
        <div
          className={`
            flex-1 flex flex-col items-center justify-center
            border-2 border-dashed rounded-xl p-8 m-4
            transition-all duration-200 cursor-pointer
            ${isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop images or PDF here' : 'Upload Photos or PDF'}
          </h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Drag & drop images or PDFs here, click to browse, or paste from clipboard
          </p>
          <p className="text-muted-foreground/70 text-xs mt-2 text-center">
            Supports JPG, PNG, WEBP & PDF (e-Aadhaar, PAN, Documents) • Max 50MB
          </p>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <FileImage className="w-4 h-4 mr-2" />
              Browse Files
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCameraCapture();
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
          </div>

          {isLoading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span>{loadingText}</span>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Add more button */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  {loadingText}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Photo / PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCameraCapture}
              disabled={isLoading}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          {/* Image & PDF Thumbnails */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg cursor-pointer
                    transition-colors group
                    ${index === selectedImageIndex
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                    }
                  `}
                  onClick={() => selectImage(index)}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                    <img
                      src={img.thumbnailUrl || img.objectUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    {img.isPdf && (
                      <Badge className="absolute bottom-0.5 right-0.5 text-[8px] px-1 py-0 bg-red-600 text-white font-mono">
                        P{img.pdfPageNumber || 1}
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{img.name}</p>
                      {img.isPdf && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-red-500 border-red-500/30 flex-shrink-0">
                          PDF
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {img.width} × {img.height} px
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(img.size)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateImage(index); }}
                      className="p-1 rounded hover:bg-muted"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                      className="p-1 rounded hover:bg-destructive/10"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Drop zone overlay */}
          {isDragging && (
            <div
              className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center z-10"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="text-primary font-medium">Drop photos or PDF here</p>
            </div>
          )}

          {error && (
            <div className="p-3 border-t border-border">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <PdfPasswordDialog
        isOpen={passwordPrompt.isOpen}
        fileName={passwordPrompt.fileName}
        onUnlock={(pwd) => passwordPrompt.resolve?.(pwd)}
        onCancel={() => passwordPrompt.reject?.()}
      />
    </div>
  );
}
