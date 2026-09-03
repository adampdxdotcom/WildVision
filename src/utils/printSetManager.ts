/**
 * Print Set Manager Utility
 * Automatically discovers, preloads, and manages print sets from src/assets/sets/*\/*.{png,jpg,jpeg}
 */

import { useAppStore } from '../store/useAppStore';

// Discover all image files inside src/assets/sets using Vite's import.meta.glob
const setModules = import.meta.glob<{ default: string }>(
  '/src/assets/sets/**/*.{png,jpg,jpeg}',
  { eager: true }
);

export interface PrintSetItem {
  url: string;
  img?: HTMLImageElement;
}

/**
  * Formats a raw directory or file name into a human-readable Title Case string.
  * Replaces underscores and hyphens with spaces and capitalizes each word.
  */
export function formatSubfolderName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const setUrlsMap: Record<string, string[]> = {};
const setImageCache: Record<string, HTMLImageElement[]> = {};

// Group images by parent folder name (the set name) or filename if placed directly in sets
for (const [path, module] of Object.entries(setModules)) {
  const matchFolder = path.match(/\/sets\/([^\/]+)\//);
  const matchFile = path.match(/\/sets\/([^\/]+)\.(png|jpg|jpeg)$/i);
  let rawSetName = '';
  if (matchFolder) {
    rawSetName = matchFolder[1];
  } else if (matchFile) {
    rawSetName = matchFile[1];
  }

  const setName = formatSubfolderName(rawSetName);

  if (setName) {
    const url = typeof module === 'string' ? module : (module?.default || '');
    if (url) {
      if (!setUrlsMap[setName]) {
        setUrlsMap[setName] = [];
        setImageCache[setName] = [];
      }
      setUrlsMap[setName].push(url);

      // Preload and cache HTMLImageElement instances
      if (typeof window !== 'undefined') {
        const img = new Image();
        img.onload = () => {
          try {
            const state = useAppStore.getState();
            if (state && state.setIsCanvasDirty) {
              state.setIsCanvasDirty(true);
            }
          } catch (_) {}
        };
        img.src = url;
        setImageCache[setName].push(img);
      }
    }
  }
}

/**
 * Expose a getter to retrieve the array of available set names for the UI.
 */
export function getAvailableSetNames(): string[] {
  return Object.keys(setUrlsMap);
}

/**
 * Get all image URLs for a given set name.
 */
export function getSetUrls(setName: string): string[] {
  return setUrlsMap[setName] || [];
}

/**
 * Get preloaded HTMLImageElement instances for a set name.
 */
export function getSetImages(setName: string): HTMLImageElement[] {
  return setImageCache[setName] || [];
}

/**
 * Deterministic pseudo-random hash function accepting x and y coordinates.
 * Ensures adjacent coordinates resolve to different hash values.
 */
export function hash2DCoordinates(x: number, y: number): number {
  const ix = Math.floor(Math.abs(x) < 1000 ? Math.round(x) : x);
  const iy = Math.floor(Math.abs(y) < 1000 ? Math.round(y) : y);

  let h = (ix * 374761393 + iy * 668265263) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Selects and returns a specific image from a requested set array based on coordinates,
 * ensuring adjacent coordinates resolve to different indices to prevent identical neighboring prints.
 */
export function getPrintForLocation(setName: string, x: number, y: number): PrintSetItem | null {
  const formattedName = formatSubfolderName(setName);
  const urls = setUrlsMap[setName] || setUrlsMap[formattedName];
  if (!urls || urls.length === 0) {
    return null;
  }
  const images = setImageCache[setName] || setImageCache[formattedName];
  const hash = hash2DCoordinates(x, y);
  const index = hash % urls.length;

  return {
    url: urls[index],
    img: images ? images[index] : undefined,
  };
}
