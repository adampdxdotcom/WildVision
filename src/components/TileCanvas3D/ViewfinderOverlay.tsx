import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ViewfinderOverlay: React.FC = () => {
  const isWildVisionOpen = useAppStore((state) => state.isWildVisionOpen);
  const viewMode = useAppStore((state) => state.viewMode);
  const renderAspectRatio = useAppStore((state) => state.renderAspectRatio);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isWildVisionOpen || viewMode !== '3d' || !containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isWildVisionOpen, viewMode]);

  if (!isWildVisionOpen || viewMode !== '3d') return null;

  const { width, height } = dimensions;
  if (width === 0 || height === 0) {
    return (
      <div 
        ref={containerRef} 
        className="absolute inset-0 pointer-events-none z-30" 
      />
    );
  }

  // Define numeric aspect ratio
  let ratioNum = 4 / 3;
  if (renderAspectRatio === '1:1') ratioNum = 1.0;
  else if (renderAspectRatio === '16:9') ratioNum = 16 / 9;
  else if (renderAspectRatio === '9:16') ratioNum = 9 / 16;

  const containerRatio = width / height;

  let w = width;
  let h = height;

  if (containerRatio > ratioNum) {
    // Container is wider than aspect ratio: pillarboxes
    h = height;
    w = height * ratioNum;
  } else {
    // Container is taller than aspect ratio: letterboxes
    w = width;
    h = width / ratioNum;
  }

  const leftPad = (width - w) / 2;
  const topPad = (height - h) / 2;

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
    >
      {/* 4 Dimmed Panels */}
      {/* Top panel */}
      <div 
        className="absolute bg-black/60 transition-all duration-300 border-b border-white/5"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: `${topPad}px`,
        }}
      />
      {/* Bottom panel */}
      <div 
        className="absolute bg-black/60 transition-all duration-300 border-t border-white/5"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: `${topPad}px`,
        }}
      />
      {/* Left panel */}
      <div 
        className="absolute bg-black/60 transition-all duration-300"
        style={{
          top: `${topPad}px`,
          bottom: `${topPad}px`,
          left: 0,
          width: `${leftPad}px`,
        }}
      />
      {/* Right panel */}
      <div 
        className="absolute bg-black/60 transition-all duration-300"
        style={{
          top: `${topPad}px`,
          bottom: `${topPad}px`,
          right: 0,
          width: `${leftPad}px`,
        }}
      />

      {/* Center Viewfinder / Safe Area Indicator */}
      <div 
        className="absolute transition-all duration-300 flex flex-col justify-between animate-fade-in"
        style={{
          left: `${leftPad}px`,
          top: `${topPad}px`,
          width: `${w}px`,
          height: `${h}px`,
        }}
      >
        {/* Subtle dashed outline border inside */}
        <div className="absolute inset-0 border border-white/35 border-dashed rounded-xs pointer-events-none m-[1px]">
          {/* Corner focus brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-rose-500 rounded-tl-[1px]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-rose-500 rounded-tr-[1px]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-rose-500 rounded-bl-[1px]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-rose-500 rounded-br-[1px]" />

          {/* Central subtle center point target */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-45">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            <div className="absolute w-6 h-[1px] bg-white" />
            <div className="absolute h-6 w-[1px] bg-white" />
          </div>

          {/* Camera Info Floating Badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/85 border border-slate-700/50 px-2.5 py-0.5 rounded-full shadow-md text-[9px] font-mono font-bold tracking-wider text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>AI SAFE AREA: {renderAspectRatio}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
