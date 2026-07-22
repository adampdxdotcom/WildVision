import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';
import { applyRotationAndOffset } from '../generator';

export interface StandardGeneratorParams {
  wallWidth: number;
  wallHeight: number;
  shape: TileShape;
  tileWidth: number;
  tileHeight: number;
  pattern: string;
  groutWidth: number;
  offsetX: number;
  offsetY: number;
  angle: number;
  angleRad: number;
  cullBuffer: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  actualTileW: number;
  actualTileH: number;
  xStep: number;
  yStep: number;
  isPicket?: boolean;
  picketLength?: number;
  layoutId?: string;
  getGridBounds: (stepX: number, stepY: number, rotAngle: number) => { minU: number; maxU: number; minV: number; maxV: number };
}

export function generateStandardTiles(params: StandardGeneratorParams): TileInstance[] {
  const {
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
    isPicket = false,
    picketLength = 8,
    layoutId = 'main',
    getGridBounds
  } = params;

  const tiles: TileInstance[] = [];
  const { minU, maxU, minV, maxV } = getGridBounds(xStep, yStep, angleRad);

  for (let c = minU; c <= maxU; c++) {
    for (let r = minV; r <= maxV; r++) {
      let cx = 0;
      let cy = 0;

      if (shape === 'hexagon') {
        cx = c * xStep + (Math.abs(r % 2) === 1 ? 0.5 * xStep : 0) + offsetX;
        cy = r * yStep + offsetY;
      } else if (shape === 'round' && pattern !== 'stack') {
        cx = c * xStep + (Math.abs(r % 2) === 1 ? 0.5 * xStep : 0) + offsetX;
        cy = r * yStep + offsetY;
      } else if (shape === 'diamond') {
        // --- DIAMOND HORIZONTAL STAGGER LOGIC ---
        // Because diamond tiles mesh diagonally, subsequent rows (where row index r is odd) 
        // are shifted horizontally by exactly 50% of the horizontal pitch (xStep) to perfectly 
        // nest into the shoulder pockets of the previous row.
        cx = c * xStep + (Math.abs(r % 2) === 1 ? 0.5 * xStep : 0) + offsetX;
        cy = r * yStep + offsetY;
      } else if (shape === 'scallop') {
        cx = c * xStep + (Math.abs(r % 2) === 1 ? 0.5 * xStep : 0) + offsetX;
        cy = r * yStep + offsetY;
        cx += actualTileW / 2;
        cy += actualTileH / 2;
      } else {
        cx = c * xStep + offsetX;
        cy = r * yStep + offsetY;

        if (shape === 'rectangle' && (pattern === 'running_50' || pattern === 'third_33' || pattern === 'plank')) {
          const isVertical = actualTileH >= actualTileW;
          const index = isVertical ? c : r;
          const stepSize = isVertical ? yStep : xStep;
          const idxCyclic = ((index % 12) + 12) % 12;

          let multiplier = 0;
          if (pattern === 'running_50') {
            multiplier = (idxCyclic % 2) * 0.5;
          } else if (pattern === 'third_33') {
            multiplier = (idxCyclic % 3) * (1 / 3);
          } else if (pattern === 'plank') {
            const staticMultipliers = [0.0, 0.35, 0.7, 0.15, 0.5, 0.85];
            const pCyclic = ((index % staticMultipliers.length) + staticMultipliers.length) % staticMultipliers.length;
            multiplier = staticMultipliers[pCyclic];
          }

          const offsetVal = multiplier * stepSize;
          if (isVertical) {
            cy += offsetVal;
          } else {
            cx += offsetVal;
          }
        }
        
        if (shape === 'rectangle' || shape === 'chevron' || shape === 'octagon_dot' || shape === 'triangle') {
          cx += actualTileW / 2;
          cy += actualTileH / 2;
        }
      }

      if (angle !== 0) {
        const dx = cx - offsetX;
        const dy = cy - offsetY;
        const rotated = applyRotationAndOffset(dx, dy, angleRad, offsetX, offsetY);
        cx = rotated.x;
        cy = rotated.y;
      }

      // EARLY EXIT CULLING: Check if standard grid tile center coordinates are outside bounding box plus buffer.
      if (
        cx < minX - cullBuffer || 
        cx > maxX + cullBuffer || 
        cy < minY - cullBuffer || 
        cy > maxY + cullBuffer
      ) {
        continue;
      }

      const isCurrentlyMirrored = shape === 'chevron' ? Math.abs(c % 2) === 1 : false;
      const isDown = shape === 'triangle' ? Math.abs((c + r) % 2) === 1 : false;

      tiles.push({
        id: `${layoutId}_std_${c}_${r}`,
        center: { x: cx, y: cy },
        vertices: getTileVertices(cx, cy, actualTileW, actualTileH, angleRad, shape, isCurrentlyMirrored, isDown, isPicket, picketLength),
        shape,
      });
    }
  }

  return tiles;
}
