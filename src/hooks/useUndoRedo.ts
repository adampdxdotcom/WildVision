import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getSnapshot } from '../store/slices/projectSlice';

export function useUndoRedo() {
  const storeState = useAppStore();
  const {
    projectName,
    wallWidth,
    wallHeight,
    wallVertices,
    unit,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    angle,
    tileName,
    tileColors,
    colorPattern,
    tilesPerStripe,
    compositeColors,
    colorVariation,
    groutColor,
    subAreas,
    wallExtensions,
    isPainted,
    soldAsMosaic,
    mosaicWidth,
    mosaicHeight,
    overage,
    hasNotes,
    notes,
    backgroundImage,
    bgScale,
    bgOffsetX,
    bgOffsetY,
    tileOpacity,
    bgOpacity,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    wallAngle,
    wallBorder,
    mainShapeSettings,
    foldLines,
    sceneObjects,
    roomDimensions,
    roomColors,
    activeCustomPattern,
    tileColorOverrides,
    activeBrushColorIndex,
    layoutFoldType,
    isRestoringHistory,
    setIsRestoringHistory,
    setPastStateStack,
    setFutureStateStack,
    setIsCanvasDirty,
    setLastSavedState,
    setInitialPristineState,
  } = storeState;

  const tileDotColor = compositeColors?.secondary || '#334155';

  useEffect(() => {
    // Run exactly once on mount to capture pristine initial state
    const snapshot = getSnapshot(useAppStore.getState());
    if (!useAppStore.getState().initialPristineState) {
      setInitialPristineState(snapshot);
    }
    if (!useAppStore.getState().lastSavedState) {
      setLastSavedState(snapshot);
    }
  }, []);

  useEffect(() => {
    if (useAppStore.getState().isReceivingRemoteUpdate) return;

    if (isRestoringHistory) {
      // We just restored a snapshot. Re-arm the system and ignore this change.
      setIsRestoringHistory(false);
      return;
    }

    const currentSnapshot = getSnapshot(useAppStore.getState());
    const currentLastSaved = useAppStore.getState().lastSavedState;

    if (!currentLastSaved) {
      setLastSavedState(currentSnapshot);
      return;
    }

    const isDifferent = JSON.stringify(currentLastSaved) !== JSON.stringify(currentSnapshot);
    if (!isDifferent) return;

    // Trigger isCanvasDirty immediately on any modification
    setIsCanvasDirty(true);

    const timer = setTimeout(() => {
      const latestSnapshot = getSnapshot(useAppStore.getState());
      const activeLastSaved = useAppStore.getState().lastSavedState;
      if (JSON.stringify(activeLastSaved) !== JSON.stringify(latestSnapshot)) {
        const currentPast = useAppStore.getState().pastStateStack;
        setPastStateStack([...currentPast, activeLastSaved]);
        setFutureStateStack([]); // Clear redo stack
        setLastSavedState(latestSnapshot);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    projectName,
    wallWidth,
    wallHeight,
    wallVertices,
    unit,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    angle,
    tileName,
    tileColors,
    colorPattern,
    tilesPerStripe,
    tileDotColor,
    activeCustomPattern,
    compositeColors,
    colorVariation,
    groutColor,
    subAreas,
    wallExtensions,
    isPainted,
    soldAsMosaic,
    mosaicWidth,
    mosaicHeight,
    overage,
    hasNotes,
    notes,
    backgroundImage,
    bgScale,
    bgOffsetX,
    bgOffsetY,
    tileOpacity,
    bgOpacity,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    wallAngle,
    wallBorder,
    mainShapeSettings,
    foldLines,
    sceneObjects,
    roomDimensions,
    roomColors,
    tileColorOverrides,
    activeBrushColorIndex,
    layoutFoldType,
    isRestoringHistory,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if the user is typing in an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            useAppStore.getState().handleRedo();
          } else {
            useAppStore.getState().handleUndo();
          }
        } else if (key === 'y') {
          e.preventDefault();
          useAppStore.getState().handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
