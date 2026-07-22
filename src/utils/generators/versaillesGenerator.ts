import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';
import { applyRotationAndOffset } from '../generator';

export interface VersaillesGeneratorParams {
  tileWidth: number;
  groutWidth: number;
  offsetX: number;
  offsetY: number;
  angleRad: number;
  cullBuffer: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  layoutId?: string;
  getGridBounds: (stepX: number, stepY: number, rotAngle: number) => { minU: number; maxU: number; minV: number; maxV: number };
}

export function generateVersaillesTiles(params: VersaillesGeneratorParams): TileInstance[] {
  const {
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
    layoutId = 'main',
    getGridBounds
  } = params;

  const tiles: TileInstance[] = [];

  const U = tileWidth;
  const unitStep = U + groutWidth;

  // True 12-piece interlocking Versailles block (matches the classic layout).
  const versaillesBlock = [
    { dx: 0, dy: 0, w: 2, h: 2 },
    { dx: 5, dy: 0, w: 1, h: 1 },
    { dx: 0, dy: 2, w: 1, h: 2 },
    { dx: 1, dy: 2, w: 1, h: 1 },
    { dx: 2, dy: 1, w: 2, h: 2 },
    { dx: 4, dy: 1, w: 2, h: 3 },
    { dx: 1, dy: 3, w: 2, h: 2 },
    { dx: 3, dy: 3, w: 1, h: 1 },
    { dx: 3, dy: 4, w: 2, h: 1 },
    { dx: 5, dy: 4, w: 2, h: 2 }, // Overhangs right
    { dx: 1, dy: 5, w: 1, h: 1 },
    { dx: 2, dy: 5, w: 3, h: 2 }  // Overhangs bottom
  ];

  const blockW = 6 * unitStep;
  const blockH = 6 * unitStep;
  const { minU, maxU, minV, maxV } = getGridBounds(blockW, blockH, angleRad);

  for (let u = minU; u <= maxU; u++) {
    for (let v = minV; v <= maxV; v++) {
      const blockX = u * blockW;
      const blockY = v * blockH;

      for (const [idx, t] of versaillesBlock.entries()) {
        const physicalW = (t.w * unitStep) - groutWidth;
        const physicalH = (t.h * unitStep) - groutWidth;
        const localCx = (t.dx * unitStep) + (physicalW / 2);
        const localCy = (t.dy * unitStep) + (physicalH / 2);
        const dx = blockX + localCx;
        const dy = blockY + localCy;
        const rotated = applyRotationAndOffset(dx, dy, angleRad, offsetX, offsetY);
        const finalCx = rotated.x;
        const finalCy = rotated.y;

        // EARLY EXIT CULLING: Check if Versailles tile center coordinates are outside bounding box plus buffer.
        if (
          finalCx < minX - cullBuffer || 
          finalCx > maxX + cullBuffer || 
          finalCy < minY - cullBuffer || 
          finalCy > maxY + cullBuffer
        ) {
          continue;
        }

        tiles.push({
          id: `${layoutId}_blk_${u}_${v}_${idx}`,
          center: { x: finalCx, y: finalCy },
          vertices: getTileVertices(finalCx, finalCy, physicalW, physicalH, angleRad, 'rectangle'),
          shape: 'rectangle',
          actualWidth: physicalW,
          actualHeight: physicalH
        });
      }
    }
  }

  return tiles;
}
