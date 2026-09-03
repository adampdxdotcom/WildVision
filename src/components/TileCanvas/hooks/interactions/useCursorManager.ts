import { useState, useEffect } from 'react';

export const useCursorManager = (
  isPanningCanvas: boolean,
  isReadOnly: boolean,
  isActiveContextPainting: boolean,
  activeTool: string,
  isBgUnlocked: boolean,
  backgroundImage: any,
  hoveredSubAreaEdge?: { id: string; handle: 'l' | 'r' | 't' | 'b' } | null
) => {
  const [activeCursor, setActiveCursor] = useState<string>('grab');

  useEffect(() => {
    if (isPanningCanvas) {
      setActiveCursor('grabbing');
      return;
    }
    if (isReadOnly) {
      setActiveCursor('grab');
      return;
    }
    if (isActiveContextPainting && activeTool === 'paint') {
      setActiveCursor('crosshair');
      return;
    }
    if (hoveredSubAreaEdge) {
      if (hoveredSubAreaEdge.handle === 'l' || hoveredSubAreaEdge.handle === 'r') {
        setActiveCursor('ew-resize');
      } else {
        setActiveCursor('ns-resize');
      }
      return;
    }
    if (activeTool === 'pen' || activeTool === 'pen-arch') {
      setActiveCursor('crosshair');
    } else if (activeTool === 'eraser') {
      setActiveCursor('cell');
    } else if (activeTool === 'marquee') {
      setActiveCursor('crosshair');
    } else if (activeTool === 'fill') {
      setActiveCursor('copy');
    } else {
      setActiveCursor(isBgUnlocked && backgroundImage ? 'grab' : 'default');
    }
  }, [isPanningCanvas, isBgUnlocked, backgroundImage, activeTool, isActiveContextPainting, isReadOnly, hoveredSubAreaEdge]);

  return { activeCursor, setActiveCursor };
};
