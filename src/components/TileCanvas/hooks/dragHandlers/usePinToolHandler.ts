import React from 'react';
import { getRegionCentroid } from '../../utils/interactionHelpers';
import { sliceWallIntoRegions } from '../../../../utils/geometry';

interface UsePinToolHandlerProps {
  wallVertices: any[] | null;
  foldLines: any[] | null;
  wallToScreen: (wx: number, wy: number) => { px: number; py: number };
  containerRef: React.RefObject<HTMLDivElement>;
  anchoredRegionCenter: { x: number; y: number } | null;
  setAnchoredRegionCenter: (center: { x: number; y: number } | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setActiveCursor: (cursor: string) => void;
}

export const usePinToolHandler = ({
  wallVertices,
  foldLines,
  wallToScreen,
  containerRef,
  anchoredRegionCenter,
  setAnchoredRegionCenter,
  setIsDragging,
  setActiveCursor
}: UsePinToolHandlerProps) => {

  const handlePinHover = (clientX: number, clientY: number): boolean => {
    if (!wallVertices || wallVertices.length < 3) return false;

    const rect = containerRef.current?.getBoundingClientRect();
    const clickX = rect ? (clientX - rect.left) : 0;
    const clickY = rect ? (clientY - rect.top) : 0;

    const regionsForPin = sliceWallIntoRegions(wallVertices, foldLines);
    let hoverPin = false;
    for (const reg of regionsForPin) {
      const centroid = getRegionCentroid(reg);
      const pinScreen = wallToScreen(centroid.x, centroid.y);
      const dist = Math.hypot(clickX - pinScreen.px, clickY - pinScreen.py);
      if (dist < 18) {
        hoverPin = true;
        break;
      }
    }
    
    if (hoverPin) {
      setActiveCursor('pointer');
      return true;
    } else {
      setActiveCursor('default');
      return true;
    }
  };

  const handlePinClick = (clientX: number, clientY: number): boolean => {
    if (!wallVertices || wallVertices.length < 3) return false;

    const rect = containerRef.current?.getBoundingClientRect();
    const clickX = rect ? (clientX - rect.left) : 0;
    const clickY = rect ? (clientY - rect.top) : 0;

    const regionsForPin = sliceWallIntoRegions(wallVertices, foldLines);
    let clickedPinCentroid: { x: number; y: number } | null = null;
    let clickedPinIsActive = false;

    for (const reg of regionsForPin) {
      const centroid = getRegionCentroid(reg);
      const pinScreen = wallToScreen(centroid.x, centroid.y);
      const dist = Math.hypot(clickX - pinScreen.px, clickY - pinScreen.py);
      if (dist < 18) {
        clickedPinCentroid = centroid;
        const isActive = anchoredRegionCenter &&
          Math.hypot(centroid.x - anchoredRegionCenter.x, centroid.y - anchoredRegionCenter.y) < 1.0;
        if (isActive) {
          clickedPinIsActive = true;
        }
        break;
      }
    }

    if (clickedPinCentroid) {
      if (clickedPinIsActive) {
        setAnchoredRegionCenter(null);
      } else {
        setAnchoredRegionCenter(clickedPinCentroid);
      }
      setIsDragging(false);
      return true;
    }
    
    return false;
  };

  return {
    handlePinHover,
    handlePinClick
  };
};
