import React from 'react';
import { Palette, Sun } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const RoomDimensionsPanel: React.FC = () => {
  const { 
    roomDimensions, 
    setRoomDimensions, 
    roomColors, 
    setRoomColors,
    lightingExposure,
    setLightingExposure
  } = useAppStore();

  return (
    <>
      {/* Numeric inputs for Dimensions */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Width (in)
          </label>
          <input
            type="number"
            min="12"
            max="600"
            value={roomDimensions.width}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRoomDimensions({ width: isNaN(val) ? 120 : val });
            }}
            className="w-full px-2.5 py-1.5 border rounded text-xs font-semibold focus:outline-none focus:ring-2 bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Height (in)
          </label>
          <input
            type="number"
            min="12"
            max="300"
            value={roomDimensions.height}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRoomDimensions({ height: isNaN(val) ? 96 : val });
            }}
            className="w-full px-2.5 py-1.5 border rounded text-xs font-semibold focus:outline-none focus:ring-2 bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Depth (in)
          </label>
          <input
            type="number"
            min="12"
            max="600"
            value={roomDimensions.depth}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRoomDimensions({ depth: isNaN(val) ? 120 : val });
            }}
            className="w-full px-2.5 py-1.5 border rounded text-xs font-semibold focus:outline-none focus:ring-2 bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Primary Color Picker (Master Room Color) */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded mb-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            Master Room Color
          </span>
          <span className="text-[9px] text-slate-500 font-medium leading-normal">
            Applies a uniform background color to all surfaces
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={roomColors.base}
            onChange={(e) => setRoomColors({ base: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0"
          />
          <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded">
            {roomColors.base.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Studio Lighting Exposure Slider */}
      <div className="p-3 bg-slate-50 border border-slate-200/60 rounded mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
              Studio Lighting Exposure
            </span>
            <span className="text-[9px] text-slate-500 font-medium leading-normal">
              Controls global scene brightness and shadow intensity
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {(lightingExposure ?? 1.0).toFixed(1)}x
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={lightingExposure ?? 1.0}
            onChange={(e) => setLightingExposure(parseFloat(e.target.value))}
            className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </>
  );
};
