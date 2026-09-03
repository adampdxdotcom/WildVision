import React, { useEffect, useState, useRef } from 'react';
import { useAppStore, availableMaterialTextures, getLoadedTextureImage, getLoadedSurfaceImage } from '../../../store/useAppStore';
import { Viewport, mapToCanvas } from '../canvasUtils';
import { drawCanvasBacking, defineCombinedWallPath, drawFoldLines, drawStitches } from '../wallPainter';
import { drawMainTiles, drawSubAreas, drawBorder } from '../painters';
import { drawWallMeasurements, drawSubAreaDimensions } from '../dimensionPainter';
import { generateTiles } from '../../../utils/generator';
import { ColorPattern, ColorVariation } from '../../../types';
import { sliceWallIntoRegions } from '../../../utils/geometry';

function getRegionCentroid(region: { x: number; y: number }[]): { x: number; y: number } {
  if (region.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const v of region) {
    sumX += v.x;
    sumY += v.y;
  }
  return { x: sumX / region.length, y: sumY / region.length };
}

function drawPushpin(ctx: CanvasRenderingContext2D, x: number, y: number, isActive: boolean, isHovered: boolean) {
  ctx.save();
  ctx.translate(x, y);

  // Subtle hover scaling
  const scale = isHovered ? 1.25 : 1.0;
  ctx.scale(scale, scale);

  // Set colors based on state
  const mainColor = isActive ? '#0e76a8' : (isHovered ? '#475569' : '#94a3b8');
  const fillColor = isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.85)';

  // Draw background shadow ring
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.fill();

  // Pin top plate line
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = mainColor;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Pin body block
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-3, -1);
  ctx.lineTo(-6, 2);
  ctx.lineTo(6, 2);
  ctx.lineTo(3, -1);
  ctx.lineTo(4, -6);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = mainColor;
  ctx.stroke();

  // Pin needle line
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, 8);
  ctx.lineWidth = 2;
  ctx.strokeStyle = mainColor;
  ctx.stroke();

  ctx.restore();
}

export interface UseCanvasRendererArgs {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  dimensions: { width: number; height: number };
  viewport: Viewport;
  combinedWidth: number;
  combinedHeight: number;
  panX: number;
  panY: number;
  panXRef: React.MutableRefObject<number>;
  panYRef: React.MutableRefObject<number>;
  draggingVertexIndex: number | null;
  mouseScreenPos?: { px: number; py: number } | null;
  hoveredFoldIndex?: number | null;
  hoveredSegment?: { type: 'wall' | 'fold'; indexA: number; indexB: number } | null;
  draggingSegment?: { type: 'wall' | 'fold'; indexA: number; indexB: number } | null;
  subAreaTileMap?: Record<string, any[]>;
  hoveredSubAreaEdge?: { id: string; handle: 'l' | 'r' | 't' | 'b' } | null;
  draggingSubAreaHandle?: 'bl' | 'br' | 'tl' | 'tr' | 'l' | 'r' | 't' | 'b' | null;
  draggingSubAreaId?: string | null;
}

export function useCanvasRenderer({
  canvasRef,
  overlayCanvasRef,
  dimensions,
  viewport,
  combinedWidth,
  combinedHeight,
  panX,
  panY,
  panXRef,
  panYRef,
  draggingVertexIndex,
  mouseScreenPos,
  hoveredFoldIndex,
  hoveredSegment,
  draggingSegment,
  subAreaTileMap,
  hoveredSubAreaEdge,
  draggingSubAreaHandle,
  draggingSubAreaId,
}: UseCanvasRendererArgs) {
  const wallWidth = useAppStore(state => state.wallWidth);
  const wallHeight = useAppStore(state => state.wallHeight);
  const roomDimensions = useAppStore(state => state.roomDimensions);
  const layoutTransform = useAppStore(state => state.layoutTransform);
  const unit = useAppStore(state => state.unit);
  const shape = useAppStore(state => state.shape);
  const tileWidth = useAppStore(state => state.tileWidth);
  const tileHeight = useAppStore(state => state.tileHeight);
  const pattern = useAppStore(state => state.pattern);
  const groutWidth = useAppStore(state => state.groutWidth);
  const tileColors = useAppStore(state => state.tileColors);
  const colorPattern = useAppStore(state => state.colorPattern);
  const tilesPerStripe = useAppStore(state => state.tilesPerStripe);
  const colorVariation = useAppStore(state => state.colorVariation);
  const groutColor = useAppStore(state => state.groutColor);
  const offsetX = useAppStore(state => state.offsetX);
  const offsetY = useAppStore(state => state.offsetY);
  const isPainted = useAppStore(state => state.isPainted);
  const rawSubAreas = useAppStore(state => state.subAreas);
  const sceneObjects = useAppStore(state => state.sceneObjects);
  const subAreas = rawSubAreas;
  const activeSubAreaId = useAppStore(state => state.activeSubAreaId);
  const activeWallExtensionId = useAppStore(state => state.activeWallExtensionId);
  const angle = useAppStore(state => state.angle);
  const zoom = useAppStore(state => state.zoom);
  const wallExtensions = useAppStore(state => state.wallExtensions);
  const isBlankCanvasMode = useAppStore(state => state.isBlankCanvasMode);
  const isPdfExporting = useAppStore(state => state.isPdfExporting);
  const isBgUnlocked = useAppStore(state => state.isBgUnlocked);
  const backgroundImage = useAppStore(state => state.backgroundImage);
  const tileOpacity = useAppStore(state => state.tileOpacity);
  const showAccentDistances = useAppStore(state => state.showAccentDistances);
  const wallBoundaryShape = useAppStore(state => state.wallBoundaryShape);
  const wallArchHeight = useAppStore(state => state.wallArchHeight);
  const wallActiveArches = useAppStore(state => state.wallActiveArches);
  const wallArchDepth = useAppStore(state => state.wallArchDepth);
  const wallAngle = useAppStore(state => state.wallAngle);
  const isPicket = useAppStore(state => state.isPicket);
  const picketLength = useAppStore(state => state.picketLength);
  const wallVertices = useAppStore(state => state.wallVertices);
  const activeTool = useAppStore(state => state.activeTool);
  const compositeColors = useAppStore(state => state.compositeColors);
  const tileDotColor = compositeColors?.secondary || '#334155';
  const wallBorder = useAppStore(state => state.wallBorder);
  const angleDisplayMode = useAppStore(state => state.angleDisplayMode);
  const foldLines = useAppStore(state => state.foldLines);
  const stitches = useAppStore(state => state.stitches);
  const draftStitchNodeIndex = useAppStore(state => state.draftStitchNodeIndex);
  const anchoredRegionCenter = useAppStore(state => state.anchoredRegionCenter);
  const viewSettings = useAppStore(state => state.viewSettings);
  const materialTexture = useAppStore(state => state.materialTexture);
  const disableColorWithTexture = useAppStore(state => state.disableColorWithTexture);
  const isDrafting = useAppStore(state => state.isDrafting);
  const activeCustomPattern = useAppStore(state => state.activeCustomPattern);
  const flatsketVerticalRows = useAppStore(state => state.flatsketVerticalRows);
  const flatsketHorizontalRows = useAppStore(state => state.flatsketHorizontalRows);
  const tileColorOverrides = useAppStore(state => state.tileColorOverrides);

  const [materialImage, setMaterialImage] = useState<HTMLImageElement | null>(null);
  const [accentTexturesLoadedKey, setAccentTexturesLoadedKey] = useState(0);

  useEffect(() => {
    if (!materialTexture || materialTexture === 'none') {
      setMaterialImage(null);
      return;
    }
    const texDef = availableMaterialTextures.find(t => t.id === materialTexture);
    if (!texDef) {
       setMaterialImage(null);
       return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setMaterialImage(img);
    };
    img.src = texDef.url;
  }, [materialTexture]);

  useEffect(() => {
    const texturesToLoad = Array.from(
      new Set(
        subAreas
          .map((sa) => sa.materialTexture)
          .filter((t): t is string => !!t && t !== 'none')
       )
    );

    if (texturesToLoad.length === 0) return;

    let loadedCount = 0;
    texturesToLoad.forEach((texId) => {
      getLoadedTextureImage(texId, () => {
        loadedCount++;
        if (loadedCount === texturesToLoad.length) {
          setAccentTexturesLoadedKey((prev) => prev + 1);
        }
      });
    });
  }, [subAreas]);

  useEffect(() => {
    const surfacesToLoad = Array.from(
      new Set(
        subAreas
          .map((sa) => sa.surfaceUrl)
          .filter((url): url is string => !!url)
      )
    );

    surfacesToLoad.forEach((url) => {
      getLoadedSurfaceImage(url, () => {
        useAppStore.getState().setIsCanvasDirty(true);
      });
    });
  }, [subAreas]);

  const tileSpecular = viewSettings.render.enableReflection;
  const disableTileColorOnPdf = viewSettings.pdf.disableTileColor;
  const visibility = viewSettings.canvas;

  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const overlayCanvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  const drawBaseRef = useRef<(() => void) | null>(null);
  const drawOverlayRef = useRef<(() => void) | null>(null);

  drawBaseRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (visibility.showTextures && materialTexture !== 'none' && (!materialImage || materialImage.src.indexOf(materialTexture) === -1)) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    
    if (
      canvasSizeRef.current.width !== dimensions.width ||
      canvasSizeRef.current.height !== dimensions.height ||
      canvasSizeRef.current.dpr !== dpr
    ) {
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      canvasSizeRef.current = { width: dimensions.width, height: dimensions.height, dpr };
    }

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const panOffsetX = panXRef.current - panX;
    const panOffsetY = panYRef.current - panY;

    if (isBgUnlocked) {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    } else {
      drawCanvasBacking(ctx, dimensions.width, dimensions.height, !!backgroundImage, false, viewport, unit, panOffsetX, panOffsetY);
    }

    ctx.translate(panOffsetX, panOffsetY);

    ctx.save();
    if (wallAngle !== 0) {
      const cx = viewport.cornerX + viewport.renderW / 2;
      const cy = viewport.cornerY + viewport.renderH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((wallAngle * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (isBgUnlocked) {
      ctx.save();
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 4;
      defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      subAreas.forEach((sa) => {
        const minVal = {
          x: viewport.cornerX + (sa.x - viewport.minX) * viewport.scale,
          y: viewport.cornerY + (viewport.renderH - (sa.y + sa.height - viewport.minY) * viewport.scale),
        };
        const rW = sa.width * viewport.scale;
        const rH = sa.height * viewport.scale;
        ctx.strokeRect(minVal.x, minVal.y, rW, rH);
      });
      ctx.restore();

      if (!activeSubAreaId) {
        drawWallMeasurements(
          ctx,
          viewport,
          combinedWidth,
          combinedHeight,
          unit,
          wallWidth,
          wallHeight,
          wallExtensions,
          !!backgroundImage,
          [],
          false,
          wallVertices,
          false,
          angleDisplayMode
        );
      }
      drawSubAreaDimensions(ctx, viewport, subAreas, showAccentDistances, unit, !!backgroundImage, false, angleDisplayMode);
      ctx.restore();

      if (drawOverlayRef.current) drawOverlayRef.current();
      return;
    }

    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
    ctx.fill();
    ctx.stroke();
    
    ctx.globalAlpha = tileOpacity;
    ctx.fillStyle = isPainted ? groutColor : 'rgba(226, 232, 240, 0.8)';
    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
    ctx.fill();

    if (!isPainted) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        "Click 'Paint Canvas' to layout tiles",
        viewport.cornerX + viewport.renderW / 2,
        viewport.cornerY + viewport.renderH / 2
      );
    }
    ctx.restore();

    if (isPainted) {
      ctx.save();
      const borderThickness = wallBorder?.enabled ? Math.min(wallBorder.tileWidth, wallBorder.tileHeight) : 0;
      defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, borderThickness, wallVertices);
      ctx.clip();

      if (!isBlankCanvasMode && !isDrafting) {
        const mainTiles = subAreaTileMap ? subAreaTileMap['main'] || [] : [];

        ctx.save();
        ctx.globalAlpha = tileOpacity;
        drawMainTiles(
          ctx,
          mainTiles,
          viewport,
          materialTexture && materialTexture !== 'none' && disableColorWithTexture ? ['#ffffff'] : tileColors,
          colorPattern as ColorPattern,
          tileSpecular,
          subAreas,
          wallWidth,
          wallHeight,
          tileWidth,
          tileHeight,
          shape,
          wallExtensions,
          disableTileColorOnPdf || false,
          colorVariation as ColorVariation,
          tileDotColor,
          groutWidth,
          tilesPerStripe,
          wallVertices,
          false,
          visibility.showTextures ? materialImage : null
        );
        ctx.restore();
      } else if (!isDrafting) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.font = 'bold 15px "Space Grotesk", "Inter", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const diag = Math.sqrt(dimensions.width * dimensions.width + dimensions.height * dimensions.height);
        const stepX = 145;
        const stepY = 64;
        
        ctx.translate(dimensions.width / 2, dimensions.height / 2);
        ctx.rotate(-25 * Math.PI / 180);
        
        const startX = -diag;
        const endX = diag;
        const startY = -diag;
        const endY = diag;
        
        let rowCount = 0;
        for (let y = startY; y < endY; y += stepY) {
          const xOffset = (rowCount % 2) * (stepX / 2);
          for (let x = startX + xOffset; x < endX; x += stepX) {
            ctx.fillText('Blank Canvas', x, y);
          }
          rowCount++;
        }
        ctx.restore();
      }

      ctx.restore();

      if (wallBorder?.enabled) {
        const defaultBColor = (tileColors?.[0] ? (typeof tileColors[0] === 'string' ? tileColors[0] : tileColors[0].hex) : '') || '#1e293b';
        const selectedBColor = wallBorder.color || defaultBColor;
        const finalBColor = isPdfExporting && disableTileColorOnPdf ? '#ffffff' : selectedBColor;
        drawBorder(ctx, { x: 0, y: 0, w: wallWidth, h: wallHeight }, wallBorder, false, viewport, 0, finalBColor, groutColor, groutWidth);
      }

      drawSubAreas(
        ctx,
        subAreas,
        activeSubAreaId,
        viewport,
        tileSpecular,
        unit,
        wallWidth,
        wallHeight,
        wallExtensions,
        false,
        tileOpacity,
        disableTileColorOnPdf || false,
        wallBoundaryShape,
        wallArchHeight,
        wallActiveArches,
        wallArchDepth,
        wallVertices,
        false,
        visibility.showTextures ? materialImage : null,
        isDrafting,
        visibility.showTextures,
        subAreaTileMap,
        null,
        null,
        null
      );
    }

    if (!activeSubAreaId) {
      drawWallMeasurements(
        ctx,
        viewport,
        combinedWidth,
        combinedHeight,
        unit,
        wallWidth,
        wallHeight,
        wallExtensions,
        !!backgroundImage,
        [],
        false,
        wallVertices,
        false,
        angleDisplayMode
      );
    }

    drawSubAreaDimensions(ctx, viewport, subAreas, showAccentDistances, unit, !!backgroundImage, false, angleDisplayMode);

    ctx.restore();

    if (drawOverlayRef.current) {
      drawOverlayRef.current();
    }
  };

  drawOverlayRef.current = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (
      overlayCanvasSizeRef.current.width !== dimensions.width ||
      overlayCanvasSizeRef.current.height !== dimensions.height ||
      overlayCanvasSizeRef.current.dpr !== dpr
    ) {
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      overlayCanvasSizeRef.current = { width: dimensions.width, height: dimensions.height, dpr };
    }

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const panOffsetX = panXRef.current - panX;
    const panOffsetY = panYRef.current - panY;

    ctx.translate(panOffsetX, panOffsetY);

    ctx.save();
    if (wallAngle !== 0) {
      const cx = viewport.cornerX + viewport.renderW / 2;
      const cy = viewport.cornerY + viewport.renderH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((wallAngle * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    drawFoldLines(
      ctx,
      foldLines,
      wallVertices,
      (x, y) => {
        const pt = mapToCanvas(x, y, viewport);
        return { px: pt.x, py: pt.y };
      },
      hoveredFoldIndex,
      activeTool
    );

    if (activeTool === 'pin' && wallVertices && wallVertices.length >= 3) {
      const regionsForPin = sliceWallIntoRegions(wallVertices, foldLines);
      for (const reg of regionsForPin) {
        const centroid = getRegionCentroid(reg);
        const pt = mapToCanvas(centroid.x, centroid.y, viewport);

        const isActive = anchoredRegionCenter &&
          Math.hypot(centroid.x - anchoredRegionCenter.x, centroid.y - anchoredRegionCenter.y) < 1.0;

        let isHovered = false;
        if (mouseScreenPos) {
          const dist = Math.hypot(mouseScreenPos.px - pt.x, mouseScreenPos.py - pt.y);
          if (dist < 18) {
            isHovered = true;
          }
        }

        drawPushpin(ctx, pt.x, pt.y, !!isActive, isHovered);
      }
    }

    drawStitches(
      ctx,
      stitches,
      wallVertices,
      (x, y) => {
        const pt = mapToCanvas(x, y, viewport);
        return { px: pt.x, py: pt.y };
      },
      draftStitchNodeIndex,
      mouseScreenPos || null
    );

    const activeHighlight = draggingSegment || hoveredSegment;
    if (activeHighlight && wallVertices && wallVertices[activeHighlight.indexA] && wallVertices[activeHighlight.indexB]) {
      const pA = wallVertices[activeHighlight.indexA];
      const pB = wallVertices[activeHighlight.indexB];
      const ptA = mapToCanvas(pA.x, pA.y, viewport);
      const ptB = mapToCanvas(pB.x, pB.y, viewport);

      ctx.save();
      if (draggingSegment) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 5.5;
        ctx.shadowColor = 'rgba(2, 132, 199, 0.45)';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.35)';
        ctx.shadowBlur = 6;
      }
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ptA.x, ptA.y);
      ctx.lineTo(ptB.x, ptB.y);
      ctx.stroke();
      ctx.restore();
    }

    let targetSubArea: any = null;
    let targetEdgeHandle: 'l' | 'r' | 't' | 'b' | null = null;

    for (const sa of subAreas) {
      if (sa.visible === false) continue;
      if (draggingSubAreaId === sa.id && draggingSubAreaHandle && ['l', 'r', 't', 'b'].includes(draggingSubAreaHandle)) {
        targetSubArea = sa;
        targetEdgeHandle = draggingSubAreaHandle as 'l' | 'r' | 't' | 'b';
        break;
      } else if (hoveredSubAreaEdge && hoveredSubAreaEdge.id === sa.id) {
        targetSubArea = sa;
        targetEdgeHandle = hoveredSubAreaEdge.handle;
        break;
      }
    }

    if (targetSubArea && targetEdgeHandle) {
      const sa = targetSubArea;
      const saCanvasMin = mapToCanvas(sa.x, sa.y + sa.height, viewport);
      const saCanvasMax = mapToCanvas(sa.x + sa.width, sa.y, viewport);
      const xLeft = saCanvasMin.x;
      const xRight = saCanvasMax.x;
      const yTop = saCanvasMin.y;
      const yBottom = saCanvasMax.y;

      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (targetEdgeHandle === 'l') {
        ctx.moveTo(xLeft, yTop);
        ctx.lineTo(xLeft, yBottom);
      } else if (targetEdgeHandle === 'r') {
        ctx.moveTo(xRight, yTop);
        ctx.lineTo(xRight, yBottom);
      } else if (targetEdgeHandle === 't') {
        ctx.moveTo(xLeft, yTop);
        ctx.lineTo(xRight, yTop);
      } else if (targetEdgeHandle === 'b') {
        ctx.moveTo(xLeft, yBottom);
        ctx.lineTo(xRight, yBottom);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    if (drawBaseRef.current) drawBaseRef.current();
  }, [
    dimensions,
    wallWidth,
    wallHeight,
    unit,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    tileColors,
    colorPattern,
    tilesPerStripe,
    colorVariation,
    groutColor,
    offsetX,
    offsetY,
    isPainted,
    subAreas,
    activeSubAreaId,
    angle,
    zoom,
    wallExtensions,
    activeWallExtensionId,
    isBlankCanvasMode,
    isPdfExporting,
    isBgUnlocked,
    backgroundImage,
    tileOpacity,
    showAccentDistances,
    panX,
    panY,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    wallAngle,
    isPicket,
    picketLength,
    wallVertices,
    draggingVertexIndex,
    activeTool,
    tileDotColor,
    wallBorder,
    angleDisplayMode,
    viewSettings,
    materialTexture,
    materialImage,
    accentTexturesLoadedKey,
    tileColorOverrides,
    disableColorWithTexture,
    sceneObjects
  ]);

  useEffect(() => {
    if (drawOverlayRef.current) drawOverlayRef.current();
  }, [
    mouseScreenPos,
    hoveredFoldIndex,
    hoveredSegment,
    draggingSegment,
    hoveredSubAreaEdge,
    draggingSubAreaHandle,
    draggingSubAreaId,
    activeTool,
    foldLines,
    wallVertices,
    viewport,
    anchoredRegionCenter,
    stitches,
    draftStitchNodeIndex,
    subAreas,
    panX,
    panY,
    wallAngle
  ]);

  useEffect(() => {
    const handleForceRedraw = () => {
      if (drawBaseRef.current) drawBaseRef.current();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wildvision:forceCanvasRedraw', handleForceRedraw);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wildvision:forceCanvasRedraw', handleForceRedraw);
      }
    };
  }, []);
}
