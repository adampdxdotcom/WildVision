import React from 'react';
import { SubArea } from '../../../types';
import { distanceToPolygonLine, getSubAreaVertices } from '../../../utils/geometry';

export const findBestSubArea = (subAreas: SubArea[], wx: number, wy: number) => {
  const matches = subAreas.filter(
    (sa) => wx >= sa.x && wx <= sa.x + sa.width && wy >= sa.y && wy <= sa.y + sa.height
  );
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => {
    const aLocked = !!a.locked;
    const bLocked = !!b.locked;
    if (aLocked !== bLocked) return aLocked ? 1 : -1;
    return (a.width * a.height) - (b.width * b.height);
  })[0];
};

export const checkSubAreaCornerHit = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  activeSa: SubArea,
  clientX: number,
  clientY: number,
  wallToScreen: (x: number, y: number) => { px: number; py: number }
) => {
  const ptBL = wallToScreen(activeSa.x, activeSa.y);
  const ptBR = wallToScreen(activeSa.x + activeSa.width, activeSa.y);
  const ptTL = wallToScreen(activeSa.x, activeSa.y + activeSa.height);
  const ptTR = wallToScreen(activeSa.x + activeSa.width, activeSa.y + activeSa.height);

  const rect = containerRef.current?.getBoundingClientRect();
  const clickX = rect ? clientX - rect.left : 0;
  const clickY = rect ? clientY - rect.top : 0;

  const tolerance = 15;
  if (Math.hypot(clickX - ptBL.px, clickY - ptBL.py) < tolerance) return { corner: 'bl' as const, cursor: 'nesw-resize' };
  if (Math.hypot(clickX - ptBR.px, clickY - ptBR.py) < tolerance) return { corner: 'br' as const, cursor: 'nwse-resize' };
  if (Math.hypot(clickX - ptTL.px, clickY - ptTL.py) < tolerance) return { corner: 'tl' as const, cursor: 'nwse-resize' };
  if (Math.hypot(clickX - ptTR.px, clickY - ptTR.py) < tolerance) return { corner: 'tr' as const, cursor: 'nesw-resize' };
  
  return null;
};

export const findPenHoverMatch = (
  wx: number,
  wy: number,
  subAreas: SubArea[],
  wallVertices: { x: number; y: number }[] | undefined,
  scale: number
) => {
  const sortedSubAreas = [...subAreas]
    .filter((sa) => !sa.locked)
    .sort((a, b) => (a.width * a.height) - (b.width * b.height));

  for (const sa of sortedSubAreas) {
    const saVertices = getSubAreaVertices(sa);
    const match = distanceToPolygonLine({ x: wx, y: wy }, saVertices);
    if (match && match.distSq < (15 / scale) ** 2) {
      const n = saVertices.length;
      const isCurveEdge = (saVertices[match.index] as any).isCurveNode || (saVertices[(match.index + 1) % n] as any).isCurveNode;
      if (!isCurveEdge) {
        return { isSubArea: true, id: sa.id, index: match.index, point: match.point, vertices: saVertices };
      }
    }
  }

  if (wallVertices) {
    const match = distanceToPolygonLine({ x: wx, y: wy }, wallVertices);
    if (match && match.distSq < (15 / scale) ** 2) {
      const n = wallVertices.length;
      const isCurveEdge = (wallVertices[match.index] as any).isCurveNode || (wallVertices[(match.index + 1) % n] as any).isCurveNode;
      if (!isCurveEdge) {
        return { isSubArea: false, id: null, index: match.index, point: match.point, vertices: wallVertices };
      }
    }
  }
  return null;
};

export const getMarqueeSelectedIndices = (
  marqueeStart: { x: number; y: number },
  marqueeEnd: { x: number; y: number },
  wallVertices: { x: number; y: number }[]
) => {
  const minX = Math.min(marqueeStart.x, marqueeEnd.x);
  const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
  const minY = Math.min(marqueeStart.y, marqueeEnd.y);
  const maxY = Math.max(marqueeStart.y, marqueeEnd.y);

  const indices: number[] = [];
  wallVertices.forEach((v, index) => {
    if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) {
      indices.push(index);
    }
  });
  return indices;
};

export const calculateMagneticSnap = (
  dragged: { x: number; y: number; w?: number; h?: number } | number,
  yOrWallVertices: number | { x: number, y: number }[] | undefined,
  wallVerticesOrSubareas?: { x: number, y: number }[] | SubArea[] | undefined,
  subAreasOrActiveId?: SubArea[] | string | null,
  activeSubAreaIdOrScale?: string | null | number,
  scaleOrNothing?: number
): { x: number, y: number, snappedGrid: boolean, snappedEdge: boolean } => {
  let draggedBox: { x: number; y: number; w: number; h: number };
  let wallVertices: { x: number; y: number }[] | undefined;
  let subAreas: SubArea[];
  let activeSubAreaId: string | null;
  let scale: number;

  if (typeof dragged === 'number') {
    draggedBox = { x: dragged, y: yOrWallVertices as number, w: 0, h: 0 };
    wallVertices = wallVerticesOrSubareas as { x: number; y: number }[] | undefined;
    subAreas = subAreasOrActiveId as SubArea[];
    activeSubAreaId = activeSubAreaIdOrScale as string | null;
    scale = scaleOrNothing as number;
  } else {
    draggedBox = {
      x: dragged.x,
      y: dragged.y,
      w: dragged.w || 0,
      h: dragged.h || 0,
    };
    wallVertices = yOrWallVertices as { x: number; y: number }[] | undefined;
    subAreas = wallVerticesOrSubareas as SubArea[];
    activeSubAreaId = subAreasOrActiveId as string | null;
    scale = activeSubAreaIdOrScale as number;
  }

  const snapDist = 15 / scale;
  const snapDistSq = snapDist * snapDist;

  // Calculate the 4 corners of the draggedBox
  const corners = [
    { x: draggedBox.x, y: draggedBox.y }, // Bottom-Left
    { x: draggedBox.x + draggedBox.w, y: draggedBox.y }, // Bottom-Right
    { x: draggedBox.x, y: draggedBox.y + draggedBox.h }, // Top-Left
    { x: draggedBox.x + draggedBox.w, y: draggedBox.y + draggedBox.h } // Top-Right
  ];

  let bestEdgeSnap: { x: number, y: number } | null = null;
  let bestEdgeDistSq = Infinity;

  const compareEdge = (vertices: { x: number; y: number }[]) => {
    corners.forEach((C) => {
      const match = distanceToPolygonLine(C, vertices);
      if (match && match.distSq < snapDistSq && match.distSq < bestEdgeDistSq) {
        bestEdgeDistSq = match.distSq;
        const deltaX = match.point.x - C.x;
        const deltaY = match.point.y - C.y;
        bestEdgeSnap = {
          x: draggedBox.x + deltaX,
          y: draggedBox.y + deltaY
        };
      }
    });
  };

  // Check master wall
  if (wallVertices) {
    compareEdge(wallVertices);
  }

  // Check sub-areas
  subAreas.forEach((sa) => {
    if (sa.id !== activeSubAreaId && !sa.locked) {
      compareEdge(getSubAreaVertices(sa));
    }
  });

  if (bestEdgeSnap) {
    return { ...bestEdgeSnap, snappedEdge: true, snappedGrid: false };
  }

  // Check Grid (6x6)
  const gridX = Math.round(draggedBox.x / 6) * 6;
  const gridY = Math.round(draggedBox.y / 6) * 6;

  let finalX = draggedBox.x;
  let finalY = draggedBox.y;
  let snappedGrid = false;

  if (Math.abs(draggedBox.x - gridX) < snapDist) {
    finalX = gridX;
    snappedGrid = true;
  }
  if (Math.abs(draggedBox.y - gridY) < snapDist) {
    finalY = gridY;
    snappedGrid = true;
  }

  return { x: finalX, y: finalY, snappedGrid, snappedEdge: false };
};

export function getRegionCentroid(region: { x: number; y: number }[]): { x: number; y: number } {
  if (region.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const v of region) {
    sumX += v.x;
    sumY += v.y;
  }
  return { x: sumX / region.length, y: sumY / region.length };
}

export function getDistanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}
