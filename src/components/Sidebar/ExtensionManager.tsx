import React from 'react';
import { MeasurementUnit, WallExtension } from '../../types';
import { Plus, Lock, Unlock, Trash2 } from 'lucide-react';
import { ActiveExtensionEditor } from './ActiveExtensionEditor';

interface ExtensionManagerProps {
  wallExtensions: WallExtension[];
  setWallExtensions: React.Dispatch<React.SetStateAction<WallExtension[]>>;
  activeWallExtensionId: string | null;
  setActiveWallExtensionId: (id: string | null) => void;
  setActiveSubAreaId: (id: string | null) => void;
  unit: MeasurementUnit;
  wallWidth: number;
  wallHeight: number;
}

export const ExtensionManager: React.FC<ExtensionManagerProps> = ({
  wallExtensions,
  setWallExtensions,
  activeWallExtensionId,
  setActiveWallExtensionId,
  setActiveSubAreaId,
  unit,
  wallWidth,
  wallHeight,
}) => {
  const handleAddExtension = () => {
    const id = `ext_${Date.now()}`;
    const newExt: WallExtension = {
      id,
      name: `Extension ${wallExtensions.length + 1}`,
      x: Math.round(wallWidth),
      y: 0,
      width: Math.round(wallWidth * 0.4 || 40),
      height: Math.round(wallHeight * 0.6 || 60),
    };
    setWallExtensions((prev) => [...prev, newExt]);
    setActiveWallExtensionId(id);
    setActiveSubAreaId(null);
  };

  const handleDeleteExtension = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWallExtensions((prev) => prev.filter((ext) => ext.id !== id));
    if (activeWallExtensionId === id) {
      setActiveWallExtensionId(null);
    }
  };

  const handleUpdateExtension = (id: string, updates: Partial<WallExtension>) => {
    setWallExtensions((prev) =>
      prev.map((ext) => {
        if (ext.id === id) {
          return { ...ext, ...updates };
        }
        return ext;
      })
    );
  };

  const activeExt = wallExtensions.find((ext) => ext.id === activeWallExtensionId);

  return (
    <div id="wall-extensions-section" className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-4 animate-fade-in">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Wall Shape Extensions</h3>
        </div>
        <button
          type="button"
          id="add-extension-btn"
          onClick={handleAddExtension}
          className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 font-bold text-xs py-1 px-2.5 rounded border border-emerald-200 cursor-pointer transition shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Extension
        </button>
      </div>

      {wallExtensions.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-2">
          No wall extensions added. Click &ldquo;Add Extension&rdquo; to expand the wall's rectangular layout boundaries.
        </p>
      ) : (
        <div className="space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Active Shape Extensions:
          </span>
          {wallExtensions.map((ext) => {
            const isSelected = ext.id === activeWallExtensionId;
            return (
              <div
                key={ext.id}
                onClick={() => {
                  setActiveWallExtensionId(isSelected ? null : ext.id);
                  setActiveSubAreaId(null); // Uncheck active niches/accents
                }}
                className={`p-2.5 rounded border transition cursor-pointer flex justify-between items-center group relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/45 text-emerald-950 ring-1 ring-emerald-555'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-xs">{ext.name}</span>
                  <span className="text-[10px] font-mono text-slate-405 mt-0.5">
                    Pos: ({ext.x}, {ext.y}) &bull; Size: {ext.width} &times; {ext.height} {unit}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateExtension(ext.id, { locked: !ext.locked });
                    }}
                    className={`p-1.5 rounded transition ${
                      ext.locked
                        ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold shadow-2xs'
                        : 'text-slate-400 hover:text-slate-605 hover:bg-slate-150'
                    }`}
                    title={ext.locked ? 'Unlock layout extension' : 'Lock layout extension'}
                  >
                    {ext.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteExtension(ext.id, e)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100/55 transition opacity-80 group-hover:opacity-100"
                    title="Delete extension"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Extension detail config sliders */}
      {activeExt && (
        <ActiveExtensionEditor
          activeExt={activeExt}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          unit={unit}
          handleUpdateExtension={handleUpdateExtension}
        />
      )}
    </div>
  );
};
