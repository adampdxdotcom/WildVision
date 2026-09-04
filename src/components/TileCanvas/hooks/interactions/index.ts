import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import { TileInstance } from '../../../../utils/generator';
import { findBestSubArea, checkSubAreaCornerHit, getMarqueeSelectedIndices } from '../../utils/interactionHelpers';

import { useExtrudeHandler } from '../dragHandlers/useExtrudeHandler';
import { usePenToolHandler } from '../dragHandlers/usePenToolHandler';
import { useSelectionHandler } from '../dragHandlers/useSelectionHandler';
import { useHoverHandler } from '../dragHandlers/useHoverHandler';
import { usePinToolHandler } from '../dragHandlers/usePinToolHandler';
import { useSegmentDragHandler } from '../dragHandlers/useSegmentDragHandler';
import { useFillHandler } from '../dragHandlers/useFillHandler';
import { usePaintModeHandler } from '../dragHandlers/usePaintModeHandler';
import { useExtensionDrag } from '../dragHandlers/useExtensionDrag';
import { useSubAreaDrag } from '../dragHandlers/useSubAreaDrag';
import { usePropDragHandler } from '../dragHandlers/usePropDragHandler';
import { useWallNodeDrag } from '../dragHandlers/useWallNodeDrag';

import { useLockBroker } from './useLockBroker';
import { useCursorManager } from './useCursorManager';
import { useDragStateMachine } from './useDragStateMachine';
import { useMarqueeSelector } from './useMarqueeSelector';

interface UseCanvasInteractionsProps {
  scale: number;
  dimensions: { width: number; height: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPanningCanvas: boolean;
  isDraggingBg: boolean;
  screenToWall: (x: number, y: number) => { wx: number; wy: number };
  wallToScreen: (x: number, y: number) => { px: number; py: number };
  dragStart: { x: number; y: number };
  setDragStart: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  offsetStart: { x: number; y: number };
  setOffsetStart: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  handlePanStart: (clientX: number, clientY: number) => void;
  handlePanMove: (clientX: number, clientY: number) => void;
  handlePanEnd: () => void;
  handleBgDragStart: (clientX: number, clientY: number) => void;
  handleBgDragMove: (clientX: number, clientY: number) => void;
  handleBgDragEnd: () => void;
  activeEditingSegmentId: number | null;
  setActiveEditingSegmentId: (id: number | null) => void;
  activeEditingSegmentSubAreaId?: string | null;
  setActiveEditingSegmentSubAreaId?: (id: string | null) => void;
  panX: number;
  setPanX: (val: number) => void;
  panY: number;
  setPanY: (val: number) => void;
  subAreaTileMap?: Record<string, TileInstance[]>;
}

export const useCanvasInteractions = ({
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
  subAreaTileMap = {},
}: UseCanvasInteractionsProps) => {
  const wallWidth = useAppStore(state => state.wallWidth);
  const wallHeight = useAppStore(state => state.wallHeight);
  const wallVertices = useAppStore(state => state.wallVertices);
  const setWallVertices = useAppStore(state => state.setWallVertices);
  const offsetX = useAppStore(state => state.offsetX);
  const offsetY = useAppStore(state => state.offsetY);
  const setOffsetX = useAppStore(state => state.setOffsetX);
  const setOffsetY = useAppStore(state => state.setOffsetY);
  const subAreas = useAppStore(state => state.subAreas);
  const setSubAreas = useAppStore(state => state.setSubAreas);
  const activeSubAreaId = useAppStore(state => state.activeSubAreaId);
  const setActiveSubAreaId = useAppStore(state => state.setActiveSubAreaId);
  const wallExtensions = useAppStore(state => state.wallExtensions);
  const setWallExtensions = useAppStore(state => state.setWallExtensions);
  const setActiveWallExtensionId = useAppStore(state => state.setActiveWallExtensionId);
  const backgroundImage = useAppStore(state => state.backgroundImage);
  const isBgUnlocked = useAppStore(state => state.isBgUnlocked);
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const sceneObjects = useAppStore(state => state.sceneObjects || {});
  const activeObjectId = useAppStore(state => state.activeObjectId);
  const setActiveObjectId = useAppStore(state => state.setActiveObjectId);
  const roomDimensions = useAppStore(state => state.roomDimensions);
  const archDragBehavior = useAppStore(state => state.archDragBehavior);
  const selectedVertexIndices = useAppStore(state => state.selectedVertexIndices);
  const setSelectedVertexIndices = useAppStore(state => state.setSelectedVertexIndices);
  const foldLines = useAppStore(state => state.foldLines);
  const setFoldLines = useAppStore(state => state.setFoldLines);
  const canvasLabels = useAppStore(state => state.canvasLabels);
  const setCanvasLabels = useAppStore(state => state.setCanvasLabels);
  const setEditingLabelId = useAppStore(state => state.setEditingLabelId);
  const stitches = useAppStore(state => state.stitches);
  const setStitches = useAppStore(state => state.setStitches);
  const unit = useAppStore(state => state.unit);
  const anchoredRegionCenter = useAppStore(state => state.anchoredRegionCenter);
  const setIsDrafting = useAppStore(state => state.setIsDrafting);
  const colorPattern = useAppStore(state => state.colorPattern);
  const isReadOnly = useAppStore(state => state.isReadOnly);
  const isPublicViewer = useAppStore(state => state.isPublicViewer);
  const effectiveReadOnly = isReadOnly || isPublicViewer;

  const lockBroker = useLockBroker();

  const dragMachine = useDragStateMachine({
    activeSubAreaId,
    lockElement: lockBroker.lockElement,
    unlockElement: lockBroker.unlockElement,
    wallVertices: wallVertices || [],
  });

  const marquee = useMarqueeSelector();

  const [hoveredSubAreaEdge, setHoveredSubAreaEdge] = useState<{ id: string; handle: 'l' | 'r' | 't' | 'b' } | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{ type: 'wall' | 'fold'; indexA: number; indexB: number } | null>(null);
  const [draggingSegment, setDraggingSegment] = useState<{
    type: 'wall' | 'fold';
    indexA: number;
    indexB: number;
    Nx: number;
    Ny: number;
    origA: { x: number; y: number };
    origB: { x: number; y: number };
  } | null>(null);

  const handleSetDraggingSegment = (segment: any | null) => {
    if (segment !== null) {
      const elementId = `segment_${segment.type}_${segment.indexA}_${segment.indexB}`;
      const success = lockBroker.lockElement(elementId);
      if (!success) return;
    } else {
      if (draggingSegment) {
        const elementId = `segment_${draggingSegment.type}_${draggingSegment.indexA}_${draggingSegment.indexB}`;
        lockBroker.unlockElement(elementId);
      }
    }
    setDraggingSegment(segment);
  };

  const { isActiveContextPainting, handlePaintStart, handlePaintMove } = usePaintModeHandler({
    colorPattern,
    subAreas,
    activeSubAreaId,
    setActiveSubAreaId,
    subAreaTileMap: subAreaTileMap || {},
    screenToWall,
  });

  const { activeCursor, setActiveCursor } = useCursorManager(
    isPanningCanvas,
    effectiveReadOnly,
    isActiveContextPainting,
    activeTool,
    isBgUnlocked,
    backgroundImage,
    hoveredSubAreaEdge
  );

  const { handleFillClick } = useFillHandler({
    wallVertices: wallVertices || [],
    foldLines,
    subAreas,
    setSubAreas,
    setActiveSubAreaId,
    setActiveTool,
    setIsDragging: dragMachine.setIsDragging,
    unit
  });

  const actualDragging = !!(
    dragMachine.isDragging ||
    dragMachine.draggingSubAreaId ||
    dragMachine.draggingSubAreaCorner ||
    dragMachine.draggingExtensionId ||
    dragMachine.draggingVertexIndex !== null ||
    dragMachine.draggingSubAreaVertexIndex !== null ||
    draggingSegment ||
    (window as any).__isDraggingFold ||
    (window as any).__isDraggingStitch
  );

  useEffect(() => {
    if (!(isActiveContextPainting && activeTool === 'paint')) {
      setIsDrafting(actualDragging);
    } else {
      setIsDrafting(false);
    }
  }, [actualDragging, isActiveContextPainting, activeTool, setIsDrafting]);

  const lastMouseScreenRef = useRef<{ x: number; y: number } | null>(null);

  const { handleSegmentDragMove } = useSegmentDragHandler({
    wallVertices,
    setWallVertices,
    unit,
    scale,
    dragStart,
    draggingSegment,
    lastMouseScreenRef
  });

  const {
    hoverLineIndex,
    hoverSplitPoint,
    setHoverLineIndex,
    setHoverSplitPoint,
    handlePenHover,
    handlePenClick
  } = usePenToolHandler({
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
  });

  const { handleSelectionClick } = useSelectionHandler({
    wallVertices: wallVertices || [],
    subAreas,
    activeSubAreaId,
    setActiveEditingSegmentId,
    setActiveEditingSegmentSubAreaId,
    setDraggingSegment: handleSetDraggingSegment,
    setDragStart,
    setIsDragging: dragMachine.setIsDragging,
    setActiveCursor,
    wallToScreen,
    containerRef,
    lastMouseScreenRef
  });

  const { handlePinHover, handlePinClick } = usePinToolHandler({
    wallVertices: wallVertices || [],
    foldLines,
    wallToScreen,
    containerRef,
    anchoredRegionCenter,
    setAnchoredRegionCenter: (center) => useAppStore.getState().setAnchoredRegionCenter(center),
    setIsDragging: dragMachine.setIsDragging,
    setActiveCursor
  });

  const { handleHoverCheck } = useHoverHandler({
    wallVertices: wallVertices || [],
    foldLines,
    subAreas,
    activeSubAreaId,
    wallToScreen,
    containerRef,
    setHoveredSegment,
    setActiveCursor,
    setHoveredSubAreaEdge
  });

  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({
    wallVertices,
    setWallVertices,
    foldLines,
    setFoldLines,
    stitches,
    setStitches,
    setDraggingSegment: handleSetDraggingSegment,
    lastMouseScreenRef,
    setDragStart,
    setIsDragging: dragMachine.setIsDragging,
    setActiveCursor,
    draggingSegment,
    dragStart,
    scale,
  });

  const { handleExtensionDrag } = useExtensionDrag({
    wallWidth,
    wallHeight,
    wallExtensions,
    setWallExtensions,
  });

  const { handleSubAreaDrag, activeGuides, clearGuides } = useSubAreaDrag({
    scale,
    wallWidth,
    wallHeight,
    wallExtensions,
    wallVertices,
    subAreas,
    setSubAreas,
  });

  const { handlePropDragMove } = usePropDragHandler({
    screenToWall,
    scale
  });

  const { handleNodeDrag, handleNodeDragEnd } = useWallNodeDrag({
    scale,
    wallVertices,
    setWallVertices,
    subAreas,
    setSubAreas,
    activeSubAreaId,
    selectedVertexIndices,
    archDragBehavior,
    screenToWall,
    dragStartVertexPos: dragMachine.dragStartVertexPos,
    dragStartVertices: dragMachine.dragStartVertices,
  });

  const handleDragStart = (clientX: number, clientY: number, isShiftPressed: boolean = false) => {
    const { wx, wy } = screenToWall(clientX, clientY);

    if (isActiveContextPainting && activeTool === 'paint') {
      const handled = handlePaintStart(clientX, clientY, isShiftPressed);
      if (handled) {
        dragMachine.setIsDragging(true);
      }
      return;
    }

    if (activeTool === 'fold-line' || activeTool === 'stitch') {
      dragMachine.setIsDragging(false);
      return;
    }

    if (activeTool === 'text') {
      const newLabel = { id: crypto.randomUUID(), x: wx, y: wy, text: 'New Label' };
      setCanvasLabels([...canvasLabels, newLabel]);
      setEditingLabelId(newLabel.id);
      setActiveTool('select');
      dragMachine.setIsDragging(false);
      return;
    }

    if (activeTool === 'marquee') {
      marquee.setMarqueeStart({ x: wx, y: wy });
      marquee.setMarqueeEnd({ x: wx, y: wy });
      setActiveCursor('crosshair');
      dragMachine.setIsDragging(true);
      return;
    }

    if (activeTool === 'fill') {
      const handled = handleFillClick(wx, wy);
      if (handled) return;
    }

    if (isBgUnlocked && backgroundImage) {
      handleBgDragStart(clientX, clientY);
      setActiveCursor('grabbing');
      setSelectedVertexIndices([]);
      return;
    }

const clickedSceneObject = Object.values(sceneObjects).find(obj => {
      if (!(obj.metadata?.isWallLocked === true && obj.attachedPlane === 'back')) return false;
      const width = obj.metadata?.dimensions?.[0] || 12;
      const height = obj.metadata?.dimensions?.[1] || 12; // Use height in 2D (which is position[1] map)
      const objWx = obj.position[0];
      const objWy = obj.position[1];
      // Box is centered on objWx, objWy
      return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
    });

    if (clickedSceneObject) {
      setActiveObjectId(clickedSceneObject.id);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
      dragMachine.setDraggingSceneObjectId(clickedSceneObject.id);
      setDragStart({ x: clientX, y: clientY });
      
      const objWx = clickedSceneObject.position[0];
      const objWy = clickedSceneObject.position[1];
      dragMachine.setSceneObjectStartPos({ x: objWx, y: objWy });
      
      setActiveCursor('move');
      return true;
    } else {
      setActiveObjectId(null);
    }

    let hitSegment = false;
    if (activeTool === 'pin') {
      const handled = handlePinClick(clientX, clientY);
      if (handled) return;
    }

    if (activeTool === 'extrude') {
      const handled = handleExtrudeStart(clientX, clientY, hoveredSegment);
      if (handled) return;
    }

    if (activeTool === 'select') {
      hitSegment = handleSelectionClick(clientX, clientY, hoveredSegment);
      if (hitSegment) return;
    }

    if (!hitSegment) {
      setActiveEditingSegmentId(null);
      if (setActiveEditingSegmentSubAreaId) {
        setActiveEditingSegmentSubAreaId(null);
      }
    }

    if ((activeTool === 'pen' || activeTool === 'pen-arch') && hoverSplitPoint) {
       const handled = handlePenClick(clientX, clientY);
       if (handled) {
         setActiveCursor('default');
         return;
       }
    }

    if (hoveredSubAreaEdge) {
      const sa = subAreas.find((s) => s.id === hoveredSubAreaEdge.id);
      if (sa && !sa.locked) {
        setActiveSubAreaId(sa.id);
        setActiveWallExtensionId(null);
        dragMachine.setDraggingSubAreaCorner(hoveredSubAreaEdge.handle);
        dragMachine.setDraggingSubAreaId(sa.id);
        setDragStart({ x: clientX, y: clientY });
        dragMachine.setSubAreaStartPos({
          x: sa.x,
          y: sa.y,
          width: sa.width,
          height: sa.height,
        });
        setActiveCursor(hoveredSubAreaEdge.handle === 'l' || hoveredSubAreaEdge.handle === 'r' ? 'ew-resize' : 'ns-resize');
        return;
      }
    }

    if (activeSubAreaId) {
      const activeSa = subAreas.find((sa) => sa.id === activeSubAreaId);
      if (activeSa && !activeSa.locked) {
        const cornerHit = checkSubAreaCornerHit(containerRef, activeSa, clientX, clientY, wallToScreen);
        if (cornerHit) {
          dragMachine.setDraggingSubAreaCorner(cornerHit.corner);
          setDragStart({ x: clientX, y: clientY });
          dragMachine.setSubAreaStartPos({
            x: activeSa.x,
            y: activeSa.y,
            width: activeSa.width,
            height: activeSa.height,
          });
          setActiveCursor(cornerHit.cursor);
          return;
        }
      }
    }

    const clickedExt = wallExtensions.find(
      (ext) => !ext.locked && wx >= ext.x && wx <= ext.x + ext.width && wy >= ext.y && wy <= ext.y + ext.height
    );

    if (clickedExt) {
      setActiveWallExtensionId(clickedExt.id);
      setActiveSubAreaId(null);
      dragMachine.setDraggingExtensionId(clickedExt.id);
      setDragStart({ x: clientX, y: clientY });
      dragMachine.setExtStartPos({ x: clickedExt.x, y: clickedExt.y });
      setActiveCursor('move');
      return;
    }

    const clickedSa = findBestSubArea(subAreas, wx, wy);
    if (clickedSa) {
      setActiveSubAreaId(clickedSa.id);
      setActiveWallExtensionId(null);
      setDragStart({ x: clientX, y: clientY });
      if (!clickedSa.locked) {
        dragMachine.setDraggingSubAreaId(clickedSa.id);
        dragMachine.setSubAreaStartPos({ x: clickedSa.x, y: clickedSa.y, width: clickedSa.width, height: clickedSa.height });
        setActiveCursor('move');
      } else {
        dragMachine.setDraggingSubAreaId(null);
        setActiveCursor('default');
      }
    } else {
      dragMachine.setDraggingSubAreaId(null);
      dragMachine.setDraggingExtensionId(null);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
      dragMachine.setIsDragging(false);
      setActiveCursor('default');
      setSelectedVertexIndices([]);
    }
  };

  const handleDragMove = (clientX: number, clientY: number, isFreeform: boolean = false, isOrtho: boolean = false) => {
    const { wx, wy } = screenToWall(clientX, clientY);

    if (isPanningCanvas) {
      handlePanMove(clientX, clientY);
      return;
    }

    if (isActiveContextPainting && activeTool === 'paint') {
      if (dragMachine.isDragging) {
        handlePaintMove(clientX, clientY, isOrtho);
      }
      return;
    }

    if (activeTool === 'marquee' && dragMachine.isDragging) {
      const { wx, wy } = screenToWall(clientX, clientY);
      marquee.setMarqueeEnd({ x: wx, y: wy });
      return;
    }

    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;

    const deltaX = dx / scale;
    const deltaY = -dy / scale;

    if (dragMachine.draggingSceneObjectId && dragMachine.isDragging) {
      const handled = handlePropDragMove(
        dragMachine.draggingSceneObjectId,
        deltaX,
        deltaY,
        dragMachine.sceneObjectStartPos,
        isFreeform,
        unit === 'cm' ? 5 : 6
      );
      if (handled) return;
    }

    if (isBgUnlocked && isDraggingBg) {
      handleBgDragMove(clientX, clientY);
      return;
    }

    if (activeTool === 'extrude' && draggingSegment) {
      const handled = handleExtrudeMove(clientX, clientY, isFreeform);
      if (handled) return;
    }

    if (draggingSegment && wallVertices) {
      const handled = handleSegmentDragMove(clientX, clientY, isFreeform);
      if (handled) return;
    }

    if (activeTool === 'select' && (dragMachine.draggingSubAreaVertexIndex !== null || dragMachine.draggingVertexIndex !== null)) {
      let currentDragStartVertices = dragMachine.dragStartVertices;
      if (dragMachine.draggingVertexIndex !== null && !currentDragStartVertices && wallVertices) {
        const fallbackPos = { x: wallVertices[dragMachine.draggingVertexIndex].x, y: wallVertices[dragMachine.draggingVertexIndex].y };
        const fallbackVertices = wallVertices.map(v => ({ ...v }));
        dragMachine.setDraggingVertexIndex(dragMachine.draggingVertexIndex);
        currentDragStartVertices = fallbackVertices;
      }
      const processed = handleNodeDrag(
        clientX,
        clientY,
        dragMachine.draggingSubAreaVertexIndex,
        dragMachine.draggingVertexIndex,
        currentDragStartVertices || undefined,
        isFreeform,
        isOrtho
      );
      if (processed) return;
    }

    if (!dragMachine.isDragging && !dragMachine.draggingSubAreaId && !dragMachine.draggingExtensionId && !dragMachine.draggingSubAreaCorner && !draggingSegment && !dragMachine.draggingSceneObjectId) {
      if (activeTool === 'pen' || activeTool === 'pen-arch') {
        handlePenHover(clientX, clientY);
        return;
      }

      if (activeTool === 'pin') {
        const isHovering = handlePinHover(clientX, clientY);
        if (isHovering) return;
      }

      if (activeTool === 'select' || activeTool === 'extrude') {
        const isHovering = handleHoverCheck(clientX, clientY, activeTool);
        if (isHovering) return;
      }

      if (isBgUnlocked && backgroundImage) {
        setActiveCursor('grab');
        return;
      }
      const hoveredSceneObject = Object.values(sceneObjects).find(obj => {
        if (!(obj.metadata?.isWallLocked === true && obj.attachedPlane === 'back')) return false;
        const width = obj.metadata?.dimensions?.[0] || 12;
        const height = obj.metadata?.dimensions?.[1] || 12;
        const objWx = obj.position[0];
        const objWy = obj.position[1];
        return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
      });
      const clickedExt = wallExtensions.find(
        (ext) => !ext.locked && wx >= ext.x && wx <= ext.x + ext.width && wy >= ext.y && wy <= ext.y + ext.height
      );
      const bestSa = findBestSubArea(subAreas, wx, wy);
      const isOverUnlockedSa = bestSa && !bestSa.locked;

      if (hoveredSceneObject) {
        setActiveCursor('move');
      } else if (clickedExt) {
        setActiveCursor('move');
      } else if (isOverUnlockedSa) {
        setActiveCursor('move');
      } else {
        setActiveCursor('default');
      }
      return;
    }

    if (dragMachine.draggingExtensionId) {
      handleExtensionDrag(dragMachine.draggingExtensionId, deltaX, deltaY, dragMachine.extStartPos, isFreeform);
    } else if (dragMachine.draggingSubAreaCorner || dragMachine.draggingSubAreaId) {
      handleSubAreaDrag(dragMachine.draggingSubAreaId, dragMachine.draggingSubAreaCorner, activeSubAreaId, deltaX, deltaY, dragMachine.subAreaStartPos, isFreeform);
    } else if (dragMachine.isDragging) {
      setOffsetX(offsetStart.x + deltaX);
      setOffsetY(offsetStart.y + deltaY);
    }
  };

  const handleDragEnd = () => {
    if (activeTool === 'marquee' && marquee.marqueeStart && marquee.marqueeEnd && wallVertices) {
      const indices = getMarqueeSelectedIndices(marquee.marqueeStart, marquee.marqueeEnd, wallVertices);
      setSelectedVertexIndices(indices);
      setActiveTool('select');
      marquee.clearMarquee();
      dragMachine.setIsDragging(false);
      setActiveCursor('default');
      setIsDrafting(false);
      return;
    }

    handleNodeDragEnd(dragMachine.draggingSubAreaVertexIndex, dragMachine.draggingVertexIndex);

    clearGuides();
    handlePanEnd();
    handleBgDragEnd();
    dragMachine.setIsDragging(false);
    dragMachine.setDraggingSubAreaId(null);
    dragMachine.setDraggingSubAreaCorner(null);
    dragMachine.setDraggingExtensionId(null);
    dragMachine.setDraggingSceneObjectId(null);
    dragMachine.setDraggingVertexIndex(null);
    dragMachine.setDraggingSubAreaVertexIndex(null);
    handleSetDraggingSegment(null);
    setHoveredSegment(null);
    setHoveredSubAreaEdge(null);
    lastMouseScreenRef.current = null;
    setActiveCursor('default');
    setIsDrafting(false);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      handlePanStart(e.clientX, e.clientY);
      setActiveCursor('grabbing');
      return;
    }

    if (effectiveReadOnly) {
      if (e.button === 0) {
        e.preventDefault();
        handlePanStart(e.clientX, e.clientY);
        setActiveCursor('grabbing');
      }
      return;
    }

    if (activeTool === 'fold-line' || activeTool === 'stitch') {
      return;
    }

    if (e.button === 0) {
      const activeSa = activeSubAreaId ? subAreas.find(s => s.id === activeSubAreaId) : null;
      const isPaintingNow = ((activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint')) && activeTool === 'paint';
      if (!isPaintingNow) {
        setIsDrafting(true);
        dragMachine.setIsDragging(true);
      }
      const hitProp = handleDragStart(e.clientX, e.clientY, e.shiftKey);
      if (hitProp) {
        e.stopPropagation();
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const isFreeform = e.ctrlKey || e.metaKey;
    const isOrtho = e.shiftKey;
    handleDragMove(e.clientX, e.clientY, isFreeform, isOrtho);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    handleDragEnd();
  };

  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    handleDragEnd();
  };

  return {
    isDragging: dragMachine.isDragging,
    draggingSubAreaId: dragMachine.draggingSubAreaId,
    draggingSubAreaCorner: dragMachine.draggingSubAreaCorner,
    draggingExtensionId: dragMachine.draggingExtensionId,
    subAreaStartPos: dragMachine.subAreaStartPos,
    extStartPos: dragMachine.extStartPos,
    draggingVertexIndex: dragMachine.draggingVertexIndex,
    draggingSubAreaVertexIndex: dragMachine.draggingSubAreaVertexIndex,
    hoverLineIndex,
    hoverSplitPoint,
    activeCursor,
    marqueeStart: marquee.marqueeStart,
    marqueeEnd: marquee.marqueeEnd,
    setDraggingVertexIndex: dragMachine.setDraggingVertexIndex,
    setDraggingSubAreaVertexIndex: dragMachine.setDraggingSubAreaVertexIndex,
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
  };
};
