import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const AdvancedSurfacesPanel: React.FC = () => {
  const { roomColors, setRoomColors } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      {/* Advanced Collapsible Section */}
      <div className="border border-slate-200/60 rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/75 transition-colors text-left"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Advanced / Individual Surfaces
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-3 bg-white space-y-2.5 border-t border-slate-100 divide-y divide-slate-50 animate-fade-in">
            {[
              { key: 'floor' as const, label: 'Floor' },
              { key: 'ceiling' as const, label: 'Ceiling' },
              { key: 'left' as const, label: 'Left Wall' },
              { key: 'right' as const, label: 'Right Wall' },
              { key: 'back' as const, label: 'Back Wall' },
            ].map((surf, idx) => {
              const overrideVal = roomColors.overrides[surf.key];
              const displayColor = overrideVal || roomColors.base;
              const hasOverride = overrideVal !== undefined;

              return (
                <div key={surf.key} className={`flex items-center justify-between pt-2.5 ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">{surf.label}</span>
                    <span className="text-[9px] text-slate-400">
                      {hasOverride ? 'Custom override active' : 'Inheriting Master Color'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          setRoomColors({
                            overrides: {
                              [surf.key]: null as any,
                            } as any
                          });
                        }}
                        className="text-[9px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition"
                      >
                        Reset
                      </button>
                    )}
                    <input
                      type="color"
                      value={displayColor}
                      onChange={(e) => {
                        setRoomColors({
                          overrides: {
                            [surf.key]: e.target.value,
                          } as any
                        });
                      }}
                      className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0"
                    />
                    <span className="text-[10px] font-mono font-semibold text-slate-500 w-14 text-right">
                      {displayColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
