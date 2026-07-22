import React from 'react';
import { useAppStore } from '../../../store/useAppStore';

interface GuidanceBannerProps {
  isDraggingBg?: boolean;
}

export const GuidanceBanner: React.FC<GuidanceBannerProps> = ({ isDraggingBg }) => {
  const isBgUnlocked = useAppStore(state => state.isBgUnlocked);
  const backgroundImage = useAppStore(state => state.backgroundImage);
  const bgOpacity = useAppStore(state => state.bgOpacity);

  return (
    <div id="floating-guidance-banner" className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/90 backdrop-blur-xs select-none shadow-sm rounded-full text-[10px] text-slate-500 font-medium pointer-events-none border border-slate-200 flex items-center gap-1 z-10">
      {isBgUnlocked ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 stroke-amber-500" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span>
            {isDraggingBg 
              ? `Moving Background (Opacity: ${Math.round(bgOpacity * 100)}%)...` 
              : "Move Mode: Drag background area to pan and align photo."}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 stroke-amber-500" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-bounce stroke-slate-500" viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          <span>Drag accent niches/extensions to position them.</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-bounce stroke-slate-500" viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </>
      )}
    </div>
  );
};
