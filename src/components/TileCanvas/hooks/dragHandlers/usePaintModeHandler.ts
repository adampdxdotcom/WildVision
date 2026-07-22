import { useAppStore } from '../../../../store/useAppStore';
import { isPointInPolygon } from '../../../../utils/geometry';
import { findBestSubArea } from '../../utils/interactionHelpers';

interface UsePaintModeHandlerProps {
  colorPattern: string;
  subAreas: any[];
  activeSubAreaId: string | null;
  setActiveSubAreaId: (id: string | null) => void;
  subAreaTileMap: Record<string, any[]>;
  screenToWall: (clientX: number, clientY: number) => { wx: number; wy: number };
}

export const usePaintModeHandler = ({
  colorPattern,
  subAreas,
  activeSubAreaId,
  setActiveSubAreaId,
  subAreaTileMap,
  screenToWall,
}: UsePaintModeHandlerProps) => {
  const activeSa = activeSubAreaId ? subAreas.find(s => s.id === activeSubAreaId) : null;
  const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint');

  const raycastPaintHit = (wx: number, wy: number, isEraser: boolean = false): boolean => {
    const state = useAppStore.getState();
    const targetTiles = activeSa ? (subAreaTileMap?.[activeSa.id] || []) : (subAreaTileMap?.['main'] || []);

    const saX = activeSa ? activeSa.x : 0;
    const saY = activeSa ? activeSa.y : 0;

    for (const tile of targetTiles) {
      const w = activeSa ? (activeSa.tileWidth || state.tileWidth) : state.tileWidth;
      const h = activeSa ? (activeSa.tileHeight || state.tileHeight) : state.tileHeight;
      const tileMaxDim = Math.max(tile.actualWidth || w, tile.actualHeight || h);
      const limitSq = (tileMaxDim * tileMaxDim) * 1.5;
      
      const cx = tile.center.x + saX;
      const cy = tile.center.y + saY;
      const dx = wx - cx;
      const dy = wy - cy;
      
      if (dx * dx + dy * dy < limitSq) {
        const worldVertices = tile.vertices.map(v => ({ x: v.x + saX, y: v.y + saY }));
        if (isPointInPolygon(wx, wy, worldVertices)) {
          state.setTileColorOverride(tile.id, isEraser ? null : state.activeBrushColorIndex);
          return true; // Hit a tile
        }
      }
    }
    return false;
  };

  const handlePaintStart = (clientX: number, clientY: number, isEraser: boolean = false): boolean => {
    if (!isActiveContextPainting) return false;

    const { wx, wy } = screenToWall(clientX, clientY);
    const clickedSa = findBestSubArea(subAreas, wx, wy);
    const clickedSaId = clickedSa ? clickedSa.id : null;
    const currentSaId = activeSubAreaId || null;
    
    // If user clicked a different context, switch to it and DO NOT paint or drag
    if (clickedSaId !== currentSaId) {
      setActiveSubAreaId(clickedSaId);
      return true; // Return true to say "we handled this click by switching context", so it terminates interaction routing.
    }

    // Otherwise, raycast and paint
    raycastPaintHit(wx, wy, isEraser);
    // Return true to indicate we handled it (and prevent wall panning)
    return true; 
  };

  const handlePaintMove = (clientX: number, clientY: number, isEraser: boolean = false): boolean => {
    if (!isActiveContextPainting) return false;
    const { wx, wy } = screenToWall(clientX, clientY);
    raycastPaintHit(wx, wy, isEraser);
    return true;
  };

  return {
    isActiveContextPainting,
    handlePaintStart,
    handlePaintMove,
  };
};
