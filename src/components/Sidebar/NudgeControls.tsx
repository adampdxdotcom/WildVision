import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export interface NudgeControlsProps {
  unit: 'in' | 'cm';
  offsetX?: number;
  offsetY?: number;
  onNudge: (dir: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  onReset: () => void;
  resetTitle?: string;
  className?: string;
  showCoordinates?: boolean;
}

export const NudgeControls: React.FC<NudgeControlsProps> = ({
  unit,
  offsetX = 0,
  offsetY = 0,
  onNudge,
  onReset,
  resetTitle = 'Reset Alignment',
  className = '',
  showCoordinates = true,
}) => {
  // Preset definitions based on unit
  const imperialPresets = [
    { value: 0.25, label: '.25"' },
    { value: 0.5, label: '.5"' },
    { value: 1, label: '1"' },
  ];

  const metricPresets = [
    { value: 0.5, label: '.5cm' },
    { value: 1, label: '1cm' },
    { value: 2, label: '2cm' },
  ];

  const presets = unit === 'cm' ? metricPresets : imperialPresets;

  // Selected mode: numeric preset value or 'custom'
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(
    unit === 'cm' ? 0.5 : 0.25
  );
  const [customValue, setCustomValue] = useState<number>(
    unit === 'cm' ? 0.25 : 0.125
  );

  // When unit changes, update default preset if currently using a preset
  useEffect(() => {
    if (selectedPreset !== 'custom') {
      setSelectedPreset(unit === 'cm' ? 0.5 : 0.25);
    }
  }, [unit]);

  const activeAmount = selectedPreset === 'custom'
    ? Math.max(0.001, customValue || (unit === 'cm' ? 0.5 : 0.25))
    : selectedPreset;

  const handleArrowClick = (dir: 'up' | 'down' | 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    onNudge(dir, activeAmount);
  };

  const formattedX = offsetX ? (offsetX > 0 ? `+${Number(offsetX.toFixed(4))}` : `${Number(offsetX.toFixed(4))}`) : '0';
  const formattedY = offsetY ? (offsetY > 0 ? `+${Number(offsetY.toFixed(4))}` : `${Number(offsetY.toFixed(4))}`) : '0';
  const hasOffset = offsetX !== 0 || offsetY !== 0;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Nudge Layout
        </label>
        {showCoordinates && hasOffset && (
          <span className="text-[10px] font-mono text-slate-500 font-medium">
            X: {formattedX}{unit} Y: {formattedY}{unit}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded p-3.5">
        {/* Preset Selector */}
        <div className="w-full">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded border border-slate-200">
            {presets.map((p) => {
              const isSelected = selectedPreset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedPreset(p.value)}
                  className={`py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedPreset('custom')}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                selectedPreset === 'custom'
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Input Field when Custom is selected */}
        {selectedPreset === 'custom' && (
          <div className="flex items-center gap-2 w-full animate-fade-in">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Step ({unit})
            </span>
            <input
              type="number"
              min="0.001"
              step={unit === 'cm' ? '0.1' : '0.0625'}
              value={customValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCustomValue(isNaN(val) ? 0 : val);
              }}
              placeholder={unit === 'cm' ? 'e.g. 0.5' : 'e.g. 0.125'}
              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 flex-1"
            />
          </div>
        )}

        {/* Directional Pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          <div />
          <button
            type="button"
            onClick={(e) => handleArrowClick('up', e)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
            title={`Nudge Up by ${activeAmount}${unit}`}
          >
            <ChevronUp size={16} />
          </button>
          <div />
          <button
            type="button"
            onClick={(e) => handleArrowClick('left', e)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
            title={`Nudge Left by ${activeAmount}${unit}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onReset();
            }}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
            title={resetTitle}
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => handleArrowClick('right', e)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
            title={`Nudge Right by ${activeAmount}${unit}`}
          >
            <ChevronRight size={16} />
          </button>
          <div />
          <button
            type="button"
            onClick={(e) => handleArrowClick('down', e)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
            title={`Nudge Down by ${activeAmount}${unit}`}
          >
            <ChevronDown size={16} />
          </button>
          <div />
        </div>
      </div>
    </div>
  );
};
