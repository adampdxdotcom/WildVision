import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { useAssetPreloader } from './useAssetPreloader';
import { useRedrawListener } from './useRedrawListener';
import { setupBakingCanvases } from './canvasSetup';
import { drawTexture } from './texturePainter';

export function useTileTexture() {
  const [textures, setTextures] = useState<{
    color: THREE.CanvasTexture | null;
    bump: THREE.CanvasTexture | null;
  }>({ color: null, bump: null });

  const {
    wallWidth,
    wallHeight,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    tileColors,
    colorPattern,
    colorVariation,
    groutColor,
    offsetX,
    offsetY,
    angle,
    wallExtensions,
    isPicket,
    picketLength,
    wallVertices,
    tileOpacity,
    subAreas: rawSubAreas,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    compositeColors,
    wallBorder,
    isPainted,
    unit,
    tilesPerStripe,
    viewSettings,
    enableRealisticDepth,
    materialTexture,
    activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
    isBlankCanvasMode,
    tileColorOverrides,
    disableColorWithTexture,
    sceneObjects,
    isDrafting,
  } = useAppStore();

  const subAreas = rawSubAreas;

  const redrawTrigger = useRedrawListener();
  const { isReady, materialImage, accentTexturesLoadedKey } = useAssetPreloader(materialTexture, subAreas);

  const tileSpecular = viewSettings.render.enableReflection;
  const disableTileColorOnPdf = viewSettings.pdf.disableTileColor;

  // Dedicated cleanup effect to avoid memory leaks on unmount
  useEffect(() => {
    return () => {
      setTextures(prev => {
        if (prev.color) prev.color.dispose();
        if (prev.bump) prev.bump.dispose();
        return { color: null, bump: null };
      });
    };
  }, []);

  useEffect(() => {
    if (!isReady || isDrafting) {
      return;
    }

    const {
      canvas,
      ctx,
      bumpCanvas,
      bumpCtx,
      viewport,
    } = setupBakingCanvases(wallWidth, wallHeight, wallExtensions, wallVertices || [], enableRealisticDepth);

    if (!ctx) return;

    drawTexture({
      ctx,
      bumpCtx,
      viewport,
      wallWidth,
      wallHeight,
      shape,
      tileWidth,
      tileHeight,
      pattern,
      groutWidth,
      tileColors,
      colorPattern,
      colorVariation,
      groutColor,
      offsetX,
      offsetY,
      angle,
      wallExtensions,
      isPicket,
      picketLength,
      wallVertices: wallVertices || [],
      tileOpacity,
      subAreas,
      wallBoundaryShape,
      wallArchHeight,
      wallActiveArches,
      wallArchDepth,
      compositeColors,
      wallBorder,
      isPainted,
      unit,
      tilesPerStripe,
      isBlankCanvasMode,
      materialTexture,
      disableColorWithTexture,
      materialImage,
      tileSpecular,
      disableTileColorOnPdf,
      activeCustomPattern,
      flatsketVerticalRows,
      flatsketHorizontalRows,
    });

    const newColorTexture = new THREE.CanvasTexture(canvas);
    newColorTexture.colorSpace = THREE.SRGBColorSpace;
    newColorTexture.needsUpdate = true;

    let newBumpTexture: THREE.CanvasTexture | null = null;
    if (bumpCanvas) {
      newBumpTexture = new THREE.CanvasTexture(bumpCanvas);
      newBumpTexture.colorSpace = THREE.NoColorSpace;
      newBumpTexture.needsUpdate = true;
    }

    setTextures(prev => {
      // Safely dispose old textures
      if (prev.color) prev.color.dispose();
      if (prev.bump) prev.bump.dispose();
      return {
        color: newColorTexture,
        bump: newBumpTexture,
      };
    });
  }, [
    wallWidth,
    wallHeight,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    tileColors,
    colorPattern,
    colorVariation,
    groutColor,
    offsetX,
    offsetY,
    angle,
    wallExtensions,
    isPicket,
    picketLength,
    wallVertices,
    tileOpacity,
    subAreas,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    compositeColors,
    wallBorder,
    isPainted,
    unit,
    tilesPerStripe,
    viewSettings,
    enableRealisticDepth,
    materialTexture,
    materialImage,
    accentTexturesLoadedKey,
    redrawTrigger,
    isBlankCanvasMode,
    tileColorOverrides,
    disableColorWithTexture,
    isReady,
    activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
    tileSpecular,
    disableTileColorOnPdf,
    isDrafting,
  ]);

  return textures;
}
export default useTileTexture;
