import React from 'react';
import { getSubAreaVertices } from '../../../../utils/geometry';

interface UseSelectionHandlerProps {
  wallVertices: any[] | null;
  subAreas: any[];
  activeSubAreaId: string | null;
  setActiveEditingSegmentId: (id: number | null) => void;
  setActiveEditingSegmentSubAreaId?: (id: string | null) => void;
  setDraggingSegment: (segment: any) => void;
  setDragStart: (pos: { x: number; y: number }) => void;
  setIsDragging: (dragging: boolean) => void;
  setActiveCursor: (cursor: string) => void;
  wallToScreen: (wx: number, wy: number) => { px: number; py: number };
  containerRef: React.RefObject<HTMLDivElement>;
  lastMouseScreenRef: React.MutableRefObject<{ x: number; y: number } | null>;
}

export const useSelectionHandler = ({
  wallVertices,
  subAreas,
  activeSubAreaId,
  setActiveEditingSegmentId,
  setActiveEditingSegmentSubAreaId,
  setDraggingSegment,
  setDragStart,
  setIsDragging,
  setActiveCursor,
  wallToScreen,
  containerRef,
  lastMouseScreenRef
}: UseSelectionHandlerProps) => {

  const handleSelectionClick = (clientX: number, clientY: number, hoveredSegment: any): boolean => {
    if (!activeSubAreaId && hoveredSegment && wallVertices) {
      const nodeA = wallVertices[hoveredSegment.indexA];
      const nodeB = wallVertices[hoveredSegment.indexB];
      if (nodeA && nodeB) {
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const Nx = len > 1e-6 ? -dy / len : 0;
        const Ny = len > 1e-6 ? dx / len : 0;

        lastMouseScreenRef.current = { x: clientX, y: clientY };
        setDraggingSegment({
          type: hoveredSegment.type,
          indexA: hoveredSegment.indexA,
          indexB: hoveredSegment.indexB,
          Nx,
          Ny,
          origA: { x: nodeA.x, y: nodeA.y },
          origB: { x: nodeB.x, y: nodeB.y }
        });
        setDragStart({ x: clientX, y: clientY });
        setIsDragging(true);
        setActiveCursor('grabbing');
        return true;
      }
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const clickX = rect ? (clientX - rect.left) : 0;
    const clickY = rect ? (clientY - rect.top) : 0;
    
    let hitSegment = false;

    // Check active subarea segments first if there is an active subarea
    if (activeSubAreaId && subAreas) {
      const activeSa = subAreas.find((s) => s.id === activeSubAreaId);
      if (activeSa && !activeSa.locked) {
        const saVertices = getSubAreaVertices(activeSa);
        const n = saVertices.length;
        for (let i = 0; i < n; i++) {
          const p1 = saVertices[i] as any;
          const nextPt = saVertices[(i + 1) % n] as any;
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
            setActiveEditingSegmentId(i);
            if (setActiveEditingSegmentSubAreaId) {
              setActiveEditingSegmentSubAreaId(activeSubAreaId);
            }
            hitSegment = true;
            setIsDragging(false);
            return true;
          }
        }
      }
    }

    // Check wall segments if no subarea segment was hit
    if (!hitSegment && !activeSubAreaId && wallVertices && wallVertices.length >= 3) {
      const n = wallVertices.length;
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
          setActiveEditingSegmentId(i);
          if (setActiveEditingSegmentSubAreaId) {
            setActiveEditingSegmentSubAreaId(null);
          }
          hitSegment = true;
          setIsDragging(false);
          return true;
        }
      }
    }

    return false;
  };

  return {
    handleSelectionClick
  };
};
