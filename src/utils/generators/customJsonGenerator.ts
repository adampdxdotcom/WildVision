import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';
import { applyRotationAndOffset } from '../generator';

export interface CustomJsonGeneratorParams {
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
  activeCustomPattern?: any;
  layoutId?: string;
  getGridBounds: (stepX: number, stepY: number, rotAngle: number) => { minU: number; maxU: number; minV: number; maxV: number };
}

export function generateCustomJsonTiles(params: CustomJsonGeneratorParams): TileInstance[] {
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
    activeCustomPattern,
    layoutId = 'main',
    getGridBounds
  } = params;

  const STAR_AND_CROSS_SCHEMA = {
    patternName: 'Star & Cross',
    blockWidth: 1.0,
    blockHeight: 1.0,
    tiles: [
      {
        w: 1.0,
        h: 1.0,
        dx: 0.0,
        dy: 0.0,
        shape: 'cross' as TileShape,
        role: 'primary' as const,
      },
      {
        w: 1.0,
        h: 1.0,
        dx: 0.5,
        dy: 0.5,
        shape: 'star' as TileShape,
        role: 'secondary' as const,
      }
    ]
  };

  const schema = activeCustomPattern || STAR_AND_CROSS_SCHEMA;
  if (!schema || typeof schema !== 'object' || !schema.tiles) {
    return [];
  }

  const tiles: TileInstance[] = [];
  const unitStep = tileWidth + groutWidth;
  const blockW = schema.blockWidth * unitStep;
  const blockH = schema.blockHeight * unitStep;

  if (blockW <= 0.1 || blockH <= 0.1) {
    return [];
  }

  const { minU, maxU, minV, maxV } = getGridBounds(blockW, blockH, angleRad);

  for (let u = minU; u <= maxU; u++) {
    for (let v = minV; v <= maxV; v++) {
      const blockX = u * blockW;
      const blockY = v * blockH;

      for (const [idx, t] of schema.tiles.entries()) {
        const instances = t.polarArray?.instances ?? 1;
        const angleStep = t.polarArray?.angleStep ?? 90;
        const pivotX = t.polarArray?.pivotX ?? 0;
        const pivotY = t.polarArray?.pivotY ?? 0;

        for (let cloneIndex = 0; cloneIndex < instances; cloneIndex++) {
          const polarAngleRad = (cloneIndex * angleStep * Math.PI) / 180;

          const physicalW = (t.w * unitStep) - groutWidth;
          const physicalH = (t.h * unitStep) - groutWidth;
          const localCx = t.dx * unitStep;
          const localCy = t.dy * unitStep;
          const dx = blockX + localCx;
          const dy = blockY + localCy;
          const rotated = applyRotationAndOffset(dx, dy, angleRad, offsetX, offsetY);
          const finalCx = rotated.x;
          const finalCy = rotated.y;

          // EARLY EXIT CULLING: Check if custom json pattern tile coordinates are outside bounding box plus buffer.
          if (
            finalCx < minX - cullBuffer || 
            finalCx > maxX + cullBuffer || 
            finalCy < minY - cullBuffer || 
            finalCy > maxY + cullBuffer
          ) {
            continue;
          }

          let computedVertices;
          if (t.shape === 'custom_polygon' && t.vertices && t.vertices.length > 0) {
            computedVertices = t.vertices.map((v: { x: number; y: number }) => {
              let scaledX = v.x * physicalW;
              let scaledY = v.y * physicalH;

              if (cloneIndex > 0) {
                const scaledPivotX = pivotX * physicalW;
                const scaledPivotY = pivotY * physicalH;
                const px = scaledX - scaledPivotX;
                const py = scaledY - scaledPivotY;
                const rx = px * Math.cos(polarAngleRad) - py * Math.sin(polarAngleRad);
                const ry = px * Math.sin(polarAngleRad) + py * Math.cos(polarAngleRad);
                scaledX = rx + scaledPivotX;
                scaledY = ry + scaledPivotY;
              }

              const rotX = scaledX * Math.cos(angleRad) - scaledY * Math.sin(angleRad);
              const rotY = scaledX * Math.sin(angleRad) + scaledY * Math.cos(angleRad);
              return {
                x: finalCx + rotX,
                y: finalCy + rotY
              };
            });
          } else {
            computedVertices = getTileVertices(finalCx, finalCy, physicalW, physicalH, angleRad, t.shape);
          }

          tiles.push({
            id: `${layoutId}_blk_${u}_${v}_${idx}_clone_${cloneIndex}`,
            center: { x: finalCx, y: finalCy },
            vertices: computedVertices,
            shape: t.shape,
            actualWidth: physicalW,
            actualHeight: physicalH,
            role: t.role,
            name: t.name,
            color: t.color
          });
        }
      }
    }
  }

  return tiles;
}
