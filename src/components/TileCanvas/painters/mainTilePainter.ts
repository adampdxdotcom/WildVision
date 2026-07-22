/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileShape, ColorVariation, ColorPattern, ColorCard, SubArea, WallExtension } from '../../../types';
import { TileInstance } from '../../../utils/generator';
import { getTessellatedPath, getVariedColor } from '../../../utils/geometry';
import { drawRoundTile, drawHexagonTileDirect, drawPolygonTile, drawScallopTile, drawPebbleTile } from '../tileRenderers';
import { Viewport, mapToCanvas } from '../canvasUtils';
import { useAppStore } from '../../../store/useAppStore';
import { getPatternImage, ensureColorCard, getCardPatternImageAndBlob } from '../../../utils/svgPatternManager';
import { getPatternColor } from './colorUtils';

/**
 * Draws the main wall tiles and handles coloring/specularity
 */
export function drawMainTiles(
  ctx: CanvasRenderingContext2D,
  tiles: TileInstance[],
  viewport: Viewport,
  tileColors: (string | ColorCard)[],
  colorPattern: ColorPattern,
  tileSpecular: boolean,
  subAreas: SubArea[],
  wallWidth: number,
  wallHeight: number,
  tileWidth: number,
  tileHeight: number,
  shape: TileShape,
  extensions: WallExtension[] = [],
  disableTileColorOnPdf?: boolean,
  colorVariation?: ColorVariation,
  tileDotColor?: string,
  groutWidth?: number,
  tilesPerStripe: number = 1,
  wallVertices?: {x: number, y: number}[],
  isBumpMapMode: boolean = false,
  materialImage?: HTMLImageElement | null
) {
  const actualTileW = shape === 'hexagon' ? tileWidth : tileWidth;

  let wallMinX = 0;
  let wallMaxX = wallWidth;
  let wallMinY = 0;
  let wallMaxY = wallHeight;

  if (wallVertices && wallVertices.length >= 3) {
      const tessellated = getTessellatedPath(wallVertices);
      tessellated.forEach((v: {x: number, y: number}) => {
          wallMinX = Math.min(wallMinX, v.x);
          wallMaxX = Math.max(wallMaxX, v.x);
          wallMinY = Math.min(wallMinY, v.y);
          wallMaxY = Math.max(wallMaxY, v.y);
      });
  }

  for (const tile of tiles) {
    const xs = tile.vertices.map((v) => v.x);
    const ys = tile.vertices.map((v) => v.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    // Filter off-screen candidates (merged wall & extensions)
    let overlapsActiveShape = (xMin < wallMaxX && xMax > wallMinX && yMin < wallMaxY && yMax > wallMinY);
    if (!overlapsActiveShape && extensions && extensions.length > 0) {
      for (const ext of extensions) {
        if (xMin < ext.x + ext.width && xMax > ext.x && yMin < ext.y + ext.height && yMax > ext.y) {
          overlapsActiveShape = true;
          break;
        }
      }
    }
    if (!overlapsActiveShape) continue;

    const canvasVertices = tile.vertices.map((v) => mapToCanvas(v.x, v.y, viewport));
    const pCenter = mapToCanvas(tile.center.x, tile.center.y, viewport);

    ctx.save();

    const baseColorCardOrStr = getPatternColor(tileColors, colorPattern, tile, tileWidth, tileHeight, groutWidth, tilesPerStripe);
    const baseCard = ensureColorCard(baseColorCardOrStr);
    const baseColor = baseCard.hex;
    let resolvedTileColor = disableTileColorOnPdf ? '#ffffff' : baseColor;

    const state = useAppStore.getState();
    const tileColorOverrides = state.tileColorOverrides || {};
    const customPaintOverride = tileColorOverrides[tile.id];

    if (customPaintOverride !== undefined && !isBumpMapMode) {
      const overrideCardOrStr = tileColors[customPaintOverride];
      const overrideColor = overrideCardOrStr ? (typeof overrideCardOrStr === 'string' ? overrideCardOrStr : overrideCardOrStr.hex) : '#ffffff';
      resolvedTileColor = disableTileColorOnPdf ? '#ffffff' : overrideColor;
    } else {
      const compositeColors = state.compositeColors || {};
      const isPrimary = tile.role === 'primary' || (tile.role as string) === 'background';

      if (tile.name) {
        const tileColor = compositeColors[tile.name] || tile.color || baseColor;
        resolvedTileColor = disableTileColorOnPdf ? '#ffffff' : tileColor;
      } else if (!isPrimary && (tile.role || (tile.shape === 'rectangle' && shape === 'octagon_dot'))) {
        const roleKey = tile.role;
        const shapeKey = tile.shape;

        const compositeColor = (roleKey && compositeColors[roleKey]) || 
                               (shapeKey && compositeColors[shapeKey]) || 
                               compositeColors['secondary'] || 
                               tileDotColor || 
                               baseColor;

        resolvedTileColor = disableTileColorOnPdf ? '#ffffff' : compositeColor;
      }
    }

    const uploadedSvgText = state.uploadedSvgText;
    const patternAccentColor = state.patternAccentColor || '#000000';
    const angleDeg = state.angle || 0;
    const angleRad = (angleDeg * Math.PI) / 180;
    if (!disableTileColorOnPdf) {
      resolvedTileColor = getVariedColor(resolvedTileColor, tile.center.x, tile.center.y, colorVariation);
    }
    const resolvedSpecular = disableTileColorOnPdf ? false : tileSpecular;

    const onImageLoaded = () => {
      useAppStore.getState().setIsCanvasDirty(true);
    };

    let patternImg: HTMLImageElement | null = null;
    if (baseCard.pattern && baseCard.pattern.svgText) {
      const cardForDrawing: ColorCard = {
        ...baseCard,
        hex: resolvedTileColor,
      };
      const { image } = getCardPatternImageAndBlob(cardForDrawing, onImageLoaded);
      patternImg = image;
    } else if (uploadedSvgText) {
      patternImg = getPatternImage(uploadedSvgText, resolvedTileColor, patternAccentColor, onImageLoaded);
    }

    if (tile.shape === 'round') {
      const radius = (actualTileW / 2) * viewport.scale;
      drawRoundTile(ctx, pCenter, radius, resolvedTileColor, resolvedSpecular, isBumpMapMode, materialImage, tile.center, patternImg, angleRad, viewport.scale);
    } else if (tile.shape === 'scallop') {
      const radius = (actualTileW / 2) * viewport.scale;
      drawScallopTile(ctx, pCenter, radius, resolvedTileColor, resolvedSpecular, angleRad, isBumpMapMode, materialImage, tile.center, patternImg, angleRad, viewport.scale);
    } else if (tile.shape === 'pebble') {
      const pTileColors = disableTileColorOnPdf 
        ? ['#ffffff'] 
        : tileColors.map(c => typeof c === 'string' ? c : c.hex);
      const pColorPattern = disableTileColorOnPdf ? 'single' : colorPattern;
      const pColorVar = disableTileColorOnPdf ? 'V1' : colorVariation;
      drawPebbleTile(ctx, canvasVertices, pCenter, resolvedTileColor, resolvedSpecular, pTileColors, pColorPattern, pColorVar, tile.center, isBumpMapMode, materialImage, patternImg, angleRad, viewport.scale);
    } else {
      drawPolygonTile(ctx, canvasVertices, pCenter, resolvedTileColor, resolvedSpecular, tile.shape, isBumpMapMode, materialImage, tile.center, patternImg, angleRad, viewport.scale);
    }

    ctx.restore();
  }
}
