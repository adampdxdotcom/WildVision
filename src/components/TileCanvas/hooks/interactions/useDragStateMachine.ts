import { useState, useEffect } from 'react';

interface DragStateMachineProps {
  activeSubAreaId: string | null;
  lockElement: (id: string) => boolean;
  unlockElement: (id: string) => void;
  wallVertices: any[];
}

export const useDragStateMachine = ({
  activeSubAreaId,
  lockElement,
  unlockElement,
  wallVertices,
}: DragStateMachineProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggingSubAreaId, setDraggingSubAreaId] = useState<string | null>(null);
  const [draggingSubAreaCorner, setDraggingSubAreaCorner] = useState<'bl' | 'br' | 'tl' | 'tr' | null>(null);
  const [draggingExtensionId, setDraggingExtensionId] = useState<string | null>(null);
  const [draggingSceneObjectId, setDraggingSceneObjectId] = useState<string | null>(null);
  const [subAreaStartPos, setSubAreaStartPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [extStartPos, setExtStartPos] = useState({ x: 0, y: 0 });
  const [sceneObjectStartPos, setSceneObjectStartPos] = useState({ x: 0, y: 0 });
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [draggingSubAreaVertexIndex, setDraggingSubAreaVertexIndex] = useState<number | null>(null);

  const [dragStartVertexPos, setDragStartVertexPos] = useState<{ x: number, y: number } | null>(null);
  const [dragStartVertices, setDragStartVertices] = useState<{ x: number; y: number; isCurveNode?: boolean; isAngleLocked?: boolean; lockedAngleValue?: number | null }[] | null>(null);

  useEffect(() => {
    if (draggingVertexIndex !== null && wallVertices && wallVertices[draggingVertexIndex] && !dragStartVertexPos) {
      setDragStartVertexPos({ x: wallVertices[draggingVertexIndex].x, y: wallVertices[draggingVertexIndex].y });
      setDragStartVertices(wallVertices.map(v => ({ ...v })));
    } else if (draggingVertexIndex === null) {
      setDragStartVertexPos(null);
      setDragStartVertices(null);
    }
  }, [draggingVertexIndex, wallVertices]);

  const handleSetDraggingSubAreaCorner = (corner: 'bl' | 'br' | 'tl' | 'tr' | null) => {
    if (corner !== null && activeSubAreaId) {
      const elementId = `subarea_${activeSubAreaId}`;
      const success = lockElement(elementId);
      if (!success) return;
    } else {
      if (draggingSubAreaCorner !== null && activeSubAreaId) {
        const elementId = `subarea_${activeSubAreaId}`;
        unlockElement(elementId);
      }
    }
    setDraggingSubAreaCorner(corner);
  };

  const handleSetDraggingVertexIndex = (index: number | null) => {
    if (index !== null) {
      const elementId = `wall_node_${index}`;
      const success = lockElement(elementId);
      if (!success) return;
    } else {
      if (draggingVertexIndex !== null) {
        const elementId = `wall_node_${draggingVertexIndex}`;
        unlockElement(elementId);
      }
    }
    setDraggingVertexIndex(index);
  };

  const handleSetDraggingSubAreaVertexIndex = (index: number | null) => {
    if (index !== null && activeSubAreaId) {
      const elementId = `subarea_node_${activeSubAreaId}_${index}`;
      const success = lockElement(elementId);
      if (!success) return;
    } else {
      if (draggingSubAreaVertexIndex !== null && activeSubAreaId) {
        const elementId = `subarea_node_${activeSubAreaId}_${draggingSubAreaVertexIndex}`;
        unlockElement(elementId);
      }
    }
    setDraggingSubAreaVertexIndex(index);
  };

  const handleSetDraggingSubAreaId = (id: string | null) => {
    if (id !== null) {
      const elementId = `subarea_${id}`;
      const success = lockElement(elementId);
      if (!success) return;
    } else {
      if (draggingSubAreaId !== null) {
        const elementId = `subarea_${draggingSubAreaId}`;
        unlockElement(elementId);
      }
    }
    setDraggingSubAreaId(id);
  };

  return {
    isDragging,
    setIsDragging,
    draggingSubAreaId,
    setDraggingSubAreaId: handleSetDraggingSubAreaId,
    draggingSubAreaCorner,
    setDraggingSubAreaCorner: handleSetDraggingSubAreaCorner,
    draggingExtensionId,
    setDraggingExtensionId,
    draggingSceneObjectId,
    setDraggingSceneObjectId,
    subAreaStartPos,
    setSubAreaStartPos,
    extStartPos,
    setExtStartPos,
    sceneObjectStartPos,
    setSceneObjectStartPos,
    draggingVertexIndex,
    setDraggingVertexIndex: handleSetDraggingVertexIndex,
    draggingSubAreaVertexIndex,
    setDraggingSubAreaVertexIndex: handleSetDraggingSubAreaVertexIndex,
    dragStartVertexPos,
    dragStartVertices,
  };
};
