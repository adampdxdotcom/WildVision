import { TileShape } from '../../types';
import { TileInstance } from '../generator';
import { getTileVertices } from '../geometry';
import { applyRotationAndOffset } from '../generator';

export interface RhombusLatticeGeneratorParams {
  pattern: string;
  groutWidth: number;
  offsetX: number;
  offsetY: number;
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
  layoutId?: string;
  getGridBounds: (stepX: number, stepY: number, rotAngle: number) => { minU: number; maxU: number; minV: number; maxV: number };
}

export function generateRhombusLatticeTiles(params: RhombusLatticeGeneratorParams): TileInstance[] {
  const {
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
    layoutId = 'main',
    getGridBounds
  } = params;

  const tiles: TileInstance[] = [];
  const { minU, maxU, minV, maxV } = getGridBounds(xStep, yStep, angleRad);

  for (let c = minU; c <= maxU; c++) {
    for (let r = minV; r <= maxV; r++) {
      if (pattern === 'star_lattice') {
        const isRowOdd = Math.abs(r % 2) === 1;
        const gridCx = c * xStep + (isRowOdd ? 0.5 * xStep : 0) + offsetX;
        const gridCy = r * yStep + offsetY;

        const W = actualTileW;
        const H = actualTileH;

        // Shrink the dimensions to create perfectly uniform grout lines around each 60° rhombus
        const shrunkW = W - groutWidth;
        const shrunkH = H - groutWidth * Math.sqrt(3);

        // Place 3 identical 60° rhombuses pointing in the positive directions to tile the plane without duplicates
        const localOffsets = [
          { dx: 0, dy: -H / 2, rotationOffset: 0 },
          { dx: -0.75 * W, dy: H / 4, rotationOffset: (2 * Math.PI) / 3 }, // 120°
          { dx: 0.75 * W, dy: H / 4, rotationOffset: (4 * Math.PI) / 3 }  // 240°
        ];

        for (let i = 0; i < localOffsets.length; i++) {
          const opt = localOffsets[i];
          // Rotate the local offsets around the star center gridCx/gridCy based on global layout angle
          const rotatedOffset = applyRotationAndOffset(opt.dx, opt.dy, angleRad, gridCx, gridCy);
          const cx = rotatedOffset.x;
          const cy = rotatedOffset.y;

          // EARLY EXIT CULLING
          if (
            cx < minX - cullBuffer || 
            cx > maxX + cullBuffer || 
            cy < minY - cullBuffer || 
            cy > maxY + cullBuffer
          ) {
            continue;
          }

          const finalTileAngle = angleRad + opt.rotationOffset;

          tiles.push({
            id: `${layoutId}_star_${c}_${r}_${i}`,
            center: { x: cx, y: cy },
            vertices: getTileVertices(cx, cy, shrunkW, shrunkH, finalTileAngle, 'diamond'),
            shape: 'diamond'
          });
        }
      } else if (pattern === '3d_cube') {
        // Calculate the local coordinates of the cube center point
        const isRowOdd = Math.abs(r % 2) === 1;
        const localCubeCx = c * xStep + (isRowOdd ? 0.5 * xStep : 0);
        const localCubeCy = r * yStep;

        // Check if the whole cube is out of bounds
        const cubeRot = applyRotationAndOffset(localCubeCx, localCubeCy, angleRad, offsetX, offsetY);
        const cubeCx = cubeRot.x;
        const cubeCy = cubeRot.y;

        // EARLY EXIT CULLING: Check if 3D cube model is out of bounds before parsing faces.
        if (
          cubeCx < minX - cullBuffer || 
          cubeCx > maxX + cullBuffer || 
          cubeCy < minY - cullBuffer || 
          cubeCy > maxY + cullBuffer
        ) {
          continue;
        }

        const W = actualTileW;
        const H = actualTileH;

        const facesConf = [
          {
            type: 'top' as const,
            fx: localCubeCx,
            fy: localCubeCy - H / 4,
            verts: [
              { x: localCubeCx, y: localCubeCy },
              { x: localCubeCx + W / 2, y: localCubeCy - H / 4 },
              { x: localCubeCx, y: localCubeCy - H / 2 },
              { x: localCubeCx - W / 2, y: localCubeCy - H / 4 },
            ]
          },
          {
            type: 'left' as const,
            fx: localCubeCx - W / 4,
            fy: localCubeCy + H / 8,
            verts: [
              { x: localCubeCx, y: localCubeCy },
              { x: localCubeCx - W / 2, y: localCubeCy - H / 4 },
              { x: localCubeCx - W / 2, y: localCubeCy + H / 4 },
              { x: localCubeCx, y: localCubeCy + H / 2 },
            ]
          },
          {
            type: 'right' as const,
            fx: localCubeCx + W / 4,
            fy: localCubeCy + H / 8,
            verts: [
              { x: localCubeCx, y: localCubeCy },
              { x: localCubeCx + W / 2, y: localCubeCy - H / 4 },
              { x: localCubeCx + W / 2, y: localCubeCy + H / 4 },
              { x: localCubeCx, y: localCubeCy + H / 2 },
            ]
          }
        ];

        for (const face of facesConf) {
          const shrunkVerts = face.verts.map((v) => {
            const dx = v.x - face.fx;
            const dy = v.y - face.fy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.05) {
              const sf = Math.max(0.1, Math.min(1.0, (dist - groutWidth / 2) / dist));
              return {
                x: face.fx + dx * sf,
                y: face.fy + dy * sf,
              };
            }
            return v;
          });

          const rotateScaleAndTranslate = (pt: { x: number; y: number }) => {
            return applyRotationAndOffset(pt.x, pt.y, angleRad, offsetX, offsetY);
          };

          const finalCenter = rotateScaleAndTranslate({ x: face.fx, y: face.fy });
          const finalVertices = shrunkVerts.map(rotateScaleAndTranslate);

          tiles.push({
            id: `${layoutId}_${pattern}_${c}_${r}_${face.type}`,
            center: finalCenter,
            vertices: finalVertices,
            shape: 'diamond',
            cubeFace: face.type,
          });
        }
      }
    }
  }

  return tiles;
}
