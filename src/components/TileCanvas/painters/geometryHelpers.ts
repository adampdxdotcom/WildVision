/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubArea } from '../../../types';
import { getTessellatedPath, isPointInPolygon } from '../../../utils/geometry';
import { Viewport, mapToCanvas } from '../canvasUtils';
import { useAppStore } from '../../../store/useAppStore';

/**
 * Checks if a coordinate (tx, ty) is inside a sub-area's boundary shape
 */
export function isPointInSubArea(tx: number, ty: number, sa: SubArea): boolean {
  if (sa.vertices && sa.vertices.length >= 3) {
    const tessellated = getTessellatedPath(sa.vertices);
    return isPointInPolygon(tx, ty, tessellated);
  }

  if (tx < sa.x || tx > sa.x + sa.width || ty < sa.y || ty > sa.y + sa.height) {
    return false;
  }

  if (sa.boundaryShape === 'oval') {
    const rx = sa.width / 2;
    const ry = sa.height / 2;
    const cx = sa.x + rx;
    const cy = sa.y + ry;
    if (rx === 0 || ry === 0) return false;
    return ((tx - cx) / rx) ** 2 + ((ty - cy) / ry) ** 2 <= 1;
  }

  if (sa.boundaryShape === 'arch') {
    const archH = sa.archHeight || (sa.width / 2);
    if (ty >= sa.y + archH) {
      return true;
    }
    const rx = sa.width / 2;
    const ry = archH;
    const cx = sa.x + rx;
    const cy = sa.y + archH;
    if (rx === 0 || ry === 0) return false;
    return ((tx - cx) / rx) ** 2 + ((ty - cy) / ry) ** 2 <= 1;
  }

  return true;
}

/**
 * Checks if a sub-area is in bench mode
 */
export function isSubAreaInBenchMode(sa: SubArea): boolean {
  try {
    const state = useAppStore.getState();
    const { foldLines, wallVertices } = state;
    if (!foldLines || !wallVertices) return false;
    for (const fold of foldLines) {
      const vStart = wallVertices[fold.startNodeIndex];
      const vEnd = wallVertices[fold.endNodeIndex];
      if (vStart && vEnd) {
        const isVertical = Math.abs(vStart.x - vEnd.x) < Math.abs(vStart.y - vEnd.y);
        if (!isVertical) {
          const foldY = (vStart.y + vEnd.y) / 2;
          if (Math.abs(sa.y - foldY) < 0.1 || Math.abs((sa.y + sa.height) - foldY) < 0.1) {
            return true;
          }
        }
      }
    }
  } catch (err) {
    // Graceful fallback
  }
  return false;
}

/**
 * Defines a custom canvas path based on an array of custom sub-area vertices
 */
export function definePolygonVerticesPath(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  vertices: { x: number; y: number; isCurveNode?: boolean }[]
) {
  if (!vertices || vertices.length < 3) return;
  const scaledPts = vertices.map(v => {
    const pt = mapToCanvas(v.x, v.y, viewport);
    return {
      x: pt.x,
      y: pt.y,
      isCurveNode: v.isCurveNode
    };
  });

  let startIndex = scaledPts.findIndex(p => !p.isCurveNode);
  if (startIndex === -1) startIndex = 0;

  const pts = [];
  for (let i = 0; i < scaledPts.length; i++) {
    pts.push(scaledPts[(startIndex + i) % scaledPts.length]);
  }

  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length; i++) {
    const nextPt = pts[(i + 1) % pts.length];
    if (nextPt.isCurveNode) {
      const A = pts[i];
      const B = nextPt;
      const C = pts[(i + 2) % pts.length];
      
      const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
      if (Math.abs(d) > 1e-6) {
        const cxArc = ((A.x*A.x + A.y*A.y) * (B.y - C.y) + (B.x*B.x + B.y*B.y) * (C.y - A.y) + (C.x*C.x + C.y*C.y) * (A.y - B.y)) / d;
        const cyArc = ((A.x*A.x + A.y*A.y) * (C.x - B.x) + (B.x*B.x + B.y*B.y) * (A.x - C.x) + (C.x*C.x + C.y*C.y) * (B.x - A.x)) / d;
        const rArc = Math.sqrt(Math.pow(cxArc - A.x, 2) + Math.pow(cyArc - A.y, 2));

        let startAngle = Math.atan2(A.y - cyArc, A.x - cxArc);
        let endAngle = Math.atan2(C.y - cyArc, C.x - cxArc);
        let midAngle = Math.atan2(B.y - cyArc, B.x - cxArc);

        let diff = endAngle - startAngle;
        while (diff < 0) diff += 2 * Math.PI;
        let midDiff = midAngle - startAngle;
        while (midDiff < 0) midDiff += 2 * Math.PI;
        
        const ccw = midDiff > diff;
        ctx.arc(cxArc, cyArc, rArc, startAngle, endAngle, ccw);
      } else {
        ctx.lineTo(C.x, C.y);
      }
      i++; // skip B
    } else {
      ctx.lineTo(nextPt.x, nextPt.y);
    }
  }
  ctx.closePath();
}
