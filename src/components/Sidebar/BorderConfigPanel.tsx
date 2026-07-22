import React from 'react';
import { BorderConfig, TileShape } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface BorderConfigPanelProps {
  border: BorderConfig | undefined;
  onChange: (border: BorderConfig | undefined) => void;
  shape: TileShape;
}

export const BorderConfigPanel: React.FC<BorderConfigPanelProps> = ({ border, onChange, shape }) => {
  const isEnabled = border?.enabled || false;
  const tileColorOverrides = useAppStore(state => state.tileColorOverrides) || {};
  const isLockedForPainting = Object.keys(tileColorOverrides).length > 0;

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLockedForPainting) return;
    if (e.target.checked) {
      onChange({
        enabled: true,
        tileName: border?.tileName || 'Border Tile',
        tileWidth: border?.tileWidth || 4,
        tileHeight: border?.tileHeight || 2,
        cornerJoint: border?.cornerJoint || 'straight',
        color: border?.color || '#1e293b'
      });
    } else {
      onChange({
        ...(border || {}),
        enabled: false,
      } as BorderConfig);
    }
  };

  const updateField = (field: keyof BorderConfig, value: any) => {
    if (!border || isLockedForPainting) return;
    onChange({ ...border, [field]: value });
  };

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      <label className={`flex items-center gap-2 font-bold text-xs text-slate-800 select-none ${isLockedForPainting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isLockedForPainting}
          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:cursor-not-allowed"
        />
        Enable Perimeter Border
      </label>

      {isEnabled && border && (
        <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-3 animate-fade-in pl-6 relative">
          <div className="absolute left-2.5 top-0 bottom-3 w-px bg-slate-200"></div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Border Tile Name
            </label>
            <input
              type="text"
              value={border.tileName}
              onChange={(e) => updateField('tileName', e.target.value)}
              placeholder="e.g. Profile Edge"
              disabled={isLockedForPainting}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Width
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={border.tileWidth}
                onChange={(e) => updateField('tileWidth', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                disabled={isLockedForPainting || shape !== 'rectangle'}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Height
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={border.tileHeight}
                onChange={(e) => updateField('tileHeight', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                disabled={isLockedForPainting || shape !== 'rectangle'}
              />
            </div>
          </div>
          
          {shape !== 'rectangle' && (
            <p className="text-[9px] text-amber-600/80 leading-tight">
              Border size is fixed for non-rectangular tiles.
            </p>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Corner Joint
            </label>
            <select
              value={border.cornerJoint}
              onChange={(e) => updateField('cornerJoint', e.target.value)}
              disabled={isLockedForPainting}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="straight">Straight</option>
              <option value="mitered">Mitered (45°)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Border Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={border.color || '#1e293b'}
                onChange={(e) => updateField('color', e.target.value)}
                disabled={isLockedForPainting}
                className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0.5 custom-color-input disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 font-mono">
                {border.color || 'Default'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
