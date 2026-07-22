import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { X, Save, Cloud, FileDown, Check, RefreshCw, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { logger } from '../../utils/logger';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleSaveProject: () => void; // Standard JSON download file utility
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  handleSaveProject,
}) => {
  const { user, role } = useAuthStore();
  const { 
    currentProjectId, 
    currentProjectName, 
    setProjectMetadata, 
    projectName, 
    setProjectName, 
    setIsUpgradeModalOpen,
    saveProjectAs
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helper to construct exact project snapshot
  const getStoreSnapshot = () => {
    const s = useAppStore.getState();
    return {
      version: '1.0',
      projectName: s.projectName || 'Untitled',
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

  const triggerLocalSave = () => {
    handleSaveProject();
    onClose();
  };

  const handleCloudSave = async () => {
    if (!user) return;
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const snapshot = getStoreSnapshot();
    const finalProjectName = projectName || 'Untitled Project';

    try {
      if (role === 'free' && !currentProjectId) {
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
          setErrorMsg('Storage Full: Free tier users are limited to 10 saved projects. Please upgrade to unlock unlimited cloud saves!');
          return;
        }
      }

      if (currentProjectId) {
        // CASE A: Force update on current loaded project ID
        const { error: updateErr } = await supabase
          .from('projects')
          .update({
            name: finalProjectName,
            state_payload: snapshot,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentProjectId);

        if (updateErr) {
          setErrorMsg(updateErr.message);
          logger.error('Failed to save project to cloud', { error: updateErr.message });
        } else {
          useAppStore.getState().setIsCanvasDirty(false);
          setSuccessMsg('Project synchronized successfully!');
          logger.info('Project saved to cloud', { projectId: currentProjectId });
          // Auto close modal shortly
          setTimeout(() => onClose(), 1000);
        }
      } else {
        // CASE B: Insert a brand new custom database project entry
        const { data, error: insertErr } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: finalProjectName,
            state_payload: snapshot,
          })
          .select()
          .single();

        if (insertErr) {
          setErrorMsg(insertErr.message);
          logger.error('Failed to save project to cloud', { error: insertErr.message });
        } else if (data) {
          setProjectMetadata(data.id, data.name);
          useAppStore.getState().setIsCanvasDirty(false);
          setSuccessMsg('Project published and saved to Cloud!');
          logger.info('Project saved to cloud', { projectId: data.id });
          setTimeout(() => onClose(), 1000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred while syncing.');
      logger.error('Failed to save project to cloud', { error: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNewCopy = async () => {
    if (!user) return;
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const finalProjectName = projectName || 'Untitled Project';

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
          setErrorMsg('Storage Full: Free tier users are limited to 10 saved projects. Please upgrade to unlock unlimited cloud saves!');
          return;
        }
      }

      const success = await saveProjectAs(finalProjectName);
      if (success) {
        setSuccessMsg('Project duplicated as new copy successfully!');
        setTimeout(() => onClose(), 1000);
      } else {
        setErrorMsg('Failed to save as new copy.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred while duplicating.');
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 rounded-lg">
              <Save size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Save Project
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Export files or backup to your synchronized account
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

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mt-4 flex gap-2 items-start p-3 bg-red-50 dark:bg-red-950/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-xs font-semibold">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="flex-1 shrink-0">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex gap-2 items-start p-3 bg-emerald-50 dark:bg-emerald-950/15 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30 rounded-lg text-xs font-semibold">
            <Check size={15} className="shrink-0 mt-0.5" />
            <span className="flex-1 shrink-0">{successMsg}</span>
          </div>
        )}

        {/* Info panel on active document sync state */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/60 rounded-lg text-xs flex justify-between items-center text-slate-500">
          <div className="pr-3 flex-1">
            <label className="font-semibold block text-[10px] uppercase text-slate-400 tracking-wider">Active Workspace Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-250 outline-none transition"
              placeholder="Kitchen Accent Backsplash"
            />
          </div>

          <div className="shrink-0">
            {currentProjectId ? (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-750 border border-emerald-200 dark:border-emerald-900/30 rounded-md py-1 px-2 flex items-center gap-1 leading-none">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Cloud Synced
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200/50 dark:bg-slate-800 text-slate-500 rounded-md py-1 px-2 leading-none border border-slate-250">
                Offline Mode
              </span>
            )}
          </div>
        </div>

        {/* Buttons Panel */}
        <div className="mt-4 flex flex-col gap-4 py-1">
          {/* Option A: Local Download */}
          <button
            type="button"
            onClick={triggerLocalSave}
            className="flex items-start text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 shadow-xs cursor-pointer transition select-none group"
          >
            <div className="p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-500 group-hover:text-slate-750 group-hover:bg-slate-100 rounded-lg mr-4 border border-slate-100 dark:border-slate-850">
              <FileDown size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-850 dark:text-white">
                Download Local (.json)
              </h4>
              <p className="text-[11px] text-slate-505 leading-relaxed mt-1">
                Generates a raw layout description file and saves it in your browser download folder. Safely archive or share design files easily.
              </p>
            </div>
          </button>

          {/* Option B: Cloud Backup Save */}
          {user ? (
            <button
              type="button"
              onClick={handleCloudSave}
              disabled={loading}
              className="flex items-start text-left p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 shadow-xs cursor-pointer transition select-none group"
            >
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 group-hover:text-indigo-750 group-hover:bg-indigo-100/85 rounded-lg mr-4 border border-indigo-100 dark:border-indigo-950">
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400">
                  {currentProjectId ? 'Sync Cloud Progress Now' : 'Publish to Cloud Backup'}
                </h4>
                <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed mt-1">
                  {currentProjectId 
                    ? `Locks in edits immediately inside active backup slot: "${currentProjectName || projectName}".`
                    : 'Transfers current layout to a dedicated project row on our backend database, unlocking live autosaving.'
                  }
                </p>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/30">
              <div className="flex gap-2.5 items-start">
                <Cloud size={16} className="text-slate-450 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-400">
                    Cloud Saving Disabled
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Connect real-time accounts from the top right user menu to enable durable database back-ups. It is completely free!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Option C: Save as New Copy */}
          {user && (
            <button
              type="button"
              onClick={handleSaveAsNewCopy}
              disabled={loading}
              className="flex items-start text-left p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-800 bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 shadow-xs cursor-pointer transition select-none group"
            >
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-650 group-hover:text-emerald-750 group-hover:bg-emerald-100/85 rounded-lg mr-4 border border-emerald-100 dark:border-emerald-950">
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <Copy size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-400">
                  Save as New Copy
                </h4>
                <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed mt-1">
                  Duplicates your current workspace into a brand new cloud save slot.
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
