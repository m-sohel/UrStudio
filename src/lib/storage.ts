/**
 * Local Storage Abstraction
 * 
 * Uses IndexedDB (via idb-keyval) for large data (projects, images)
 * and localStorage for small settings.
 * 
 * Includes cascading orphan cleanup and cybercafé privacy wipe utilities.
 */

import { get, set, del, keys, clear } from 'idb-keyval';

// ============================================================
// Storage Keys
// ============================================================

const STORAGE_KEYS = {
  CUSTOM_TEMPLATES: 'cybercafe-custom-templates',
  CUSTOM_ID_TEMPLATES: 'cybercafe-custom-id-templates',
  SETTINGS: 'cybercafe-settings',
  RECENT_PROJECTS: 'cybercafe-recent-projects',
  CUSTOM_PAPERS: 'cybercafe-custom-papers',
} as const;

// ============================================================
// Template Storage
// ============================================================

export async function saveCustomTemplates(templates: unknown[]): Promise<void> {
  await set(STORAGE_KEYS.CUSTOM_TEMPLATES, templates);
}

export async function loadCustomTemplates<T>(): Promise<T[]> {
  const data = await get(STORAGE_KEYS.CUSTOM_TEMPLATES);
  return (data as T[]) || [];
}

export async function saveCustomIDTemplates(templates: unknown[]): Promise<void> {
  await set(STORAGE_KEYS.CUSTOM_ID_TEMPLATES, templates);
}

export async function loadCustomIDTemplates<T>(): Promise<T[]> {
  const data = await get(STORAGE_KEYS.CUSTOM_ID_TEMPLATES);
  return (data as T[]) || [];
}

// ============================================================
// Project Storage with Orphan Cascade Purge
// ============================================================

export interface StoredProject {
  id: string;
  name: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  paperId?: string;
  orientation?: 'portrait' | 'landscape';
  copies?: number;
  /** Serialized crop data */
  cropData?: string;
  /** Image stored as data URL or blob */
  imageData?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export async function saveProject(project: StoredProject): Promise<void> {
  await set(`project-${project.id}`, project);
  
  // Update recent projects list
  const recent = await loadRecentProjects();
  const filtered = recent.filter(p => p.id !== project.id);
  filtered.unshift({
    id: project.id,
    name: project.name,
    customerName: project.customerName,
    updatedAt: project.updatedAt,
  });

  // Keep only last 20 projects, cascade delete dropped project records
  const kept = filtered.slice(0, 20);
  const dropped = filtered.slice(20);
  for (const d of dropped) {
    await del(`project-${d.id}`);
  }

  await set(STORAGE_KEYS.RECENT_PROJECTS, kept);
}

export async function loadProject(id: string): Promise<StoredProject | null> {
  const data = await get(`project-${id}`);
  return (data as StoredProject) || null;
}

export async function deleteProject(id: string): Promise<void> {
  await del(`project-${id}`);
  
  const recent = await loadRecentProjects();
  await set(
    STORAGE_KEYS.RECENT_PROJECTS,
    recent.filter(p => p.id !== id)
  );
}

export interface RecentProject {
  id: string;
  name: string;
  customerName?: string;
  updatedAt: string;
}

export async function loadRecentProjects(): Promise<RecentProject[]> {
  const data = await get(STORAGE_KEYS.RECENT_PROJECTS);
  return (data as RecentProject[]) || [];
}

// ============================================================
// Settings Storage
// ============================================================

export function saveSettings(settings: Record<string, unknown>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    console.warn('Failed to save settings to localStorage');
  }
}

export function loadSettings<T>(): T | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ============================================================
// Custom Paper Storage
// ============================================================

export async function saveCustomPapers(papers: unknown[]): Promise<void> {
  await set(STORAGE_KEYS.CUSTOM_PAPERS, papers);
}

export async function loadCustomPapers<T>(): Promise<T[]> {
  const data = await get(STORAGE_KEYS.CUSTOM_PAPERS);
  return (data as T[]) || [];
}

// ============================================================
// Storage Health & Privacy Purge
// ============================================================

export interface StorageHealth {
  projectCount: number;
  templateCount: number;
  totalKeys: number;
  estimatedBytes: number;
}

export async function getStorageHealth(): Promise<StorageHealth> {
  const allKeys = await keys();
  let projectCount = 0;

  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith('project-')) {
      projectCount++;
    }
  }

  const customTemplates = await loadCustomTemplates();
  const customIdTemplates = await loadCustomIDTemplates();

  let estimatedBytes = 0;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      estimatedBytes = estimate.usage || 0;
    } catch {
      estimatedBytes = 0;
    }
  }

  return {
    projectCount,
    templateCount: customTemplates.length + customIdTemplates.length,
    totalKeys: allKeys.length,
    estimatedBytes,
  };
}

/**
 * Privacy Wipe: Purges all customer job records and cached images from IndexedDB,
 * while preserving user-defined templates.
 */
export async function purgeAllCustomerData(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith('project-')) {
      await del(key);
    }
  }
  await del(STORAGE_KEYS.RECENT_PROJECTS);
}

export async function clearAllData(): Promise<void> {
  await clear();
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

export async function clearProjects(): Promise<void> {
  await purgeAllCustomerData();
}

export async function clearTemplates(): Promise<void> {
  await del(STORAGE_KEYS.CUSTOM_TEMPLATES);
  await del(STORAGE_KEYS.CUSTOM_ID_TEMPLATES);
}
