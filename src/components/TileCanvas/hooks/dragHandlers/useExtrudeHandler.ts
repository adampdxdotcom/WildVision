import { doLineSegmentsIntersect } from '../../../../utils/geometry';
import { useAppStore } from '../../../../store/useAppStore';

interface UseExtrudeHandlerProps {
  wallVertices: { x: number; y: number; isCurveNode?: boolean; isAngleLocked?: boolean; lockedAngleValue?: number | null }[] | null;
  setWallVertices: (vertices: any[]) => void;
  foldLines: any[];
  setFoldLines: (lines: any[]) => void;
  stitches: any[];
  setStitches: (stitches: any[]) => void;
  setDraggingSegment: (segment: any) => void;
  lastMouseScreenRef: React.MutableRefObject<{ x: number; y: number } | null>;
  setDragStart: (pos: { x: number; y: number }) => void;
  setIsDragging: (isDragging: boolean) => void;
  setActiveCursor: (cursor: string) => void;
  draggingSegment: any;
  dragStart: { x: number; y: number };
  scale: number;
}

export const useExtrudeHandler = ({
  wallVertices,
  setWallVertices,
  foldLines,
  setFoldLines,
  stitches,
  setStitches,
  setDraggingSegment,
  lastMouseScreenRef,
  setDragStart,
  setIsDragging,
  setActiveCursor,
  draggingSegment,
  dragStart,
  scale,
}: UseExtrudeHandlerProps) => {

  const handleExtrudeStart = (clientX: number, clientY: number, hoveredSegment: any): boolean => {
    if (hoveredSegment && wallVertices && hoveredSegment.type === 'wall') {
      const { indexA, indexB } = hoveredSegment;
      const nodeA = wallVertices[indexA];
      const nodeB = wallVertices[indexB];
      if (nodeA && nodeB) {
        const nodeAPrime = { ...nodeA };
        const nodeBPrime = { ...nodeB };

        const n = wallVertices.length;
        let newVertices = [...wallVertices];
        let newIdxA = indexA + 1;
        let newIdxB = indexA + 2;

        if (indexA === n - 1 && indexB === 0) {
          newVertices.push(nodeAPrime, nodeBPrime);
          newIdxA = n;
          newIdxB = n + 1;
        } else {
          newVertices.splice(indexA + 1, 0, nodeAPrime, nodeBPrime);
        }

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const Nx = len > 1e-6 ? -dy / len : 0;
        const Ny = len > 1e-6 ? dx / len : 0;

        const insertionIndex = indexA + 1;
        const delta = 2;

        const shiftedFolds = foldLines.map(f => ({
          ...f,
          startNodeIndex: f.startNodeIndex >= insertionIndex ? f.startNodeIndex + delta : f.startNodeIndex,
          endNodeIndex: f.endNodeIndex >= insertionIndex ? f.endNodeIndex + delta : f.endNodeIndex
        }));
        setFoldLines(shiftedFolds);

        const shiftedStitches = stitches.map(s => ({
          ...s,
          nodeAIndex: s.nodeAIndex >= insertionIndex ? s.nodeAIndex + delta : s.nodeAIndex,
          nodeBIndex: s.nodeBIndex >= insertionIndex ? s.nodeBIndex + delta : s.nodeBIndex
        }));
        setStitches(shiftedStitches);

        setWallVertices(newVertices);

        setDraggingSegment({
          type: 'wall',
          indexA: newIdxA,
          indexB: newIdxB,
          Nx,
          Ny,
          origA: { x: nodeAPrime.x, y: nodeAPrime.y },
          origB: { x: nodeBPrime.x, y: nodeBPrime.y }
        });

        lastMouseScreenRef.current = { x: clientX, y: clientY };
        setDragStart({ x: clientX, y: clientY });
        setIsDragging(true);
        setActiveCursor('grabbing');
        return true;
      }
    }
    return false;
  };

  const handleExtrudeMove = (clientX: number, clientY: number, isFreeform: boolean): boolean => {
    if (!draggingSegment || !wallVertices) return false;
    
    const origA = draggingSegment.origA;
    const origB = draggingSegment.origB;
    
    if (origA && origB) {
      const dScreenX = clientX - dragStart.x;
      const dScreenY = clientY - dragStart.y;
      
      const dWallX = dScreenX / scale;
      const dWallY = -dScreenY / scale;
      
      const shift = dWallX * draggingSegment.Nx + dWallY * draggingSegment.Ny;

      let rawNewNodeAX = origA.x + shift * draggingSegment.Nx;
      let rawNewNodeAY = origA.y + shift * draggingSegment.Ny;
      let rawNewNodeBX = origB.x + shift * draggingSegment.Nx;
      let rawNewNodeBY = origB.y + shift * draggingSegment.Ny;

      const unit = useAppStore.getState().unit || 'in';
      const mainGrid = unit === 'cm' ? 10 : 12;
      const subGrid = unit === 'cm' ? 5 : 6;
      const snapTolerance = 15 / scale;

      const snapToGrid = (val: number) => {
        const gridMain = Math.round(val / mainGrid) * mainGrid;
        if (Math.abs(val - gridMain) < snapTolerance) {
          return { snapped: true, value: gridMain };
        }
        const gridSub = Math.round(val / subGrid) * subGrid;
        if (Math.abs(val - gridSub) < snapTolerance) {
          return { snapped: true, value: gridSub };
        }
        return { snapped: false, value: val };
      };

      if (!isFreeform) {
        if (Math.abs(draggingSegment.Nx) > 0.9) {
          const snapRes = snapToGrid(rawNewNodeAX);
          if (snapRes.snapped) {
            rawNewNodeAX = snapRes.value;
            rawNewNodeBX = snapRes.value;
          }
        }
        if (Math.abs(draggingSegment.Ny) > 0.9) {
          const snapRes = snapToGrid(rawNewNodeAY);
          if (snapRes.snapped) {
            rawNewNodeAY = snapRes.value;
            rawNewNodeBY = snapRes.value;
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

      const n = wallVertices.length;
      const idxParentA = (draggingSegment.indexA - 1 + n) % n;
      const idxParentB = (draggingSegment.indexB + 1) % n;
      const parentA = wallVertices[idxParentA];
      const parentB = wallVertices[idxParentB];

      const sharesEndpoint = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        p3: { x: number; y: number },
        p4: { x: number; y: number }
      ) => {
        const eps = 1e-4;
        const distSq = (a: { x: number; y: number }, b: { x: number; y: number }) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          return dx * dx + dy * dy;
        };
        const epsSq = eps * eps;
        if (distSq(p1, p3) < epsSq) return true;
        if (distSq(p1, p4) < epsSq) return true;
        if (distSq(p2, p3) < epsSq) return true;
        if (distSq(p2, p4) < epsSq) return true;
        return false;
      };

      const aabbOverlap = (
        minX1: number, maxX1: number, minY1: number, maxY1: number,
        minX2: number, maxX2: number, minY2: number, maxY2: number
      ) => {
        return maxX1 >= minX2 && maxX2 >= minX1 && maxY1 >= minY2 && maxY2 >= minY1;
      };

      // Precompute static segment AABB bounding boxes once per mouse event
      const staticSegments: {
        p1: { x: number; y: number };
        p2: { x: number; y: number };
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
      }[] = [];

      for (let i = 0; i < n; i++) {
        if (i === idxParentA || i === draggingSegment.indexA || i === draggingSegment.indexB) {
          continue;
        }
        const st1 = wallVertices[i];
        const st2 = wallVertices[(i + 1) % n];
        staticSegments.push({
          p1: st1,
          p2: st2,
          minX: Math.min(st1.x, st2.x),
          maxX: Math.max(st1.x, st2.x),
          minY: Math.min(st1.y, st2.y),
          maxY: Math.max(st1.y, st2.y)
        });
      }

      const isPositionValid = (t: number) => {
        const tempA = {
          x: origA.x + t * (proposedAX - origA.x),
          y: origA.y + t * (proposedAY - origA.y)
        };
        const tempB = {
          x: origB.x + t * (proposedBX - origB.x),
          y: origB.y + t * (proposedBY - origB.y)
        };

        // Bounding boxes for proposed movement segments
        const minX1 = Math.min(parentA.x, tempA.x), maxX1 = Math.max(parentA.x, tempA.x);
        const minY1 = Math.min(parentA.y, tempA.y), maxY1 = Math.max(parentA.y, tempA.y);

        const minX2 = Math.min(tempA.x, tempB.x), maxX2 = Math.max(tempA.x, tempB.x);
        const minY2 = Math.min(tempA.y, tempB.y), maxY2 = Math.max(tempA.y, tempB.y);

        const minX3 = Math.min(tempB.x, parentB.x), maxX3 = Math.max(tempB.x, parentB.x);
        const minY3 = Math.min(tempB.y, parentB.y), maxY3 = Math.max(tempB.y, parentB.y);

        for (let j = 0; j < staticSegments.length; j++) {
          const seg = staticSegments[j];
          const st1 = seg.p1;
          const st2 = seg.p2;

          // seg1 (parentA -> tempA)
          if (aabbOverlap(minX1, maxX1, minY1, maxY1, seg.minX, seg.maxX, seg.minY, seg.maxY)) {
            if (!sharesEndpoint(parentA, tempA, st1, st2)) {
              if (doLineSegmentsIntersect(parentA, tempA, st1, st2)) return false;
            }
          }

          // seg2 (tempA -> tempB)
          if (aabbOverlap(minX2, maxX2, minY2, maxY2, seg.minX, seg.maxX, seg.minY, seg.maxY)) {
            if (!sharesEndpoint(tempA, tempB, st1, st2)) {
              if (doLineSegmentsIntersect(tempA, tempB, st1, st2)) return false;
            }
          }

          // seg3 (tempB -> parentB)
          if (aabbOverlap(minX3, maxX3, minY3, maxY3, seg.minX, seg.maxX, seg.minY, seg.maxY)) {
            if (!sharesEndpoint(tempB, parentB, st1, st2)) {
              if (doLineSegmentsIntersect(tempB, parentB, st1, st2)) return false;
            }
          }
        }
        return true;
      };

      if (isPositionValid(1)) {
        finalAX = proposedAX;
        finalAY = proposedAY;
        finalBX = proposedBX;
        finalBY = proposedBY;
      } else {
        let lowT = 0;
        let highT = 1;
        let bestT = 0;

        for (let step = 0; step < 15; step++) {
          const midT = (lowT + highT) / 2;
          if (isPositionValid(midT)) {
            bestT = midT;
            lowT = midT;
          } else {
            highT = midT;
          }
        }

        if (bestT < 0.999) {
          const eps = 0.1; 
          const dxA = proposedAX - origA.x;
          const dyA = proposedAY - origA.y;
          const lenA = Math.sqrt(dxA * dxA + dyA * dyA);

          let backOffT = bestT;
          if (lenA > 1e-4) {
            const epsT = eps / lenA;
            backOffT = Math.max(0, bestT - epsT);
          }

          finalAX = origA.x + backOffT * (proposedAX - origA.x);
          finalAY = origA.y + backOffT * (proposedAY - origA.y);
          finalBX = origB.x + backOffT * (proposedBX - origB.x);
          finalBY = origB.y + backOffT * (proposedBY - origB.y);
        } else {
          finalAX = origA.x + bestT * (proposedAX - origA.x);
          finalAY = origA.y + bestT * (proposedAY - origA.y);
          finalBX = origB.x + bestT * (proposedBX - origB.x);
          finalBY = origB.y + bestT * (proposedBY - origB.y);
        }
      }

      const newNodeA = { ...origA, x: finalAX, y: finalAY };
      const newNodeB = { ...origB, x: finalBX, y: finalBY };

      const nextVertices = wallVertices.map((v, idx) => {
        if (idx === draggingSegment.indexA) return newNodeA;
        if (idx === draggingSegment.indexB) return newNodeB;
        return v;
      });

      setWallVertices(nextVertices);
      lastMouseScreenRef.current = { x: clientX, y: clientY };
      return true;
    }
    return false;
  };

  return {
    handleExtrudeStart,
    handleExtrudeMove
  };
};
