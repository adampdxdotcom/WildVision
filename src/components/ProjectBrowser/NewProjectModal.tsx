import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { X, FilePlus, Cloud, Laptop, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { logger } from '../../utils/logger';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleNewProjectReset: () => void; // Existing handler from useProjectIO
  resetHistory?: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  handleNewProjectReset,
  resetHistory,
}) => {
  const { user, role } = useAuthStore();
  const { setProjectMetadata, setProjectName, setIsUpgradeModalOpen, isCanvasDirty, resetToBlankWorkspace } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'local' | 'cloud' | null>(null);

  if (!isOpen) return null;

  // Helper to compile state snapshot
  const getStoreSnapshot = () => {
    const s = useAppStore.getState();
    return {
      version: '1.0',
      projectName: 'Untitled',
      wallWidth: s.wallWidth,
      wallHeight: s.wallHeight,
      wallVertices: s.wallVertices,
      unit: s.unit,
      shape: s.shape,
      tileWidth: s.tileWidth,
      tileHeight: s.tileHeight,
      pattern: s.pattern,
      groutWidth: s.groutWidth,
      angle: s.angle,
      tileName: s.tileName,
      tileColors: s.tileColors,
      colorPattern: s.colorPattern,
      tilesPerStripe: s.tilesPerStripe,
      tileDotColor: s.compositeColors.secondary || '#334155',
      colorVariation: s.colorVariation,
      groutColor: s.groutColor,
      viewSettings: s.viewSettings,
      offsetX: s.offsetX,
      offsetY: s.offsetY,
      subAreas: s.subAreas,
      activeSubAreaId: s.activeSubAreaId,
      wallExtensions: s.wallExtensions,
      activeWallExtensionId: s.activeWallExtensionId,
      isPainted: s.isPainted,
      isBlankCanvasMode: s.isBlankCanvasMode,
      activePresetId: s.activePresetId,
      soldAsMosaic: s.soldAsMosaic,
      mosaicWidth: s.mosaicWidth,
      mosaicHeight: s.mosaicHeight,
      overage: s.overage,
      hasNotes: s.hasNotes,
      notes: s.notes,
      angleDisplayMode: s.angleDisplayMode,
      backgroundImage: s.backgroundImage,
      isBgUnlocked: s.isBgUnlocked,
      bgScale: s.bgScale,
      bgOffsetX: s.bgOffsetX,
      bgOffsetY: s.bgOffsetY,
      tileOpacity: s.tileOpacity,
      bgOpacity: s.bgOpacity,
      exportPhotoBg: s.exportPhotoBg,
      showAccentDistances: s.showAccentDistances,
      wallBoundaryShape: s.wallBoundaryShape,
      wallArchHeight: s.wallArchHeight,
      wallActiveArches: s.wallActiveArches,
      wallArchDepth: s.wallArchDepth,
      wallAngle: s.wallAngle,
      wallBorder: s.wallBorder,
      mainShapeSettings: s.mainShapeSettings,
      foldLines: s.foldLines,
      roomDimensions: s.roomDimensions,
      roomColors: s.roomColors,
      layoutTransform: s.layoutTransform,
      sceneObjects: s.sceneObjects,
      activeObjectId: s.activeObjectId,
      floorY: s.floorY,
      backWallZ: s.backWallZ,
      leftWallX: s.leftWallX,
      rightWallX: s.rightWallX,
      ceilingY: s.ceilingY,
      linkedSubfloorProjectId: s.linkedSubfloorProjectId,
      integrationData: s.integrationData,
    };
  };

  const executeLocalReset = () => {
    resetToBlankWorkspace();
    setProjectName('Untitled');
    setProjectMetadata(null, 'Untitled');
    if (resetHistory) resetHistory();
    logger.info('Workspace reset');
    setShowUnsavedWarning(false);
    setPendingAction(null);
    onClose();
  };

  const handleCreateLocal = () => {
    if (isCanvasDirty) {
      setPendingAction('local');
      setShowUnsavedWarning(true);
      return;
    }
    executeLocalReset();
  };

  const executeCloudReset = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      if (role === 'free') {
        const { count, error: countErr } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countErr) {
          throw countErr;
        }

        if (count !== null && count >= 10) {
          setLoading(false);
          setIsUpgradeModalOpen(true);
          setError('Storage Full: Free tier users are limited to 10 saved projects. Please upgrade to unlock unlimited cloud saves!');
          return;
        }
      }

      // Reset standard configuration locally first
      resetToBlankWorkspace();
      setProjectName('Untitled');
      logger.info('Workspace reset');
      
      // Compute snapshot of fresh design config
      const FreshSnapshot = getStoreSnapshot();

      // Direct INSERT into Supabase database to start tracking
      const { data, error: insertErr } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: 'Untitled',
          state_payload: FreshSnapshot,
        })
        .select('id, name')
        .single();

      if (insertErr) {
        setError(insertErr.message);
        logger.error('Failed to save project to cloud', { error: insertErr.message });
      } else if (data) {
        // Set new Cloud ID to begin instant Auto-Saving
        setProjectMetadata(data.id, data.name);
        logger.info('Project saved to cloud', { projectId: data.id });
        if (resetHistory) resetHistory();
        setShowUnsavedWarning(false);
        setPendingAction(null);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create database card.');
      logger.error('Failed to save project to cloud', { error: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCloud = async () => {
    if (isCanvasDirty) {
      setPendingAction('cloud');
      setShowUnsavedWarning(true);
      return;
    }
    executeCloudReset();
  };

  const handleConfirmWarning = () => {
    if (pendingAction === 'local') {
      executeLocalReset();
    } else if (pendingAction === 'cloud') {
      executeCloudReset();
    }
  };

  const handleCancelWarning = () => {
    setShowUnsavedWarning(false);
    setPendingAction(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Container */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col transform transition-all duration-300 overflow-hidden">
        {showUnsavedWarning ? (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-650 rounded-lg">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Unsaved Changes
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Are you sure you want to proceed?
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelWarning}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="py-6 text-sm text-slate-600 dark:text-slate-300">
              You have unsaved changes in your current project. Starting a new project will wipe the workspace and these changes will be permanently lost.
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={handleCancelWarning}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWarning}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {loading && <RefreshCw size={14} className="animate-spin" />}
                Discard & Continue
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 rounded-lg">
                  <FilePlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    New Project Option
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Discard active tile configs &amp; start fresh
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error notification alert */}
            {error && (
              <div className="mt-4 flex gap-2 items-start p-3 bg-red-50 dark:bg-red-950/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-xs font-semibold">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1 shrink-0">{error}</span>
              </div>
            )}

            {/* Action Panel Cards */}
            <div className="mt-4 flex flex-col gap-4 py-2">
              {/* Option A: Local Project */}
              <button
                onClick={handleCreateLocal}
                className="flex items-start text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 shadow-xs cursor-pointer transition select-none group"
              >
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-100 rounded-lg mr-4 border border-slate-100 dark:border-slate-850">
                  <Laptop size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-850 dark:text-white">
                    New Local Project
                  </h4>
                  <p className="text-[11px] text-slate-505 leading-relaxed mt-1">
                    Wipe the workspace and start a fresh local draft. Saves locally to your device as a JSON file.
                  </p>
                </div>
              </button>

              {/* Option B: Cloud Live-Sync Project */}
              {user ? (
                <button
                  onClick={handleCreateCloud}
                  disabled={loading}
                  className="flex items-start text-left p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 shadow-xs cursor-pointer transition select-none group"
                >
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 group-hover:text-indigo-750 group-hover:bg-indigo-100/85 rounded-lg mr-4 border border-indigo-100 dark:border-indigo-950">
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                      New Cloud Project
                      <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded">
                        Auto-Save
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-505 leading-relaxed mt-1">
                      Start a new project synced directly to your cloud dashboard. Requires active login.
                    </p>
                  </div>
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/30">
                  <div className="flex gap-2.5 items-start">
                    <Cloud size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">
                        Cloud Live-Sync Disabled
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                        Log in inside the upper-right user dropdown to unlock immediate, background auto-saves and database design histories.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions warning */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 text-center flex items-center gap-1.5 justify-center leading-none">
              <AlertCircle size={11} />
              <span>Warning: Creating a new workspace will fully replace your active layout.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
