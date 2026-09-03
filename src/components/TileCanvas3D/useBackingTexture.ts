import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { getCombinedWallBounds } from '../../utils/geometry';
import { defineCombinedWallPath } from '../TileCanvas/wallPainter';
import { Viewport } from '../TileCanvas/canvasUtils';

export function useBackingTexture() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const {
    wallWidth,
    wallHeight,
    wallExtensions,
    wallVertices,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    isDrafting
  } = useAppStore();

  // Dedicated cleanup effect to avoid memory leaks on unmount
  useEffect(() => {
    return () => {
      setTexture(prev => {
        if (prev) prev.dispose();
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (isDrafting) return;

    // Determine combined bounds
    const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);
    
    // Create offscreen high-res canvas (2048 is clean and sharp)
    const maxDim = 2048;
    const canvasScale = maxDim / Math.max(bounds.width, bounds.height || 1);
    const canvasWidth = bounds.width * canvasScale;
    const canvasHeight = bounds.height * canvasScale;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport setup for mapToCanvas mapping inside defineCombinedWallPath
    const viewport: Viewport = {
      cornerX: 0,
      cornerY: 0,
      renderW: canvasWidth,
      renderH: canvasHeight,
      scale: canvasScale,
      minX: bounds.minX,
      minY: bounds.minY,
    };

    // 0. Ensure the backing canvas is cleared to be fully transparent before anything is drawn
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Save context state for clipping mask
    ctx.save();

    // 1. Build and apply clipping path matching the wall's precise outer boundary shape
    defineCombinedWallPath(
      ctx,
      viewport,
      wallWidth,
      wallHeight,
      wallExtensions,
      wallBoundaryShape,
      wallArchHeight,
      wallActiveArches,
      wallArchDepth,
      0,
      wallVertices
    );
    ctx.clip();

    // Fill base cement board / drywall structural backing color (drywall light beige/gray) inside the clip
    ctx.fillStyle = '#e2dfd9';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Create the offscreen watermark pattern
    const patternCanvas = document.createElement('canvas');
    const pSize = 180; // Size of each repeating unit in the grid
    patternCanvas.width = pSize;
    patternCanvas.height = pSize;
    const pCtx = patternCanvas.getContext('2d');

    if (pCtx) {
      // Clear with transparency
      pCtx.clearRect(0, 0, pSize, pSize);

      pCtx.font = '900 13px system-ui, sans-serif';
      pCtx.fillStyle = 'rgba(100, 100, 100, 0.08)'; // Light, manufacturer-style faint watermark
      pCtx.textAlign = 'center';
      pCtx.textBaseline = 'middle';

      // Repeating staggered texture pattern
      // Sub-pattern at center (90, 90)
      pCtx.save();
      pCtx.translate(pSize / 2, pSize / 2);
      pCtx.rotate(-Math.PI / 4); // Slanted at 45 degrees
      pCtx.fillText('WildVision', 0, 0);
      pCtx.restore();

      // Sub-patterns at corners so it is staggered when tiled
      const corners = [
        [0, 0],
        [pSize, 0],
        [0, pSize],
        [pSize, pSize]
      ];
      corners.forEach(([cx, cy]) => {
        pCtx.save();
        pCtx.translate(cx, cy);
        pCtx.rotate(-Math.PI / 4);
        pCtx.fillText('WildVision', 0, 0);
        pCtx.restore();
      });
    }

    // 3. Tile the watermark across the backing canvas
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Restore context state to release the clip mask
    ctx.restore();

    // Create CanvasTexture with sRGB space for accurate brand rendering
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.colorSpace = THREE.SRGBColorSpace;
    newTexture.needsUpdate = true;

    setTexture(prev => {
      if (prev) prev.dispose();
      return newTexture;
    });
  }, [
    wallWidth,
    wallHeight,
    wallExtensions,
    wallVertices,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    isDrafting
  ]);

  return texture;
}
