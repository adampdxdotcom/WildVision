import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useCloudAutoSave = () => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentProjectId,
    currentProjectName,
    setProjectMetadata,
    isAutoSaveEnabled,
    setCloudSyncError,
    isLockedByAnotherTab,
    onlineUsers,
    currentProjectPermission,
    
    // Design/Canvas states to watch
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
    viewSettings,
    offsetX,
    offsetY,
    subAreas,
    activeSubAreaId,
    wallExtensions,
    activeWallExtensionId,
    isPainted,
    isBlankCanvasMode,
    activePresetId,
    soldAsMosaic,
    mosaicWidth,
    mosaicHeight,
    overage,
    hasNotes,
    notes,
    angleDisplayMode,
    backgroundImage,
    isBgUnlocked,
    bgScale,
    bgOffsetX,
    bgOffsetY,
    tileOpacity,
    bgOpacity,
    exportPhotoBg,
    showAccentDistances,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    wallAngle,
    wallBorder,
    mainShapeSettings,
    foldLines,
    roomDimensions,
    roomColors,
    layoutTransform,
    sceneObjects,
    activeObjectId,
    floorY,
    backWallZ,
    leftWallX,
    rightWallX,
    ceilingY,
    purchasingSettings,
    linkedSubfloorProjectId,
    integrationData,
  } = useAppStore();

  const tileDotColor = compositeColors?.secondary || '#334155';

  const { user } = useAuthStore();

  // Create active snapshot payload of layout/canvas configurations
  const getSnapshot = () => {
    return {
      version: '1.0',
      projectName: currentProjectName || projectName,
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
      compositeColors,
      colorVariation,
      groutColor,
      viewSettings,
      offsetX,
      offsetY,
      subAreas,
      purchasingSettings,
      activeSubAreaId,
      wallExtensions,
      activeWallExtensionId,
      isPainted,
      isBlankCanvasMode,
      activePresetId,
      soldAsMosaic,
      mosaicWidth,
      mosaicHeight,
      overage,
      hasNotes,
      notes,
      angleDisplayMode,
      backgroundImage,
      isBgUnlocked,
      bgScale,
      bgOffsetX,
      bgOffsetY,
      tileOpacity,
      bgOpacity,
      exportPhotoBg,
      showAccentDistances,
      wallBoundaryShape,
      wallArchHeight,
      wallActiveArches,
      wallArchDepth,
      wallAngle,
      wallBorder,
      mainShapeSettings,
      foldLines,
      roomDimensions,
      roomColors,
      layoutTransform,
      sceneObjects,
      activeObjectId,
      floorY,
      backWallZ,
      leftWallX,
      rightWallX,
      ceilingY,
      linkedSubfloorProjectId,
      integrationData,
    };
  };

  // Stringify the payload to detect actual structural changes
  const serializedState = JSON.stringify({
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
    compositeColors,
    colorVariation,
    groutColor,
    viewSettings,
    offsetX,
    offsetY,
    subAreas,
    activeSubAreaId,
    wallExtensions,
    activeWallExtensionId,
    isPainted,
    isBlankCanvasMode,
    activePresetId,
    soldAsMosaic,
    mosaicWidth,
    mosaicHeight,
    overage,
    hasNotes,
    notes,
    angleDisplayMode,
    backgroundImage,
    isBgUnlocked,
    bgScale,
    bgOffsetX,
    bgOffsetY,
    tileOpacity,
    bgOpacity,
    exportPhotoBg,
    showAccentDistances,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    wallAngle,
    wallBorder,
    mainShapeSettings,
    foldLines,
    roomDimensions,
    roomColors,
    layoutTransform,
    sceneObjects,
    activeObjectId,
    floorY,
    backWallZ,
    leftWallX,
    rightWallX,
    ceilingY,
    linkedSubfloorProjectId,
    integrationData,
  });

  // Track initial render to prevent instant autosave on load
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!user) {
      setSaveStatus('idle');
      return;
    }

    if (!currentProjectId) {
      setSaveStatus('idle');
      return;
    }

    if (isLockedByAnotherTab) {
      setSaveStatus('idle');
      return;
    }


    if (!isAutoSaveEnabled) {
      setSaveStatus('idle');
      return;
    }

    const isMultiplayer = Object.keys(onlineUsers || {}).length > 0;
    const isOwner = currentProjectPermission === 'owner';

    // Auto-Save Delegation: In multiplayer, ONLY the owner saves background states to avoid save storms
    if (isMultiplayer && !isOwner) {
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');


    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        const payload = getSnapshot();
        const fallbackProjectName = payload.projectName || 'Untitled Project';

        // UPDATE existing record
        const { error } = await supabase
          .from('projects')
          .update({
            state_payload: payload,
            name: fallbackProjectName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentProjectId);

        if (error) {
          console.error('Supabase auto-save (update) error:', error);
          setSaveStatus('error');
          logger.error('Failed to save project to cloud', { error: error.message });
          setCloudSyncError(true);
        } else {
          setSaveStatus('saved');
          useAppStore.getState().setIsCanvasDirty(false);
          logger.info('Project saved to cloud', { projectId: currentProjectId });
          setCloudSyncError(false);
        }
      } catch (err: any) {
        console.error('Unexpected auto-save error:', err);
        setSaveStatus('error');
        logger.error('Failed to save project to cloud', { error: err?.message || String(err) });
        setCloudSyncError(true);
      }
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [serializedState, user, currentProjectId, isAutoSaveEnabled, isLockedByAnotherTab, onlineUsers, currentProjectPermission]);

  return { saveStatus };
};
