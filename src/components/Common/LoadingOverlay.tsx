import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const LoadingOverlay: React.FC = () => {
  const isProjectLoading = useAppStore((state) => state.isProjectLoading);

  if (!isProjectLoading) return null;

  return (
    <div
      id="project-loading-overlay"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-opacity duration-200 pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Loading Project...
          </h3>
          <p className="text-xs text-slate-400">
            Parsing layout data and generating tiles
          </p>
        </div>
      </div>
    </div>
  );
};
