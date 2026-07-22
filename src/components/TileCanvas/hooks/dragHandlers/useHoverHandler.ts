import React from 'react';
import { getDistanceToSegment } from '../../utils/interactionHelpers';

interface UseHoverHandlerProps {
  wallVertices: any[] | null;
  foldLines: any[] | null;
  wallToScreen: (wx: number, wy: number) => { px: number; py: number };
  containerRef: React.RefObject<HTMLDivElement>;
  setHoveredSegment: (segment: any | null) => void;
  setActiveCursor: (cursor: string) => void;
}

export const useHoverHandler = ({
  wallVertices,
  foldLines,
  wallToScreen,
  containerRef,
  setHoveredSegment,
  setActiveCursor
}: UseHoverHandlerProps) => {

  const handleHoverCheck = (clientX: number, clientY: number, activeTool: string): boolean => {
    if (!wallVertices || wallVertices.length < 3) return false;

    const rect = containerRef.current?.getBoundingClientRect();
    const clickX = rect ? (clientX - rect.left) : 0;
    const clickY = rect ? (clientY - rect.top) : 0;

    // Perform perpendicular Segment Hover Detection first
    let minDistance = Infinity;
    let bestSegment: { type: 'wall' | 'fold'; indexA: number; indexB: number } | null = null;

    const n = wallVertices.length;
    // 1. Check all perimeter wall segments
    for (let i = 0; i < n; i++) {
      const p1 = wallVertices[i];
      const p2 = wallVertices[(i + 1) % n];
      if ((p1 as any).isCurveNode || (p2 as any).isCurveNode) continue;
      const cp1 = wallToScreen(p1.x, p1.y);
      const cp2 = wallToScreen(p2.x, p2.y);
      
      const dist = getDistanceToSegment(clickX, clickY, cp1.px, cp1.py, cp2.px, cp2.py);
      if (dist < minDistance) {
        minDistance = dist;
        bestSegment = { type: 'wall', indexA: i, indexB: (i + 1) % n };
      }
    }

    // 2. Check all fold lines
    if (foldLines && foldLines.length > 0) {
      for (let i = 0; i < foldLines.length; i++) {
        const fold = foldLines[i];
        const startNode = wallVertices[fold.startNodeIndex];
        const endNode = wallVertices[fold.endNodeIndex];
        if (startNode && endNode) {
          const cp1 = wallToScreen(startNode.x, startNode.y);
          const cp2 = wallToScreen(endNode.x, endNode.y);
          const dist = getDistanceToSegment(clickX, clickY, cp1.px, cp1.py, cp2.px, cp2.py);
          if (dist < minDistance) {
            minDistance = dist;
            bestSegment = { type: 'fold', indexA: fold.startNodeIndex, indexB: fold.endNodeIndex };
          }
        }
      }
    }

    if (minDistance <= 10 && bestSegment) {
      setHoveredSegment(bestSegment);
      setActiveCursor('grab');
      return true;
    } else {
      setHoveredSegment(null);
    }

    let hoverDimension = false;
    for (let i = 0; i < n; i++) {
      const p1 = wallVertices[i] as any;
      const nextPt = wallVertices[(i + 1) % n] as any;
      if (p1.isCurveNode || nextPt.isCurveNode) continue;

      const p2 = nextPt;
      const cp1 = wallToScreen(p1.x, p1.y);
      const cp2 = wallToScreen(p2.x, p2.y);

      const vx = p2.x - p1.x;
      const vy = p2.y - p1.y;
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len < 0.1) continue;

      const dx = vy / len;
      const dy = -vx / len;

      const nx = dx;
      const ny = -dy;
      const offsetPixels = 16;

      const midX = (cp1.px + cp2.px) / 2 + nx * offsetPixels;
      const midY = (cp1.py + cp2.py) / 2 + ny * offsetPixels;

      const dist = Math.sqrt((clickX - midX) ** 2 + (clickY - midY) ** 2);
      if (dist < 22) {
        hoverDimension = true;
        break;
      }
    }
    if (hoverDimension) {
      setActiveCursor('pointer');
      return true;
    }

    return false;
  };

  return {
    handleHoverCheck
  };
};
