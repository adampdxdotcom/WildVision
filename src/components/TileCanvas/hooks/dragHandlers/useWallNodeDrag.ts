import { SubArea } from '../../../../types';
import {
  getInternalAngle,
  getSignedArea,
  getSubAreaVertices,
} from '../../../../utils/geometry';
import { useAppStore } from '../../../../store/useAppStore';
import { handleSubAreaNodeDrag } from './handleSubAreaNodeDrag';
import { handleMainWallNodeDrag } from './handleMainWallNodeDrag';

interface UseWallNodeDragArgs {
  scale: number;
  wallVertices: { x: number; y: number }[] | undefined;
  setWallVertices: (val: { x: number; y: number }[] | ((prev: { x: number; y: number }[]) => { x: number; y: number }[])) => void;
  subAreas: SubArea[];
  setSubAreas: (val: SubArea[] | ((prev: SubArea[]) => SubArea[])) => void;
  activeSubAreaId: string | null;
  selectedVertexIndices: number[];
  archDragBehavior: 'symmetric' | 'proportional';
  screenToWall: (sx: number, sy: number) => { wx: number; wy: number };
  dragStartVertexPos: { x: number; y: number } | null;
  dragStartVertices?: { x: number; y: number; isCurveNode?: boolean; isAngleLocked?: boolean; lockedAngleValue?: number | null; isLengthLocked?: boolean; lockedLengthValue?: number | null }[] | null;
}

export const useWallNodeDrag = ({
  scale,
  wallVertices,
  setWallVertices,
  subAreas,
  setSubAreas,
  activeSubAreaId,
  selectedVertexIndices,
  archDragBehavior,
  screenToWall,
  dragStartVertexPos,
  dragStartVertices,
}: UseWallNodeDragArgs) => {
  const handleNodeDrag = (
    clientX: number,
    clientY: number,
    draggingSubAreaVertexIndex: number | null,
    draggingVertexIndex: number | null,
    overrideDragStartVertices?: any[],
    isFreeform: boolean = false,
    isOrtho: boolean = false
  ): boolean => {
    const unit = useAppStore.getState().unit || 'in';
    const increment = unit === 'cm' ? 5 : 6;

    if (draggingSubAreaVertexIndex !== null) {
      return handleSubAreaNodeDrag({
        clientX,
        clientY,
        draggingSubAreaVertexIndex,
        scale,
        subAreas,
        setSubAreas,
        activeSubAreaId,
        archDragBehavior,
        screenToWall,
        increment,
        isFreeform,
        isOrtho,
        dragStartVertexPos
      });
    }

    if (draggingVertexIndex !== null && !activeSubAreaId) {
      return handleMainWallNodeDrag({
        clientX,
        clientY,
        draggingVertexIndex,
        scale,
        wallVertices,
        setWallVertices,
        selectedVertexIndices,
        archDragBehavior,
        screenToWall,
        dragStartVertices: overrideDragStartVertices !== undefined ? overrideDragStartVertices : dragStartVertices,
        increment,
        isFreeform,
        isOrtho,
        dragStartVertexPos
      });
    }

    return false;
  };

  const handleNodeDragEnd = (
    draggingSubAreaVertexIndex: number | null,
    draggingVertexIndex: number | null
  ) => {
    if (draggingSubAreaVertexIndex !== null && activeSubAreaId) {
      const activeSa = subAreas.find((s) => s.id === activeSubAreaId);
      if (activeSa && !activeSa.locked) {
        const saVertices = getSubAreaVertices(activeSa);
        const node = saVertices[draggingSubAreaVertexIndex] as any;
        if (node.isAngleLocked && !node.isCurveNode) {
          const n = saVertices.length;
          const prev = saVertices[(draggingSubAreaVertexIndex - 1 + n) % n];
          const next = saVertices[(draggingSubAreaVertexIndex + 1) % n];
          const isCCW = getSignedArea(saVertices) >= 0;
          const finalAngle = getInternalAngle(prev, node, next, isCCW);

          const newVertices = [...saVertices];
          (newVertices[draggingSubAreaVertexIndex] as any).lockedAngleValue = finalAngle;
          setSubAreas((prevSa) =>
            prevSa.map((s) => {
              if (s.id === activeSubAreaId) {
                return { ...s, vertices: newVertices };
              }
              return s;
            })
          );
        }
      }
    }

    if (draggingVertexIndex !== null && wallVertices && setWallVertices) {
      const node = wallVertices[draggingVertexIndex] as any;
      if (node.isAngleLocked && !node.isCurveNode) {
        const n = wallVertices.length;
        const prev = wallVertices[(draggingVertexIndex - 1 + n) % n];
        const next = wallVertices[(draggingVertexIndex + 1) % n];
        const isCCW = getSignedArea(wallVertices) >= 0;
        const finalAngle = getInternalAngle(prev, node, next, isCCW);

        const newVertices = [...wallVertices];
        (newVertices[draggingVertexIndex] as any).lockedAngleValue = finalAngle;
        setWallVertices(newVertices);
      }
    }
  };

  return { handleNodeDrag, handleNodeDragEnd };
};
