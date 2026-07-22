/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SubArea, MeasurementUnit } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface CanvasHeaderProps {
  activeSubAreaId: string | null;
  subAreas: SubArea[];
  offsetX: number;
  offsetY: number;
  unit: MeasurementUnit;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  activeSubAreaId,
  subAreas,
  offsetX,
  offsetY,
  unit,
}) => {
  const activeSubArea = subAreas.find((sa) => sa.id === activeSubAreaId);
  const { projectName, isSaveFileLoaded, currentProjectId, isCanvasDirty, cloudSyncError, isLockedByAnotherTab, isReadOnly } = useAppStore();

  const titleText = activeSubArea
    ? `Editing Sub Area: ${activeSubArea.name}`
    : (isSaveFileLoaded ? projectName : 'Interactive Main Wall Canvas');

  let dotColorClass = 'bg-indigo-500';
  let badgeText = '';

  if (isLockedByAnotherTab) {
    dotColorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse';
    badgeText = 'LOCKED (READ ONLY)';
  } else if (cloudSyncError) {
    dotColorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse';
    badgeText = 'CLOUD (OFFLINE)';
  } else if (isCanvasDirty) {
    dotColorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    if (currentProjectId) {
      badgeText = 'CLOUD *';
    } else if (isSaveFileLoaded) {
      badgeText = 'LOCAL *';
    } else {
      badgeText = 'UNSAVED';
    }
  } else if (currentProjectId) {
    dotColorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    badgeText = 'CLOUD';
  } else if (isSaveFileLoaded) {
    dotColorClass = 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
    badgeText = 'LOCAL';
  }

  return (
    <div id="canvas-header-readout" className="flex justify-between items-center px-4 py-2 bg-slate-900 text-slate-100 rounded-t-xl border-b border-slate-700 select-none">
      <div className="flex items-center gap-2 max-w-[70%]">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColorClass}`}></span>
        <span className="text-xs font-semibold tracking-wider uppercase font-mono truncate" title={titleText}>
          {titleText}
        </span>
        {isReadOnly && !isLockedByAnotherTab && (
          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-white rounded border border-slate-600 shadow-sm flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            READ-ONLY
          </span>
        )}
        {badgeText && (
          <span className="ml-2 text-[10px] font-semibold tracking-widest text-slate-400/80">{badgeText}</span>
        )}
        {isLockedByAnotherTab && (
          <span className="hidden md:inline-block ml-3 px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md shadow-xs animate-pulse">
            ⚠️ Project open in another tab. Autosave disabled to prevent data loss.
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
        {activeSubArea ? (
          <>
            <div>
              Sub-Area X: <span className="font-bold text-amber-300">{Number(activeSubArea.x).toFixed(3)}</span> {unit}
            </div>
            <div>
              Sub-Area Y: <span className="font-bold text-amber-300">{Number(activeSubArea.y).toFixed(3)}</span> {unit}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
