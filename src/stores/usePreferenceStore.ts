import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { PreferenceProfile } from '../types';
import { getPreference, storePreference } from '../utils/db-operations';
import { useImageStore } from './useImageStore';
import { useBoardStore } from './useBoardStore';

interface PreferenceStore {
  profiles: PreferenceProfile[];
  isLoaded: boolean;

  loadProfiles: (projectId: string) => Promise<void>;
  getProfile: (projectId: string) => PreferenceProfile | undefined;
  addApproval: (projectId: string, imageId: string) => Promise<void>;
  addRejection: (projectId: string, imageId: string, critique?: string) => Promise<void>;
  addCorrection: (projectId: string, correction: string) => Promise<void>;
  clearProfile: (projectId: string) => Promise<void>;
}

/** Extract style keywords from a prompt text */
function extractKeywords(text: string): string[] {
  if (!text || text.length < 10) return [];
  // Extract short descriptive phrases (2-4 words) that describe style/look
  const stylePatterns = [
    /\b(cinematic|documentary|editorial|minimalist|high[- ]contrast|desaturated|warm|cool|dramatic|atmospheric|natural|organic|raw|candid|polished|moody|vibrant|muted|dark|bright|soft|harsh|gritty|clean|filmic|analog|digital)\b/gi,
    /\b(shallow DOF|bokeh|tack sharp|handheld|steadicam|locked[- ]off|slow motion|time[- ]lapse|long exposure)\b/gi,
    /\b(golden hour|blue hour|overcast|hard light|soft light|backlit|rim light|practical lights|natural light)\b/gi,
  ];
  const found = new Set<string>();
  for (const pattern of stylePatterns) {
    const matches = text.match(pattern) || [];
    matches.forEach(m => found.add(m.toLowerCase().trim()));
  }
  return Array.from(found).slice(0, 8);
}

export const usePreferenceStore = create<PreferenceStore>((set, get) => ({
  profiles: [],
  isLoaded: false,

  loadProfiles: async (projectId) => {
    const profile = await getPreference(projectId);
    if (profile) {
      set((s) => ({
        profiles: [...s.profiles.filter(p => p.projectId !== projectId), profile],
        isLoaded: true,
      }));
    } else {
      set({ isLoaded: true });
    }
  },

  getProfile: (projectId) => {
    return get().profiles.find(p => p.projectId === projectId);
  },

  addApproval: async (projectId, imageId) => {
    // Extract keywords from associated prompt nodes
    const promptNodes = useBoardStore.getState().promptNodes.filter(p => p.imageId === imageId);
    const keywords: string[] = [];
    for (const node of promptNodes) {
      keywords.push(...extractKeywords(node.text));
    }
    // Also check image label
    const image = useImageStore.getState().images.find(i => i.id === imageId);
    if (image?.label) keywords.push(image.label);

    const existing = get().getProfile(projectId);
    const profile: PreferenceProfile = existing ?? {
      id: projectId,
      projectId,
      approvedStyles: [],
      rejectedStyles: [],
      userCorrections: [],
      updatedAt: Date.now(),
    };

    const newApproved = [...new Set([...profile.approvedStyles, ...keywords])].slice(0, 30);
    const updated: PreferenceProfile = { ...profile, approvedStyles: newApproved, updatedAt: Date.now() };

    await storePreference(updated);
    set((s) => ({
      profiles: [...s.profiles.filter(p => p.projectId !== projectId), updated],
    }));
  },

  addRejection: async (projectId, imageId, critique) => {
    const promptNodes = useBoardStore.getState().promptNodes.filter(p => p.imageId === imageId);
    const keywords: string[] = [];
    for (const node of promptNodes) {
      keywords.push(...extractKeywords(node.text));
    }

    const existing = get().getProfile(projectId);
    const profile: PreferenceProfile = existing ?? {
      id: projectId,
      projectId,
      approvedStyles: [],
      rejectedStyles: [],
      userCorrections: [],
      updatedAt: Date.now(),
    };

    const newRejected = [...new Set([...profile.rejectedStyles, ...keywords])].slice(0, 30);
    const newCorrections = critique
      ? [...profile.userCorrections, critique.trim()].slice(-10)
      : profile.userCorrections;

    const updated: PreferenceProfile = {
      ...profile,
      rejectedStyles: newRejected,
      userCorrections: newCorrections,
      updatedAt: Date.now(),
    };

    await storePreference(updated);
    set((s) => ({
      profiles: [...s.profiles.filter(p => p.projectId !== projectId), updated],
    }));
  },

  addCorrection: async (projectId, correction) => {
    if (!correction.trim()) return;
    const existing = get().getProfile(projectId);
    const profile: PreferenceProfile = existing ?? {
      id: projectId,
      projectId,
      approvedStyles: [],
      rejectedStyles: [],
      userCorrections: [],
      updatedAt: Date.now(),
    };

    const updated: PreferenceProfile = {
      ...profile,
      userCorrections: [...profile.userCorrections, correction.trim()].slice(-10),
      updatedAt: Date.now(),
    };

    await storePreference(updated);
    set((s) => ({
      profiles: [...s.profiles.filter(p => p.projectId !== projectId), updated],
    }));
  },

  clearProfile: async (projectId) => {
    const cleared: PreferenceProfile = {
      id: projectId,
      projectId,
      approvedStyles: [],
      rejectedStyles: [],
      userCorrections: [],
      updatedAt: Date.now(),
    };
    await storePreference(cleared);
    set((s) => ({
      profiles: [...s.profiles.filter(p => p.projectId !== projectId), cleared],
    }));
  },
}));

// Suppress unused import warning
void nanoid;
