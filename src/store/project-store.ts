'use client';

/**
 * Project Store
 * 
 * Manages project save/load with IndexedDB via idb-keyval.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RecentProject } from '@/lib/storage';

interface ProjectState {
  // Active project
  activeProjectId: string | null;
  activeProjectName: string;
  customerName: string;
  
  // Recent projects (stored in zustand, synced with IndexedDB)
  recentProjects: RecentProject[];
  
  // Actions
  setActiveProject: (id: string | null, name: string, customer?: string) => void;
  addRecentProject: (project: RecentProject) => void;
  removeRecentProject: (id: string) => void;
  clearRecentProjects: () => void;
  setCustomerName: (name: string) => void;
  setProjectName: (name: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      activeProjectName: 'Untitled Project',
      customerName: '',
      recentProjects: [],

      setActiveProject: (id, name, customer) => set({
        activeProjectId: id,
        activeProjectName: name,
        customerName: customer || '',
      }),

      addRecentProject: (project) => set((state) => {
        const filtered = state.recentProjects.filter(p => p.id !== project.id);
        return {
          recentProjects: [project, ...filtered].slice(0, 20),
        };
      }),

      removeRecentProject: (id) => set((state) => ({
        recentProjects: state.recentProjects.filter(p => p.id !== id),
      })),

      clearRecentProjects: () => set({ recentProjects: [] }),

      setCustomerName: (name) => set({ customerName: name }),
      setProjectName: (name) => set({ activeProjectName: name }),
    }),
    {
      name: 'cybercafe-projects',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
