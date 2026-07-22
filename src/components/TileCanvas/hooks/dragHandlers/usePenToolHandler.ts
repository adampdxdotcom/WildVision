import { useState } from 'react';
import { findPenHoverMatch } from '../../utils/interactionHelpers';
import { getSubAreaVertices } from '../../../../utils/geometry';
import { useAppStore } from '../../../../store/useAppStore';

interface UsePenToolHandlerProps {
  wallVertices: any[] | null;
  setWallVertices: (vertices: any[]) => void;
  subAreas: any[];
  setSubAreas: (updater: any) => void;
  activeSubAreaId: string | null;
  setActiveSubAreaId: (id: string | null) => void;
  scale: number;
  unit: string;
  activeTool: string;
  foldLines: any[];
  setFoldLines: (lines: any[]) => void;
  stitches: any[];
  setStitches: (stitches: any[]) => void;
  setActiveWallExtensionId: (id: string | null) => void;
  screenToWall: (x: number, y: number) => { wx: number; wy: number };
  setActiveCursor: (cursor: string) => void;
}

export const usePenToolHandler = ({
  wallVertices,
  setWallVertices,
  subAreas,
  setSubAreas,
  activeSubAreaId,
  setActiveSubAreaId,
  scale,
  unit,
  activeTool,
  foldLines,
  setFoldLines,
  stitches,
  setStitches,
  setActiveWallExtensionId,
  screenToWall,
  setActiveCursor
}: UsePenToolHandlerProps) => {
  const [hoverLineIndex, setHoverLineIndex] = useState<number | null>(null);
  const [hoverSplitPoint, setHoverSplitPoint] = useState<{ x: number; y: number } | null>(null);

  const handlePenHover = (clientX: number, clientY: number) => {
    const { wx, wy } = screenToWall(clientX, clientY);
    const hoverMatch = findPenHoverMatch(wx, wy, subAreas, wallVertices, scale);

    if (hoverMatch) {
      if (activeSubAreaId !== hoverMatch.id) {
        setActiveSubAreaId(hoverMatch.id);
      }
      setHoverLineIndex(hoverMatch.index);
      
      const pA = hoverMatch.vertices[hoverMatch.index];
      const pB = hoverMatch.vertices[(hoverMatch.index + 1) % hoverMatch.vertices.length];
      
      let pt = { x: 0, y: 0 };

      if (activeTool === 'pen-arch') {
        pt = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
      } else {
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const totalLength = Math.hypot(dx, dy);

        if (totalLength > 1e-4) {
          const abLenSq = dx * dx + dy * dy;
          let t = ((wx - pA.x) * dx + (wy - pA.y) * dy) / abLenSq;
          t = Math.max(0, Math.min(1, t));
          const rawScalarDistance = t * totalLength;

          const increment = unit === 'cm' ? 5 : 6;

          let snappedDistance = Math.round(rawScalarDistance / increment) * increment;
          snappedDistance = Math.max(0, Math.min(totalLength, snappedDistance));

          const ux = dx / totalLength;
          const uy = dy / totalLength;

          let finalX = pA.x + snappedDistance * ux;
          let finalY = pA.y + snappedDistance * uy;

          if (Math.abs(dy) < 1e-7) {
            finalY = pA.y;
            finalX = Math.round(finalX);
          } else if (Math.abs(dx) < 1e-7) {
            finalX = pA.x;
            finalY = Math.round(finalY);
          }

          pt = { x: finalX, y: finalY };
        } else {
          pt = { ...hoverMatch.point };
        }
      }

      setHoverSplitPoint(pt);
      setActiveCursor('crosshair');
    } else {
      setHoverLineIndex(null);
      setHoverSplitPoint(null);
    }
  };

  const handlePenClick = (clientX: number, clientY: number): boolean => {
    if (hoverLineIndex === null || !hoverSplitPoint) return false;

    if (activeSubAreaId) {
      const activeSa = subAreas.find((s) => s.id === activeSubAreaId);
      if (activeSa && !activeSa.locked) {
        const saVertices = getSubAreaVertices(activeSa);
        const newVertices = [...saVertices];
        const newNode = { ...hoverSplitPoint } as any;
        if (activeTool === 'pen-arch') newNode.isCurveNode = true;
        newVertices.splice(hoverLineIndex + 1, 0, newNode);

        setSubAreas(
          (prev: any) => prev.map((s: any) => {
            if (s.id === activeSubAreaId) {
              const xs = newVertices.map((v) => v.x);
              const ys = newVertices.map((v) => v.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              return {
                ...s,
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                vertices: newVertices,
              };
            }
            return s;
          })
        );
        setHoverLineIndex(null);
        setHoverSplitPoint(null);
        return true;
      }
    } else if (wallVertices && setWallVertices) {
      const newVertices = [...wallVertices];
      const newNode = { ...hoverSplitPoint } as any;
      if (activeTool === 'pen-arch') {
        newNode.isCurveNode = true;
      } else {
        newNode.isAngleLocked = true;
        newNode.lockedAngleValue = 180;
      }
      newVertices.splice(hoverLineIndex + 1, 0, newNode);

      const insertedIndex = hoverLineIndex + 1;
      const shiftedFolds = foldLines.map(f => ({
        ...f,
        startNodeIndex: f.startNodeIndex >= insertedIndex ? f.startNodeIndex + 1 : f.startNodeIndex,
        endNodeIndex: f.endNodeIndex >= insertedIndex ? f.endNodeIndex + 1 : f.endNodeIndex
      }));
      setFoldLines(shiftedFolds);

      const shiftedStitches = stitches.map(s => ({
        ...s,
        nodeAIndex: s.nodeAIndex >= insertedIndex ? s.nodeAIndex + 1 : s.nodeAIndex,
        nodeBIndex: s.nodeBIndex >= insertedIndex ? s.nodeBIndex + 1 : s.nodeBIndex
      }));
      setStitches(shiftedStitches);

      setWallVertices(newVertices);
      setHoverLineIndex(null);
      setHoverSplitPoint(null);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
      return true;
    }
    return false;
  };

  return {
    hoverLineIndex,
    hoverSplitPoint,
    setHoverLineIndex,
    setHoverSplitPoint,
    handlePenHover,
    handlePenClick
  };
};
