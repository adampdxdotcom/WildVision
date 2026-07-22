import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MeasurementUnit } from '../../types';
import {
  ArrowLeft,
  Info,
  BookOpen,
  Sliders,
  HelpCircle
} from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const {
    unit, setUnit,
    wallWidth, setWallWidth,
    wallHeight, setWallHeight,
    tileWidth, setTileWidth,
    tileHeight, setTileHeight,
    groutWidth, setGroutWidth,
    setSubAreas,
    setWallExtensions,
    wallArchHeight, setWallArchHeight,
    overage, setOverage,
    viewSettings, updateViewSetting,
    setTutorialStepIndex,
    autoSavePatterns, setAutoSavePatterns
  } = useAppStore();

  const [showHelp, setShowHelp] = React.useState<boolean>(false);
  const [helpTab, setHelpTab] = React.useState<'instructions' | 'features'>('instructions');

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    if (newUnit === unit) return;
    setUnit(newUnit);

    const ratio = newUnit === 'cm' ? 2.54 : 1 / 2.54;
    setWallWidth(Number((wallWidth * ratio).toFixed(1)));
    setWallHeight(Number((wallHeight * ratio).toFixed(1)));
    setTileWidth(Number((tileWidth * ratio).toFixed(2)));
    setTileHeight(Number((tileHeight * ratio).toFixed(2)));
    setGroutWidth(Number((groutWidth * ratio).toFixed(3)));

    if (wallArchHeight && setWallArchHeight) {
      setWallArchHeight(Number((wallArchHeight * ratio).toFixed(1)));
    }

    setSubAreas((prev) =>
      prev.map((sa) => ({
        ...sa,
        x: Number((sa.x * ratio).toFixed(2)),
        y: Number((sa.y * ratio).toFixed(2)),
        width: Number((sa.width * ratio).toFixed(2)),
        height: Number((sa.height * ratio).toFixed(2)),
        tileWidth: Number((sa.tileWidth * ratio).toFixed(2)),
        tileHeight: Number((sa.tileHeight * ratio).toFixed(2)),
        groutWidth: Number((sa.groutWidth * ratio).toFixed(3)),
      }))
    );

    setWallExtensions((prev) =>
      prev.map((ext) => ({
        ...ext,
        x: Number((ext.x * ratio).toFixed(2)),
        y: Number((ext.y * ratio).toFixed(2)),
        width: Number((ext.width * ratio).toFixed(2)),
        height: Number((ext.height * ratio).toFixed(2)),
      }))
    );
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-4 animate-fade-in text-slate-700">
      {showHelp ? (
        <div className="space-y-4 animate-fade-in">
          {/* Help Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </button>
            <span className="text-[10px] uppercase font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-wide">
              Help Center
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setHelpTab('instructions')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition cursor-pointer ${
                helpTab === 'instructions'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-100/30'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              Instructions
            </button>
            <button
              type="button"
              onClick={() => setHelpTab('features')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition cursor-pointer ${
                helpTab === 'features'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-100/30'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              Features
            </button>
          </div>

          {/* Tab Content: Instructions */}
          {helpTab === 'instructions' && (
            <div className="space-y-3 pb-1 max-h-[360px] overflow-y-auto pr-1 text-xs">
              <div className="p-3 bg-indigo-50/40 rounded border border-indigo-100/55 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                  Follow this step-by-step layout guide to customize, align, measure, and calculate your tile layouts flawlessly.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="flex gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px] shrink-0 font-mono">1</span>
                  <div>
                    <h4 className="font-bold text-slate-850 text-xs">Define Your Structure</h4>
                    <p className="text-[10.5px] text-slate-550 mt-0.5 leading-relaxed">
                      Under the <strong>Canvas & Wall</strong> setup, set the total Width and Height. Select Rectangle, Arch, or Oval boundaries, and add Wall Extensions for column columns/recesses.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px] shrink-0 font-mono">2</span>
                  <div>
                    <h4 className="font-bold text-slate-850 text-xs">Configure Tile Styles</h4>
                    <p className="text-[10.5px] text-slate-550 mt-0.5 leading-relaxed">
                      Specify the primary tile shape (such as Hexagon, Chevron, Round, Basket Weave), precision size sizes, rotation angle, and grout spacer joints. Toggle <strong>Mosaic sheets</strong> for mesh backing.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px] shrink-0 font-mono">3</span>
                  <div>
                    <h4 className="font-bold text-slate-850 text-xs">Position Accent Zones</h4>
                    <p className="text-[10.5px] text-slate-550 mt-0.5 leading-relaxed">
                      Go to the <strong>Accents</strong> panel, edit locations, separate visual colors or rotation offsets, or enable <strong>Is Stencil</strong> clip mode. Lock placement positions to secure dragging.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px] shrink-0 font-mono">4</span>
                  <div>
                    <h4 className="font-bold text-slate-850 text-xs">Nudge Room Background</h4>
                    <p className="text-[10.5px] text-slate-550 mt-0.5 leading-relaxed">
                      In the <strong>Overlay</strong> panel, upload a room snapshot, unlock the background, and scale or drag coordinates to fit. Slide Tile Opacity to blend material colors onto real fixtures.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px] shrink-0 font-mono">5</span>
                  <div>
                    <h4 className="font-bold text-slate-850 text-xs">Inspect Math & Save</h4>
                    <p className="text-[10.5px] text-slate-550 mt-0.5 leading-relaxed">
                      Verify material overage counts. If final, click <strong>Export PDF</strong> from the header controls to download the professional job blueprint reports.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Features */}
          {helpTab === 'features' && (
            <div className="space-y-3 pb-1 max-h-[360px] overflow-y-auto pr-1 text-xs">
              <div className="p-3 bg-indigo-50/40 rounded border border-indigo-100/55 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                  WildVision supports a comprehensive set of professional drafting capabilities optimized for high-performance visual calculation:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="border-b border-slate-100/70 pb-2">
                  <h4 className="font-bold text-slate-800 text-[11px]">1. Interactive 2D Workspace</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Hold Spacebar for infinite canvas panning, zoom level controls, dynamic snaps, and a 12&ldquo; real-world calibrated blueprint drafting grid layout.
                  </p>
                </div>

                <div className="border-b border-slate-100/70 pb-2">
                  <h4 className="font-bold text-slate-800 text-[11px]">2. Custom Wall Setup</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Inches and centimeters setup, Rounded Arch/Oval primary wall boundaries with customizable height rises, and modular wall extension shapes.
                  </p>
                </div>

                <div className="border-b border-slate-100/70 pb-2">
                  <h4 className="font-bold text-slate-800 text-[11px]">3. Tile Configuration Engine</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Shapes (Rectangles, Hexagon, Chevron, Round, Rhombus, Scalloped) with precise joint grout spacing, angle rotation offsets, mosaic sheets, and glazed tile reflections.
                  </p>
                </div>

                <div className="border-b border-slate-100/70 pb-2">
                  <h4 className="font-bold text-slate-800 text-[11px]">4. Accent Panels & Niches</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Drag and drop shower niches, adjust inner patterns independently, set custom arch/oval styles, clip to wall limits via stencil cuts, and click Lock positions.
                  </p>
                </div>

                <div className="border-b border-slate-100/70 pb-2">
                  <h4 className="font-bold text-slate-800 text-[11px]">5. Photo Overlay Mode</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Fast in-browser compression to align room snapshot images, unlock target scales, and adjust tile blending transparency.
                  </p>
                </div>

                <div className="border-b border-slate-100/70 pb-2">
                  <h4 className="font-bold text-slate-800 text-[11px]">6. Intelligent Measurements</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Segmented dimensions on design details, real-time niche edge clearances, and material summaries (full tiles vs. cuts).
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-[11px]">7. Project Saves & PDF Export</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Save lightweight JSON templates and print highly professional blueprint pdf portfolios containing custom estimates and photos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Regular Calibration & Settings Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Calibration & Settings</h3>
            </div>
            <div className="flex items-center gap-1.5 animate-fade-in">
              {/* Interactive Tutorial Trigger */}
              <button
                type="button"
                onClick={() => setTutorialStepIndex?.(0)}
                className="text-xs text-indigo-600 hover:text-indigo-850 border border-indigo-150 hover:bg-indigo-50 font-extrabold flex items-center gap-1 cursor-pointer transition py-0.5 px-2 bg-indigo-50/50 rounded"
              >
                <HelpCircle size={16} />
                <span>Tutorial</span>
              </button>
              {/* The requested HELP Link on the Settings Page */}
              <button
                type="button"
                onClick={() => {
                  setShowHelp(true);
                  setHelpTab('instructions');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-850 font-extrabold flex items-center gap-1 cursor-pointer transition py-0.5 px-2 bg-indigo-50 hover:bg-indigo-100 rounded"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help</span>
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Measurement Unit</span>
              <div className="inline-flex rounded p-0.5 bg-slate-100 border border-slate-200/50">
                <button
                  type="button"
                  id="unit-inches-btn"
                  onClick={() => handleUnitChange('in')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer ${
                    unit === 'in'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Inches
                </button>
                <button
                  type="button"
                  id="unit-cm-btn"
                  onClick={() => handleUnitChange('cm')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer ${
                    unit === 'cm'
                      ? 'bg-white text-indigo-500 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Overage / Waste Factor</span>
                <span className="font-bold text-indigo-600">{overage}% overage</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={overage}
                onChange={(e) => setOverage(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[9px] text-slate-400 block mt-1 leading-normal font-sans">
                Safety cushion percentage for cuts, corner fits, and extra waste.
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3 text-xs text-slate-650">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Additional Settings</span>
              <label className="flex flex-col gap-1 cursor-pointer font-semibold">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={autoSavePatterns}
                    onChange={(e) => setAutoSavePatterns(e.target.checked)}
                    className="accent-indigo-600 rounded-xs cursor-pointer"
                  />
                  <span>Auto-Save Pattern Edits</span>
                </div>
                <span className="text-[9px] text-slate-400 ml-6 block leading-normal font-sans font-normal">
                  Automatically saves your custom pattern adjustments to the cloud in real-time.
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={viewSettings.render.enableReflection}
                  onChange={(e) => updateViewSetting('render', 'enableReflection', e.target.checked)}
                  className="accent-indigo-600 rounded-xs cursor-pointer"
                />
                <span>Enable Glazed Ceramic Reflection</span>
              </label>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
