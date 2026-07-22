import { useAppStore } from '../store/useAppStore';
import { ColorCard } from '../types';

export function ensureColorCard(color: string | ColorCard, indexOrId?: string | number): ColorCard {
  if (!color) {
    return {
      id: String(indexOrId ?? Math.random()),
      hex: '#ffffff',
      pattern: null
    };
  }
  if (typeof color === 'string') {
    return {
      id: String(indexOrId ?? color),
      hex: color,
      pattern: null
    };
  }
  return color;
}

interface CachedPattern {
  uploadedSvgText: string;
  tileColor: string;
  accentColor: string;
  blobUrl: string;
  image: HTMLImageElement;
}

// Map key: `${tileColor}_${accentColor}`
const patternCache = new Map<string, CachedPattern>();

export function clearPatternCache() {
  for (const cached of patternCache.values()) {
    URL.revokeObjectURL(cached.blobUrl);
  }
  patternCache.clear();
}

function isWhite(val: string): boolean {
  if (!val) return false;
  const cleaned = val.trim().toLowerCase().replace(/\s+/g, '');
  return (
    cleaned === '#ffffff' ||
    cleaned === '#fff' ||
    cleaned === 'white' ||
    cleaned === 'rgb(255,255,255)' ||
    cleaned === 'rgba(255,255,255,1)' ||
    cleaned === 'hsl(0,0%,100%)' ||
    cleaned === 'hsl(0,100%,100%)'
  );
}

function isBlack(val: string): boolean {
  if (!val) return false;
  const cleaned = val.trim().toLowerCase().replace(/\s+/g, '');
  return (
    cleaned === '#000000' ||
    cleaned === '#000' ||
    cleaned === 'black' ||
    cleaned === 'rgb(0,0,0)' ||
    cleaned === 'rgba(0,0,0,1)' ||
    cleaned === 'hsl(0,0%,0%)' ||
    cleaned === 'hsl(0,100%,0%)'
  );
}

export function getSwappedSvgText(svgText: string, tileColor: string, accentColor: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('DOMParser failed to parse SVG:', parserError.textContent);
      return svgText;
    }

    const shapes = doc.querySelectorAll('path, rect, circle, polygon, ellipse, line, polyline');
    
    shapes.forEach((el) => {
      const fillAttr = el.getAttribute('fill');
      const strokeAttr = el.getAttribute('stroke');
      const styleAttr = el.getAttribute('style') || '';

      const hasFillInStyle = /\bfill\s*:/i.test(styleAttr);
      const hasStrokeInStyle = /\bstroke\s*:/i.test(styleAttr);

      // 1. Process style attribute inline declarations if any
      if (styleAttr) {
        const parts = styleAttr.split(';').map(p => p.trim()).filter(Boolean);
        const updatedStyleParts = parts.map(part => {
          const colIndex = part.indexOf(':');
          if (colIndex !== -1) {
            const prop = part.substring(0, colIndex).trim().toLowerCase();
            let val = part.substring(colIndex + 1).trim();
            if (prop === 'fill') {
              if (isWhite(val)) {
                val = tileColor;
              } else if (isBlack(val)) {
                val = accentColor;
              }
              return `${prop}: ${val}`;
            }
            if (prop === 'stroke') {
              if (isWhite(val)) {
                val = tileColor;
              } else if (isBlack(val)) {
                val = accentColor;
              }
              return `${prop}: ${val}`;
            }
          }
          return part;
        });
        el.setAttribute('style', updatedStyleParts.join('; '));
      }

      // 2. Process presentation attributes
      if (fillAttr) {
        if (isWhite(fillAttr)) {
          el.setAttribute('fill', tileColor);
        } else if (isBlack(fillAttr)) {
          el.setAttribute('fill', accentColor);
        }
      } else if (!hasFillInStyle) {
        // No fill attribute and no fill in inline styles
        const tagName = el.tagName.toLowerCase();
        if (tagName !== 'line') {
          el.setAttribute('fill', accentColor);
        }
      }

      if (strokeAttr) {
        if (isWhite(strokeAttr)) {
          el.setAttribute('stroke', tileColor);
        } else if (isBlack(strokeAttr)) {
          el.setAttribute('stroke', accentColor);
        }
      }
    });

    return new XMLSerializer().serializeToString(doc);
  } catch (err) {
    console.error('Error during DOMParser SVG color swapping:', err);
    return svgText;
  }
}

export function getPatternImage(
  svgText: string | null,
  tileColor: string,
  accentColor: string,
  onImageLoaded?: () => void
): HTMLImageElement | null {
  if (!svgText) {
    if (patternCache.size > 0) {
      clearPatternCache();
    }
    return null;
  }

  const key = `${tileColor.toLowerCase()}_${accentColor.toLowerCase()}`;
  const existing = patternCache.get(key);

  if (existing && existing.uploadedSvgText === svgText) {
    return existing.image;
  }

  // If there's an existing one with different SVG text or colors, revoke it first
  if (existing) {
    URL.revokeObjectURL(existing.blobUrl);
    patternCache.delete(key);
  }

  const modifiedSvg = getSwappedSvgText(svgText, tileColor, accentColor);
  const blob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = blobUrl;
  
  if (onImageLoaded) {
    image.onload = () => {
      onImageLoaded();
    };
  }

  patternCache.set(key, {
    uploadedSvgText: svgText,
    tileColor,
    accentColor,
    blobUrl,
    image,
  });

  return image;
}

export function getPatternBlobUrl(
  svgText: string | null,
  tileColor: string,
  accentColor: string
): string | null {
  if (!svgText) return null;
  
  const key = `${tileColor.toLowerCase()}_${accentColor.toLowerCase()}`;
  const existing = patternCache.get(key);

  if (existing && existing.uploadedSvgText === svgText) {
    return existing.blobUrl;
  }

  // Generate a Blob URL, cache it
  if (existing) {
    URL.revokeObjectURL(existing.blobUrl);
    patternCache.delete(key);
  }

  const modifiedSvg = getSwappedSvgText(svgText, tileColor, accentColor);
  const blob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = blobUrl;

  patternCache.set(key, {
    uploadedSvgText: svgText,
    tileColor,
    accentColor,
    blobUrl,
    image,
  });

  return blobUrl;
}

export function dispatchForceCanvasRedraw() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
  }
}

// Key is `key` (id + hex + accent + len) to allow peaceful coexistence of different colored tiles of the same card in the same frame
const cardBlobCache = new Map<string, { blobUrl: string; image: HTMLImageElement; lastUsed: number; cardId: string }>();

export function getCardPatternImageAndBlob(
  card: ColorCard,
  onImageLoaded?: () => void
): { blobUrl: string | null; image: HTMLImageElement | null } {
  if (!card.pattern || !card.pattern.svgText) {
    // If the card no longer has a pattern, we don't clear everything right away since other tiles might still use it,
    // but we can let them be evicted naturally.
    return { blobUrl: null, image: null };
  }

  const { svgText, accentColor } = card.pattern;
  const hexColor = card.hex;

  const key = `${card.id}_${hexColor.toLowerCase()}_${accentColor.toLowerCase()}_${(svgText || '').length}`;
  const existing = cardBlobCache.get(key);

  if (existing) {
    existing.lastUsed = Date.now();
    return { blobUrl: existing.blobUrl, image: existing.image };
  }

  // Generate a brand new Blob URL for this combination
  const modifiedSvg = getSwappedSvgText(svgText, hexColor, accentColor);
  const blob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    if (onImageLoaded) {
      onImageLoaded();
    }
    dispatchForceCanvasRedraw();
  };
  image.src = blobUrl;

  cardBlobCache.set(key, {
    blobUrl,
    image,
    lastUsed: Date.now(),
    cardId: card.id,
  });

  // Limit size of card blob cache to 150 unique render keys to avoid leaks, while allowing plenty of color variations
  if (cardBlobCache.size > 150) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, val] of cardBlobCache.entries()) {
      if (val.lastUsed < oldestTime) {
        oldestTime = val.lastUsed;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const oldest = cardBlobCache.get(oldestKey);
      if (oldest) {
        URL.revokeObjectURL(oldest.blobUrl);
        cardBlobCache.delete(oldestKey);
      }
    }
  }

  return { blobUrl, image };
}

export function revokeCardBlob(cardId: string) {
  // Revoke all cached entries belonging to this cardId
  for (const [key, val] of Array.from(cardBlobCache.entries())) {
    if (val.cardId === cardId) {
      URL.revokeObjectURL(val.blobUrl);
      cardBlobCache.delete(key);
    }
  }
}


