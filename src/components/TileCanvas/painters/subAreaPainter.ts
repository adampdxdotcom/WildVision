/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasurementUnit, SubArea, WallExtension, ColorCard, ColorPattern } from '../../../types';
import { TileInstance, generateTiles } from '../../../utils/generator';
import { drawRoundTile, drawHexagonTileDirect, drawPolygonTile, drawScallopTile, drawPebbleTile } from '../tileRenderers';
import { Viewport, mapToCanvas } from '../canvasUtils';
import { defineCombinedWallPath } from '../wallPainter';
import { useAppStore, getLoadedTextureImage, getLoadedSurfaceImage } from '../../../store/useAppStore';
import { getPatternImage, ensureColorCard, getCardPatternImageAndBlob } from '../../../utils/svgPatternManager';
import { getPrintForLocation } from '../../../utils/printSetManager';
import { getPatternColor } from './colorUtils';
import { isSubAreaInBenchMode, definePolygonVerticesPath } from './geometryHelpers';
import { drawBorder } from './borderPainter';
import { getVariedColor } from '../../../utils/geometry';

/**
 * Renders individual custom Accent SubAreas onto the active canvas
 */
export function drawSubAreas(
  ctx: CanvasRenderingContext2D,
  subAreas: SubArea[],
  activeSubAreaId: string | null,
  viewport: Viewport,
  tileSpecular: boolean,
  unit: MeasurementUnit,
  wallWidth?: number,
  wallHeight?: number,
  wallExtensions?: WallExtension[],
  hideLabels?: boolean,
  tileOpacity: number = 1.0,
  disableTileColorOnPdf?: boolean,
  wallBoundaryShape: 'rectangle' | 'arch' | 'oval' | 'custom_arches' = 'rectangle',
  wallArchHeight?: number,
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean },
  wallArchDepth?: number,
  wallVertices?: {x: number, y: number}[],
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null,
  isDraftMode: boolean = false,
  showTextures: boolean = true,
  subAreaTileMap?: Record<string, any[]>,
  hoveredSubAreaEdge?: { id: string; handle: 'l' | 'r' | 't' | 'b' } | null,
  draggingSubAreaHandle?: 'bl' | 'br' | 'tl' | 'tr' | 'l' | 'r' | 't' | 'b' | null,
  draggingSubAreaId?: string | null
) {
  subAreas.forEach((sa) => {
    if (sa.visible === false) return;
    const resolvedSaMaterialImage = (showTextures && sa.materialTexture && sa.materialTexture !== 'none')
      ? getLoadedTextureImage(sa.materialTexture)
      : (sa.materialTexture === 'none' ? null : materialImage);

    const saCanvasMin = mapToCanvas(sa.x, sa.y + sa.height, viewport);
    const saCanvasMax = mapToCanvas(sa.x + sa.width, sa.y, viewport);
    const saW = saCanvasMax.x - saCanvasMin.x;
    const saH = saCanvasMax.y - saCanvasMin.y;

    const rawType = (sa.accentType as string) || (sa.isCutout ? 'cutout' : (sa.hasSill ? 'niche' : 'flat'));
    const resolvedType = (rawType === 'bench' ? 'shelf' : rawType) as 'flat' | 'niche' | 'shelf' | 'cutout';

    if (resolvedType === 'shelf' && isSubAreaInBenchMode(sa)) {
      const depthVal = sa.depth ?? 6.0;
      const footprintCanvasMin = mapToCanvas(sa.x, sa.y, viewport);
      const footprintCanvasMax = mapToCanvas(sa.x + sa.width, sa.y - depthVal, viewport);
      const fW = footprintCanvasMax.x - footprintCanvasMin.x;
      const fH = footprintCanvasMax.y - footprintCanvasMin.y;

      ctx.save();
      ctx.globalAlpha = 0.30;
      const baseColor = sa.tileColor || '#475569';
      let hex = baseColor.replace('#', '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      let darkerColor = '#1e293b';
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const darkR = Math.max(0, Math.floor(r * 0.45));
        const darkG = Math.max(0, Math.floor(g * 0.45));
        const darkB = Math.max(0, Math.floor(b * 0.45));
        darkerColor = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
      }

      ctx.fillStyle = darkerColor;
      ctx.fillRect(footprintCanvasMin.x, footprintCanvasMin.y, fW, fH);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(footprintCanvasMin.x, footprintCanvasMin.y, fW, fH);

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let offset = 4; offset < fW; offset += 8) {
        ctx.moveTo(footprintCanvasMin.x + offset, footprintCanvasMin.y);
        ctx.lineTo(footprintCanvasMin.x + offset, footprintCanvasMin.y + fH);
      }
      ctx.stroke();

      ctx.restore();
    }

    const isCutoutVal = resolvedType === 'cutout';

    const borderThickness = sa.border?.enabled ? Math.min(sa.border.tileWidth, sa.border.tileHeight) : 0;
    // Sub-Areas are generally Inset, but Cutouts are Outset (holes get bigger so field shrinks around it)
    const rawInset = isCutoutVal ? -borderThickness : borderThickness;
    const insetPx = rawInset * viewport.scale;

    const xLeft = saCanvasMin.x + insetPx;
    const xRight = saCanvasMax.x - insetPx;
    const yTop = saCanvasMin.y + insetPx;
    const yBottom = saCanvasMax.y - insetPx;
    const rW = Math.max(0, saW - 2 * insetPx);
    const rH = Math.max(0, saH - 2 * insetPx);

    const defineBoundaryPath = () => {
      ctx.beginPath();
      if (sa.vertices && sa.vertices.length >= 3) {
        definePolygonVerticesPath(ctx, viewport, sa.vertices);
        return;
      }
      switch (sa.boundaryShape) {
        case 'oval': {
          ctx.ellipse(xLeft + rW / 2, yTop + rH / 2, rW / 2, rH / 2, 0, 0, 2 * Math.PI);
          break;
        }
        case 'custom_arches': {
          const depthPx = Math.max(0, (sa.archDepth || 0) * viewport.scale);
          const innerXMin = xLeft + (sa.activeArches?.left ? depthPx : 0);
          const innerXMax = xRight - (sa.activeArches?.right ? depthPx : 0);
          const innerYMin = yTop + (sa.activeArches?.top ? depthPx : 0);
          const innerYMax = yBottom - (sa.activeArches?.bottom ? depthPx : 0);

          const rxHorizontal = Math.max(0, (innerXMax - innerXMin) / 2);
          const ryHorizontal = depthPx;
          const rxVertical = depthPx;
          const ryVertical = Math.max(0, (innerYMax - innerYMin) / 2);

          ctx.moveTo(innerXMin, innerYMin);
          
          // Top Edge
          if (sa.activeArches?.top) {
            ctx.ellipse((innerXMin + innerXMax) / 2, innerYMin, rxHorizontal, ryHorizontal, 0, Math.PI, Math.PI * 2, false);
          } else {
            ctx.lineTo(innerXMax, innerYMin);
          }
          
          // Right Edge
          if (sa.activeArches?.right) {
            ctx.ellipse(innerXMax, (innerYMin + innerYMax) / 2, rxVertical, ryVertical, 0, -Math.PI / 2, Math.PI / 2, false);
          } else {
            ctx.lineTo(innerXMax, innerYMax);
          }
          
          // Bottom Edge
          if (sa.activeArches?.bottom) {
            ctx.ellipse((innerXMin + innerXMax) / 2, innerYMax, rxHorizontal, ryHorizontal, 0, 0, Math.PI, false);
          } else {
            ctx.lineTo(innerXMin, innerYMax);
          }
          
          // Left Edge
          if (sa.activeArches?.left) {
            ctx.ellipse(innerXMin, (innerYMin + innerYMax) / 2, rxVertical, ryVertical, 0, Math.PI / 2, Math.PI * 1.5, false);
          } else {
            ctx.lineTo(innerXMin, innerYMin);
          }
          ctx.closePath();
          break;
        }
        case 'arch': {
          const archPixelHeight = (sa.archHeight || sa.width / 2) * viewport.scale;
          ctx.moveTo(xLeft, yBottom);
          ctx.lineTo(xRight, yBottom);
          ctx.lineTo(xRight, yTop + archPixelHeight);
          ctx.ellipse(xLeft + rW / 2, yTop + archPixelHeight, rW / 2, archPixelHeight, 0, 0, Math.PI, true);
          ctx.lineTo(xLeft, yTop + archPixelHeight);
          ctx.closePath();
          break;
        }
        case 'rectangle':
        default: {
          ctx.rect(xLeft, yTop, rW, rH);
          break;
        }
      }
    };

    ctx.save();

    ctx.globalAlpha = tileOpacity;

    if (resolvedType === 'cutout') {
      // Draw background fill representing empty/cutout space (faint gray)
      ctx.save();
      ctx.globalAlpha = 1.0;
      defineBoundaryPath();
      ctx.clip();

      ctx.fillStyle = '#f8fafc'; // faint slate gray
      ctx.fill();

      // Distinct bounding stroke: solid slate border
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      defineBoundaryPath();
      ctx.stroke();

      // Draw two intersecting diagonal lines
      ctx.strokeStyle = '#94a3b8'; // clear slate gray
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xLeft, yTop);
      ctx.lineTo(xRight, yBottom);
      ctx.moveTo(xRight, yTop);
      ctx.lineTo(xLeft, yBottom);
      ctx.stroke();
      ctx.restore();
    } else {
      if (sa.isStencil && wallWidth !== undefined && wallHeight !== undefined && wallExtensions !== undefined) {
        ctx.beginPath();
        defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
        ctx.clip();
      }

      const isProtruding = resolvedType === 'shelf';

      if (isProtruding) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        
        ctx.fillStyle = sa.groutColor || '#ffffff';
        defineBoundaryPath();
        ctx.fill();
        ctx.restore();

        // Draw a slightly thicker, darker outer border
        ctx.save();
        ctx.strokeStyle = '#334155'; // darker slate border
        ctx.lineWidth = 2.5;
        defineBoundaryPath();
        ctx.stroke();
        ctx.restore();
      }

      // 1. Fill accent band background with grout joint base
      if (!sa.organicEdges) {
        if (!isProtruding) {
          ctx.fillStyle = sa.groutColor;
          defineBoundaryPath();
          ctx.fill();
        }

        // 2. Set sub-area clipping region
        defineBoundaryPath();
        ctx.clip();
      } else if (!sa.isStencil && wallWidth !== undefined && wallHeight !== undefined && wallExtensions !== undefined) {
        ctx.beginPath();
        defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
        ctx.clip();
      }

    if (!isDraftMode) {
      if ((sa as any).accentType === 'slab') {
        let patternFilled = false;
        if (sa.surfaceUrl) {
          const img = getLoadedSurfaceImage(sa.surfaceUrl);
          if (img) {
            const pattern = ctx.createPattern(img, 'no-repeat');
            if (pattern) {
              const imageAspect = img.naturalWidth / img.naturalHeight;
              const saAspect = sa.width / sa.height;
              
              const matrix = new DOMMatrix();
              matrix.translateSelf(saCanvasMin.x, saCanvasMin.y);
              
              let scaleX = 1, scaleY = 1;
              if (imageAspect > saAspect) {
                // Image is wider than the area. Fit height, crop width.
                scaleY = saH / img.naturalHeight;
                scaleX = scaleY;
                const scaledWidth = img.naturalWidth * scaleX;
                matrix.translateSelf(-((scaledWidth - saW) / 2), 0);
              } else {
                // Image is taller than the area. Fit width, crop height.
                scaleX = saW / img.naturalWidth;
                scaleY = scaleX;
                const scaledHeight = img.naturalHeight * scaleY;
                matrix.translateSelf(0, -((scaledHeight - saH) / 2));
              }
              matrix.scaleSelf(scaleX, scaleY);
              pattern.setTransform(matrix);
              
              ctx.fillStyle = pattern;
              defineBoundaryPath();
              ctx.fill();
              patternFilled = true;
            }
          }
        }
        if (!patternFilled) {
          ctx.fillStyle = sa.tileColor || '#94a3b8'; // fallback solid color
          defineBoundaryPath();
          ctx.fill();
        }
      } else {
      // 3. Generate internal accent band tiles beautifully
      const saAngleRad = ((sa.angle || 0) * Math.PI) / 180;
    const saActualTileW = sa.shape === 'hexagon' ? sa.tileWidth : sa.tileWidth;
    let saActualTileH = sa.shape === 'hexagon'
      ? (sa.isPicket ? (sa.picketLength || 8) : sa.tileWidth * (2 / Math.sqrt(3)))
      : (sa.shape === 'round' || sa.shape === 'scallop' ? sa.tileWidth : sa.tileHeight);

    if (sa.shape === 'octagon_dot' || sa.shape === 'scallop') {
      saActualTileH = saActualTileW;
    }

    const saXStep = saActualTileW + sa.groutWidth;
    let saYStep = saActualTileH + sa.groutWidth;

    if (sa.shape === 'hexagon') {
      if (sa.isPicket) {
        saYStep = 0.75 * ((sa.picketLength || 8) + sa.groutWidth);
      } else {
        const R_step = (saActualTileW + sa.groutWidth) / Math.sqrt(3);
        saYStep = 1.5 * R_step;
      }
    } else if (sa.shape === 'round' && sa.pattern !== 'stack') {
      saYStep = saXStep * Math.sqrt(3) / 2;
    } else if (sa.shape === 'scallop') {
      saYStep = (saActualTileW / 2) + sa.groutWidth;
    } else if (sa.shape === 'diamond') {
      saYStep = 0.5 * saActualTileH + sa.groutWidth;
    }

    const saDiag = Math.sqrt(sa.width * sa.width + sa.height * sa.height);
    const saStep = Math.min(saXStep, saYStep);
    const saSweep = Math.ceil(saDiag / (saStep || 0.1)) + 5;

    const saOriginX = sa.x + sa.offsetX;
    const saOriginY = sa.y + sa.offsetY;

    let saTiles: TileInstance[] = [];
    if (subAreaTileMap && subAreaTileMap[sa.id]) {
      const generated = subAreaTileMap[sa.id];
      saTiles = generated.map(t => ({
        ...t,
        center: { x: t.center.x + sa.x, y: t.center.y + sa.y },
        vertices: t.vertices.map(v => ({ x: v.x + sa.x, y: v.y + sa.y })),
      }));
    } else {
      const activePat = sa.customPatternPayload || (useAppStore.getState().activeCustomPattern);
      const flatsketV = sa.flatsketVerticalRows || (useAppStore.getState().flatsketVerticalRows);
      const flatsketH = sa.flatsketHorizontalRows || (useAppStore.getState().flatsketHorizontalRows);

      const generated = generateTiles({
        wallWidth: sa.width,
        wallHeight: sa.height,
        shape: sa.shape,
        tileWidth: sa.tileWidth,
        tileHeight: sa.tileHeight,
        pattern: sa.pattern as any,
        groutWidth: sa.groutWidth || 0.125,
        offsetX: sa.offsetX || 0,
        offsetY: sa.offsetY || 0,
        angle: sa.angle || 0,
        isPicket: sa.isPicket,
        picketLength: sa.picketLength,
        wallVertices: sa.vertices,
        activeCustomPattern: activePat,
        flatsketVerticalRows: flatsketV,
        flatsketHorizontalRows: flatsketH,
        layoutId: sa.id,
      });
      saTiles = generated.map(t => ({
        ...t,
        center: { x: t.center.x + sa.x, y: t.center.y + sa.y },
        vertices: t.vertices.map(v => ({ x: v.x + sa.x, y: v.y + sa.y })),
      }));
    }

    // 4. Filter and mask organic edge tiles, or prepare for drawing
    let finalSaTiles = saTiles;

    if (sa.organicEdges) {
      ctx.save();
      defineBoundaryPath();
      const matrix = ctx.getTransform();
      finalSaTiles = saTiles.filter((tile) => {
        const centerCanvas = mapToCanvas(tile.center.x, tile.center.y, viewport);
        const transformedX = centerCanvas.x * matrix.a + centerCanvas.y * matrix.c + matrix.e;
        const transformedY = centerCanvas.x * matrix.b + centerCanvas.y * matrix.d + matrix.f;
        return ctx.isPointInPath(transformedX, transformedY);
      });
      ctx.restore();

      // Pre-draw silhouettes filled with grout color to block out the background wall tiles
      ctx.save();
      ctx.fillStyle = sa.groutColor;
      for (const tile of finalSaTiles) {
        const canvasVertices = tile.vertices.map((v) => mapToCanvas(v.x, v.y, viewport));
        const pCenter = mapToCanvas(tile.center.x, tile.center.y, viewport);

        ctx.beginPath();
        if (tile.shape === 'round') {
          const radius = (saActualTileW / 2) * viewport.scale;
          // expand by half grout width so adjacent tiles' grout touches each other
          ctx.arc(pCenter.x, pCenter.y, radius + (sa.groutWidth / 2) * viewport.scale, 0, 2 * Math.PI);
        } else if (tile.shape === 'scallop') {
          // It's harder to expand a scallop analytically, we can use line extrusion via stroke
          // Or we can just stroke and fill. Yes, stroke and fill works great for a generic path mask
          const radius = (saActualTileW / 2) * viewport.scale;
          const segments = 24;
          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * 2 * Math.PI;
            const px = pCenter.x + radius * Math.cos(theta);
            const py = pCenter.y + radius * Math.sin(theta);
            const bottomDist = Math.max(0, py - pCenter.y);
            const currentR = radius + bottomDist * 0.4;
            const ox = pCenter.x + currentR * Math.cos(theta);
            const oy = pCenter.y + currentR * Math.sin(theta);
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
          }
          ctx.closePath();
          ctx.lineWidth = sa.groutWidth * viewport.scale;
          ctx.strokeStyle = sa.groutColor;
          ctx.stroke();
        } else {
          ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
          for (let i = 1; i < canvasVertices.length; i++) {
            ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
          }
          ctx.closePath();
          ctx.lineJoin = 'miter';
          ctx.lineWidth = sa.groutWidth * viewport.scale;
          ctx.strokeStyle = sa.groutColor;
          ctx.stroke(); // Expand by grout width
        }
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Fill accent band tiles
    for (const tile of finalSaTiles) {
      const xs = tile.vertices.map((v) => v.x);
      const ys = tile.vertices.map((v) => v.y);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const yMin = Math.min(...ys);
      const yMax = Math.max(...ys);

      const overlapsX = xMin < sa.x + sa.width && xMax > sa.x;
      const overlapsY = yMin < sa.y + sa.height && yMax > sa.y;
      if (!overlapsX || !overlapsY) continue;

      const canvasVertices = tile.vertices.map((v) => mapToCanvas(v.x, v.y, viewport));
      const pCenter = mapToCanvas(tile.center.x, tile.center.y, viewport);

      ctx.save();

      const useSpecular = disableTileColorOnPdf ? false : (sa.tileSpecular && tileSpecular);
      const baseSaColor = getPatternColor(
        sa.tileColors || [(sa as any).tileColor || '#f1f5f9'],
        sa.colorPattern || 'single',
        tile,
        sa.tileWidth,
        sa.tileHeight,
        sa.groutWidth || 0.125,
        sa.tilesPerStripe || 1
      );
      const baseSaCard = ensureColorCard(baseSaColor);
      const baseSaColorHex = baseSaCard.hex;
      let resolvedSaTileColor = disableTileColorOnPdf ? '#ffffff' : baseSaColorHex;

      const state = useAppStore.getState();
      const tileColorOverrides = state.tileColorOverrides || {};
      const customPaintOverride = tileColorOverrides[tile.id];

      if (customPaintOverride !== undefined) {
        const overrideCardOrStr = (sa.tileColors || [])[customPaintOverride];
        const overrideColor = overrideCardOrStr ? (typeof overrideCardOrStr === 'string' ? overrideCardOrStr : overrideCardOrStr.hex) : '#ffffff';
        resolvedSaTileColor = disableTileColorOnPdf ? '#ffffff' : overrideColor;
      } else if (tile.shape === 'rectangle' && sa.shape === 'octagon_dot') {
        resolvedSaTileColor = disableTileColorOnPdf ? '#ffffff' : (sa.tileDotColor || '#334155');
      }
      if (!disableTileColorOnPdf) {
        resolvedSaTileColor = getVariedColor(resolvedSaTileColor, tile.center.x, tile.center.y, sa.colorVariation || 'V1');
      }

      const uploadedSvgText = state.uploadedSvgText;
      const patternAccentColor = state.patternAccentColor || '#000000';
      const saAngleRad = ((sa.angle || 0) * Math.PI) / 180;

      const onImageLoaded = () => {
        useAppStore.getState().setIsCanvasDirty(true);
      };

      let patternImg: HTMLImageElement | null = null;
      if (baseSaCard.pattern && baseSaCard.pattern.svgText) {
        const cardForDrawing: ColorCard = {
          ...baseSaCard,
          hex: resolvedSaTileColor,
        };
        const { image } = getCardPatternImageAndBlob(cardForDrawing, onImageLoaded);
        patternImg = image;
      } else if (uploadedSvgText) {
        patternImg = getPatternImage(uploadedSvgText, resolvedSaTileColor, patternAccentColor, onImageLoaded);
      }

      let printImg: HTMLImageElement | null = null;
      let printOpacity = 1.0;
      if (baseSaCard.printConfig && baseSaCard.printConfig.setName) {
        const printItem = getPrintForLocation(baseSaCard.printConfig.setName, tile.center.x, tile.center.y);
        if (printItem && printItem.img) {
          printImg = printItem.img;
          printOpacity = baseSaCard.printConfig.opacity ?? 1.0;
        }
      }

      if (tile.shape === 'round') {
        const radius = (saActualTileW / 2) * viewport.scale;
        drawRoundTile(ctx, pCenter, radius, resolvedSaTileColor, useSpecular, isBumpMapMode, resolvedSaMaterialImage, tile.center, patternImg, saAngleRad, viewport.scale, printImg, printOpacity);
      } else if (tile.shape === 'scallop') {
        const radius = (saActualTileW / 2) * viewport.scale;
        drawScallopTile(ctx, pCenter, radius, resolvedSaTileColor, useSpecular, saAngleRad, isBumpMapMode, resolvedSaMaterialImage, tile.center, patternImg, saAngleRad, viewport.scale, printImg, printOpacity);
      } else if (tile.shape === 'hexagon' && !sa.isPicket) {
        const drawRadius = (saActualTileW / Math.sqrt(3)) * viewport.scale;
        drawHexagonTileDirect(ctx, pCenter, drawRadius, resolvedSaTileColor, useSpecular, isBumpMapMode, resolvedSaMaterialImage, tile.center, patternImg, saAngleRad, viewport.scale, printImg, printOpacity);
      } else if (tile.shape === 'pebble') {
        const saColors = disableTileColorOnPdf 
          ? ['#ffffff'] 
          : (sa.tileColors || [sa.tileColor || '#f1f5f9']).map(c => typeof c === 'string' ? c : c.hex);
        const saPattern = disableTileColorOnPdf ? 'single' : (sa.colorPattern || 'single');
        const saVar = disableTileColorOnPdf ? 'V1' : (sa.colorVariation || 'V1');
        drawPebbleTile(ctx, canvasVertices, pCenter, resolvedSaTileColor, useSpecular, saColors, saPattern, saVar, tile.center, isBumpMapMode, resolvedSaMaterialImage, patternImg, saAngleRad, viewport.scale, printImg, printOpacity);
      } else {
        drawPolygonTile(ctx, canvasVertices, pCenter, resolvedSaTileColor, useSpecular, tile.shape, isBumpMapMode, resolvedSaMaterialImage, tile.center, patternImg, saAngleRad, viewport.scale, printImg, printOpacity);
      }
      ctx.restore();
    } // closes tile loop
    } // closes slab else block
    } // closes !isDraftMode check
  } // closes else block

    ctx.restore(); // restores sub-area clip

    // 5. Render borders
    const isSelected = sa.id === activeSubAreaId;
    if (!hideLabels) {
      ctx.strokeStyle = isSelected ? '#4f46e5' : '#475569';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      if (sa.hasSill) {
        ctx.setLineDash([6, 4]);
      }
      defineBoundaryPath();
      ctx.stroke();
      if (sa.hasSill) {
        ctx.setLineDash([]);
      }

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        defineBoundaryPath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 6. Draw border
    if (sa.border?.enabled && !sa.organicEdges) {
       const borderFill = disableTileColorOnPdf ? '#ffffff' : (sa.border?.color || (sa.tileColors && sa.tileColors[0] && ensureColorCard(sa.tileColors[0]).hex) || '#1e293b');
       drawBorder(
          ctx,
          { x: sa.x, y: sa.y, w: sa.width, h: sa.height },
          sa.border,
          isCutoutVal,
          viewport,
          (sa.angle || 0) * Math.PI / 180,
          borderFill,
          sa.groutColor || '#ffffff',
          sa.groutWidth || 0.125
       );
    }

    // 7. Draw hovered or active edge highlight line
    let targetEdgeHandle: 'l' | 'r' | 't' | 'b' | null = null;
    if (draggingSubAreaId === sa.id && draggingSubAreaHandle && ['l', 'r', 't', 'b'].includes(draggingSubAreaHandle)) {
      targetEdgeHandle = draggingSubAreaHandle as 'l' | 'r' | 't' | 'b';
    } else if (hoveredSubAreaEdge && hoveredSubAreaEdge.id === sa.id) {
      targetEdgeHandle = hoveredSubAreaEdge.handle;
    }

    if (targetEdgeHandle) {
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
  });
}
