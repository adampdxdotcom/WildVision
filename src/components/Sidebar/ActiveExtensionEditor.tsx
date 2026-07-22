import React from 'react';
import { MeasurementUnit, WallExtension } from '../../types';
import { Lock, Unlock } from 'lucide-react';

interface ActiveExtensionEditorProps {
  activeExt: WallExtension;
  wallWidth: number;
  wallHeight: number;
  unit: MeasurementUnit;
  handleUpdateExtension: (id: string, updates: Partial<WallExtension>) => void;
}

export const ActiveExtensionEditor: React.FC<ActiveExtensionEditorProps> = ({
  activeExt,
  wallWidth,
  wallHeight,
  unit,
  handleUpdateExtension,
}) => {
  return (
    <div className="space-y-3 bg-slate-50/50 p-3 rounded-md border border-slate-150 animate-fade-in">
      <div className="flex justify-between items-center pb-1 border-b border-slate-100 mb-2">
        <span className="text-[10px] font-black uppercase text-emerald-705 tracking-wider">
          Configure {activeExt.name}
        </span>
        <span className="text-[9px] font-semibold text-slate-400 mt-0.5 capitalize">
          {activeExt.locked ? 'Unlock to drag on canvas' : 'drag on canvas to align'}
        </span>
      </div>

      {/* Name configuration */}
      <div>
        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
          Extension Name
        </label>
        <input
          type="text"
          value={activeExt.name}
          onChange={(e) => handleUpdateExtension(activeExt.id, { name: e.target.value })}
          className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-800"
        />
      </div>

      {/* Lock Configuration */}
      <div className="flex items-center justify-between bg-white px-2.5 py-2 rounded border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          {activeExt.locked ? (
            <Lock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="text-[10px] font-bold text-slate-700">Lock Position Coordinates</span>
        </div>
        <button
          type="button"
          onClick={() => handleUpdateExtension(activeExt.id, { locked: !activeExt.locked })}
          className={`px-3 py-1 text-[9px] font-bold rounded cursor-pointer transition ${
            activeExt.locked
              ? 'bg-amber-600 text-white shadow-xs border border-amber-605'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
          }`}
        >
          {activeExt.locked ? 'LOCKED' : 'LOCK'}
        </button>
      </div>

      {/* Size config */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
            Width ({unit})
          </label>
          <input
            type="number"
            min="5"
            max="300"
            step="0.001"
            value={activeExt.width === 0 ? '' : activeExt.width}
            onChange={(e) => {
              const valStr = e.target.value;
              if (valStr === '') {
                handleUpdateExtension(activeExt.id, { width: 0 });
              } else {
                const val = parseFloat(valStr);
                if (!isNaN(val)) handleUpdateExtension(activeExt.id, { width: val });
              }
            }}
            onBlur={() => {
              handleUpdateExtension(activeExt.id, { width: Math.max(5, Math.min(300, activeExt.width || 5)) });
            }}
            className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
            Height ({unit})
          </label>
          <input
            type="number"
            min="5"
            max="300"
            step="0.001"
            value={activeExt.height === 0 ? '' : activeExt.height}
            onChange={(e) => {
              const valStr = e.target.value;
              if (valStr === '') {
                handleUpdateExtension(activeExt.id, { height: 0 });
              } else {
                const val = parseFloat(valStr);
                if (!isNaN(val)) handleUpdateExtension(activeExt.id, { height: val });
              }
            }}
            onBlur={() => {
              handleUpdateExtension(activeExt.id, { height: Math.max(5, Math.min(300, activeExt.height || 5)) });
            }}
            className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-800"
          />
        </div>
      </div>

      {/* Manual position adjusters */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
            Offset X
          </label>
          <input
            type="number"
            min="-500"
            max="500"
            step="0.001"
            value={activeExt.x}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) handleUpdateExtension(activeExt.id, { x: val });
            }}
            className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
            Offset Y
          </label>
          <input
            type="number"
            min="-500"
            max="500"
            step="0.001"
            value={activeExt.y}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) handleUpdateExtension(activeExt.id, { y: val });
            }}
            className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-800"
          />
        </div>
      </div>

      {/* Boundary Shape for Extension */}
      <div className="pt-2.5 border-t border-slate-200/50">
        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 font-bold">
          Extension Boundary Shape
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['rectangle', 'arch'] as const).map((shapeOption) => (
            <button
              key={shapeOption}
              type="button"
              onClick={() => {
                handleUpdateExtension(activeExt.id, {
                  boundaryShape: shapeOption,
                  archHeight: shapeOption === 'arch' && (activeExt.archHeight === 0 || activeExt.archHeight === undefined)
                    ? activeExt.width / 2
                    : activeExt.archHeight
                });
              }}
              className={`py-1.5 px-1 rounded-md text-center border capitalize font-bold text-[10px] transition cursor-pointer ${
                (activeExt.boundaryShape || 'rectangle') === shapeOption
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-655 border-slate-200'
              }`}
            >
              <span>{shapeOption}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extension Arch Height numerical control */}
      {(activeExt.boundaryShape || 'rectangle') === 'arch' && (
        <div className="space-y-2">
          <div className="pt-2 animate-fade-in">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                Extension Arch Height ({unit})
              </label>
              <span className="text-[9px] text-slate-400 font-mono font-bold">
                Max: {activeExt.height} {unit}
              </span>
            </div>
            <input
              type="number"
              min="0.1"
              max={activeExt.height}
              step="0.1"
              value={activeExt.archHeight || ''}
              onChange={(e) => {
                const valStr = e.target.value;
                if (valStr === '') {
                  handleUpdateExtension(activeExt.id, { archHeight: 0 });
                } else {
                  const val = parseFloat(valStr);
                  if (!isNaN(val)) {
                    handleUpdateExtension(activeExt.id, { archHeight: Math.min(activeExt.height, val) });
                  }
                }
              }}
              onBlur={() => {
                const val = Math.max(0.1, Math.min(activeExt.height, activeExt.archHeight || (activeExt.width / 2)));
                handleUpdateExtension(activeExt.id, { archHeight: val });
              }}
              className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-800"
            />
          </div>

          <div className="pt-1.5 animate-fade-in">
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 font-bold">
              Arch Direction
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['top', 'bottom', 'left', 'right'] as const).map((dirOption) => (
                <button
                  key={dirOption}
                  type="button"
                  onClick={() => {
                    handleUpdateExtension(activeExt.id, { archDirection: dirOption });
                  }}
                  className={`py-1 px-0.5 rounded text-center border capitalize font-bold text-[9px] transition cursor-pointer ${
                    (activeExt.archDirection || 'top') === dirOption
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-655 border-slate-200'
                  }`}
                >
                  <span>{dirOption}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Center Alignment Utilities */}
      <div className="pt-2 border-t border-slate-200/60">
        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 text-slate-500">
          Alignment Helpers
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const computedX = Number(((wallWidth - activeExt.width) / 2).toFixed(3));
              handleUpdateExtension(activeExt.id, { x: computedX });
            }}
            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-[10px] text-indigo-700 font-bold rounded border border-indigo-200/65 transition cursor-pointer text-center"
          >
            Center Horizontally
          </button>
          <button
            type="button"
            onClick={() => {
              const computedY = Number(((wallHeight - activeExt.height) / 2).toFixed(3));
              handleUpdateExtension(activeExt.id, { y: computedY });
            }}
            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-[10px] text-indigo-700 font-bold rounded border border-indigo-200/65 transition cursor-pointer text-center"
          >
            Center Vertically
          </button>
        </div>
      </div>
    </div>
  );
};
