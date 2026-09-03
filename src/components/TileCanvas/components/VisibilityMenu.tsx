import React, { useState, useRef, useEffect } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { switchMeasurementUnit } from '../../../utils/unitUtils';

type CanvasVisibilityKey = 'showNodes' | 'showDimensions' | 'showAngles' | 'showLabels' | 'showFoldLines' | 'showTextures';
type LayerKey = CanvasVisibilityKey | 'disableTileColor';

interface LayerConfig {
  key: LayerKey;
  label: string;
  description: string;
}

export const VisibilityMenu: React.FC = React.memo(() => {
  const viewSettings = useAppStore(state => state.viewSettings);
  const updateViewSetting = useAppStore(state => state.updateViewSetting);
  const isPublicViewer = useAppStore(state => state.isPublicViewer);
  const unit = useAppStore(state => state.unit);
  const setUnit = useAppStore(state => state.setUnit);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const layersConfig: LayerConfig[] = [
    {
      key: 'showNodes',
      label: 'Corners & Nodes',
      description: 'Interactive anchor handle vertices',
    },
    {
      key: 'showDimensions',
      label: 'Dimensions',
      description: 'Wall widths, heights, depths & margins',
    },
    {
      key: 'showAngles',
      label: 'Degree Angles',
      description: 'Inside & exterior corner slope degrees',
    },
    {
      key: 'showLabels',
      label: 'Feature Labels',
      description: 'Metadata overlays on shapes',
    },
    {
      key: 'showFoldLines',
      label: 'Fold Lines',
      description: 'Flaps, floors, & 3D folding structures',
    },
    {
      key: 'showTextures',
      label: 'Material Textures (2D)',
      description: 'Overlay realistic texture patterns in 2D visual layout',
    },
    {
      key: 'disableTileColor',
      label: 'Turn off colors for clean black & white',
      description: 'Turn off colors for clean black & white CAD',
    },
  ];

  const hiddenInPublic: LayerKey[] = ['showNodes', 'showAngles', 'showFoldLines', 'disableTileColor'];
  const activeLayersConfig = isPublicViewer
    ? layersConfig.filter((layer) => !hiddenInPublic.includes(layer.key))
    : layersConfig;

  const canvasVisibility = viewSettings.canvas;

  const handleToggle = (key: LayerKey) => {
    if (key === 'disableTileColor') {
      updateViewSetting('pdf', 'disableTileColor', !viewSettings.pdf.disableTileColor);
    } else {
      updateViewSetting('canvas', key as CanvasVisibilityKey, !canvasVisibility[key as CanvasVisibilityKey]);
    }
  };

  return (
    <div 
      id="cad-visibility-menu" 
      ref={containerRef} 
      className="absolute bottom-4 left-4 z-50 flex flex-col items-start gap-1 pointer-events-auto"
      onPointerDown={(e) => {
        // Stop drag selection or canvas interactions
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Stop drag selection or canvas interactions
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        // Stop touch drag selection or canvas interactions
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Styled Popover */}
      {isOpen && (
        <div 
          id="visibility-menu-popover" 
          className="w-68 bg-white border border-slate-200 rounded-xl shadow-xl p-3 flex flex-col gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1">
            <span className="text-xs font-bold text-slate-800 tracking-tight font-sans">Active Layers</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {activeLayersConfig.map(({ key, label, description }) => {
              const active = key === 'disableTileColor' ? viewSettings.pdf.disableTileColor : canvasVisibility[key as CanvasVisibilityKey];
              return (
                <div
                  id={`layer-row-${key}`}
                  key={key}
                  onClick={() => handleToggle(key)}
                  className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors duration-150">
                      {label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal leading-tight">
                      {description}
                    </span>
                  </div>

                  {/* Switch toggle control */}
                  <div className="flex items-center gap-2">
                    {active ? (
                      <Eye size={12} className="text-indigo-500" />
                    ) : (
                      <EyeOff size={12} className="text-slate-300" />
                    )}
                    <button
                      id={`toggle-button-${key}`}
                      aria-label={`Toggle ${label}`}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        active ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global Unit Toggle */}
          <div id="visibility-menu-unit-toggle" className="pt-2 border-t border-slate-100 flex items-center justify-between mt-1">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-700">
                Measurement Units
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                System scale
              </span>
            </div>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                id="unit-toggle-inches"
                onClick={() => switchMeasurementUnit('in')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  unit === 'in'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Inches
              </button>
              <button
                type="button"
                id="unit-toggle-cm"
                onClick={() => switchMeasurementUnit('cm')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  unit === 'cm'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                cm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        id="visibility-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-md border transition-all duration-200 ${
          isOpen
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        title="Toggle Drawing Layers"
      >
        <Layers size={14} className={isOpen ? 'animate-pulse' : ''} />
        <span>Layers</span>
      </button>
    </div>
  );
});
