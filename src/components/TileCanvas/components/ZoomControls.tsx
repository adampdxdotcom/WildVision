import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Target } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

interface ZoomControlsProps {
  onCenter: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = React.memo(({ onCenter }) => {
  const zoom = useAppStore(state => state.zoom);
  const setZoom = useAppStore(state => state.setZoom);
  const setPanX = useAppStore(state => state.setPanX);
  const setPanY = useAppStore(state => state.setPanY);
  const tutorialStepIndex = useAppStore(state => state.tutorialStepIndex);
  
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isHovered || tutorialStepIndex === 1;

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level >= zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    } else if (zoom > ZOOM_LEVELS[0]) {
       setZoom(ZOOM_LEVELS[0]);
    }
  };

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level > zoom);
    if (currentIndex !== -1) {
      setZoom(ZOOM_LEVELS[currentIndex]);
    } else if (zoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]) {
      setZoom(ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
    }
  };

  const handleReset = () => {
    const triggerFitWorkspace = useAppStore.getState().triggerFitWorkspace;
    if (triggerFitWorkspace) {
      triggerFitWorkspace();
    }
  };

  return (
    <div 
      id="floating-zoom-controls" 
      className="absolute top-3 right-3 z-10 flex flex-row items-center gap-1.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex items-center justify-end bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-200 select-none overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: isExpanded ? '180px' : '56px' }}
      >
        <div className="flex items-center justify-end gap-2.5 w-[172px] shrink-0">
          
          <div className={`flex items-center gap-2.5 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_LEVELS[0]}
              className="w-7 h-7 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
 
            <span className="text-[11px] font-bold text-slate-600 font-mono select-none whitespace-nowrap w-[40px] text-center shrink-0">
              {Math.round(zoom * 100)}%
            </span>
 
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              className="w-7 h-7 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
 
          <button
            type="button"
            onClick={handleReset}
            className="w-12 h-7 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-md transition cursor-pointer flex items-center justify-center shadow-2xs shrink-0"
            title="Reset Zoom to Fit"
          >
            {isExpanded ? 'FIT' : 'ZOOM'}
          </button>
 
        </div>
      </div>
 
      <button
        type="button"
        onClick={onCenter}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/95 hover:bg-indigo-50 border border-indigo-200 text-indigo-600 hover:text-indigo-700 shadow-xs transition cursor-pointer shrink-0"
        title="Center Layout"
      >
        <Target className="w-4.5 h-4.5" />
      </button>
    </div>
  );
});

