'use client';

/**
 * Template Store
 * 
 * Manages custom user templates with IndexedDB persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PhotoTemplate, IDCardTemplate } from '@/lib/templates';

interface TemplateState {
  customPhotoTemplates: PhotoTemplate[];
  customIDCardTemplates: IDCardTemplate[];
  
  addPhotoTemplate: (template: PhotoTemplate) => void;
  updatePhotoTemplate: (id: string, updates: Partial<PhotoTemplate>) => void;
  deletePhotoTemplate: (id: string) => void;
  
  addIDCardTemplate: (template: IDCardTemplate) => void;
  updateIDCardTemplate: (id: string, updates: Partial<IDCardTemplate>) => void;
  deleteIDCardTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      customPhotoTemplates: [],
      customIDCardTemplates: [],

      addPhotoTemplate: (template) => set((state) => ({
        customPhotoTemplates: [...state.customPhotoTemplates, template],
      })),

      updatePhotoTemplate: (id, updates) => set((state) => ({
        customPhotoTemplates: state.customPhotoTemplates.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),

      deletePhotoTemplate: (id) => set((state) => ({
        customPhotoTemplates: state.customPhotoTemplates.filter(t => t.id !== id),
      })),

      addIDCardTemplate: (template) => set((state) => ({
        customIDCardTemplates: [...state.customIDCardTemplates, template],
      })),

      updateIDCardTemplate: (id, updates) => set((state) => ({
        customIDCardTemplates: state.customIDCardTemplates.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),

      deleteIDCardTemplate: (id) => set((state) => ({
        customIDCardTemplates: state.customIDCardTemplates.filter(t => t.id !== id),
      })),
    }),
    {
      name: 'cybercafe-templates',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
