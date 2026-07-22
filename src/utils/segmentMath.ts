/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WallExtension } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface SegmentWithNormal {
  p1: Point;
  p2: Point;
  dx: number;
  dy: number;
  isCurve?: boolean;
  curveNode?: Point;
}

/**
 * Helper to merge collinear, overlapping or touching intervals
 */
export function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current[0] <= last[1] + 0.001) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

/**
 * Automatically calculates and returns individual straight segments with wall boundary information
 */
export function getMergedSegments(
  wallWidth: number,
  wallHeight: number,
  extensions: WallExtension[] = [],
  wallVertices?: {x: number, y: number}[]
): SegmentWithNormal[] {
  if (wallVertices && wallVertices.length >= 3) {
    const perimeterSegments: SegmentWithNormal[] = [];
    for (let i = 0; i < wallVertices.length; i++) {
        const p1 = wallVertices[i];
        const nextPt = wallVertices[(i + 1) % wallVertices.length] as any;
        
        let p2;
        let isCurve = false;
        let curveNode = undefined;
        
        if (nextPt.isCurveNode) {
            isCurve = true;
            curveNode = nextPt;
            p2 = wallVertices[(i + 2) % wallVertices.length];
        } else {
            p2 = nextPt;
        }

        let vx = p2.x - p1.x;
        let vy = p2.y - p1.y;
        let len = Math.sqrt(vx * vx + vy * vy);
        let dx = len > 0 ? vy / len : 0;
        let dy = len > 0 ? -vx / len : 0;

        perimeterSegments.push({
            p1,
            p2,
            dx,
            dy,
            isCurve,
            curveNode
        });
        
        if (isCurve) {
            i++; // skip the curve node
        }
    }
    return perimeterSegments;
  }

  const rects = [
    { x: 0, y: 0, width: wallWidth, height: wallHeight },
    ...extensions.map(ext => ({ x: ext.x, y: ext.y, width: ext.width, height: ext.height }))
  ];

  const xSet = new Set<number>();
  const ySet = new Set<number>();
  rects.forEach(r => {
    xSet.add(r.x);
    xSet.add(r.x + r.width);
    ySet.add(r.y);
    ySet.add(r.y + r.height);
  });

  const xCoords = Array.from(xSet).sort((a, b) => a - b);
  const yCoords = Array.from(ySet).sort((a, b) => a - b);

  const rawHorizontal: { y: number; x1: number; x2: number; dy: number }[] = [];
  const rawVertical: { x: number; y1: number; y2: number; dx: number }[] = [];
  const eps = 0.01;

  const isPointInsideAnyRect = (px: number, py: number): boolean => {
    for (const r of rects) {
      if (px >= r.x - eps && px <= r.x + r.width + eps && py >= r.y - eps && py <= r.y + r.height + eps) {
        return true;
      }
    }
    return false;
  };

  rects.forEach(r => {
    const xLeft = r.x;
    const xRight = r.x + r.width;

    const checkVerticalSegment = (X: number, yStart: number, yEnd: number) => {
      if (Math.abs(yStart - yEnd) < 0.001) return;
      for (let i = 0; i < yCoords.length - 1; i++) {
        const y1 = yCoords[i];
        const y2 = yCoords[i+1];
        if (y1 >= yStart - 0.001 && y2 <= yEnd + 0.001) {
          const midY = (y1 + y2) / 2;
          const insideLeft = isPointInsideAnyRect(X - 0.05, midY);
          const insideRight = isPointInsideAnyRect(X + 0.05, midY);
          if (insideLeft !== insideRight) {
            const dx = insideLeft ? 1 : -1;
            rawVertical.push({ x: X, y1, y2, dx });
          }
        }
      }
    };

    checkVerticalSegment(xLeft, r.y, r.y + r.height);
    checkVerticalSegment(xRight, r.y, r.y + r.height);
  });

  rects.forEach(r => {
    const yBottom = r.y;
    const yTop = r.y + r.height;

    const checkHorizontalSegment = (Y: number, xStart: number, xEnd: number) => {
      if (Math.abs(xStart - xEnd) < 0.001) return;
      for (let i = 0; i < xCoords.length - 1; i++) {
        const x1 = xCoords[i];
        const x2 = xCoords[i+1];
        if (x1 >= xStart - 0.001 && x2 <= xEnd + 0.001) {
          const midX = (x1 + x2) / 2;
          const insideBottom = isPointInsideAnyRect(midX, Y - 0.05);
          const insideTop = isPointInsideAnyRect(midX, Y + 0.05);
          if (insideBottom !== insideTop) {
            const dy = insideBottom ? 1 : -1;
            rawHorizontal.push({ y: Y, x1, x2, dy });
          }
        }
      }
    };

    checkHorizontalSegment(yBottom, r.x, r.x + r.width);
    checkHorizontalSegment(yTop, r.x, r.x + r.width);
  });

  // Merge horizontal segments by (y, dy)
  const hMap: { [key: string]: { y: number; dy: number; intervals: [number, number][] } } = {};
  rawHorizontal.forEach(h => {
    const key = `${h.y.toFixed(4)}_${h.dy}`;
    if (!hMap[key]) {
      hMap[key] = { y: h.y, dy: h.dy, intervals: [] };
    }
    hMap[key].intervals.push([Math.min(h.x1, h.x2), Math.max(h.x1, h.x2)]);
  });

  const mergedSegments: SegmentWithNormal[] = [];

  Object.values(hMap).forEach(group => {
    const mergedIntervals = mergeIntervals(group.intervals);
    mergedIntervals.forEach(([x1, x2]) => {
      mergedSegments.push({
        p1: { x: x1, y: group.y },
        p2: { x: x2, y: group.y },
        dx: 0,
        dy: group.dy
      });
    });
  });

  // Merge vertical segments by (x, dx)
  const vMap: { [key: string]: { x: number; dx: number; intervals: [number, number][] } } = {};
  rawVertical.forEach(v => {
    const key = `${v.x.toFixed(4)}_${v.dx}`;
    if (!vMap[key]) {
      vMap[key] = { x: v.x, dx: v.dx, intervals: [] };
    }
    vMap[key].intervals.push([Math.min(v.y1, v.y2), Math.max(v.y1, v.y2)]);
  });

  Object.values(vMap).forEach(group => {
    const mergedIntervals = mergeIntervals(group.intervals);
    mergedIntervals.forEach(([y1, y2]) => {
      mergedSegments.push({
        p1: { x: group.x, y: y1 },
        p2: { x: group.x, y: y2 },
        dx: group.dx,
        dy: 0
      });
    });
  });

  return mergedSegments;
}
