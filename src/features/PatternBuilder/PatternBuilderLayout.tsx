import React, { useEffect, useRef, useState } from 'react';
import SidebarManager from './SidebarManager';
import PatternWorkspace from './PatternWorkspace';
import { useAppStore } from '../../store/useAppStore';
import { Check } from 'lucide-react';

export default function PatternBuilderLayout() {
  const { 
    patternName, 
    builderTiles, 
    blockWidth, 
    blockHeight,
    autoSavePatterns,
    currentPatternId,
    savePatternToCloud
  } = useAppStore();

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (!autoSavePatterns || !currentPatternId) {
      return;
    }

    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const ok = await savePatternToCloud();
      if (ok) {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('idle');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [builderTiles, patternName, blockWidth, blockHeight, autoSavePatterns, currentPatternId, savePatternToCloud]);

  return (
    <div className="flex flex-1 h-full min-h-0 w-full gap-8 overflow-hidden relative">
      {/* Auto-Save Indicator */}
      {autoSavePatterns && autoSaveStatus !== 'idle' && (
        <div className="absolute top-4 right-4 z-50 bg-slate-800/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-slate-700 animate-fade-in pointer-events-none">
          {autoSaveStatus === 'saving' ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3 h-3" />
              All changes saved
            </span>
          )}
        </div>
      )}

      {/* Left Panel (Sidebar) */}
      <section className="w-[360px] xl:w-[420px] h-full flex flex-col flex-shrink-0 gap-6 overflow-y-auto pr-2" id="pattern-builder-sidebar">
        <SidebarManager />
      </section>

      {/* Right Panel (Main Canvas): Fills the rest of the screen with PatternWorkspace */}
      <section className="flex-1 h-full flex flex-col min-h-0 overflow-hidden" id="pattern-builder-canvas">
        <PatternWorkspace />
      </section>
    </div>
  );
}

