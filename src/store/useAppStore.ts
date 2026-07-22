import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProjectSlice, createProjectSlice } from './slices/projectSlice';
import { DraftingSlice, createDraftingSlice } from './slices/draftingSlice';
import { MaterialSlice, createMaterialSlice } from './slices/materialSlice';
import { ThreeDEnvSlice, createThreeDEnvSlice } from './slices/threeDEnvSlice';
import { AiRenderSlice, createAiRenderSlice } from './slices/aiRenderSlice';
import { PatternBuilderSlice, createPatternBuilderSlice } from './slices/patternBuilderSlice';
import { IntegrationSlice, createIntegrationSlice } from './slices/integrationSlice';
import { CollaborationSlice, createCollaborationSlice } from './slices/collaborationSlice';
import { ViewMode } from '../types';

// Dynamic Vite Auto-Discovery of Material Textures
const texturesGlob = import.meta.glob<{ default: string }>('../assets/textures/*.png', { eager: true });
export interface MaterialTextureDef {
  id: string;
  label: string;
  url: string;
  realWorldWidth?: number;
}

export const availableMaterialTextures: MaterialTextureDef[] = Object.entries(texturesGlob).map(([filePath, module]) => {
  const filename = filePath.split('/').pop() || '';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  const label = nameWithoutExt
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const url = module.default;

  // Determine real-world scale metadata in physical inches
  let realWorldWidth = 24; // Default to 24 inches (e.g. for slate/stone)
  const lowerName = nameWithoutExt.toLowerCase();
  if (lowerName.includes('marble') || lowerName.includes('wood') || lowerName.includes('slab')) {
    realWorldWidth = 36; // set slate/stone textures to 24 inches, and large marble/wood slabs to 36 or 48 inches
  }

  return {
    id: nameWithoutExt,
    label,
    url,
    realWorldWidth,
  };
});

const textureImageCache: Record<string, HTMLImageElement> = {};
const pendingCallbacks: Record<string, Set<() => void>> = {};

const surfaceImageCache: Record<string, HTMLImageElement> = {};
const pendingSurfaceCallbacks: Record<string, Set<() => void>> = {};

export function getLoadedSurfaceImage(surfaceUrl: string, onLoad?: () => void): HTMLImageElement | null {
  if (!surfaceUrl) return null;
  
  const cachedImg = surfaceImageCache[surfaceUrl];
  if (cachedImg) {
    if (cachedImg.complete && cachedImg.naturalWidth > 0) {
      return cachedImg;
    }
    if (onLoad) {
      if (!pendingSurfaceCallbacks[surfaceUrl]) {
        pendingSurfaceCallbacks[surfaceUrl] = new Set();
      }
      pendingSurfaceCallbacks[surfaceUrl].add(onLoad);
    }
    return null;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  if (onLoad) {
    if (!pendingSurfaceCallbacks[surfaceUrl]) {
      pendingSurfaceCallbacks[surfaceUrl] = new Set();
    }
    pendingSurfaceCallbacks[surfaceUrl].add(onLoad);
  }

  img.onload = () => {
    if (pendingSurfaceCallbacks[surfaceUrl]) {
      pendingSurfaceCallbacks[surfaceUrl].forEach((cb) => cb());
      pendingSurfaceCallbacks[surfaceUrl].clear();
    }
  };

  img.onerror = () => {
    console.error('Failed to load custom surface image:', surfaceUrl);
    if (pendingSurfaceCallbacks[surfaceUrl]) {
      pendingSurfaceCallbacks[surfaceUrl].clear();
    }
  };

  img.src = surfaceUrl;
  surfaceImageCache[surfaceUrl] = img;
  
  return null;
}

export function getLoadedTextureImage(textureId: string, onLoad?: () => void): HTMLImageElement | null {
  if (!textureId || textureId === 'none') return null;
  
  const cachedImg = textureImageCache[textureId];
  if (cachedImg) {
    if (cachedImg.complete && cachedImg.naturalWidth > 0) {
      return cachedImg;
    }
    if (onLoad) {
      if (!pendingCallbacks[textureId]) {
        pendingCallbacks[textureId] = new Set();
      }
      pendingCallbacks[textureId].add(onLoad);
    }
    return null;
  }

  const texDef = availableMaterialTextures.find((t) => t.id === textureId);
  if (!texDef) return null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  if (onLoad) {
    pendingCallbacks[textureId] = new Set([onLoad]);
  } else {
    pendingCallbacks[textureId] = new Set();
  }

  const handleLoad = () => {
    const callbacks = pendingCallbacks[textureId];
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Error in texture onload callback:', err);
        }
      });
      delete pendingCallbacks[textureId];
    }
    img.removeEventListener('load', handleLoad);
    img.removeEventListener('error', handleError);
  };

  const handleError = () => {
    delete pendingCallbacks[textureId];
    img.removeEventListener('load', handleLoad);
    img.removeEventListener('error', handleError);
  };

  img.addEventListener('load', handleLoad);
  img.addEventListener('error', handleError);

  img.src = texDef.url;
  textureImageCache[textureId] = img;
  return null;
}

export interface AppState extends ProjectSlice, DraftingSlice, MaterialSlice, ThreeDEnvSlice, AiRenderSlice, PatternBuilderSlice, IntegrationSlice, CollaborationSlice {
  zoom3D: number;
  setZoom3D: (val: number | ((prev: number) => number)) => void;
  showSavePrompt: boolean;
  setShowSavePrompt: (val: boolean | ((prev: boolean) => boolean)) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  draftStitchNodeIndex: number | null;
  setDraftStitchNodeIndex: (val: number | null | ((prev: number | null) => number | null)) => void;
  anchoredRegionCenter: { x: number; y: number } | null;
  setAnchoredRegionCenter: (val: { x: number; y: number } | null | ((prev: { x: number; y: number } | null) => { x: number; y: number } | null)) => void;
  enableRealisticDepth: boolean;
  setEnableRealisticDepth: (val: boolean | ((prev: boolean) => boolean)) => void;
  materialTexture: string;
  setMaterialTexture: (val: string | ((prev: string) => string)) => void;
  isDrafting: boolean;
  setIsDrafting: (val: boolean | ((prev: boolean) => boolean)) => void;
  isAccountSettingsOpen: boolean;
  setIsAccountSettingsOpen: (open: boolean) => void;
  isAdminConsoleOpen: boolean;
  setIsAdminConsoleOpen: (open: boolean) => void;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  isSurfaceGalleryModalOpen: boolean;
  setIsSurfaceGalleryModalOpen: (open: boolean) => void;
  isImportLayoutModalOpen: boolean;
  setIsImportLayoutModalOpen: (open: boolean) => void;
  autoSavePatterns: boolean;
  setAutoSavePatterns: (val: boolean) => void;
}

function createUpdater<K extends keyof AppState>(
  set: (
    partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>),
    replace?: boolean
  ) => void,
  key: K
) {
  return (updater: AppState[K] | ((prev: AppState[K]) => AppState[K])) => {
    set((state) => ({
      [key]: typeof updater === 'function' ? (updater as (prev: AppState[K]) => AppState[K])(state[key]) : updater,
    } as unknown as Partial<AppState>));
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get, store) => ({
      ...createProjectSlice(set, get, store),
      ...createDraftingSlice(set, get, store),
      ...createMaterialSlice(set, get, store),
      ...createThreeDEnvSlice(set, get, store),
      ...createAiRenderSlice(set, get, store),
      ...createPatternBuilderSlice(set, get, store),
      ...createIntegrationSlice(set, get, store),
      ...createCollaborationSlice(set, get, store),

      zoom3D: 1.0,
      setZoom3D: createUpdater(set, 'zoom3D'),
      showSavePrompt: false,
      setShowSavePrompt: createUpdater(set, 'showSavePrompt'),

      viewMode: '2d',
      setViewMode: (mode) => set({ viewMode: mode }),

      draftStitchNodeIndex: null,
      setDraftStitchNodeIndex: createUpdater(set, 'draftStitchNodeIndex'),
      anchoredRegionCenter: null,
      setAnchoredRegionCenter: createUpdater(set, 'anchoredRegionCenter'),
      enableRealisticDepth: true,
      setEnableRealisticDepth: createUpdater(set, 'enableRealisticDepth'),
      materialTexture: 'none',
      setMaterialTexture: (updater) => set((state: any) => {
        const nextVal = typeof updater === 'function' ? updater(state.materialTexture) : updater;
        const nextDisable = nextVal !== 'none' ? true : state.disableColorWithTexture;
        return {
          materialTexture: nextVal,
          disableColorWithTexture: nextDisable
        };
      }),
      isDrafting: false,
      setIsDrafting: createUpdater(set, 'isDrafting'),
      isAccountSettingsOpen: false,
      setIsAccountSettingsOpen: (open) => set({ isAccountSettingsOpen: open }),
      isAdminConsoleOpen: false,
      setIsAdminConsoleOpen: (open) => set((state: any) => {
        const updates: any = { isAdminConsoleOpen: open };
        if (open && state.viewMode === 'pattern_studio') {
          updates.viewMode = '2d';
        }
        return updates;
      }),
      isUpgradeModalOpen: false,
      setIsUpgradeModalOpen: (open) => set({ isUpgradeModalOpen: open }),
      isSurfaceGalleryModalOpen: false,
      setIsSurfaceGalleryModalOpen: (open) => set({ isSurfaceGalleryModalOpen: open }),
      isImportLayoutModalOpen: false,
      setIsImportLayoutModalOpen: (open) => set({ isImportLayoutModalOpen: open }),
      autoSavePatterns: false,
      setAutoSavePatterns: (val) => set({ autoSavePatterns: val }),
    }),
    {
      name: 'wildvision-session-state',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        zoom3D: state.zoom3D,
        viewMode: state.viewMode,
        enableRealisticDepth: state.enableRealisticDepth,
        materialTexture: state.materialTexture,
        disableColorWithTexture: state.disableColorWithTexture,
        isAccountSettingsOpen: state.isAccountSettingsOpen,
        isAdminConsoleOpen: state.isAdminConsoleOpen,
        isUpgradeModalOpen: state.isUpgradeModalOpen,
        autoSavePatterns: state.autoSavePatterns,
      }),
    }
  )
);
