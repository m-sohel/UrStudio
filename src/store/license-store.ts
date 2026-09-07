'use client';

/**
 * License Store
 * 
 * Zustand store for tracking offline license status, shop branding configuration,
 * and freemium upgrade modal state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type LicenseTier,
  type ShopBrandingConfig,
  DEFAULT_SHOP_BRANDING,
  verifyOfflineLicenseKey,
} from '@/lib/license-engine';

interface LicenseState {
  isPro: boolean;
  tier: LicenseTier;
  licenseKey: string | null;
  activatedAt: number | null;
  expiresAt: number | null;
  singlePassCount: number;
  shopBranding: ShopBrandingConfig;

  // Upgrade Modal UI state
  isUpgradeModalOpen: boolean;
  modalHighlightFeature: string | null;

  // Actions
  activateLicense: (key: string) => { success: boolean; message: string };
  activateSinglePass: (count?: number) => void;
  consumeSinglePass: () => boolean;
  updateShopBranding: (branding: Partial<ShopBrandingConfig>) => void;
  deactivateLicense: () => void;
  openUpgradeModal: (featureHint?: string) => void;
  closeUpgradeModal: () => void;
  checkExpiration: () => void;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      isPro: false,
      tier: 'free',
      licenseKey: null,
      activatedAt: null,
      expiresAt: null,
      singlePassCount: 0,
      shopBranding: DEFAULT_SHOP_BRANDING,

      isUpgradeModalOpen: false,
      modalHighlightFeature: null,

      activateLicense: (key: string) => {
        const result = verifyOfflineLicenseKey(key);

        if (result.valid) {
          if (result.tier === 'single_pass') {
            set((state) => ({
              singlePassCount: state.singlePassCount + 1,
              isPro: true,
              tier: 'single_pass',
              licenseKey: key.trim().toUpperCase(),
              activatedAt: Date.now(),
              expiresAt: null,
            }));
          } else {
            set({
              isPro: true,
              tier: result.tier,
              licenseKey: key.trim().toUpperCase(),
              activatedAt: Date.now(),
              expiresAt: result.expiresAt,
            });
          }

          return { success: true, message: result.message };
        }

        return { success: false, message: result.message };
      },

      activateSinglePass: (count = 1) => {
        set((state) => ({
          singlePassCount: state.singlePassCount + count,
          isPro: true,
          tier: 'single_pass',
          activatedAt: Date.now(),
        }));
      },

      consumeSinglePass: () => {
        const state = get();
        if (state.tier === 'lifetime' || state.tier === 'annual') {
          return true; // Unlimited exports
        }

        if (state.singlePassCount > 0) {
          const newCount = state.singlePassCount - 1;
          set({
            singlePassCount: newCount,
            isPro: newCount > 0,
            tier: newCount > 0 ? 'single_pass' : 'free',
          });
          return true;
        }

        return false;
      },

      updateShopBranding: (branding) => {
        set((state) => ({
          shopBranding: {
            ...state.shopBranding,
            ...branding,
          },
        }));
      },

      deactivateLicense: () => {
        set({
          isPro: false,
          tier: 'free',
          licenseKey: null,
          activatedAt: null,
          expiresAt: null,
          singlePassCount: 0,
        });
      },

      openUpgradeModal: (featureHint) => {
        set({
          isUpgradeModalOpen: true,
          modalHighlightFeature: featureHint || null,
        });
      },

      closeUpgradeModal: () => {
        set({
          isUpgradeModalOpen: false,
          modalHighlightFeature: null,
        });
      },

      checkExpiration: () => {
        const state = get();
        if (state.tier === 'annual' && state.expiresAt) {
          if (Date.now() > state.expiresAt) {
            set({
              isPro: false,
              tier: 'free',
              licenseKey: null,
            });
          }
        }
      },
    }),
    {
      name: 'urstudio-license',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        // In-memory fallback for SSR and test execution
        const memoryStore = new Map<string, string>();
        return {
          getItem: (key: string) => memoryStore.get(key) || null,
          setItem: (key: string, value: string) => { memoryStore.set(key, value); },
          removeItem: (key: string) => { memoryStore.delete(key); },
          clear: () => { memoryStore.clear(); },
          key: (index: number) => Array.from(memoryStore.keys())[index] || null,
          get length() { return memoryStore.size; },
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.checkExpiration();
        }
      },
    }
  )
);
