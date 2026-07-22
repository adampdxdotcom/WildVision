import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';
import { applyRotationAndOffset } from '../generator';

export interface FlatsketGeneratorParams {
  actualTileW: number;
  actualTileH: number;
  groutWidth: number;
  offsetX: number;
  offsetY: number;
  angleRad: number;
  cullBuffer: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  flatsketVerticalRows?: number;
  flatsketHorizontalRows?: number;
  layoutId?: string;
  getGridBounds: (stepX: number, stepY: number, rotAngle: number) => { minU: number; maxU: number; minV: number; maxV: number };
}

export function generateFlatsketTiles(params: FlatsketGeneratorParams): TileInstance[] {
  const {
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
    flatsketVerticalRows = 1,
    flatsketHorizontalRows = 3,
    layoutId = 'main',
    getGridBounds
  } = params;

  const tiles: TileInstance[] = [];

  const vRows = Math.max(1, flatsketVerticalRows);
  const hRows = Math.max(1, flatsketHorizontalRows);

  // Standardize dimensions: L is always the long side, S is always the short side.
  const L = Math.max(actualTileW, actualTileH);
  const S = Math.min(actualTileW, actualTileH);

  const vStepX = S + groutWidth;
  const vStepY = L + groutWidth;
  const hStepX = L + groutWidth;
  const hStepY = S + groutWidth;

  const blockH = (vRows * vStepY) + (hRows * hStepY);
  const blockBounds = getGridBounds(1, blockH, angleRad);
  const startBlockY = blockBounds.minV;
  const endBlockY = blockBounds.maxV;
  
  let currentY = startBlockY * blockH;
  
  while (currentY < endBlockY * blockH) {
    // A. Vertical Band Block (Soldiers) -> Width = S, Height = L
    for (let i = 0; i < vRows; i++) {
      const currentYCenter = currentY + L / 2;
      const vBandBounds = getGridBounds(vStepX, 1, angleRad);
      const startC = vBandBounds.minU;
      const endC = vBandBounds.maxU;
      
      for (let c = startC; c <= endC; c++) {
        const cx = c * vStepX + S / 2;
        const rotated = applyRotationAndOffset(cx, currentYCenter, angleRad, offsetX, offsetY);
        const finalCx = rotated.x;
        const finalCy = rotated.y;
        
        // EARLY EXIT CULLING: Check if flat v tile is out of bounds
        if (
          finalCx < minX - cullBuffer || 
          finalCx > maxX + cullBuffer || 
          finalCy < minY - cullBuffer || 
          finalCy > maxY + cullBuffer
        ) {
          continue;
        }
        
        tiles.push({
          id: `${layoutId}_flat_v_${currentY}_${c}_${i}`,
          center: { x: finalCx, y: finalCy },
          vertices: getTileVertices(finalCx, finalCy, S, L, angleRad, 'rectangle'),
          shape: 'rectangle',
          actualWidth: S,
          actualHeight: L
        });
      }
      currentY += vStepY;
    }
    
    // B. Horizontal Band Block (Stack) -> Width = L, Height = S
    for (let j = 0; j < hRows; j++) {
      const currentYCenter = currentY + S / 2;
      const hBandBounds = getGridBounds(hStepX, 1, angleRad);
      const startC = hBandBounds.minU;
      const endC = hBandBounds.maxU;
      
      for (let c = startC; c <= endC; c++) {
        const cx = c * hStepX + L / 2;
        const rotated = applyRotationAndOffset(cx, currentYCenter, angleRad, offsetX, offsetY);
        const finalCx = rotated.x;
        const finalCy = rotated.y;
        
        // EARLY EXIT CULLING: Check if flat h tile is out of bounds
        if (
          finalCx < minX - cullBuffer || 
          finalCx > maxX + cullBuffer || 
          finalCy < minY - cullBuffer || 
          finalCy > maxY + cullBuffer
        ) {
          continue;
        }
        
        tiles.push({
          id: `${layoutId}_flat_h_${currentY}_${c}_${j}`,
          center: { x: finalCx, y: finalCy },
          vertices: getTileVertices(finalCx, finalCy, L, S, angleRad, 'rectangle'),
          shape: 'rectangle',
          actualWidth: L,
          actualHeight: S
        });
      }
      currentY += hStepY;
    }
  }

  return tiles;
}
