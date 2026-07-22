import React, { useState, useEffect } from 'react';
import { tutorialSteps } from './tutorialSteps';
import { HelpCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TutorialOverlayProps {
  currentStepIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGotoStep?: (index: number) => void;
}

interface SimpleRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  currentStepIndex,
  onClose,
  onNext,
  onPrev,
  onGotoStep,
}) => {
  const [elementRects, setElementRects] = useState<SimpleRect[]>([]);

  const step = currentStepIndex !== -1 ? tutorialSteps[currentStepIndex] : null;
  const targetSelector = step?.targetSelector ?? null;

  useEffect(() => {
    if (currentStepIndex === -1 || !targetSelector) {
      setElementRects([]);
      return;
    }

    const selectors = targetSelector.split(',').map(s => s.trim()).filter(Boolean);

    // Smoothly scroll target elements into view on step load
    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        const sidebar = document.getElementById('sidebar-scroll-content') || document.getElementById('sidebar-scroll-area');
        if (sidebar && sidebar.contains(el)) {
          const containerRect = sidebar.getBoundingClientRect();
          const elementRect = el.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top + sidebar.scrollTop; 

          let targetScrollTop = relativeTop;

          // Apply Alignment
          if (step?.alignment === 'center') {
            targetScrollTop = relativeTop - (containerRect.height / 2) + (elementRect.height / 2);
          } else if (step?.alignment === 'end') {
            targetScrollTop = relativeTop - containerRect.height + elementRect.height;
          } else if (step?.alignment === 'start') {
            targetScrollTop = relativeTop;
          }

          // Apply manual tweak offset
          if (step?.offsetY) {
            targetScrollTop += step.offsetY;
          }

          sidebar.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth',
          });
        } else {
          el.style.scrollMarginTop = '100px';
          el.scrollIntoView({ behavior: 'smooth', block: step?.alignment ?? 'start' });
        }
      }
    }

    const updateRects = () => {
      const rects: SimpleRect[] = [];

      for (const selector of selectors) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          rects.push({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }
      }
      setElementRects((prev) => {
        if (prev.length !== rects.length) return rects;
        const hasDiff = prev.some((r, i) => {
          const nextR = rects[i];
          return (
            Math.abs(r.top - nextR.top) > 0.5 ||
            Math.abs(r.left - nextR.left) > 0.5 ||
            Math.abs(r.width - nextR.width) > 0.5 ||
            Math.abs(r.height - nextR.height) > 0.5
          );
        });
        return hasDiff ? rects : prev;
      });
    };

    // Calculate immediately
    updateRects();

    // Active tracking for 1500ms to smoothly track smooth-scroll and transition animations
    let rafId: number;
    const startTime = Date.now();
    const trackAndAnimate = () => {
      updateRects();
      if (Date.now() - startTime < 1500) {
        rafId = requestAnimationFrame(trackAndAnimate);
      }
    };
    rafId = requestAnimationFrame(trackAndAnimate);

    window.addEventListener('resize', updateRects);
    window.addEventListener('scroll', updateRects, true); // capture scroll in custom containers

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateRects);
      window.removeEventListener('scroll', updateRects, true);
    };
  }, [currentStepIndex, targetSelector]);

  if (currentStepIndex === -1 || !step) return null;

  const isTargeted = targetSelector !== null;

  // Helper to draw a rounded rect path string for the SVG evenodd fill
  const getRoundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
    return `M ${x + r} ${y} 
            h ${w - 2 * r} 
            a ${r} ${r} 0 0 1 ${r} ${r} 
            v ${h - 2 * r} 
            a ${r} ${r} 0 0 1 ${-r} ${r} 
            h ${-(w - 2 * r)} 
            a ${r} ${r} 0 0 1 ${-r} ${-r} 
            v ${-(h - 2 * r)} 
            a ${r} ${r} 0 0 1 ${r} ${-r} Z`;
  };

  const totalPages = tutorialSteps.length;
  let startPage = Math.max(0, currentStepIndex - 2);
  let endPage = Math.min(totalPages - 1, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(0, endPage - 4);
  }
  const paginationPages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 select-text font-sans">
        {lines.map((line, i) => {
          let trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-1.5" />;

          // Check if it's a bullet point
          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
          if (isBullet) {
            trimmed = trimmed.replace(/^[•-]\s*/, '');
          }

          // Parse **bold** parts
          const parts = trimmed.split(/(\*\*.*?\*\*)/);
          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-extrabold text-slate-900 tracking-tight">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx} className="text-slate-600 font-medium">{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={i} className="flex gap-2 pl-1 items-start text-xs leading-relaxed">
                <span className="text-indigo-600 font-extrabold select-none">•</span>
                <span className="flex-1 font-medium">{formattedLine}</span>
              </div>
            );
          }

          return (
            <p key={i} className="text-xs text-slate-600 font-semibold leading-relaxed">
              {formattedLine}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* 1. Backdrop Overlay */}
      {!isTargeted ? (
        // Standard center dialog dim overlay
        <div 
          onClick={onClose}
          className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-xs animate-fade-in animate-duration-200" 
        />
      ) : (
        // Targeted interactive mask using inline SVG cutout
        elementRects.length > 0 && (
          <>
            <svg className="fixed inset-0 pointer-events-none z-[9998] w-full h-full">
              {/* Draw slate sheet masking other areas but omitting targeted cutout rect */}
              <path
                d={`M 0 0 H 10000 V 10000 H 0 Z ${elementRects.map(r => getRoundedRectPath(r.left, r.top, r.width, r.height, 12)).join(' ')}`}
                fillRule="evenodd"
                fill="rgba(15, 23, 42, 0.65)"
                className="pointer-events-auto"
                onClick={onClose}
              />
            </svg>

            {/* Neon Accent border glow outlining the target elements */}
            {elementRects.map((rect, idx) => (
              <div
                key={idx}
                className="fixed border-2 border-indigo-500 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.65)] pointer-events-none z-[9999] transition-all duration-300 animate-pulse"
                style={{
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                }}
              />
            ))}
          </>
        )
      )}

      {/* 2. Modal Dialog Card Container */}
      <div 
        className="fixed z-[9999] pointer-events-none transition-all duration-300"
        style={{
          top: isTargeted && elementRects.length > 0 && elementRects[0].top > window.innerHeight / 2 ? 24 : 'auto',
          bottom: isTargeted && elementRects.length > 0 && elementRects[0].top <= window.innerHeight / 2 ? 24 : (isTargeted ? 'auto' : 24),
          left: isTargeted && elementRects.length > 0 && elementRects[0].left > window.innerWidth / 2 ? 24 : 'auto',
          right: isTargeted && elementRects.length > 0 && elementRects[0].left <= window.innerWidth / 2 ? 24 : (isTargeted ? 'auto' : 24),
          ...( !isTargeted && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bottom: 'auto', right: 'auto' })
        }}
      >
        <div 
          id="tutorial-modal-card"
          className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 relative pointer-events-auto transform transition-all duration-300 animate-fade-in"
        >
          {/* Header decoration */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-50 p-2.5 text-indigo-600 rounded-lg animate-bounce">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-sans">
                {step.title}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Interactive Guide • Step {currentStepIndex + 1} of {tutorialSteps.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              aria-label="Close tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {renderFormattedContent(step.content)}
          </div>

          {/* Navigation and Action buttons */}
          <div className="flex justify-between items-center">
            {/* Left slot */}
            <div>
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={onPrev}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer select-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            {/* Center pagination slot */}
            {currentStepIndex > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {paginationPages.map(pageIdx => (
                  <button
                    key={pageIdx}
                    type="button"
                    onClick={() => onGotoStep?.(pageIdx)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      currentStepIndex === pageIdx
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                  >
                    {pageIdx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Right slot */}
            <div className="flex items-center gap-2">
              {currentStepIndex === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="flex items-center gap-1 px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm cursor-pointer transition select-none"
                  >
                    <span>Yes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onNext}
                    className="flex items-center gap-1 px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm cursor-pointer transition select-none"
                  >
                    <span>{currentStepIndex < tutorialSteps.length - 1 ? 'Next' : 'Finish'}</span>
                    {currentStepIndex < tutorialSteps.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
