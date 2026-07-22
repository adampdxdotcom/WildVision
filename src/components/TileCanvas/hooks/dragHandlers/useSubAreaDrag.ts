import React, { useState } from 'react';
import { SubArea, WallExtension } from '../../../../types';
import { getCombinedWallBounds } from '../../../../utils/geometry';
import { useAppStore } from '../../../../store/useAppStore';

interface UseSubAreaDragArgs {
  scale: number;
  wallWidth: number;
  wallHeight: number;
  wallExtensions: WallExtension[];
  wallVertices: { x: number; y: number }[] | undefined;
  subAreas: SubArea[];
  setSubAreas: (val: SubArea[] | ((prev: SubArea[]) => SubArea[])) => void;
}

export const useSubAreaDrag = ({
  scale,
  wallWidth,
  wallHeight,
  wallExtensions,
  wallVertices,
  subAreas,
  setSubAreas,
}: UseSubAreaDragArgs) => {
  const [activeGuides, setActiveGuides] = useState<{axis: 'x' | 'y', value: number}[]>([]);

  const clearGuides = () => {
    setActiveGuides([]);
  };

  const handleSubAreaDrag = (
    draggingSubAreaId: string | null,
    draggingSubAreaCorner: 'bl' | 'br' | 'tl' | 'tr' | null,
    activeSubAreaId: string | null,
    deltaX: number,
    deltaY: number,
    subAreaStartPos: { x: number; y: number; width: number; height: number },
    isFreeform: boolean = false
  ) => {
    if (draggingSubAreaCorner) {
      const sa = subAreas.find((s) => s.id === activeSubAreaId);
      if (!sa) return;

      const unit = useAppStore.getState().unit || 'in';
      const increment = unit === 'cm' ? 5 : 6;
      const minSize = increment;

      // Target position of the dragged corner in wall space
      let targetX = 0;
      let targetY = 0;

      if (draggingSubAreaCorner === 'bl' || draggingSubAreaCorner === 'tl') {
        targetX = subAreaStartPos.x + deltaX;
      } else {
        targetX = subAreaStartPos.x + subAreaStartPos.width + deltaX;
      }

      if (draggingSubAreaCorner === 'bl' || draggingSubAreaCorner === 'br') {
        targetY = subAreaStartPos.y + deltaY;
      } else {
        targetY = subAreaStartPos.y + subAreaStartPos.height + deltaY;
      }

      // Apply strict rounding mathematically to nearest multiple, UNLESS freeform
      if (!isFreeform) {
        targetX = Math.round(targetX / increment) * increment;
        targetY = Math.round(targetY / increment) * increment;
      }

      let newX = subAreaStartPos.x;
      let newY = subAreaStartPos.y;
      let newWidth = subAreaStartPos.width;
      let newHeight = subAreaStartPos.height;

      const rightX = subAreaStartPos.x + subAreaStartPos.width;
      const topY = subAreaStartPos.y + subAreaStartPos.height;

      if (draggingSubAreaCorner === 'bl') {
        newX = targetX;
        newY = targetY;
        newWidth = rightX - targetX;
        newHeight = topY - targetY;

        if (newWidth < minSize) {
          newWidth = minSize;
          newX = rightX - minSize;
        }
        if (newHeight < minSize) {
          newHeight = minSize;
          newY = topY - minSize;
        }
      } else if (draggingSubAreaCorner === 'br') {
        newY = targetY;
        newWidth = targetX - subAreaStartPos.x;
        newHeight = topY - targetY;

        if (newWidth < minSize) {
          newWidth = minSize;
        }
        if (newHeight < minSize) {
          newHeight = minSize;
          newY = topY - minSize;
        }
      } else if (draggingSubAreaCorner === 'tl') {
        newX = targetX;
        newWidth = rightX - targetX;
        newHeight = targetY - subAreaStartPos.y;

        if (newWidth < minSize) {
          newWidth = minSize;
          newX = rightX - minSize;
        }
        if (newHeight < minSize) {
          newHeight = minSize;
        }
      } else if (draggingSubAreaCorner === 'tr') {
        newWidth = targetX - subAreaStartPos.x;
        newHeight = targetY - subAreaStartPos.y;

        if (newWidth < minSize) {
          newWidth = minSize;
        }
        if (newHeight < minSize) {
          newHeight = minSize;
        }
      }

      // Ensure exact precision for saving to state, UNLESS freeform
      if (!isFreeform) {
        newX = Math.round(newX / increment) * increment;
        newY = Math.round(newY / increment) * increment;
        newWidth = Math.round(newWidth / increment) * increment;
        newHeight = Math.round(newHeight / increment) * increment;
      }

      setSubAreas((prev) =>
        prev.map((item) => {
          if (item.id === activeSubAreaId) {
            return {
              ...item,
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
            };
          }
          return item;
        })
      );
    } else if (draggingSubAreaId) {
      const sa = subAreas.find((s) => s.id === draggingSubAreaId);
      if (!sa) return;

      let newX = subAreaStartPos.x + deltaX;
      let newY = subAreaStartPos.y + deltaY;

      const unit = useAppStore.getState().unit || 'in';
      const increment = unit === 'cm' ? 5 : 6;
      const shapeWidth = sa.width;
      const shapeHeight = sa.height;
      const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);

      // 1. Bounds Clamping
      if (!sa.isStencil) {
        let clampedMinX = bounds.minX;
        let clampedMaxX = bounds.maxX - shapeWidth;
        let clampedMinY = bounds.minY;
        let clampedMaxY = bounds.maxY - shapeHeight;

        if (!isFreeform) {
          clampedMinX = Math.ceil(bounds.minX / increment) * increment;
          clampedMaxX = Math.floor((bounds.maxX - shapeWidth) / increment) * increment;
          clampedMinY = Math.ceil(bounds.minY / increment) * increment;
          clampedMaxY = Math.floor((bounds.maxY - shapeHeight) / increment) * increment;
        }

        newX = Math.max(clampedMinX, Math.min(clampedMaxX, newX));
        newY = Math.max(clampedMinY, Math.min(clampedMaxY, newY));
      }

      if (isFreeform) {
        setActiveGuides([]);
      } else {
        // 2. Base Grid Snapping
        newX = Math.round(newX / increment) * increment;
        newY = Math.round(newY / increment) * increment;

        // 3. Smart Guides (Overrides Grid Snap)
        const targetsX = [ bounds.minX + (bounds.maxX - bounds.minX) / 2 ];
        const targetsY = [ bounds.minY + (bounds.maxY - bounds.minY) / 2 ];

        subAreas.forEach(other => {
          if (other.id !== draggingSubAreaId && !other.locked) {
            targetsX.push(other.x, other.x + other.width / 2, other.x + other.width);
            targetsY.push(other.y, other.y + other.height / 2, other.y + other.height);
          }
        });

        const guides: { axis: 'x' | 'y'; value: number }[] = [];
        
        let minDiffX = increment;
        let offsetX = 0;
        let snappedTargetX: number | null = null;
        const myPointsX = [newX, newX + shapeWidth / 2, newX + shapeWidth];

        targetsX.forEach(target => {
          myPointsX.forEach(pt => {
            const diff = Math.abs(pt - target);
            if (diff < minDiffX) {
              minDiffX = diff;
              offsetX = target - pt;
              snappedTargetX = target;
            }
          });
        });
        if (snappedTargetX !== null) {
          newX += offsetX; // Apply magnetic offset
          guides.push({ axis: 'x', value: snappedTargetX });
        }

        let minDiffY = increment;
        let offsetY = 0;
        let snappedTargetY: number | null = null;
        const myPointsY = [newY, newY + shapeHeight / 2, newY + shapeHeight];

        targetsY.forEach(target => {
          myPointsY.forEach(pt => {
            const diff = Math.abs(pt - target);
            if (diff < minDiffY) {
              minDiffY = diff;
              offsetY = target - pt;
              snappedTargetY = target;
            }
          });
        });
        if (snappedTargetY !== null) {
          newY += offsetY; // Apply magnetic offset
          guides.push({ axis: 'y', value: snappedTargetY });
        }

        setActiveGuides(guides);
      }

      // 4. Dispatch to State (DO NOT re-snap to grid here)
      setSubAreas((prev) =>
        prev.map((item) => {
          if (item.id === draggingSubAreaId) {
            return {
              ...item,
              x: newX,
              y: newY,
            };
          }
          return item;
        })
      );
    }
  };

  return { handleSubAreaDrag, activeGuides, clearGuides };
};
