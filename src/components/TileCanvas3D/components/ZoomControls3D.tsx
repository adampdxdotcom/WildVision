import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const ZoomControls3D: React.FC = () => {
  const { zoom3D, setZoom3D, setReset3DTrigger } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isExpanded]);

  const handleZoomOut = () => {
    setZoom3D(Math.max(1.0, Number((zoom3D - 0.2).toFixed(2))));
  };

  const handleZoomIn = () => {
    setZoom3D(Math.min(4.0, Number((zoom3D + 0.2).toFixed(2))));
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom3D(parseFloat(e.target.value));
  };

  const handleReset = () => {
    setZoom3D(1.0);
    setReset3DTrigger(prev => prev + 1);
  };

  return (
    <div 
      id="floating-zoom-controls-3d" 
      className="relative z-10 pointer-events-auto"
      ref={containerRef}
    >
      <div 
        className="flex items-center justify-end bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-200 select-none overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: isExpanded ? '344px' : '56px' }}
      >
        <div className="flex items-center justify-end gap-2.5 w-[336px] shrink-0">
          
          <div className={`flex items-center gap-2.5 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              type="button"
              onClick={handleReset}
              className="w-10 h-7 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-md transition cursor-pointer flex items-center justify-center shadow-2xs shrink-0"
              title="Reset Zoom to Fit"
            >
              FIT
            </button>

            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom3D <= 1.0}
              className="w-7 h-7 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.05"
              value={zoom3D}
              onChange={handleZoomChange}
              className="w-20 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer shrink-0"
            />
            <span className="text-[11px] font-bold text-slate-600 font-mono select-none whitespace-nowrap w-[60px] text-center shrink-0">
              {Math.round(zoom3D * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom3D >= 4.0}
              className="w-7 h-7 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-12 h-7 text-[10px] font-bold uppercase tracking-widest transition cursor-pointer flex items-center justify-center shadow-2xs shrink-0 rounded-md ${
              isExpanded 
                ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
            }`}
            title="Toggle Zoom Controls"
          >
            ZOOM
          </button>
        </div>
      </div>
    </div>
  );
};
