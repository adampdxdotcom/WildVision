import React, { useState, useRef, useEffect } from 'react';
import { Camera, Focus, Lock, Unlock, RefreshCw } from 'lucide-react';

interface ViewportUIControlsProps {
  handleResetCamera: () => void;
  isCameraHeightLocked: boolean;
  setIsCameraHeightLocked: (val: boolean) => void;
  isCameraDistanceLocked: boolean;
  setIsCameraDistanceLocked: (val: boolean) => void;
  savedCameraFov: number;
  setSavedCameraFov: (val: number) => void;
  orthoLock?: boolean;
  setOrthoLock?: (val: boolean) => void;
}

export const ViewportUIControls: React.FC<ViewportUIControlsProps> = ({
  handleResetCamera,
  isCameraHeightLocked,
  setIsCameraHeightLocked,
  isCameraDistanceLocked,
  setIsCameraDistanceLocked,
  savedCameraFov,
  setSavedCameraFov,
  orthoLock = false,
  setOrthoLock = () => {},
}) => {
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

  return (
    <>
      {/* Camera Tools click-to-toggle menu */}
      <div 
        id="floating-reset-controls-3d" 
        className="relative z-20 pointer-events-auto"
        ref={containerRef}
      >
        {/* Main Trigger Button */}
        <div className="flex items-center justify-end bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-200 select-none cursor-pointer">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-10 h-7 rounded-md transition flex items-center justify-center shadow-2xs shrink-0 cursor-pointer ${
              isExpanded 
                ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Camera Tools"
          >
            <Camera size={14} className="shrink-0 text-indigo-600" />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isExpanded && (
          <div className="flex flex-col gap-1.5 absolute right-0 top-full mt-2 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-slate-200 select-none w-36 z-30 animate-fade-in">
            {/* Reset View */}
            <button
              type="button"
              onClick={() => { handleResetCamera(); setIsExpanded(false); }}
              className="w-full h-8 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-md transition cursor-pointer flex items-center gap-2 px-2 shadow-2xs"
              title="Reset Camera View to Head-On"
            >
              <Focus size={12} className="shrink-0 text-indigo-600" />
              <span>Reset View</span>
            </button>

            {/* Lock Height */}
            <button
              type="button"
              onClick={() => setIsCameraHeightLocked(!isCameraHeightLocked)}
              className={`w-full h-8 text-[10px] font-bold uppercase tracking-wider border rounded-md transition cursor-pointer flex items-center gap-2 px-2 shadow-2xs ${
                isCameraHeightLocked
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Lock Camera Vertical Height"
            >
              {isCameraHeightLocked ? (
                <Lock size={12} className="shrink-0 text-indigo-600" />
              ) : (
                <Unlock size={12} className="shrink-0 text-slate-400" />
              )}
              <span>Lock Height</span>
            </button>

            {/* Lock Zoom */}
            <button
              type="button"
              onClick={() => setIsCameraDistanceLocked(!isCameraDistanceLocked)}
              className={`w-full h-8 text-[10px] font-bold uppercase tracking-wider border rounded-md transition cursor-pointer flex items-center gap-2 px-2 shadow-2xs ${
                isCameraDistanceLocked
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Lock Camera Distance (Zoom)"
            >
              {isCameraDistanceLocked ? (
                <Lock size={12} className="shrink-0 text-indigo-600" />
              ) : (
                <Unlock size={12} className="shrink-0 text-slate-400" />
              )}
              <span>Lock Zoom</span>
            </button>

            {/* Ortho Lock */}
            <button
              type="button"
              onClick={() => setOrthoLock(!orthoLock)}
              className={`w-full h-8 text-[10px] font-bold uppercase tracking-wider border rounded-md transition cursor-pointer flex items-center gap-2 px-2 shadow-2xs ${
                orthoLock
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Lock Orthographic View"
            >
              {orthoLock ? (
                <Lock size={12} className="shrink-0 text-indigo-600" />
              ) : (
                <Unlock size={12} className="shrink-0 text-slate-400" />
              )}
              <span>Ortho Lock</span>
            </button>

            {/* FOV Cycler */}
            {!orthoLock && (
              <button
                type="button"
                onClick={() => {
                  const fovSteps = [50, 70, 90, 110];
                  const currentIndex = fovSteps.indexOf(savedCameraFov);
                  const nextIndex = (currentIndex + 1) % fovSteps.length;
                  setSavedCameraFov(fovSteps[nextIndex]);
                }}
                className="w-full h-8 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition cursor-pointer flex items-center gap-2 px-2 shadow-2xs"
                title="Cycle Camera FOV (Field of View)"
              >
                <RefreshCw size={12} className="shrink-0 text-slate-500" />
                <span>FOV: {savedCameraFov}°</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
