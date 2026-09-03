import { TileShape, RectanglePattern, WallExtension } from '../types';
import { getTessellatedPath } from './geometry';

// Import our sub-generators
import { generateStandardTiles } from './generators/standardGenerator';
import { generateHerringboneTiles } from './generators/herringboneGenerator';
import { generateBasketweaveTiles } from './generators/basketweaveGenerator';
import { generateVersaillesTiles } from './generators/versaillesGenerator';
import { generateFlatsketTiles } from './generators/flatsketGenerator';
import { generateCustomJsonTiles } from './generators/customJsonGenerator';
import { generateRhombusLatticeTiles } from './generators/rhombusLatticeGenerator';

export interface TileInstance {
  id: string;
  center: { x: number; y: number };
  vertices: { x: number; y: number }[];
  shape: TileShape;
  actualWidth?: number;
  actualHeight?: number;
  cubeFace?: 'top' | 'left' | 'right';
  role?: 'primary' | 'secondary';
  name?: string;
  color?: string;
}

export function applyRotationAndOffset(dx: number, dy: number, angleRad: number, offsetX: number, offsetY: number): { x: number; y: number } {
  if (angleRad === 0) {
    return { x: offsetX + dx, y: offsetY + dy };
  }
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  return {
    x: offsetX + dx * cosA - dy * sinA,
    y: offsetY + dx * sinA + dy * cosA
  };
}

/**
 * Procedural tile generator for both canvas rendering and metrics analysis.
 * Acts as the centralized traffic coordinator, bounding-box calculator, and parameter validator.
 */
export function generateTiles(params: {
  wallWidth: number;
  wallHeight: number;
  shape: TileShape;
  tileWidth: number;
  tileHeight: number;
  pattern: RectanglePattern;
  groutWidth: number;
  offsetX: number;
  offsetY: number;
  angle?: number;
  extensions?: WallExtension[];
  isPicket?: boolean;
  picketLength?: number;
  wallVertices?: {x: number, y: number}[];
  activeCustomPattern?: any;
  flatsketVerticalRows?: number;
  flatsketHorizontalRows?: number;
  layoutId?: string;
}): TileInstance[] {
  const {
    wallWidth,
    wallHeight,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    offsetX,
    offsetY,
    angle = 0,
    extensions,
    isPicket = false,
    picketLength = 8,
    wallVertices,
    activeCustomPattern,
    flatsketVerticalRows = 1,
    flatsketHorizontalRows = 3,
    layoutId = 'main',
  } = params;

  // Safety valve: prevent division by zero or infinite sweep loops
  if (
    isNaN(tileWidth) ||
    isNaN(tileHeight) ||
    tileWidth < 0.5 ||
    tileHeight < 0.5 ||
    !tileWidth ||
    !tileHeight
  ) {
    return [];
  }

  const actualTileW = shape === 'hexagon' ? tileWidth : tileWidth;
  let actualTileH = shape === 'hexagon'
    ? (isPicket ? picketLength : tileWidth * (2 / Math.sqrt(3)))
    : (shape === 'round' ? tileWidth : tileHeight);

  if (shape === 'octagon_dot' || shape === 'scallop') {
    actualTileH = actualTileW;
  } else if (shape === 'triangle') {
    actualTileH = actualTileW * (Math.sqrt(3) / 2);
  }

  // Spacings
  let xStep = actualTileW + groutWidth;
  let yStep = actualTileH + groutWidth;
  
  if (shape === 'triangle') {
    xStep = (actualTileW + groutWidth) / 2;
    yStep = actualTileH + groutWidth;
  } else if (shape === 'scallop') {
    xStep = actualTileW + groutWidth;
    yStep = (actualTileW / 2) + groutWidth;
  } else if (shape === 'hexagon') {
    if (isPicket) {
      yStep = 0.75 * (picketLength + groutWidth);
    } else {
      const sEff = (actualTileW + groutWidth) / Math.sqrt(3);
      yStep = 1.5 * sEff;
    }
  } else if (shape === 'round' && pattern !== 'stack') {
    yStep = xStep * Math.sqrt(3) / 2;
  } else if (shape === 'diamond') {
    if (pattern === '3d_cube') {
      xStep = actualTileW + groutWidth;
      yStep = 0.75 * (actualTileH + groutWidth);
    } else if (pattern === 'star_lattice') {
      // Equilateral triangular grid spacing based on the locked 60° height H
      const S = actualTileH + groutWidth * Math.sqrt(3);
      xStep = S;
      yStep = S * Math.sqrt(3) / 2;
    } else {
      // --- DIAMOND VERTICAL SPACING LOGIC ---
      yStep = 0.5 * actualTileH + groutWidth;
    }
  }

  const angleRad = (angle * Math.PI) / 180;

  // Coverage radius - compute full merged footprint bounds
  let minX = 0;
  let maxX = wallWidth;
  let minY = 0;
  let maxY = wallHeight;

  if (extensions && extensions.length > 0) {
    extensions.forEach((ext) => {
      minX = Math.min(minX, ext.x);
      maxX = Math.max(maxX, ext.x + ext.width);
      minY = Math.min(minY, ext.y);
      maxY = Math.max(maxY, ext.y + ext.height);
    });
  }

  if (wallVertices && wallVertices.length >= 3) {
    const tessellated = getTessellatedPath(wallVertices);
    tessellated.forEach((v: {x: number, y: number}) => {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    });
  }

  const cullBuffer = Math.max(actualTileW, actualTileH) * 2;

  const getGridBounds = (stepX: number, stepY: number, rotAngle: number) => {
    const padLeft = minX - cullBuffer;
    const padRight = maxX + cullBuffer;
    const padTop = minY - cullBuffer;
    const padBottom = maxY + cullBuffer;

    const corners = [
      { x: padLeft, y: padTop },
      { x: padRight, y: padTop },
      { x: padLeft, y: padBottom },
      { x: padRight, y: padBottom }
    ];

    const cosA = Math.cos(rotAngle);
    const sinA = Math.sin(rotAngle);

    let unrotatedMinX = Infinity;
    let unrotatedMaxX = -Infinity;
    let unrotatedMinY = Infinity;
    let unrotatedMaxY = -Infinity;

    corners.forEach((c) => {
      const px = c.x - offsetX;
      const py = c.y - offsetY;
      const ux = px * cosA + py * sinA;
      const uy = -px * sinA + py * cosA;

      if (ux < unrotatedMinX) unrotatedMinX = ux;
      if (ux > unrotatedMaxX) unrotatedMaxX = ux;
      if (uy < unrotatedMinY) unrotatedMinY = uy;
      if (uy > unrotatedMaxY) unrotatedMaxY = uy;
    });

    const sX = stepX || 1;
    const sY = stepY || 1;

    let minU = Math.floor(unrotatedMinX / sX);
    let maxU = Math.ceil(unrotatedMaxX / sX);
    let minV = Math.floor(unrotatedMinY / sY);
    let maxV = Math.ceil(unrotatedMaxY / sY);

    if (pattern === 'herringbone' || pattern === '3d_cube' || pattern === 'star_lattice') {
      const rangeU = maxU - minU;
      const rangeV = maxV - minV;
      minU -= Math.round(rangeU * 0.5);
      maxU += Math.round(rangeU * 0.5);
      minV -= Math.round(rangeV * 0.5);
      maxV += Math.round(rangeV * 0.5);
    }

    return {
      minU,
      maxU,
      minV,
      maxV
    };
  };

  // 1. Custom activeCustomPattern / JSON layout
  if (activeCustomPattern || pattern === 'custom_json') {
    return generateCustomJsonTiles({
      tileWidth,
      groutWidth,
      offsetX,
      offsetY,
      angleRad,
      cullBuffer,
      minX,
      maxX,
      minY,
      maxY,
      activeCustomPattern,
      layoutId,
      getGridBounds
    });
  }

  // 2. Herringbone Layout
  if (pattern === 'herringbone' && shape === 'rectangle') {
    return generateHerringboneTiles({
      tileWidth,
      tileHeight,
      groutWidth,
      offsetX,
      offsetY,
      angleRad,
      cullBuffer,
      minX,
      maxX,
      minY,
      maxY,
      layoutId,
      getGridBounds
    });
  }

  // 3. Basketweave Layout
  if (pattern === 'basket_weave' && shape === 'rectangle') {
    return generateBasketweaveTiles({
      tileWidth,
      tileHeight,
      groutWidth,
      offsetX,
      offsetY,
      angleRad,
      cullBuffer,
      minX,
      maxX,
      minY,
      maxY,
      layoutId,
      getGridBounds
    });
  }

  // 4. Versailles Layout
  if (pattern === 'versailles' && shape === 'rectangle') {
    return generateVersaillesTiles({
      tileWidth,
      groutWidth,
      offsetX,
      offsetY,
      angleRad,
      cullBuffer,
      minX,
      maxX,
      minY,
      maxY,
      layoutId,
      getGridBounds
    });
  }

  // 5. Flatsket Layout
  if (pattern === 'flatsket' && shape === 'rectangle') {
    return generateFlatsketTiles({
      actualTileW,
      actualTileH,
      groutWidth,
      offsetX,
      offsetY,
      angleRad,
      cullBuffer,
      minX,
      maxX,
      minY,
      maxY,
      flatsketVerticalRows,
      flatsketHorizontalRows,
      layoutId,
      getGridBounds
    });
  }

  // 6. Rhombus Lattice (3D Box / Star Lattice)
  if (shape === 'diamond' && (pattern === '3d_cube' || pattern === 'star_lattice')) {
    return generateRhombusLatticeTiles({
      pattern,
      groutWidth,
      offsetX,
      offsetY,
      angleRad,
      cullBuffer,
      minX,
      maxX,
      minY,
      maxY,
      actualTileW,
      actualTileH,
      xStep,
      yStep,
      layoutId,
      getGridBounds
    });
  }

  // 7. Standard grid patterns
  return generateStandardTiles({
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
    angleRad,
    cullBuffer,
    minX,
    maxX,
    minY,
    maxY,
    actualTileW,
    actualTileH,
    xStep,
    yStep,
    isPicket,
    picketLength,
    layoutId,
    getGridBounds
  });
}
