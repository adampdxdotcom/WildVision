import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, ChevronsLeftRight } from 'lucide-react';
import { logProjectView } from '../../utils/telemetry';

export const PresentationView: React.FC = () => {
  const { projectName, featuredRenderId, generatedRenders, shareToken } = useAppStore();
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const hasLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    const token = shareToken || new URLSearchParams(window.location.search).get('share');
    if (token && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      logProjectView(token, 'ai_presentation');
    }
  }, [shareToken]);

  // Check if the user/designer deleted the featured image
  const isImageDeleted = featuredRenderId ? !generatedRenders.some(r => r.id === featuredRenderId) : false;

  // Find the featured render or fall back to the first available render
  const featuredRender = isImageDeleted ? null : (
    generatedRenders.find(r => r.id === featuredRenderId) || 
    (generatedRenders.length > 0 ? generatedRenders[0] : null)
  );

  if (!featuredRender && !isImageDeleted) {
    return (
      <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 antialiased font-sans select-none">
        {/* Header */}
        <header className="bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center gap-4 shrink-0 w-full">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-rose-500 rounded-lg shadow-md shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 tracking-wide font-sans truncate">
                {projectName || "Tile Space Design"}
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono tracking-wider">
                  CLIENT PRESENTATION
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Powered by WildVision AI</p>
            </div>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl shadow-2xl hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer select-none font-sans transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Design your own space with WildVision</span>
          </a>
        </header>

        {/* Centered empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-4 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-200">No AI Render Published Yet</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            This design does not have a featured AI render to showcase. Return to the editor to generate one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 antialiased font-sans select-none">
      
      {/* minimal header bar at the very top of the dark page */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center gap-4 shrink-0 w-full z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-rose-500 rounded-lg shadow-md shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 tracking-wide font-sans truncate">
              {projectName || "Tile Space Design"}
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono tracking-wider">
                CLIENT PRESENTATION
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Powered by WildVision AI</p>
          </div>
        </div>

        <a
          href="/"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl shadow-2xl hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer select-none font-sans transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Design your own space with WildVision</span>
        </a>
      </header>

      {/* Main framed portfolio area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
        {isImageDeleted ? (
          <div className="max-w-md w-full bg-slate-900 border border-slate-800/80 rounded-3xl p-8 shadow-2xl text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mb-6 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-200 leading-snug">Presentation Updated</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              The designer has updated this presentation and the featured render is no longer available.
            </p>
          </div>
        ) : featuredRender ? (
          <>
            {/* Framed Slider Container */}
            <div className="relative max-w-5xl w-full max-h-[70vh] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_60px_rgba(0,0,0,0.85)] bg-slate-900 flex items-center justify-center">
              
              {/* Bottom Image: AI Render (Right side of the slider) */}
              <img 
                src={featuredRender.imageUrl} 
                alt="AI Photorealistic Render" 
                className="max-h-[70vh] w-full object-contain select-none pointer-events-none rounded-2xl"
                referrerPolicy="no-referrer"
              />

              {/* Top Image: 3D Blueprint Snapshot (Left side of the slider, clipped) */}
              <img 
                src={featuredRender.sourceImage || featuredRender.imageUrl} 
                alt="3D Blueprint Snapshot" 
                className="absolute inset-0 max-h-[70vh] w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                style={{
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                }}
                referrerPolicy="no-referrer"
              />

              {/* Floating Labels */}
              <div className="absolute top-4 left-4 z-30 pointer-events-none select-none bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border border-white/10 shadow-lg">
                3D Source Blueprint
              </div>
              <div className="absolute top-4 right-4 z-30 pointer-events-none select-none bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border border-white/10 shadow-lg">
                AI Photoreal Render
              </div>

              {/* Invisible Native Range Input */}
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sliderPosition} 
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-25"
                title="Drag slider to compare 3D Blueprint with AI Render"
              />

              {/* Visual Divider Line */}
              <div 
                className="absolute top-0 bottom-0 w-[2.5px] bg-white pointer-events-none z-20 shadow-[0_0_15px_rgba(0,0,0,0.7)]"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                {/* Grabber Handle with subtle ping effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-2xl flex items-center justify-center border border-slate-200 select-none pointer-events-none">
                  <ChevronsLeftRight className="w-4 h-4 text-slate-800" />
                  <span className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-25" />
                </div>
              </div>

            </div>

            {/* Help text at bottom */}
            <div className="mt-6 text-center select-none pointer-events-none">
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase font-mono">
                Drag the slider to compare the 3D Blueprint layout with the AI photorealistic photograph
              </p>
            </div>
          </>
        ) : null}

      </main>

    </div>
  );
};
