import { Viewport } from '../../TileCanvas/canvasUtils';
import { SubArea, ColorPattern, ColorVariation, MeasurementUnit } from '../../../types';
import { generateTiles } from '../../../utils/generator';
import { drawMainTiles, drawSubAreas, drawBorder } from '../../TileCanvas/painters';
import { defineCombinedWallPath } from '../../TileCanvas/wallPainter';

export interface TexturePainterProps {
  ctx: CanvasRenderingContext2D;
  bumpCtx: CanvasRenderingContext2D | null;
  viewport: Viewport;
  wallWidth: number;
  wallHeight: number;
  shape: any;
  tileWidth: number;
  tileHeight: number;
  pattern: any;
  groutWidth: number;
  tileColors: any[];
  colorPattern: string;
  colorVariation: string;
  groutColor: string;
  offsetX: number;
  offsetY: number;
  angle: number;
  wallExtensions: any[];
  isPicket: boolean;
  picketLength: number;
  wallVertices: any[];
  tileOpacity: number;
  subAreas: SubArea[];
  wallBoundaryShape: any;
  wallArchHeight: number;
  wallActiveArches: any;
  wallArchDepth: number;
  compositeColors: any;
  wallBorder: any;
  isPainted: boolean;
  unit: MeasurementUnit;
  tilesPerStripe: number;
  isBlankCanvasMode: boolean;
  materialTexture: string;
  disableColorWithTexture: boolean;
  materialImage: HTMLImageElement | null;
  tileSpecular: boolean;
  disableTileColorOnPdf: boolean;
  activeCustomPattern: any;
  flatsketVerticalRows: number;
  flatsketHorizontalRows: number;
}

export const drawTexture = ({
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
  isBlankCanvasMode,
  materialTexture,
  disableColorWithTexture,
  materialImage,
  tileSpecular,
  disableTileColorOnPdf,
  activeCustomPattern,
  flatsketVerticalRows,
  flatsketHorizontalRows,
}: TexturePainterProps) => {
  const canvasWidth = viewport.renderW;
  const canvasHeight = viewport.renderH;
  const tileDotColor = compositeColors?.secondary || '#334155';

  // Clear contexts
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (bumpCtx) {
    bumpCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  if (isPainted) {
    // Fill backing background color
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
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
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = tileOpacity;
    ctx.fillStyle = isPainted ? groutColor : 'rgba(226, 232, 240, 0.8)';
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
    ctx.fill();
    ctx.restore();

    // Fill bump map backing (pure black #000000)
    if (bumpCtx) {
      bumpCtx.save();
      bumpCtx.fillStyle = '#000000';
      bumpCtx.strokeStyle = '#000000';
      bumpCtx.lineJoin = 'round';
      bumpCtx.lineWidth = 7;
      defineCombinedWallPath(
        bumpCtx,
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
      bumpCtx.fill();
      bumpCtx.stroke();
      bumpCtx.restore();
    }

    // Main wall tiles for color map
    ctx.save();
    if (bumpCtx) {
      bumpCtx.save();
    }

    const borderThickness = wallBorder?.enabled ? Math.min(wallBorder.tileWidth, wallBorder.tileHeight) : 0;
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
      borderThickness,
      wallVertices
    );
    ctx.clip();

    if (bumpCtx) {
      defineCombinedWallPath(
        bumpCtx,
        viewport,
        wallWidth,
        wallHeight,
        wallExtensions,
        wallBoundaryShape,
        wallArchHeight,
        wallActiveArches,
        wallArchDepth,
        borderThickness,
        wallVertices
      );
      bumpCtx.clip();
    }

    if (!isBlankCanvasMode) {
      const mainTiles = generateTiles({
        wallWidth,
        wallHeight,
        shape,
        tileWidth,
        tileHeight,
        pattern,
        groutWidth,
        offsetX,
        offsetY,
        angle,
        extensions: wallExtensions,
        isPicket,
        picketLength,
        wallVertices,
        activeCustomPattern,
        flatsketVerticalRows,
        flatsketHorizontalRows,
        layoutId: 'main',
      });

      drawMainTiles(
        ctx,
        mainTiles,
        viewport,
        materialTexture && materialTexture !== 'none' && disableColorWithTexture ? ['#ffffff'] : tileColors,
        colorPattern as ColorPattern,
        false,
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
        false, // isBumpMapMode = false
        materialImage
      );

      // Now draw main tiles on bump map (pure white tile bases and soft bevel gradients on pure black grout backing)
      if (bumpCtx) {
        drawMainTiles(
          bumpCtx,
          mainTiles,
          viewport,
          ['#ffffff'],
          'single',
          false, // disable specular highlight drawings
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
          tilesPerStripe,
          wallVertices,
          true, // isBumpMapMode = true!
          undefined
        );
      }
    }

    ctx.restore();
    if (bumpCtx) {
      bumpCtx.restore();
    }

    // Border if enabled
    if (wallBorder?.enabled) {
      const defaultBColor = (tileColors?.[0] ? (typeof tileColors[0] === 'string' ? tileColors[0] : tileColors[0].hex) : '') || '#1e293b';
      const selectedBColor = wallBorder.color || defaultBColor;
      const finalBColor = disableTileColorOnPdf ? '#ffffff' : selectedBColor;
      drawBorder(
        ctx,
        { x: 0, y: 0, w: wallWidth, h: wallHeight },
        wallBorder,
        false,
        viewport,
        0,
        finalBColor,
        groutColor,
        groutWidth
      );

      // Draw border tiles on bump map as white/bevel border on black grout
      if (bumpCtx) {
        drawBorder(
          bumpCtx,
          { x: 0, y: 0, w: wallWidth, h: wallHeight },
          wallBorder,
          false,
          viewport,
          0,
          '#ffffff',
          '#000000',
          groutWidth
        );
      }
    }

    // Draw nested subareas (accent colors)
    drawSubAreas(
      ctx,
      subAreas,
      null, // activeSubAreaId is null to avoid highlighters
      viewport,
      tileSpecular,
      unit,
      wallWidth,
      wallHeight,
      wallExtensions,
      true, // hide labels for the 3D texture
      tileOpacity,
      disableTileColorOnPdf || false,
      wallBoundaryShape,
      wallArchHeight,
      wallActiveArches,
      wallArchDepth,
      wallVertices,
      false,
      materialImage
    );

    // Draw nested subareas on bump map (with bevels)
    if (bumpCtx) {
      drawSubAreas(
        bumpCtx,
        subAreas,
        null,
        viewport,
        false, // tileSpecular is false
        unit,
        wallWidth,
        wallHeight,
        wallExtensions,
        true, // hide labels
        tileOpacity,
        false,
        wallBoundaryShape,
        wallArchHeight,
        wallActiveArches,
        wallArchDepth,
        wallVertices,
        true // isBumpMapMode = true!
      );
    }
  } else {
    // Draw standard instructions on backing
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      "Click 'Paint Canvas' to layout tiles",
      canvasWidth / 2,
      canvasHeight / 2
    );
    ctx.restore();
  }
};
