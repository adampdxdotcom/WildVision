import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { getCombinedWallBounds } from '../../utils/geometry';
import { generateTiles } from '../../utils/generator';
import { drawMainTiles, drawSubAreas } from '../TileCanvas/painters';
import { defineCombinedWallPath } from '../TileCanvas/wallPainter';
import { Viewport } from '../TileCanvas/canvasUtils';

export function useImportedTileTexture(blueprint: any) {
  const [textures, setTextures] = useState<{
    color: THREE.CanvasTexture | null;
    bump: THREE.CanvasTexture | null;
  }>({ color: null, bump: null });

  useEffect(() => {
    if (!blueprint) return;

    const wallWidth = blueprint.wallWidth || 120;
    const wallHeight = blueprint.wallHeight || 96;
    const wallExtensions = blueprint.wallExtensions || [];
    const wallVertices = blueprint.wallVertices || [];
    const subAreas = blueprint.subAreas || [];
    const tileWidth = blueprint.tileWidth || 12;
    const tileHeight = blueprint.tileHeight || 12;
    const pattern = blueprint.pattern || 'grid';
    const groutWidth = blueprint.groutWidth || 0.125;
    const tileColors = blueprint.tileColors || ['#ffffff'];
    const groutColor = blueprint.groutColor || '#cbd5e1';
    const shape = blueprint.shape || 'rectangle';
    const flatsketVerticalRows = blueprint.flatsketVerticalRows || 1;
    const flatsketHorizontalRows = blueprint.flatsketHorizontalRows || 3;

    const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);
    
    const maxDim = 1024; // 1024 is high res and efficient for background layouts
    const canvasScale = maxDim / Math.max(bounds.width, bounds.height || 1);
    const canvasWidth = bounds.width * canvasScale;
    const canvasHeight = bounds.height * canvasScale;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = canvasWidth;
    bumpCanvas.height = canvasHeight;
    const bumpCtx = bumpCanvas.getContext('2d');

    const viewport: Viewport = {
      cornerX: 0,
      cornerY: 0,
      renderW: canvasWidth,
      renderH: canvasHeight,
      scale: canvasScale,
      minX: bounds.minX,
      minY: bounds.minY,
    };

    // Color map backing
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.fillStyle = groutColor;
    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, 'rectangle', 0, undefined, 0, 0, wallVertices);
    ctx.fill();
    ctx.restore();

    // Bump map backing (pure black #000000)
    if (bumpCtx) {
      bumpCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      bumpCtx.save();
      bumpCtx.fillStyle = '#000000';
      defineCombinedWallPath(bumpCtx, viewport, wallWidth, wallHeight, wallExtensions, 'rectangle', 0, undefined, 0, 0, wallVertices);
      bumpCtx.fill();
      bumpCtx.restore();
    }

    // Generate main tiles
    const mainTiles = generateTiles({
      wallWidth,
      wallHeight,
      shape,
      tileWidth,
      tileHeight,
      pattern,
      groutWidth,
      offsetX: 0,
      offsetY: 0,
      angle: 0,
      flatsketVerticalRows,
      flatsketHorizontalRows,
      extensions: wallExtensions,
      isPicket: false,
      picketLength: 4,
      wallVertices,
      layoutId: 'main',
    });

    // Draw main tiles color
    ctx.save();
    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, 'rectangle', 0, undefined, 0, 0, wallVertices);
    ctx.clip();
    drawMainTiles(
      ctx,
      mainTiles,
      viewport,
      tileColors,
      'single',
      false, // tileSpecular
      subAreas,
      wallWidth,
      wallHeight,
      tileWidth,
      tileHeight,
      shape,
      wallExtensions,
      false, // disableTileColor
      'V1',  // colorVariation
      '#334155', // tileDotColor
      groutWidth,
      1,
      wallVertices,
      false,
      null // materialImage
    );
    ctx.restore();

    // Draw main tiles bump
    if (bumpCtx) {
      bumpCtx.save();
      defineCombinedWallPath(bumpCtx, viewport, wallWidth, wallHeight, wallExtensions, 'rectangle', 0, undefined, 0, 0, wallVertices);
      bumpCtx.clip();
      drawMainTiles(
        bumpCtx,
        mainTiles,
        viewport,
        ['#ffffff'],
        'single',
        false,
        subAreas,
        wallWidth,
        wallHeight,
        tileWidth,
        tileHeight,
        shape,
        wallExtensions,
        false,
        'V1',
        undefined,
        groutWidth,
        1,
        wallVertices,
        true, // isBumpMapMode = true!
        null
      );
      bumpCtx.restore();
    }

    // Draw subareas color
    drawSubAreas(
      ctx,
      subAreas,
      null,
      viewport,
      false,
      'in',
      wallWidth,
      wallHeight,
      wallExtensions,
      true, // hide labels
      1,    // tileOpacity
      false,
      'rectangle',
      0,
      undefined,
      0,
      wallVertices,
      false,
      null
    );

    // Draw subareas bump
    if (bumpCtx) {
      drawSubAreas(
        bumpCtx,
        subAreas,
        null,
        viewport,
        false,
        'in',
        wallWidth,
        wallHeight,
        wallExtensions,
        true, // hide labels
        1,    // tileOpacity
        false,
        'rectangle',
        0,
        undefined,
        0,
        wallVertices,
        true // isBumpMapMode = true!
      );
    }

    const newColorTexture = new THREE.CanvasTexture(canvas);
    newColorTexture.colorSpace = THREE.SRGBColorSpace;
    newColorTexture.needsUpdate = true;

    const newBumpTexture = new THREE.CanvasTexture(bumpCanvas);
    newBumpTexture.colorSpace = THREE.NoColorSpace;
    newBumpTexture.needsUpdate = true;

    setTextures({
      color: newColorTexture,
      bump: newBumpTexture,
    });

    return () => {
      newColorTexture.dispose();
      newBumpTexture.dispose();
    };
  }, [blueprint]);

  return textures;
}

export function useImportedBackingTexture(blueprint: any) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (!blueprint) return;

    const wallWidth = blueprint.wallWidth || 120;
    const wallHeight = blueprint.wallHeight || 96;
    const wallExtensions = blueprint.wallExtensions || [];
    const wallVertices = blueprint.wallVertices || [];

    const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);
    
    const maxDim = 512; // Backing can be lower res for efficiency!
    const canvasScale = maxDim / Math.max(bounds.width, bounds.height || 1);
    const canvasWidth = bounds.width * canvasScale;
    const canvasHeight = bounds.height * canvasScale;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewport: Viewport = {
      cornerX: 0,
      cornerY: 0,
      renderW: canvasWidth,
      renderH: canvasHeight,
      scale: canvasScale,
      minX: bounds.minX,
      minY: bounds.minY,
    };

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();

    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, 'rectangle', 0, undefined, 0, 0, wallVertices);
    ctx.clip();

    ctx.fillStyle = '#e2dfd9';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Dynamic watermark pattern
    const patternCanvas = document.createElement('canvas');
    const pSize = 120;
    patternCanvas.width = pSize;
    patternCanvas.height = pSize;
    const pCtx = patternCanvas.getContext('2d');

    if (pCtx) {
      pCtx.clearRect(0, 0, pSize, pSize);
      pCtx.font = '900 11px system-ui, sans-serif';
      pCtx.fillStyle = 'rgba(100, 100, 100, 0.08)';
      pCtx.textAlign = 'center';
      pCtx.textBaseline = 'middle';

      pCtx.save();
      pCtx.translate(pSize / 2, pSize / 2);
      pCtx.rotate(-Math.PI / 4);
      pCtx.fillText('WildVision', 0, 0);
      pCtx.restore();
    }

    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.restore();

    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.colorSpace = THREE.SRGBColorSpace;
    newTexture.needsUpdate = true;

    setTexture(newTexture);

    return () => {
      newTexture.dispose();
    };
  }, [blueprint]);

  return texture;
}
