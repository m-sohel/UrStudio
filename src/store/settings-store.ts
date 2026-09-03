'use client';

/**
 * Settings Store
 * 
 * Persisted application settings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  // Printing defaults
  defaultPaperId: string;
  defaultOrientation: 'portrait' | 'landscape';
  defaultMargin: number;
  defaultDPI: number;
  
  // Photo defaults
  defaultPhotoTemplateId: string;
  defaultSpacing: number;
  defaultCopies: number;
  
  // Application
  theme: Theme;
  autosave: boolean;
  recentProjectCount: number;
  
  // Actions
  updateSettings: (settings: Partial<SettingsState>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  defaultPaperId: 'a4',
  defaultOrientation: 'portrait' as const,
  defaultMargin: 5,
  defaultDPI: 300,
  defaultPhotoTemplateId: 'passport-photo-india',
  defaultSpacing: 3,
  defaultCopies: 8,
  theme: 'dark' as Theme,
  autosave: true,
  recentProjectCount: 20,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'cybercafe-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
