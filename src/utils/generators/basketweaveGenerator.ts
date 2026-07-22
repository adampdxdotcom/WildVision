import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';
import { applyRotationAndOffset } from '../generator';

export interface BasketweaveGeneratorParams {
  tileWidth: number;
  tileHeight: number;
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

export function generateBasketweaveTiles(params: BasketweaveGeneratorParams): TileInstance[] {
  const {
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
    layoutId = 'main',
    getGridBounds
  } = params;

  const tiles: TileInstance[] = [];

  const L_tile = Math.max(tileWidth, tileHeight);
  const W_tile = Math.min(tileWidth, tileHeight);
  const N = Math.max(1, Math.round(L_tile / W_tile));
  const blockSize = L_tile + groutWidth;
  const { minU, maxU, minV, maxV } = getGridBounds(blockSize, blockSize, angleRad);

  for (let u = minU; u <= maxU; u++) {
    for (let v = minV; v <= maxV; v++) {
      const isHorizontal = Math.abs(u + v) % 2 === 0;
      const bx = u * blockSize;
      const by = v * blockSize;

      for (let k = 0; k < N; k++) {
        const offset = (k - (N - 1) / 2) * (W_tile + groutWidth);
        const tileCx = isHorizontal ? bx : bx + offset;
        const tileCy = isHorizontal ? by + offset : by;

        const dx = tileCx;
        const dy = tileCy;
        const rotated = applyRotationAndOffset(dx, dy, angleRad, offsetX, offsetY);
        const finalCx = rotated.x;
        const finalCy = rotated.y;

        // EARLY EXIT CULLING: Check if basketweave tile center coordinates are outside bounding box plus buffer.
        if (
          finalCx < minX - cullBuffer || 
          finalCx > maxX + cullBuffer || 
          finalCy < minY - cullBuffer || 
          finalCy > maxY + cullBuffer
        ) {
          continue;
        }

        const finalAngle = angleRad + (isHorizontal ? 0 : Math.PI / 2);

        tiles.push({
          id: `${layoutId}_bw_${u}_${v}_${k}`,
          center: { x: finalCx, y: finalCy },
          vertices: getTileVertices(finalCx, finalCy, L_tile, W_tile, finalAngle, 'rectangle'),
          shape: 'rectangle',
        });
      }
    }
  }

  return tiles;
}
