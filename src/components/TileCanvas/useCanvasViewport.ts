/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Viewport } from './canvasUtils';
import { WallExtension } from '../../types';
import { useAppStore } from '../../store/useAppStore';

import { getTessellatedPath } from '../../utils/geometry';

interface UseCanvasViewportArgs {
  wallWidth: number;
  wallHeight: number;
  wallExtensions: WallExtension[];
  wallVertices?: {x: number, y: number}[];
  zoom: number;
  setZoom: (val: number) => void;
  isBgUnlocked: boolean;
  backgroundImage: string | null;
  bgOffsetX: number;
  bgOffsetY: number;
  setBgOffsetX: (val: number) => void;
  setBgOffsetY: (val: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  wallAngle?: number;
}

export function useCanvasViewport({
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
  wallAngle = 0,
}: UseCanvasViewportArgs) {
  const projectName = useAppStore(state => state.projectName);
  const activePresetId = useAppStore(state => state.activePresetId);
  const currentProjectId = useAppStore(state => state.currentProjectId);
  const unit = useAppStore(state => state.unit);
  const roomDimensions = useAppStore(state => state.roomDimensions);
  const layoutTransform = useAppStore(state => state.layoutTransform);

  const attachedPlane = layoutTransform?.attachedPlane || 'back';
  const drywallWidth = (attachedPlane === 'left' || attachedPlane === 'right') ? roomDimensions.depth : roomDimensions.width;
  const drywallHeight = (attachedPlane === 'floor' || attachedPlane === 'ceiling') ? roomDimensions.depth : roomDimensions.height;

  // Responsive scale & bounds
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });

  const panX = useAppStore(state => state.panX);
  const setPanX = useAppStore(state => state.setPanX);
  const panY = useAppStore(state => state.panY);
  const setPanY = useAppStore(state => state.setPanY);

  const panXRef = useRef(panX);
  const panYRef = useRef(panY);

  useEffect(() => {
    panXRef.current = panX;
    panYRef.current = panY;
  }, [panX, panY]);



  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffsetStart, setPanOffsetStart] = useState({ x: 0, y: 0 });

  // Background overlay dragging states
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const lastZoomTickRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
      const currentZoom = zoomRef.current;
      
      const now = Date.now();
      let newZoom = currentZoom;
      
      // Throttle actual zoom steps to prevent trackpads from maxing out instantly (75ms is a good feel for discrete steps)
      if (now - lastZoomTickRef.current > 75) {
        if (e.deltaY < 0) { // Scroll up -> zoom in
          const currentIndex = ZOOM_LEVELS.findIndex(level => level > currentZoom);
          if (currentIndex !== -1) {
            newZoom = ZOOM_LEVELS[currentIndex];
          } else if (currentZoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]) {
            newZoom = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
          }
        } else if (e.deltaY > 0) { // Scroll down -> zoom out
          const currentIndex = ZOOM_LEVELS.findIndex(level => level >= currentZoom);
          if (currentIndex > 0) {
            newZoom = ZOOM_LEVELS[currentIndex - 1];
          } else if (currentZoom > ZOOM_LEVELS[0]) {
             newZoom = ZOOM_LEVELS[0];
          }
        }

        if (newZoom !== currentZoom) {
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const zoomRatio = newZoom / currentZoom;

          const currentPanX = panXRef.current;
          const currentPanY = panYRef.current;

          const dx = mouseX - (rect.width / 2);
          const dy = mouseY - (rect.height / 2);

          const panOffsetX = (dx - currentPanX) * (zoomRatio - 1);
          const panOffsetY = (dy - currentPanY) * (zoomRatio - 1);

          const newPanX = currentPanX - panOffsetX;
          const newPanY = currentPanY - panOffsetY;

          panXRef.current = newPanX;
          panYRef.current = newPanY;

          setZoom(newZoom);
          setPanX(newPanX);
          setPanY(newPanY);

          lastZoomTickRef.current = now;
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, setZoom, setPanX, setPanY]);

  // Set up container size ResizeObserver observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(300, width),
          height: Math.max(120, height),
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  // Memoized base boundary calculation to avoid expensive operations on every render
  const baseBounds = useMemo(() => {
    return {
      baseMinX: 0,
      baseMinY: 0,
      baseCombinedWidth: drywallWidth,
      baseCombinedHeight: drywallHeight,
    };
  }, [drywallWidth, drywallHeight]);

  // Variables for viewport calculation
  const minX = baseBounds.baseMinX;
  const minY = baseBounds.baseMinY;
  const combinedWidth = baseBounds.baseCombinedWidth;
  const combinedHeight = baseBounds.baseCombinedHeight;

  // 1. Calibrate the Fixed Base Scale (12 pixels per inch, or ~4.72 pixels per cm)
  const FIXED_BASE_SCALE = unit === 'cm' ? (12 / 2.54) : 12; 
  const scale = FIXED_BASE_SCALE * zoom;

  const renderW = combinedWidth * scale;
  const renderH = combinedHeight * scale;

  // Base origin (0,0) starts at 15% from left, 85% from top (bottom-left)
  const cx = dimensions.width * 0.15 + panX;
  const cy = dimensions.height * 0.85 + panY;

  // Project cornerX and cornerY so that (0,0) remains mapped to the absolute camera center
  const cornerX = cx + minX * scale;
  const cornerY = cy - (minY + combinedHeight) * scale;

  const viewport: Viewport = {
    cornerX,
    cornerY,
    renderW,
    renderH,
    scale,
    minX,
    minY,
  };

  const performAutoFit = React.useCallback(() => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : dimensions.width;
    const height = container ? container.clientHeight : dimensions.height;

    let minX = 0;
    let maxX = drywallWidth;
    let minY = 0;
    let maxY = drywallHeight;

    if (wallVertices && wallVertices.length > 0) {
      minX = Math.min(...wallVertices.map(v => v.x));
      maxX = Math.max(...wallVertices.map(v => v.x));
      minY = Math.min(...wallVertices.map(v => v.y));
      maxY = Math.max(...wallVertices.map(v => v.y));
    }

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    
    const centerX = minX + (drawingWidth / 2);
    const centerY = minY + (drawingHeight / 2);

    const rad = (wallAngle * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));
    const rotatedW = drawingWidth * absCos + drawingHeight * absSin;
    const rotatedH = drawingWidth * absSin + drawingHeight * absCos;

    // 15% safety padding margin around all sides
    const paddingX = width * 0.15;
    const paddingY = height * 0.15;
    
    const availableW = Math.max(100, width - paddingX * 2);
    const availableH = Math.max(100, height - paddingY * 2);

    const scaleX = availableW / (rotatedW || 1);
    const scaleY = availableH / (rotatedH || 1);
    const targetScale = Math.min(scaleX, scaleY);

    let targetZoom = targetScale / FIXED_BASE_SCALE;
    
    // Snap to nearest discrete zoom level if desired, or let it be continuous.
    // The prompt says: "Please verify the zoom level maps safely to our discrete CAD zoom levels array (if applicable)"
    // The array is ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]
    // We can just clamp it to a reasonable continuous range so it perfectly fits. 
    // The prompt also says "does not cause infinite resizing loops"
    targetZoom = Math.max(0.1, Math.min(4, targetZoom));

    const finalScale = FIXED_BASE_SCALE * targetZoom;

    // The canvas base origin (cx, cy) is positioned at (15% width, 85% height).
    // To align the center of our bounding box with the exact center (50%) of the viewport,
    // we apply a pan shift that bridges the gap (50% - 15% = +35% for X, 50% - 85% = -35% for Y).
    const targetPanX = width * 0.35 - centerX * finalScale;
    const targetPanY = -height * 0.35 + centerY * finalScale;

    setZoom(targetZoom);
    setPanX(targetPanX);
    setPanY(targetPanY);

    panXRef.current = targetPanX;
    panYRef.current = targetPanY;
    zoomRef.current = targetZoom;
  }, [
    drywallWidth,
    drywallHeight,
    wallAngle,
    dimensions,
    setZoom,
    setPanX,
    setPanY,
    containerRef,
    unit,
    wallVertices,
  ]);

  const performCenter = React.useCallback(() => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : dimensions.width;
    const height = container ? container.clientHeight : dimensions.height;

    let minX = 0;
    let maxX = drywallWidth;
    let minY = 0;
    let maxY = drywallHeight;

    if (wallVertices && wallVertices.length > 0) {
      minX = Math.min(...wallVertices.map(v => v.x));
      maxX = Math.max(...wallVertices.map(v => v.x));
      minY = Math.min(...wallVertices.map(v => v.y));
      maxY = Math.max(...wallVertices.map(v => v.y));
    }

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    
    const centerX = minX + (drawingWidth / 2);
    const centerY = minY + (drawingHeight / 2);

    const finalScale = FIXED_BASE_SCALE * zoomRef.current;

    // The canvas base origin (cx, cy) is positioned at (15% width, 85% height).
    // To align the center of our bounding box with the exact center (50%) of the viewport,
    // we apply a pan shift that bridges the gap (50% - 15% = +35% for X, 50% - 85% = -35% for Y).
    const targetPanX = width * 0.35 - centerX * finalScale;
    const targetPanY = -height * 0.35 + centerY * finalScale;

    setPanX(targetPanX);
    setPanY(targetPanY);

    panXRef.current = targetPanX;
    panYRef.current = targetPanY;
  }, [
    drywallWidth,
    drywallHeight,
    dimensions,
    setPanX,
    setPanY,
    containerRef,
    unit,
    wallVertices,
  ]);

  const fitWorkspaceTrigger = useAppStore((state) => state.fitWorkspaceTrigger);

  // Isolate the Auto-Fit Trigger (The Ref Lock)
  const lastLoadedProjectRef = useRef<string | null>('__INIT__');
  const lastFitTriggerRef = useRef(fitWorkspaceTrigger);
  const hasAutoFittedRef = useRef(false);

  useEffect(() => {
    // We listen to changes in the active project ID or hydration state
    const currentId = currentProjectId || (projectName + activePresetId);
    let shouldRefit = false;
    
    if (currentId !== lastLoadedProjectRef.current) {
      lastLoadedProjectRef.current = currentId;
      shouldRefit = true;
    }
    
    if (fitWorkspaceTrigger !== lastFitTriggerRef.current) {
      lastFitTriggerRef.current = fitWorkspaceTrigger;
      shouldRefit = true;
    }

    if (shouldRefit) {
      hasAutoFittedRef.current = false;
    }
  }, [currentProjectId, projectName, activePresetId, fitWorkspaceTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return;
    if (hasAutoFittedRef.current) return;

    hasAutoFittedRef.current = true;
    
    // Dimension Safety Guard using a micro-deferral
    let rAF2: number;
    const rAF1 = requestAnimationFrame(() => {
      rAF2 = requestAnimationFrame(() => {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          performAutoFit();
        }
      });
    });
    
    return () => {
      cancelAnimationFrame(rAF1);
      if (rAF2) cancelAnimationFrame(rAF2);
    };
  }, [dimensions.width, dimensions.height, performAutoFit, containerRef, currentProjectId, projectName, activePresetId, fitWorkspaceTrigger]);

  // Convert screen coordinates to Wall space
  const screenToWall = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { wx: 0, wy: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let px = screenX - rect.left;
    let py = screenY - rect.top;

    if (wallAngle !== 0) {
      const cx_rot = cornerX + renderW / 2;
      const cy_rot = cornerY + renderH / 2;
      const rad = (-wallAngle * Math.PI) / 180;
      const dx = px - cx_rot;
      const dy = py - cy_rot;
      px = cx_rot + dx * Math.cos(rad) - dy * Math.sin(rad);
      py = cy_rot + dx * Math.sin(rad) + dy * Math.cos(rad);
    }

    px -= cornerX;
    py -= cornerY;

    // y is inverted (0 is bottom of wall)
    const wx = (px / scale) + minX;
    const wy = ((renderH - py) / scale) + minY;
    return { wx, wy };
  };

  const wallToScreen = (wx: number, wy: number) => {
    if (!canvasRef.current) return { px: 0, py: 0 };
    
    let px = (wx - minX) * scale + cornerX;
    let py = cornerY + renderH - (wy - minY) * scale;
    
    if (wallAngle !== 0) {
      const cx_rot = cornerX + renderW / 2;
      const cy_rot = cornerY + renderH / 2;
      const rad = (wallAngle * Math.PI) / 180;
      const dx = px - cx_rot;
      const dy = py - cy_rot;
      px = cx_rot + dx * Math.cos(rad) - dy * Math.sin(rad);
      py = cy_rot + dx * Math.sin(rad) + dy * Math.cos(rad);
    }
    
    return { px, py };
  };

  // Panning UI Action handlers
  const handlePanStart = (clientX: number, clientY: number) => {
    useAppStore.getState().setIsDrafting(true);
    setIsPanningCanvas(true);
    setPanStart({ x: clientX, y: clientY });
    setPanOffsetStart({ x: panX, y: panY });
  };

  const handlePanMove = (clientX: number, clientY: number) => {
    const dx = clientX - panStart.x;
    const dy = clientY - panStart.y;
    panXRef.current = panOffsetStart.x + dx;
    panYRef.current = panOffsetStart.y + dy;
    
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
      });
    }
  };

  const handlePanEnd = () => {
    setIsPanningCanvas(false);
    setPanX(panXRef.current);
    setPanY(panYRef.current);
  };

  // Bg image dragging UI Action handlers
  const handleBgDragStart = (clientX: number, clientY: number) => {
    useAppStore.getState().setIsDrafting(true);
    setIsDraggingBg(true);
    setDragStart({ x: clientX, y: clientY });
    setOffsetStart({ x: bgOffsetX, y: bgOffsetY });
  };

  const handleBgDragMove = (clientX: number, clientY: number) => {
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    setBgOffsetX(offsetStart.x + dx / zoom);
    setBgOffsetY(offsetStart.y + dy / zoom);
  };

  const handleBgDragEnd = () => {
    setIsDraggingBg(false);
  };

  return {
    dimensions,
    viewport,
    panX,
    setPanX,
    panY,
    setPanY,
    panXRef,
    panYRef,
    isPanningCanvas,
    setIsPanningCanvas,
    isDraggingBg,
    setIsDraggingBg,
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
  };
}
