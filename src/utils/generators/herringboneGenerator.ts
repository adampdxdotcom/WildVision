import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';

export interface HerringboneGeneratorParams {
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

export function generateHerringboneTiles(params: HerringboneGeneratorParams): TileInstance[] {
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

  // Determine the tile dimensions with grout included.
  const L_tile = Math.max(tileWidth, tileHeight);
  const W_tile = Math.min(tileWidth, tileHeight);
  const L = L_tile + groutWidth;
  const W = W_tile + groutWidth;
  
  // Herringbone layout naturally is rotated 45 degrees relative to standard rectangular grids,
  // so we set the baseline angle to 45 degrees (PI/4) and overlay the user-defined rotation angle.
  const globalRotation = Math.PI / 4 + angleRad;
  const cosG = Math.cos(globalRotation);
  const sinG = Math.sin(globalRotation);

  const { minU, maxU, minV, maxV } = getGridBounds(2 * L, 2 * W, globalRotation);

  for (let u = minU; u <= maxU; u++) {
    for (let v = minV; v <= maxV; v++) {
      // --- STAIRCASE VECTOR BASIS OFFSET LOGIC ---
      const baseX1 = (u * L) - (v * W);
      const baseY1 = (u * L) + (v * W);

      // Tile 2 is the interlocking "vertical" pair. To nest perfectly into current Tile 1's "pocket", we
      // shift Tile 2 by precisely half a tile length + half a tile width on the X-axis, and
      // half a tile length - half a tile width on the Y-axis.
      const baseX2 = baseX1 + (L / 2) + (W / 2);
      const baseY2 = baseY1 + (L / 2) - (W / 2);

      // Map the basis coordinates back to normal 2D Cartesian space using a 2D Rotation Matrix
      const rx1 = baseX1 * cosG - baseY1 * sinG;
      const ry1 = baseX1 * sinG + baseY1 * cosG;
      const cx1 = rx1 + offsetX;
      const cy1 = ry1 + offsetY;

      const rx2 = baseX2 * cosG - baseY2 * sinG;
      const ry2 = baseX2 * sinG + baseY2 * cosG;
      const cx2 = rx2 + offsetX;
      const cy2 = ry2 + offsetY;

      // EARLY EXIT CULLING: Check if herringbone tile couplet center coordinates are outside bounding box plus buffer.
      if (
        cx1 < minX - cullBuffer || 
        cx1 > maxX + cullBuffer || 
        cy1 < minY - cullBuffer || 
        cy1 > maxY + cullBuffer
      ) {
        continue;
      }

      tiles.push({
        id: `${layoutId}_hb_${u}_${v}_0`,
        center: { x: cx1, y: cy1 },
        vertices: getTileVertices(cx1, cy1, L_tile, W_tile, globalRotation, 'rectangle'),
        shape: 'rectangle',
      });

      tiles.push({
        id: `${layoutId}_hb_${u}_${v}_1`,
        center: { x: cx2, y: cy2 },
        vertices: getTileVertices(cx2, cy2, L_tile, W_tile, globalRotation + Math.PI / 2, 'rectangle'),
        shape: 'rectangle',
      });
    }
  }

  return tiles;
}
