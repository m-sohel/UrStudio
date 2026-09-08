'use client';

/**
 * Editor Store
 * 
 * Manages the main editor state: images, crop, adjustments, layout.
 * Uses Zustand for lightweight, hook-based state management.
 */

import { create } from 'zustand';
import type { ImageInfo, CropData, AdjustmentSettings } from '@/lib/image-processing';
import { DEFAULT_ADJUSTMENTS } from '@/lib/image-processing';
import type { PaperSettings, PhotoBorderSettings } from '@/lib/templates';
import { DEFAULT_PAPER_SETTINGS, DEFAULT_PHOTO_BORDER, getDefaultPaperSettings, getPhotoTemplate } from '@/lib/templates';
import type { LayoutResult } from '@/lib/layout-engine';
import { type ColorCalibrationSettings, DEFAULT_COLOR_CALIBRATION } from '@/lib/color-management';

export type EditorMode = 'photo' | 'id-card';
export type EditorStep = 'upload' | 'crop' | 'layout' | 'preview';

export interface EditorImage extends ImageInfo {
  thumbnailUrl: string;
  cropData?: CropData;
  croppedImageUrl?: string;
  isPdf?: boolean;
  pdfPageNumber?: number;
  copies?: number; // Target copies in mix-and-match
}

export interface IDCardState {
  frontImage?: EditorImage;
  backImage?: EditorImage;
  frontCroppedUrl?: string | null;
  backCroppedUrl?: string | null;
  activeSide: 'front' | 'back';
  arrangement: 'side-by-side' | 'stacked' | 'front-only' | 'back-only';
  frontBackGap: number;
  printType: 'sheet' | 'pvc-direct';
  pvcActiveSide: 'front' | 'back';
  showCuttingMarks: boolean;
}

interface UndoEntry {
  cropData?: CropData;
  adjustments: AdjustmentSettings;
  rotation: number;
}

interface EditorState {
  // Mode
  mode: EditorMode;
  step: EditorStep;
  
  // Images
  images: EditorImage[];
  selectedImageIndex: number;
  
  // Multi-Customer Mix & Match
  mixMatchMode: boolean;
  slotOverrides: Record<number, string>; // slot index -> imageId
  
  // Crop & adjustments
  cropData: CropData | null;
  adjustments: AdjustmentSettings;
  rotation: number;
  
  // Template
  selectedTemplateId: string | null;
  selectedTemplateType: 'photo' | 'id-card';
  
  // Paper & layout
  paperSettings: PaperSettings;
  copies: number;
  layoutResult: LayoutResult | null;
  
  // Photo Border Settings
  photoBorder: PhotoBorderSettings;
  
  // ID Card
  idCardState: IDCardState;
  
  // Processed output
  croppedImageUrl: string | null;
  
  // Color Calibration & CMYK Soft-Proof
  colorCalibration: ColorCalibrationSettings;

  // Undo/Redo
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  
  // Actions
  setMode: (mode: EditorMode) => void;
  setStep: (step: EditorStep) => void;
  setMixMatchMode: (enabled: boolean) => void;
  setImageCopies: (index: number, copies: number) => void;
  setSlotOverride: (slotIndex: number, imageId: string) => void;
  resetSlotOverrides: () => void;
  addImages: (images: EditorImage[]) => void;
  removeImage: (index: number) => void;
  selectImage: (index: number) => void;
  duplicateImage: (index: number) => void;
  setCropData: (data: CropData | null) => void;
  setAdjustments: (adjustments: Partial<AdjustmentSettings>) => void;
  setColorCalibration: (settings: Partial<ColorCalibrationSettings>) => void;
  resetColorCalibration: () => void;
  setRotation: (rotation: number) => void;
  setSelectedTemplate: (id: string | null, type: 'photo' | 'id-card') => void;
  setPaperSettings: (settings: Partial<PaperSettings>) => void;
  setPhotoBorder: (border: Partial<PhotoBorderSettings>) => void;
  setCopies: (copies: number) => void;
  setLayoutResult: (result: LayoutResult | null) => void;
  setCroppedImageUrl: (url: string | null) => void;
  setIDCardState: (state: Partial<IDCardState>) => void;
  resetAdjustments: () => void;
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  mode: 'photo',
  step: 'upload',
  images: [],
  selectedImageIndex: 0,
  mixMatchMode: false,
  slotOverrides: {},
  cropData: null,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  rotation: 0,
  selectedTemplateId: null,
  selectedTemplateType: 'photo',
  paperSettings: { ...DEFAULT_PAPER_SETTINGS },
  copies: 8,
  layoutResult: null,
  photoBorder: { ...DEFAULT_PHOTO_BORDER },
  idCardState: {
    activeSide: 'front',
    arrangement: 'stacked',
    frontBackGap: 5,
    printType: 'sheet',
    pvcActiveSide: 'front',
    showCuttingMarks: true,
  },
  croppedImageUrl: null,
  colorCalibration: { ...DEFAULT_COLOR_CALIBRATION },
  undoStack: [],
  redoStack: [],

  // Actions
  setMode: (mode) => set({ mode }),
  setStep: (step) => set({ step }),
  setMixMatchMode: (enabled) => set({ mixMatchMode: enabled }),
  setImageCopies: (index, copies) => set((state) => {
    const newImages = [...state.images];
    if (newImages[index]) {
      newImages[index] = { ...newImages[index], copies: Math.max(1, copies) };
    }
    return { images: newImages };
  }),
  setSlotOverride: (slotIndex, imageId) => set((state) => ({
    slotOverrides: { ...state.slotOverrides, [slotIndex]: imageId },
  })),
  resetSlotOverrides: () => set({ slotOverrides: {} }),
  setColorCalibration: (settings) => set((state) => ({
    colorCalibration: { ...state.colorCalibration, ...settings },
  })),
  resetColorCalibration: () => set({ colorCalibration: { ...DEFAULT_COLOR_CALIBRATION } }),
  
  addImages: (images) => set((state) => {
    const nextImages = [...state.images, ...images.map(img => ({ ...img, copies: img.copies || 4 }))];
    return {
      images: nextImages,
      mixMatchMode: nextImages.length > 1 ? true : state.mixMatchMode,
      selectedImageIndex: state.images.length === 0 ? 0 : state.selectedImageIndex,
    };
  }),
  
  removeImage: (index) => set((state) => {
    const newImages = state.images.filter((_, i) => i !== index);
    // Revoke object URL to free memory
    if (state.images[index]) {
      URL.revokeObjectURL(state.images[index].objectUrl);
    }
    return {
      images: newImages,
      mixMatchMode: newImages.length > 1 ? state.mixMatchMode : false,
      selectedImageIndex: Math.min(state.selectedImageIndex, Math.max(0, newImages.length - 1)),
    };
  }),
  
  selectImage: (index) => set({ selectedImageIndex: index }),
  
  duplicateImage: (index) => set((state) => {
    const img = state.images[index];
    if (!img) return state;
    const dupe: EditorImage = {
      ...img,
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    const newImages = [...state.images];
    newImages.splice(index + 1, 0, dupe);
    return { images: newImages };
  }),
  
  setCropData: (data) => set({ cropData: data }),
  
  setAdjustments: (adjustments) => set((state) => ({
    adjustments: { ...state.adjustments, ...adjustments },
  })),
  
  setRotation: (rotation) => set({ rotation }),
  
  setSelectedTemplate: (id, type) => {
    if (!id) {
      set({ selectedTemplateId: null, selectedTemplateType: type });
      return;
    }
    if (type === 'photo') {
      const tmpl = getPhotoTemplate(id);
      if (tmpl?.defaultPaperId === '4x6') {
        const isPhoto4x6 = tmpl.id === 'photo-4x6';
        set({
          selectedTemplateId: id,
          selectedTemplateType: type,
          paperSettings: {
            ...getDefaultPaperSettings('4x6'),
            orientation: isPhoto4x6 ? 'portrait' : 'landscape',
          },
          copies: tmpl.defaultCopies || (isPhoto4x6 ? 1 : 8),
        });
        return;
      }
    }
    set({ selectedTemplateId: id, selectedTemplateType: type });
  },
  
  setPaperSettings: (settings) => set((state) => ({
    paperSettings: { ...state.paperSettings, ...settings },
  })),
  
  setPhotoBorder: (border) => set((state) => ({
    photoBorder: { ...state.photoBorder, ...border },
  })),
  
  setCopies: (copies) => set({ copies: Math.max(1, copies) }),
  
  setLayoutResult: (result) => set({ layoutResult: result }),
  
  setCroppedImageUrl: (url) => set((state) => {
    const newImages = [...state.images];
    if (newImages[state.selectedImageIndex]) {
      newImages[state.selectedImageIndex] = {
        ...newImages[state.selectedImageIndex],
        croppedImageUrl: url || undefined,
        cropData: state.cropData || undefined,
      };
    }
    return {
      croppedImageUrl: url,
      images: newImages,
    };
  }),
  
  setIDCardState: (newState) => set((state) => ({
    idCardState: { ...state.idCardState, ...newState },
  })),
  
  resetAdjustments: () => set({ 
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    rotation: 0,
  }),
  
  pushUndo: () => set((state) => ({
    undoStack: [...state.undoStack, {
      cropData: state.cropData ? { ...state.cropData } : undefined,
      adjustments: { ...state.adjustments },
      rotation: state.rotation,
    }],
    redoStack: [],
  })),
  
  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state;
    const previous = state.undoStack[state.undoStack.length - 1];
    return {
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, {
        cropData: state.cropData ? { ...state.cropData } : undefined,
        adjustments: { ...state.adjustments },
        rotation: state.rotation,
      }],
      cropData: previous.cropData || null,
      adjustments: previous.adjustments,
      rotation: previous.rotation,
    };
  }),
  
  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const next = state.redoStack[state.redoStack.length - 1];
    return {
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, {
        cropData: state.cropData ? { ...state.cropData } : undefined,
        adjustments: { ...state.adjustments },
        rotation: state.rotation,
      }],
      cropData: next.cropData || null,
      adjustments: next.adjustments,
      rotation: next.rotation,
    };
  }),
  
  reset: () => {
    const state = get();
    // Clean up all active Blob/Object URLs to prevent tab memory leaks
    state.images.forEach(img => {
      if (img.objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(img.objectUrl);
      }
    });
    if (state.idCardState.frontImage?.objectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.idCardState.frontImage.objectUrl);
    }
    if (state.idCardState.backImage?.objectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.idCardState.backImage.objectUrl);
    }
    if (state.idCardState.frontCroppedUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.idCardState.frontCroppedUrl);
    }
    if (state.idCardState.backCroppedUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.idCardState.backCroppedUrl);
    }
    if (state.croppedImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.croppedImageUrl);
    }

    set({
      images: [],
      selectedImageIndex: 0,
      mixMatchMode: false,
      slotOverrides: {},
      cropData: null,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      rotation: 0,
      selectedTemplateId: null,
      layoutResult: null,
      croppedImageUrl: null,
      undoStack: [],
      redoStack: [],
      step: 'upload',
      idCardState: {
        activeSide: 'front',
        arrangement: 'stacked',
        frontBackGap: 5,
        printType: 'sheet',
        pvcActiveSide: 'front',
        showCuttingMarks: true,
      },
      colorCalibration: { ...DEFAULT_COLOR_CALIBRATION },
      photoBorder: { ...DEFAULT_PHOTO_BORDER },
    });
  },
}));
