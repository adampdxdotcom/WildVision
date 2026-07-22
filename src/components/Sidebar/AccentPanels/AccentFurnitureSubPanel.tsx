import React from 'react';
import { AccentSubPanelProps } from './types';
import { useAppStore } from '../../../store/useAppStore';
import { checkSubAreaFoldIntersection } from '../../../utils/geometry';

interface AccentFurnitureSubPanelProps extends AccentSubPanelProps {
  resolvedType: 'flat' | 'niche' | 'shelf' | 'cutout';
}

export const AccentFurnitureSubPanel: React.FC<AccentFurnitureSubPanelProps> = ({
  activeSa,
  updateActiveSubArea,
  unit,
  resolvedType,
}) => {
  if (resolvedType === 'cutout') {
    return null;
  }

  let currentDepth = activeSa.depth;

  if (currentDepth === undefined) {
    if (resolvedType === 'shelf') currentDepth = 6.0;
    else if (resolvedType === 'niche') currentDepth = 3.5;
  }

  return (
    <div className="space-y-3.5">
      {/* 1. Stencil Cutout Option (Flat / Tile Inlay only) */}
      {resolvedType === 'flat' && (
        <div className="p-2.5 bg-amber-50/50 border border-amber-200/50 rounded flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-amber-900">Stencil Cutout Mode</span>
            <span className="text-[9px] text-amber-700/80 font-medium leading-normal">
              Accent tiles perfectly clip to the main wall boundaries, acting as an overlay.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none ml-2 shrink-0">
            <input
              type="checkbox"
              checked={activeSa.isStencil || false}
              onChange={(e) => updateActiveSubArea({ isStencil: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-100 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>
      )}

      {/* 3. Inner Sill / Frame Controls (Niche recessed only) */}
      {resolvedType === 'niche' && (
        <div className="p-3 bg-amber-100/25 border border-amber-200/50 rounded-lg space-y-3">
          <label className="flex items-center gap-2 font-bold text-xs text-amber-955 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeSa.hasSill || false}
              onChange={(e) => {
                const checked = e.target.checked;
                updateActiveSubArea({
                  hasSill: checked,
                  ...(checked ? {
                    sillDepth: activeSa.sillDepth ?? 4,
                    sillTileName: activeSa.sillTileName ?? 'Bullnose Sill Tile',
                    sillTileShape: activeSa.sillTileShape ?? 'Rectangle',
                    sillTileWidth: activeSa.sillTileWidth ?? (unit === 'in' ? 2 : 5),
                    sillTileHeight: activeSa.sillTileHeight ?? (unit === 'in' ? 6 : 15),
                    sillTileColor: activeSa.sillTileColor ?? '#475569',
                  } : {})
                });
              }}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 accent-amber-600"
            />
            <span>Add Inner Sill / Frame</span>
          </label>

          {activeSa.hasSill && (
            <div className="space-y-3 pt-2.5 border-t border-amber-200/45 animate-fade-in text-slate-850">
              {/* Sill Depth component */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                  Sill Frame Width ({unit})
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="24"
                  step="0.1"
                  value={activeSa.sillDepth === 0 ? '' : (activeSa.sillDepth ?? 4)}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      updateActiveSubArea({ sillDepth: 0 });
                    } else {
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) updateActiveSubArea({ sillDepth: val });
                    }
                  }}
                  onBlur={() => {
                    updateActiveSubArea({ sillDepth: Math.max(0.1, Math.min(24, activeSa.sillDepth || 4)) });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Sill Tile Name / Label */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                  Sill Tile Name / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Slate Sill, Edge Trim"
                  value={activeSa.sillTileName || ''}
                  onChange={(e) => updateActiveSubArea({ sillTileName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-855 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Sill Tile Shape & Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                    Sill Tile Shape
                  </label>
                  <select
                    value={activeSa.sillTileShape || 'Rectangle'}
                    onChange={(e) => updateActiveSubArea({ sillTileShape: e.target.value as 'Square' | 'Rectangle' })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-855 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Square">Square</option>
                    <option value="Rectangle">Rectangle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                    Sill Color
                  </label>
                  <input
                    type="color"
                    value={activeSa.sillTileColor || '#475569'}
                    onChange={(e) => updateActiveSubArea({ sillTileColor: e.target.value })}
                    className="w-full h-8 border border-slate-250 rounded cursor-pointer p-0.5 bg-white"
                  />
                </div>
              </div>

              {/* Sill Tile Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                    Sill Tile W ({unit})
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.1"
                    value={activeSa.sillTileWidth === 0 ? '' : (activeSa.sillTileWidth ?? (unit === 'in' ? 2 : 5))}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        updateActiveSubArea({ sillTileWidth: 0 });
                      } else {
                        const val = parseFloat(valStr);
                        if (!isNaN(val)) updateActiveSubArea({ sillTileWidth: val });
                      }
                    }}
                    onBlur={() => {
                      updateActiveSubArea({ sillTileWidth: Math.max(0.1, Math.min(50, activeSa.sillTileWidth || (unit === 'in' ? 2 : 5))) });
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                    Sill Tile H ({unit})
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.1"
                    value={activeSa.sillTileHeight === 0 ? '' : (activeSa.sillTileHeight ?? (unit === 'in' ? 6 : 15))}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        updateActiveSubArea({ sillTileHeight: 0 });
                      } else {
                        const val = parseFloat(valStr);
                        if (!isNaN(val)) updateActiveSubArea({ sillTileHeight: val });
                      }
                    }}
                    onBlur={() => {
                      updateActiveSubArea({ sillTileHeight: Math.max(0.1, Math.min(50, activeSa.sillTileHeight || (unit === 'in' ? 6 : 15))) });
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Organic Edges Toggle (Flat, Shelf, Niche, Bench only) */}
      <div className="pt-3 border-t border-amber-100/50 space-y-2">
        <label className="flex items-start gap-2 cursor-pointer group">
          <div className="relative flex items-center pt-0.5">
            <input
              type="checkbox"
              checked={activeSa.organicEdges || false}
              onChange={(e) => updateActiveSubArea({ organicEdges: e.target.checked })}
              className="peer sr-only"
            />
            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
          </div>
          <div>
            <span className="font-bold text-xs text-slate-800 group-hover:text-slate-900 transition-colors select-none block leading-tight">
              Organic Edges
            </span>
            <span className="text-[10px] text-slate-500 font-medium block leading-snug mt-0.5">
              Render full tiles inside the bounds instead of clipping
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
