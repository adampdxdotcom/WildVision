import React from 'react';
import { useAppStore } from '../../../../store/useAppStore';

export const usePropDragHandler = ({
  screenToWall,
  scale
}: {
  screenToWall: (x: number, y: number) => { wx: number; wy: number };
  scale: number;
}) => {
  const sceneObjects = useAppStore(state => state.sceneObjects || {});
  const updateSceneObject = useAppStore(state => state.updateSceneObject);
  const roomDimensions = useAppStore(state => state.roomDimensions);
  const wallWidth = useAppStore(state => state.wallWidth);
  const wallHeight = useAppStore(state => state.wallHeight);

  const handlePropDragMove = (
    objectId: string,
    deltaX: number,
    deltaY: number,
    startPos: { x: number; y: number },
    isFreeform: boolean,
    gridSize: number
  ) => {
    const obj = sceneObjects[objectId];
    if (!obj) return false;

    const halfW = (obj.metadata?.dimensions?.[0] || 12) / 2;
    const halfH = (obj.metadata?.dimensions?.[1] || 12) / 2;

    const minX = 0;
    const maxX = wallWidth;
    const minY = 0;
    const maxY = wallHeight;

    const rawX = startPos.x + deltaX;
    const rawY = startPos.y + deltaY;

    // Execute the grid snap FIRST
    let snappedX = rawX;
    let snappedY = rawY;
    if (!isFreeform && gridSize > 0) {
      snappedX = Math.round(rawX / gridSize) * gridSize;
      snappedY = Math.round(rawY / gridSize) * gridSize;
    }

    // Execute the clamp SECOND
    const clampedX = Math.max(minX + halfW, Math.min(maxX - halfW, snappedX));
    const clampedY = Math.max(minY + halfH, Math.min(maxY - halfH, snappedY));

    updateSceneObject(objectId, {
      position: [clampedX, clampedY, obj.position[2]]
    });

    return true;
  };

  return { handlePropDragMove };
};

