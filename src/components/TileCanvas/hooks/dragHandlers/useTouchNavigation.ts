import React, { useRef } from 'react';

interface UseTouchNavigationProps {
  containerRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  setZoom: (zoom: number) => void;
  panXRef: React.MutableRefObject<number>;
  panYRef: React.MutableRefObject<number>;
  setPanX: (x: number) => void;
  setPanY: (y: number) => void;
  handlePanStart: (clientX: number, clientY: number) => void;
  handlePanMove: (clientX: number, clientY: number) => void;
  handlePanEnd: () => void;
}

export const useTouchNavigation = ({
  containerRef,
  zoom,
  setZoom,
  panXRef,
  panYRef,
  setPanX,
  setPanY,
  handlePanStart,
  handlePanMove,
  handlePanEnd
}: UseTouchNavigationProps) => {
  const activeTouchPointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const pinchStartMidRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartPanRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activeTouchPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    
    const plist = Array.from(activeTouchPointersRef.current.values());
    if (activeTouchPointersRef.current.size === 1) {
      handlePanStart(e.clientX, e.clientY);
    } else if (activeTouchPointersRef.current.size === 2) {
      const dist = Math.hypot(plist[0].clientX - plist[1].clientX, plist[0].clientY - plist[1].clientY);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      pinchStartMidRef.current = {
        x: (plist[0].clientX + plist[1].clientX) / 2,
        y: (plist[0].clientY + plist[1].clientY) / 2,
      };
      pinchStartPanRef.current = { x: panXRef.current, y: panYRef.current };
    }
  };

  const handleTouchMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchPointersRef.current.has(e.pointerId)) {
      activeTouchPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    const plist = Array.from(activeTouchPointersRef.current.values());
    if (activeTouchPointersRef.current.size === 1) {
      handlePanMove(e.clientX, e.clientY);
    } else if (activeTouchPointersRef.current.size === 2 && pinchStartDistRef.current && pinchStartDistRef.current > 0) {
      const currentDist = Math.hypot(plist[0].clientX - plist[1].clientX, plist[0].clientY - plist[1].clientY);
      const scaleFactor = currentDist / pinchStartDistRef.current;
      let targetZoom = pinchStartZoomRef.current * scaleFactor;
      targetZoom = Math.max(0.25, Math.min(3.0, targetZoom));

      const midX = pinchStartMidRef.current?.x || 0;
      const midY = pinchStartMidRef.current?.y || 0;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const relativeX = midX - rect.left;
        const relativeY = midY - rect.top;

        const zoomRatio = targetZoom / pinchStartZoomRef.current;
        const currentPanX = pinchStartPanRef.current?.x || 0;
        const currentPanY = pinchStartPanRef.current?.y || 0;

        const dx = relativeX - (rect.width / 2);
        const dy = relativeY - (rect.height / 2);

        const panOffsetX = (dx - currentPanX) * (zoomRatio - 1);
        const panOffsetY = (dy - currentPanY) * (zoomRatio - 1);

        const newPanX = currentPanX - panOffsetX;
        const newPanY = currentPanY - panOffsetY;

        panXRef.current = newPanX;
        panYRef.current = newPanY;

        setZoom(targetZoom);
        setPanX(newPanX);
        setPanY(newPanY);
      }
    }
  };

  const handleTouchUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activeTouchPointersRef.current.delete(e.pointerId);
    
    if (activeTouchPointersRef.current.size === 0) {
      handlePanEnd();
      pinchStartDistRef.current = null;
      pinchStartMidRef.current = null;
      pinchStartPanRef.current = null;
    } else if (activeTouchPointersRef.current.size === 1) {
      const remainingTouch = Array.from(activeTouchPointersRef.current.values())[0];
      handlePanStart(remainingTouch.clientX, remainingTouch.clientY);
      pinchStartDistRef.current = null;
      pinchStartMidRef.current = null;
      pinchStartPanRef.current = null;
    }
  };

  const handleTouchCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    activeTouchPointersRef.current.delete(e.pointerId);
    if (activeTouchPointersRef.current.size === 0) {
      handlePanEnd();
      pinchStartDistRef.current = null;
      pinchStartMidRef.current = null;
      pinchStartPanRef.current = null;
    }
  };

  return {
    handleTouchDown,
    handleTouchMove,
    handleTouchUp,
    handleTouchCancel
  };
};
