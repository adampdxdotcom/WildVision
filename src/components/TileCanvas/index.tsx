import React, { useRef } from 'react';
import { CanvasHeader } from './CanvasHeader';
import { ZoomControls } from './components/ZoomControls';
import { FloatingToolbar } from './components/FloatingToolbar';
import { InteractiveNodes } from './components/InteractiveNodes';
import { CanvasLabelsOverlay } from './CanvasLabelsOverlay';
import { VisibilityMenu } from './components/VisibilityMenu';
import { ClientQuantitiesDrawer } from '../ClientQuantitiesDrawer';

import { useCanvasViewport } from './useCanvasViewport';
import { useCanvasInteractions } from './hooks/interactions';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { useTouchNavigation } from './hooks/dragHandlers/useTouchNavigation';
import { generateTiles } from '../../utils/generator';
import { TileInstance } from '../../utils/generator';
import { broadcastCursor } from '../../utils/syncBroadcaster';
import { MultiplayerCursors } from './MultiplayerCursors';

export interface TileCanvasProps {}

import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

const CanvasHeaderWrapper = React.memo(() => {
  const activeSubAreaId = useAppStore(state => state.activeSubAreaId);
  const subAreas = useAppStore(state => state.subAreas);
  const offsetX = useAppStore(state => state.offsetX);
  const offsetY = useAppStore(state => state.offsetY);
  const unit = useAppStore(state => state.unit);

  return (
    <CanvasHeader
      activeSubAreaId={activeSubAreaId}
      subAreas={subAreas}
      offsetX={offsetX}
      offsetY={offsetY}
      unit={unit}
    />
  );
});

const CanvasInteractiveSurface: React.FC = () => {
  const { user } = useAuthStore();
  const wallWidth = useAppStore(state => state.wallWidth);
  const wallHeight = useAppStore(state => state.wallHeight);
  const wallVertices = useAppStore(state => state.wallVertices);
  const setWallVertices = useAppStore(state => state.setWallVertices);
  const unit = useAppStore(state => state.unit);
  const shape = useAppStore(state => state.shape);
  const tileWidth = useAppStore(state => state.tileWidth);
  const tileHeight = useAppStore(state => state.tileHeight);
  const pattern = useAppStore(state => state.pattern);
  const groutWidth = useAppStore(state => state.groutWidth);
  const tileColors = useAppStore(state => state.tileColors);
  const colorPattern = useAppStore(state => state.colorPattern);
  const tilesPerStripe = useAppStore(state => state.tilesPerStripe);
  const colorVariation = useAppStore(state => state.colorVariation);
  const compositeColors = useAppStore(state => state.compositeColors);
  const tileDotColor = compositeColors?.secondary || '#334155';
  const groutColor = useAppStore(state => state.groutColor);
  const offsetX = useAppStore(state => state.offsetX);
  const offsetY = useAppStore(state => state.offsetY);
  const setOffsetX = useAppStore(state => state.setOffsetX);
  const setOffsetY = useAppStore(state => state.setOffsetY);
  const isPainted = useAppStore(state => state.isPainted);
  const rawSubAreas = useAppStore(state => state.subAreas);
  const sceneObjects = useAppStore(state => state.sceneObjects);
  const subAreas = rawSubAreas;
  const setSubAreas = useAppStore(state => state.setSubAreas);
  const activeSubAreaId = useAppStore(state => state.activeSubAreaId);
  const setActiveSubAreaId = useAppStore(state => state.setActiveSubAreaId);
  const angle = useAppStore(state => state.angle);
  const zoom = useAppStore(state => state.zoom);
  const setZoom = useAppStore(state => state.setZoom);
  const wallExtensions = useAppStore(state => state.wallExtensions);
  const setWallExtensions = useAppStore(state => state.setWallExtensions);
  const activeWallExtensionId = useAppStore(state => state.activeWallExtensionId);
  const setActiveWallExtensionId = useAppStore(state => state.setActiveWallExtensionId);
  const isBlankCanvasMode = useAppStore(state => state.isBlankCanvasMode);
  const isPdfExporting = useAppStore(state => state.isPdfExporting);
  const wallBoundaryShape = useAppStore(state => state.wallBoundaryShape);
  const wallArchHeight = useAppStore(state => state.wallArchHeight);
  const wallActiveArches = useAppStore(state => state.wallActiveArches);
  const wallArchDepth = useAppStore(state => state.wallArchDepth);
  const wallAngle = useAppStore(state => state.wallAngle);
  const wallBorder = useAppStore(state => state.wallBorder);
  const backgroundImage = useAppStore(state => state.backgroundImage);
  const isBgUnlocked = useAppStore(state => state.isBgUnlocked);
  const bgScale = useAppStore(state => state.bgScale);
  const setBgScale = useAppStore(state => state.setBgScale);
  const bgOffsetX = useAppStore(state => state.bgOffsetX);
  const setBgOffsetX = useAppStore(state => state.setBgOffsetX);
  const bgOffsetY = useAppStore(state => state.bgOffsetY);
  const setBgOffsetY = useAppStore(state => state.setBgOffsetY);
  const tileOpacity = useAppStore(state => state.tileOpacity);
  const bgOpacity = useAppStore(state => state.bgOpacity);
  const showAccentDistances = useAppStore(state => state.showAccentDistances);
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const archDragBehavior = useAppStore(state => state.archDragBehavior);
  const isPicket = useAppStore(state => state.isPicket);
  const picketLength = useAppStore(state => state.picketLength);
  const draftStitchNodeIndex = useAppStore(state => state.draftStitchNodeIndex);
  const foldLines = useAppStore(state => state.foldLines);
  const removeFold = useAppStore(state => state.removeFold);
  const isDrafting = useAppStore(state => state.isDrafting);
  const tileColorOverrides = useAppStore(state => state.tileColorOverrides);
  const isClientQuantitiesOpen = useAppStore(state => state.isClientQuantitiesOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredFoldIndex, setHoveredFoldIndex] = React.useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mouseScreenPos, setMouseScreenPos] = React.useState<{ px: number; py: number } | null>(null);




  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
    }
  }, [tileColorOverrides, tileColors]);

  const activeCustomPattern = useAppStore(state => state.activeCustomPattern);
  const flatsketVerticalRows = useAppStore(state => state.flatsketVerticalRows);
  const flatsketHorizontalRows = useAppStore(state => state.flatsketHorizontalRows);

  const subAreaTileMap = React.useMemo(() => {
    if (isDrafting) {
      return {};
    }
    const map: Record<string, TileInstance[]> = {};
    for (const sa of subAreas) {
      if (sa.visible === false) continue;
      map[sa.id] = generateTiles({
        wallWidth: sa.width,
        wallHeight: sa.height,
        shape: sa.shape,
        tileWidth: sa.tileWidth,
        tileHeight: sa.tileHeight,
        pattern: sa.pattern,
        groutWidth: sa.groutWidth,
        offsetX: sa.offsetX,
        offsetY: sa.offsetY,
        angle: sa.angle || 0,
        isCutout: sa.isCutout,
        activeCustomPattern: sa.customPatternPayload || activeCustomPattern,
        flatsketVerticalRows: sa.flatsketVerticalRows || flatsketVerticalRows,
        flatsketHorizontalRows: sa.flatsketHorizontalRows || flatsketHorizontalRows,
        layoutId: sa.id,
      } as any);
    }

    if (!isBlankCanvasMode) {
      map['main'] = generateTiles({
        wallWidth,
        wallHeight,
        shape,
        tileWidth,
        tileHeight,
        pattern,
        groutWidth,
        offsetX,
        offsetY,
        angle,
        extensions: wallExtensions,
        isPicket,
        picketLength,
        wallVertices,
        activeCustomPattern,
        flatsketVerticalRows,
        flatsketHorizontalRows,
        layoutId: 'main',
      });
    }

    return map;
  }, [
    subAreas, activeCustomPattern, flatsketVerticalRows, flatsketHorizontalRows,
    isBlankCanvasMode, wallWidth, wallHeight, shape, tileWidth, tileHeight,
    pattern, groutWidth, offsetX, offsetY, angle, wallExtensions, isPicket,
    picketLength, wallVertices, isDrafting
  ]);

  const {
    dimensions,
    viewport,
    panX,
    setPanX,
    panY,
    setPanY,
    panXRef,
    panYRef,
    isPanningCanvas,
    isDraggingBg,
    screenToWall,
    wallToScreen,
    combinedWidth,
    combinedHeight,
    cornerX,
    cornerY,
    renderW,
    renderH,
    scale,
    minX,
    minY,
    dragStart,
    setDragStart,
    offsetStart,
    setOffsetStart,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleBgDragStart,
    handleBgDragMove,
    handleBgDragEnd,
    performAutoFit,
    performCenter,
  } = useCanvasViewport({
    wallWidth,
    wallHeight,
    wallExtensions,
    wallVertices,
    zoom,
    setZoom,
    isBgUnlocked,
    backgroundImage,
    bgOffsetX,
    bgOffsetY,
    setBgOffsetX,
    setBgOffsetY,
    canvasRef,
    containerRef,
    wallAngle,
  });

  const {
    handleTouchDown,
    handleTouchMove,
    handleTouchUp,
    handleTouchCancel
  } = useTouchNavigation({
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
  });

  const [activeEditingSegmentId, setActiveEditingSegmentId] = React.useState<number | null>(null);
  const [activeEditingSegmentSubAreaId, setActiveEditingSegmentSubAreaId] = React.useState<string | null>(null);

  const {
    isDragging,
    draggingVertexIndex,
    draggingSubAreaVertexIndex,
    hoverLineIndex,
    hoverSplitPoint,
    activeCursor,
    marqueeStart,
    marqueeEnd,
    setDraggingVertexIndex,
    setDraggingSubAreaVertexIndex,
    setHoverLineIndex,
    setHoverSplitPoint,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    hoveredSegment,
    draggingSegment,
    activeGuides,
    hoveredSubAreaEdge,
    draggingSubAreaCorner,
    draggingSubAreaId,
  } = useCanvasInteractions({
    scale,
    dimensions,
    containerRef,
    isPanningCanvas,
    isDraggingBg,
    screenToWall,
    wallToScreen,
    dragStart,
    setDragStart,
    offsetStart,
    setOffsetStart,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleBgDragStart,
    handleBgDragMove,
    handleBgDragEnd,
    activeEditingSegmentId,
    setActiveEditingSegmentId,
    activeEditingSegmentSubAreaId,
    setActiveEditingSegmentSubAreaId,
    panX,
    setPanX,
    panY,
    setPanY,
    subAreaTileMap,
  });

  // Execute drawing coordinating logic inside custom canvas renderer hook
  useCanvasRenderer({
    canvasRef,
    overlayCanvasRef,
    dimensions,
    viewport,
    combinedWidth,
    combinedHeight,
    panX,
    panY,
    panXRef,
    panYRef,
    draggingVertexIndex,
    mouseScreenPos,
    hoveredFoldIndex,
    hoveredSegment,
    draggingSegment,
    subAreaTileMap,
    hoveredSubAreaEdge,
    draggingSubAreaHandle: draggingSubAreaCorner,
    draggingSubAreaId,
  });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, a, input, select, textarea, [role="button"], .pointer-events-auto')) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    container.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventDefaultTouch);
      container.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, textarea, [role="button"], .pointer-events-auto')) {
      return;
    }

    if (e.pointerType === 'touch') {
      handleTouchDown(e);
      return;
    }

    if (e.button === 0 && activeTool === 'fold-line' && hoveredFoldIndex !== null) {
      e.stopPropagation();
      e.preventDefault();
      removeFold(hoveredFoldIndex);
      setHoveredFoldIndex(null);
      return;
    }
    onPointerDown(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      handleTouchMove(e);
      return;
    }

    onPointerMove(e);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      
      const cadCoords = screenToWall(e.clientX, e.clientY);
      if (user) {
        broadcastCursor(cadCoords.wx, cadCoords.wy, user.id);
      }

      if (activeTool === 'fold-line' || (activeTool === 'stitch' && draftStitchNodeIndex !== null)) {
        setMouseScreenPos({ px, py });
      }

      if (activeTool === 'fold-line' && foldLines && wallVertices) {
        let minDistance = Infinity;
        let bestIndex: number | null = null;

        for (let idx = 0; idx < foldLines.length; idx++) {
          const fold = foldLines[idx];
          const startNode = wallVertices[fold.startNodeIndex];
          const endNode = wallVertices[fold.endNodeIndex];
          if (startNode && endNode) {
            const p1 = wallToScreen(startNode.x, startNode.y);
            const p2 = wallToScreen(endNode.x, endNode.y);
            const dist = getDistanceToSegment(px, py, p1.px, p1.py, p2.px, p2.py);
            if (dist < minDistance) {
              minDistance = dist;
              bestIndex = idx;
            }
          }
        }

        if (minDistance <= 10) {
          setHoveredFoldIndex(bestIndex);
        } else {
          setHoveredFoldIndex(null);
        }
      } else {
        if (hoveredFoldIndex !== null) {
          setHoveredFoldIndex(null);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      handleTouchUp(e);
      return;
    }

    onPointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      handleTouchCancel(e);
      return;
    }

    onPointerLeave(e);
    setHoveredFoldIndex(null);
  };

  return (
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[160px] border-x border-b border-slate-200 bg-slate-50 overflow-hidden rounded-b-xl touch-none select-none"
        style={{
          cursor: (activeTool === 'fold-line' && hoveredFoldIndex !== null) ? 'crosshair' : activeCursor,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
      >
        {/* Tool Switcher */}
        {!isClientQuantitiesOpen && <FloatingToolbar />}

        {/* CAD-style Layer Visibility Menu */}
        {!isClientQuantitiesOpen && <VisibilityMenu />}

        {/* Real-Time Multiplayer Cursors */}
        <MultiplayerCursors wallToScreen={wallToScreen} />

        {/* Polygon Vertices Interaction Overlay */}
        {!isDrafting && (
          <InteractiveNodes
            wallToScreen={wallToScreen}
            dimensions={dimensions}
            setDraggingVertexIndex={setDraggingVertexIndex}
            setDraggingSubAreaVertexIndex={setDraggingSubAreaVertexIndex}
            activeEditingSegmentId={activeEditingSegmentId}
            setActiveEditingSegmentId={setActiveEditingSegmentId}
            activeEditingSegmentSubAreaId={activeEditingSegmentSubAreaId}
            setActiveEditingSegmentSubAreaId={setActiveEditingSegmentSubAreaId}
          />
        )}

        {/* Canvas Labels Overlay */}
        {!isDrafting && (
          <CanvasLabelsOverlay
            wallToScreen={wallToScreen}
            screenToWall={screenToWall}
            scale={scale}
          />
        )}

        {/* Marquee Selection Overlay */}
        {marqueeStart && marqueeEnd && (
          <div
            className="absolute z-40 border border-dashed border-indigo-500 bg-indigo-500/20 pointer-events-none"
            style={{
              left: Math.min(wallToScreen(marqueeStart.x, marqueeStart.y).px, wallToScreen(marqueeEnd.x, marqueeEnd.y).px),
              top: Math.min(wallToScreen(marqueeStart.x, marqueeStart.y).py, wallToScreen(marqueeEnd.x, marqueeEnd.y).py),
              width: Math.abs(wallToScreen(marqueeEnd.x, marqueeEnd.y).px - wallToScreen(marqueeStart.x, marqueeStart.y).px),
              height: Math.abs(wallToScreen(marqueeEnd.x, marqueeEnd.y).py - wallToScreen(marqueeStart.x, marqueeStart.y).py),
            }}
          />
        )}

        {/* Smart Guides Overlay */}
        {activeGuides && activeGuides.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none z-30" style={{ width: '100%', height: '100%' }}>
            {activeGuides.map((g, i) => {
              if (g.axis === 'x') {
                const pt1 = wallToScreen(g.value, minY);
                const pt2 = wallToScreen(g.value, minY + combinedHeight);
                return <line key={i} x1={pt1.px} y1={pt1.py} x2={pt2.px} y2={pt2.py} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="6 6" />;
              } else {
                const pt1 = wallToScreen(minX, g.value);
                const pt2 = wallToScreen(minX + combinedWidth, g.value);
                return <line key={i} x1={pt1.px} y1={pt1.py} x2={pt2.px} y2={pt2.py} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="6 6" />;
              }
            })}
          </svg>
        )}

        {(activeTool === 'pen' || activeTool === 'pen-arch') && hoverSplitPoint && (
          // Render hover split point preview
          <div 
             className="absolute w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-indigo-500 opacity-80 pointer-events-none z-20 shadow cursor-crosshair border-2 border-white"
             style={{ 
               left: wallToScreen(hoverSplitPoint.x, hoverSplitPoint.y).px, 
               top: wallToScreen(hoverSplitPoint.x, hoverSplitPoint.y).py 
             }}
          />
        )}

        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Room Background"
            className="absolute rounded-none pointer-events-none transition-opacity duration-200"
            referrerPolicy="no-referrer"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${(bgOffsetX * zoom) + panX}px, ${(bgOffsetY * zoom) + panY}px) scale(${bgScale * zoom})`,
              opacity: isDraggingBg ? bgOpacity * 0.3 : bgOpacity,
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          className="block w-full h-full relative"
          data-corner-x={cornerX}
          data-corner-y={cornerY}
          data-render-w={renderW}
          data-render-h={renderH}
        />

        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 block w-full h-full pointer-events-none z-10"
        />

        {/* Floating Elegant Zoom Controls */}
        {!isClientQuantitiesOpen && <ZoomControls onCenter={performCenter} />}

        {/* Client Quantities & Cost Estimator Drawer Overlay */}
        <ClientQuantitiesDrawer />
      </div>
  );
};

export const TileCanvas: React.FC<TileCanvasProps> = React.memo(() => {
  return (
    <div id="tile-canvas-workspace" className="flex flex-col h-full w-full">
      <CanvasHeaderWrapper />

      {/* Interactive Dragging viewport */}
      <CanvasInteractiveSurface />
    </div>
  );
});

function getDistanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}
