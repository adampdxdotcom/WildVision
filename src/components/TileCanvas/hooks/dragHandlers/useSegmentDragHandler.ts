import React from 'react';

interface UseSegmentDragHandlerProps {
  wallVertices: any[] | null;
  setWallVertices: (vertices: any[]) => void;
  unit: string;
  scale: number;
  dragStart: { x: number; y: number };
  draggingSegment: any;
  lastMouseScreenRef: React.MutableRefObject<{ x: number; y: number } | null>;
}

export const useSegmentDragHandler = ({
  wallVertices,
  setWallVertices,
  unit,
  scale,
  dragStart,
  draggingSegment,
  lastMouseScreenRef
}: UseSegmentDragHandlerProps) => {

  const handleSegmentDragMove = (clientX: number, clientY: number, isFreeform: boolean): boolean => {
    if (!draggingSegment || !wallVertices) return false;
    
    const origA = draggingSegment.origA;
    const origB = draggingSegment.origB;
    
    if (origA && origB) {
      const dScreenX = clientX - dragStart.x;
      const dScreenY = clientY - dragStart.y;
      
      // Convert screen delta (pixels) to wall unit delta
      const dWallX = dScreenX / scale;
      const dWallY = -dScreenY / scale; // Screen Y goes down, wall Y goes up
      
      // Calculate shift along normal vector from absolute start
      const shift = dWallX * draggingSegment.Nx + dWallY * draggingSegment.Ny;

      let rawNewNodeAX = origA.x + shift * draggingSegment.Nx;
      let rawNewNodeAY = origA.y + shift * draggingSegment.Ny;
      let rawNewNodeBX = origB.x + shift * draggingSegment.Nx;
      let rawNewNodeBY = origB.y + shift * draggingSegment.Ny;

      const mainGrid = unit === 'cm' ? 10 : 12;
      const subGrid = unit === 'cm' ? 5 : 6;
      const snapTolerance = 15 / scale;

      const snapToGrid = (val: number) => {
        // Try main grid first
        const gridMain = Math.round(val / mainGrid) * mainGrid;
        if (Math.abs(val - gridMain) < snapTolerance) {
          return { snapped: true, value: gridMain };
        }
        // Try sub grid next
        const gridSub = Math.round(val / subGrid) * subGrid;
        if (Math.abs(val - gridSub) < snapTolerance) {
          return { snapped: true, value: gridSub };
        }
        return { snapped: false, value: val };
      };

      let snapX: number | null = null;
      let snapY: number | null = null;

      if (!isFreeform) {
        if (Math.abs(draggingSegment.Nx) > 0.9) {
          const snapRes = snapToGrid(rawNewNodeAX);
          if (snapRes.snapped) {
            rawNewNodeAX = snapRes.value;
            rawNewNodeBX = snapRes.value;
            snapX = snapRes.value;
          }
        }

        if (Math.abs(draggingSegment.Ny) > 0.9) {
          const snapRes = snapToGrid(rawNewNodeAY);
          if (snapRes.snapped) {
            rawNewNodeAY = snapRes.value;
            rawNewNodeBY = snapRes.value;
            snapY = snapRes.value;
          }
        }
      }

      const proposedAX = rawNewNodeAX;
      const proposedAY = rawNewNodeAY;
      const proposedBX = rawNewNodeBX;
      const proposedBY = rawNewNodeBY;

      let finalAX = proposedAX;
      let finalAY = proposedAY;
      let finalBX = proposedBX;
      let finalBY = proposedBY;

      const newNodeA = { ...origA, x: finalAX, y: finalAY };
      const newNodeB = { ...origB, x: finalBX, y: finalBY };

      const nextVertices = wallVertices.map((v, idx) => {
        if (idx === draggingSegment.indexA) return newNodeA;
        if (idx === draggingSegment.indexB) return newNodeB;
        return v;
      });

      setWallVertices(nextVertices);
    }
    
    // Update last mouse position
    if (lastMouseScreenRef) {
      lastMouseScreenRef.current = { x: clientX, y: clientY };
    }
    return true;
  };

  return {
    handleSegmentDragMove
  };
};
