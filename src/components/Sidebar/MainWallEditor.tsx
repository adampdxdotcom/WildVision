import React from 'react';
import { MeasurementUnit, WallExtension, SubArea } from '../../types';
import { Maximize2, RotateCcw, HelpCircle } from 'lucide-react';
import { getCombinedWallBounds, getTrueArea } from '../../utils/geometry';
import { useAppStore } from '../../store/useAppStore';

// Dynamic Preset Scanner
const customPresetsFiles = (import.meta as any).glob('/src/presets/*.json', { eager: true }) as Record<string, any>;
const customPresets = Object.entries(customPresetsFiles).map(([path, module]: any) => {
  const data = module.default || module;
  const filename = path.split('/').pop() || '';
  const key = filename.replace(/\.json$/, '');
  const name = key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return { key, name, data };
});

interface MainWallEditorProps {
  wallWidth: number;
  setWallWidth: (val: number) => void;
  wallHeight: number;
  setWallHeight: (val: number) => void;
  unit: MeasurementUnit;
  setUnit: (unit: MeasurementUnit) => void;
  tileWidth: number;
  setTileWidth: (val: number) => void;
  tileHeight: number;
  setTileHeight: (val: number) => void;
  groutWidth: number;
  setGroutWidth: (val: number) => void;
  subAreas: SubArea[];
  setSubAreas: React.Dispatch<React.SetStateAction<SubArea[]>>;
  wallExtensions: WallExtension[];
  setWallExtensions: React.Dispatch<React.SetStateAction<WallExtension[]>>;
  isBlankCanvasMode?: boolean;
  setIsBlankCanvasMode?: (val: boolean) => void;
  wallBoundaryShape: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  setWallBoundaryShape?: (val: 'rectangle' | 'arch' | 'oval' | 'custom_arches') => void;
  wallArchHeight: number;
  setWallArchHeight?: (val: number) => void;
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  setWallActiveArches?: (val: { top: boolean; bottom: boolean; left: boolean; right: boolean }) => void;
  wallArchDepth?: number;
  setWallArchDepth?: (val: number) => void;
  wallAngle?: number;
  setWallAngle?: (val: number) => void;
  onResetWorkspace?: () => void;
  onLoadCustomPreset?: (data: any) => void;
}

export const MainWallEditor: React.FC<MainWallEditorProps> = ({
  wallWidth,
  setWallWidth,
  wallHeight,
  setWallHeight,
  unit,
  setUnit,
  tileWidth,
  setTileWidth,
  tileHeight,
  setTileHeight,
  groutWidth,
  setGroutWidth,
  subAreas,
  setSubAreas,
  wallExtensions,
  setWallExtensions,
  isBlankCanvasMode = false,
  setIsBlankCanvasMode,
  wallBoundaryShape = 'rectangle',
  setWallBoundaryShape,
  wallArchHeight = 0,
  setWallArchHeight,
  wallActiveArches = { top: true, bottom: false, left: false, right: false },
  setWallActiveArches,
  wallArchDepth = 0,
  setWallArchDepth,
  wallAngle = 0,
  setWallAngle,
  onResetWorkspace,
  onLoadCustomPreset,
}) => {
  const { isCanvasDirty, currentProjectId, layoutFoldType, setLayoutFoldType } = useAppStore();

  return (
    <div id="wall-setup-area" className="bg-white rounded border border-slate-200 p-5 shadow-xs animate-fade-in">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 group relative">
          <Maximize2 className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1 cursor-help">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Wall Setup Area</h3>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute top-full left-0 mt-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none leading-relaxed font-normal normal-case">
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
            Use this area to set up your basic canvas dimensions, or choose a preset. Once you make any change, most options on this tab will lock.
          </div>
        </div>
      </div>

      {/* Layout Fold Type Segmented Control */}
      <div className="mb-4 p-3 bg-slate-50 border border-slate-200/60 rounded flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800">Layout Fold Type</span>
            <span className="text-[9px] text-slate-500 font-medium leading-normal">
              {layoutFoldType === 'outward' ? 'Fireplace / Bump-Out (-90° Outward)' : 'Shower / Alcove (+90° Inward)'}
            </span>
          </div>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200/60 font-mono">
            {layoutFoldType === 'outward' ? '-90°' : '+90°'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-md">
          <button
            type="button"
            id="layout-fold-type-shower"
            onClick={() => setLayoutFoldType('inward')}
            className={`px-2.5 py-1.5 rounded text-[11px] font-bold transition-all ${
              layoutFoldType === 'inward' || !layoutFoldType
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shower / Alcove (Inward)
          </button>
          <button
            type="button"
            id="layout-fold-type-fireplace"
            onClick={() => setLayoutFoldType('outward')}
            className={`px-2.5 py-1.5 rounded text-[11px] font-bold transition-all ${
              layoutFoldType === 'outward'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fireplace / Bump-Out (Outward)
          </button>
        </div>
      </div>

      {/* Blank Canvas Mode Toggle Checkbox */}
      <div className="mb-4 p-3 bg-slate-50 border border-slate-200/60 rounded flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-800">Blank Canvas Mode</span>
          <span className="text-[9px] text-slate-555 font-medium leading-normal">
            Hide main wall tiles to visualize accent features & niches
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isBlankCanvasMode}
            onChange={(e) => setIsBlankCanvasMode?.(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-100 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Width ({unit})
          </label>
          <input
            type="number"
            id="wall-width-input"
            min="10"
            max="500"
            step="0.001"
            value={wallWidth === 0 ? '' : wallWidth}
            disabled={isCanvasDirty}
            onChange={(e) => {
              const valStr = e.target.value;
              if (valStr === '') {
                setWallWidth(0);
              } else {
                const val = parseFloat(valStr);
                if (!isNaN(val)) {
                  setWallWidth(val);
                }
              }
            }}
            onBlur={() => {
              setWallWidth(Math.max(10, Math.min(500, wallWidth || 10)));
            }}
            className={`w-full px-3 py-2 border rounded text-sm font-semibold focus:outline-none focus:ring-2 ${
              isCanvasDirty
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-slate-50 border-slate-200 text-slate-855 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Height ({unit})
          </label>
          <input
            type="number"
            id="wall-height-input"
            min="10"
            max="500"
            step="0.001"
            value={wallHeight === 0 ? '' : wallHeight}
            disabled={isCanvasDirty}
            onChange={(e) => {
              const valStr = e.target.value;
              if (valStr === '') {
                setWallHeight(0);
              } else {
                const val = parseFloat(valStr);
                if (!isNaN(val)) {
                  setWallHeight(val);
                }
              }
            }}
            onBlur={() => {
              setWallHeight(Math.max(10, Math.min(500, wallHeight || 10)));
            }}
            className={`w-full px-3 py-2 border rounded text-sm font-semibold focus:outline-none focus:ring-2 ${
              isCanvasDirty
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-slate-50 border-slate-200 text-slate-855 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
        </div>
      </div>

      {/* Wall rotation angle control */}
      <div className={`p-3 border rounded space-y-2 mt-4 transition-all ${
        isCanvasDirty ? 'bg-slate-50/50 border-slate-200 opacity-60' : 'bg-slate-50 border-slate-200'
      }`} style={{ marginTop: '1.25rem' }}>
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
          <span className={isCanvasDirty ? 'text-slate-400' : 'text-slate-500'}>Wall Rotation Angle</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={wallAngle || 0}
            disabled={isCanvasDirty}
            onChange={(e) => setWallAngle?.(parseInt(e.target.value) || 0)}
            className={`flex-1 cursor-pointer ${isCanvasDirty ? 'accent-slate-300 cursor-not-allowed' : 'accent-indigo-600'}`}
          />
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max="90"
              value={wallAngle || 0}
              disabled={isCanvasDirty}
              onChange={(e) => {
                const valStr = e.target.value;
                if (valStr === '') {
                  setWallAngle?.(0);
                } else {
                  const val = parseInt(valStr);
                  if (!isNaN(val)) {
                    setWallAngle?.(Math.max(0, Math.min(90, val)));
                  }
                }
              }}
              className={`w-14 px-2 py-1 text-xs font-semibold text-center border rounded focus:outline-none ${
                isCanvasDirty
                  ? 'bg-slate-100/50 text-slate-400 border-slate-250 cursor-not-allowed'
                  : 'bg-white text-slate-800 border-slate-200 focus:border-indigo-500'
              }`}
            />
            <span className="text-xs font-bold text-slate-400 ml-1">°</span>
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase font-mono pr-16 select-none">
          <span>0° (Standard)</span>
          <span>45° (Diag)</span>
          <span>90°</span>
        </div>
      </div>

      {/* Preset Designs Selection Grid */}
      <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Preset Designs
        </label>
        
        {/* Baseline Shapes & Custom Presets Grid container */}
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[9px] font-bold text-slate-400/90 uppercase tracking-wide block mb-1">Standard Shapes</span>
            <div className="grid grid-cols-2 gap-2">
              {(['rectangle', 'arch', 'oval', 'custom_arches'] as const).map((shapeOption) => {
                 const label = shapeOption === 'custom_arches' ? 'Custom Arches' : shapeOption;
                 return (
                <button
                  key={shapeOption}
                  type="button"
                  disabled={isCanvasDirty}
                  onClick={() => {
                    if (setWallBoundaryShape) {
                      setWallBoundaryShape(shapeOption);
                      if (shapeOption === 'arch' && (wallArchHeight === 0 || wallArchHeight === undefined)) {
                        const defaultArch = unit === 'cm' ? 61 : 24;
                        setWallArchHeight?.(Math.min(wallHeight, defaultArch));
                      }
                      if (shapeOption === 'custom_arches') {
                        if (setWallActiveArches && (!wallActiveArches || Object.keys(wallActiveArches).length === 0)) {
                          setWallActiveArches({ top: true, bottom: false, left: false, right: false });
                        }
                        if (setWallArchDepth && (wallArchDepth === 0 || wallArchDepth === undefined)) {
                          const defaultDepth = unit === 'cm' ? 61 : 24;
                          setWallArchDepth(Math.min(wallHeight/2, defaultDepth));
                        }
                      }
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-center border capitalize font-bold text-xs transition select-none ${
                    isCanvasDirty
                      ? wallBoundaryShape === shapeOption
                        ? 'bg-slate-200 text-slate-500 border-slate-300 opacity-60 cursor-not-allowed'
                        : 'bg-slate-100/50 text-slate-400 border-slate-250 opacity-60 cursor-not-allowed'
                      : wallBoundaryShape === shapeOption
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs cursor-pointer'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 cursor-pointer'
                  }`}
                >
                  <span>{label}</span>
                </button>
                )
              })}
            </div>
          </div>

          {customPresets.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-indigo-500/90 uppercase tracking-wide block mb-1">Custom Presets</span>
              <div className="grid grid-cols-2 gap-2">
                {customPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    disabled={isCanvasDirty}
                    onClick={() => {
                      if (onLoadCustomPreset) {
                        onLoadCustomPreset(preset.data);
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-15 rounded-md text-center border font-bold text-xs transition select-none ${
                      isCanvasDirty
                        ? 'bg-slate-100/50 text-slate-400 border-slate-250 opacity-60 cursor-not-allowed'
                        : 'bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 border-indigo-200 hover:border-indigo-400 shadow-xs cursor-pointer'
                    }`}
                  >
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isCanvasDirty && (
          <div className="mt-3 p-2.5 bg-amber-50/70 border border-amber-100 rounded-md flex flex-row flex-wrap items-center justify-between gap-2 animate-fade-in">
            <span className="text-[11px] text-amber-800 leading-tight flex-1 font-medium">
              Canvas customized. Reset workspace to choose standard templates again.
            </span>
            <button
              type="button"
              disabled={currentProjectId !== null}
              onClick={onResetWorkspace}
              title={currentProjectId !== null ? 'Cannot reset an active cloud project. Please create a New Project instead.' : undefined}
              className={`px-2 py-1 font-bold text-[10px] rounded flex items-center gap-1 shadow-xs transition select-none ${
                currentProjectId !== null
                  ? 'bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white cursor-pointer'
              }`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset Workspace
            </button>
          </div>
        )}
      </div>

      {/* Wall Custom Arches Controls */}
      {wallBoundaryShape === 'custom_arches' && (
        <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-100 animate-fade-in animate-duration-205">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Curve Depth ({unit})
              </label>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                Max: {Math.min(wallWidth / 2, wallHeight / 2).toFixed(1)} {unit}
              </span>
            </div>
            <input
              type="number"
              min="0.1"
              max={Math.min(wallWidth / 2, wallHeight / 2)}
              step="0.1"
              value={wallArchDepth === 0 ? '' : wallArchDepth}
              onChange={(e) => {
                const valStr = e.target.value;
                if (valStr === '') {
                  setWallArchDepth?.(0);
                } else {
                  const val = parseFloat(valStr);
                  if (!isNaN(val)) setWallArchDepth?.(val);
                }
              }}
              onBlur={() => {
                const maxAllowed = Math.min(wallWidth / 2, wallHeight / 2);
                setWallArchDepth?.(Math.max(0.1, Math.min(maxAllowed, wallArchDepth || 10)));
              }}
              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Active Arched Sides
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => {
                const isToggled = !!wallActiveArches[side];
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      const nextArches = {
                        top: wallActiveArches.top ?? false,
                        bottom: wallActiveArches.bottom ?? false,
                        left: wallActiveArches.left ?? false,
                        right: wallActiveArches.right ?? false,
                        [side]: !isToggled
                      };
                      setWallActiveArches?.(nextArches);
                    }}
                    className={`py-1 px-1.5 text-[9px] font-bold rounded border transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                      isToggled
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-extrabold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isToggled ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                    {side.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Wall Arch Height Numerical Control */}
      {wallBoundaryShape === 'arch' && (
        <div className="mt-4 pt-3 border-t border-slate-50 animate-fade-in animate-duration-205">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Wall Arch Height ({unit})
            </label>
            <span className="text-[10px] text-slate-500 font-mono font-medium">
              Max: {wallHeight} {unit}
            </span>
          </div>
          <input
            type="number"
            id="wall-arch-height-input"
            min="1"
            max={wallHeight}
            step="0.1"
            value={wallArchHeight || ''}
            onChange={(e) => {
              const valStr = e.target.value;
              if (valStr === '') {
                setWallArchHeight?.(0);
              } else {
                const val = parseFloat(valStr);
                if (!isNaN(val)) {
                  setWallArchHeight?.(Math.min(wallHeight, val));
                }
              }
            }}
            onBlur={() => {
              const val = Math.max(1, Math.min(wallHeight, wallArchHeight || 1));
              setWallArchHeight?.(val);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {wallExtensions.length > 0 && (() => {
        const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions);
        let mainArea = wallWidth * wallHeight;
        if (wallBoundaryShape && wallBoundaryShape !== 'rectangle') {
          mainArea = getTrueArea({
            width: wallWidth,
            height: wallHeight,
            boundaryShape: wallBoundaryShape as 'arch' | 'oval' | 'custom_arches',
            archHeight: wallArchHeight,
            activeArches: wallActiveArches,
            archDepth: wallArchDepth
          });
        }
        const totalArea = mainArea + wallExtensions.reduce((sum, ext) => sum + getTrueArea(ext), 0);
        return (
          <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-md space-y-1.5 text-xs animate-fade-in">
            <div className="font-bold text-indigo-950 uppercase tracking-wider text-[9px] flex items-center justify-between">
              <span>Recalculated Bounding Size</span>
              <span className="text-indigo-600 bg-indigo-100 px-1 py-0.5 rounded text-[8px] font-black">EXTENDED</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Bounding Width:</span>
              <span className="font-mono text-slate-900">{bounds.width} {unit}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Bounding Height:</span>
              <span className="font-mono text-slate-900">{bounds.height} {unit}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-705 border-t border-indigo-100/30 pt-1.5 text-[11px]">
              <span>Total Surface Area:</span>
              <span className="font-mono text-indigo-700 font-extrabold">{totalArea.toFixed(1)} {unit}²</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
