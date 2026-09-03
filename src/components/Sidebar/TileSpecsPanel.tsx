import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Settings, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { BorderConfigPanel } from './BorderConfigPanel';
import { UniversalTileSpecs } from './Universal/UniversalTileSpecs';

export interface TileSpecsPanelProps {
  onNudge: (dir: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  onResetAlignment: () => void;
}

export const TileSpecsPanel: React.FC<TileSpecsPanelProps> = ({ onNudge, onResetAlignment }) => {
  const [fineTuneIncrement, setFineTuneIncrement] = useState<number>(0.125);
  
  // Fetch everything from Zustand
  const shape = useAppStore(state => state.shape);
  const setShape = useAppStore(state => state.setShape);
  const tileWidth = useAppStore(state => state.tileWidth);
  const setTileWidth = useAppStore(state => state.setTileWidth);
  const tileHeight = useAppStore(state => state.tileHeight);
  const setTileHeight = useAppStore(state => state.setTileHeight);
  const pattern = useAppStore(state => state.pattern);
  const setPattern = useAppStore(state => state.setPattern);
  const groutWidth = useAppStore(state => state.groutWidth);
  const setGroutWidth = useAppStore(state => state.setGroutWidth);
  const groutColor = useAppStore(state => state.groutColor) || '#e5e7eb';
  const setGroutColor = useAppStore(state => state.setGroutColor);
  const angle = useAppStore(state => state.angle);
  const setAngle = useAppStore(state => state.setAngle);
  const unit = useAppStore(state => state.unit);
  const tileName = useAppStore(state => state.tileName);
  const setTileName = useAppStore(state => state.setTileName);
  const soldAsMosaic = useAppStore(state => state.soldAsMosaic);
  const setSoldAsMosaic = useAppStore(state => state.setSoldAsMosaic);
  const mosaicWidth = useAppStore(state => state.mosaicWidth);
  const setMosaicWidth = useAppStore(state => state.setMosaicWidth);
  const mosaicHeight = useAppStore(state => state.mosaicHeight);
  const setMosaicHeight = useAppStore(state => state.setMosaicHeight);
  const hasNotes = useAppStore(state => state.hasNotes);
  const setHasNotes = useAppStore(state => state.setHasNotes);
  const notes = useAppStore(state => state.notes);
  const setNotes = useAppStore(state => state.setNotes);
  const border = useAppStore(state => state.wallBorder);
  const setBorder = useAppStore(state => state.setWallBorder);
  
  const isPicket = useAppStore(state => state.isPicket);
  const setIsPicket = useAppStore(state => state.setIsPicket);
  const picketLength = useAppStore(state => state.picketLength);
  const setPicketLength = useAppStore(state => state.setPicketLength);
  const flatsketVerticalRows = useAppStore(state => state.flatsketVerticalRows);
  const setFlatsketVerticalRows = useAppStore(state => state.setFlatsketVerticalRows);
  const flatsketHorizontalRows = useAppStore(state => state.flatsketHorizontalRows);
  const setFlatsketHorizontalRows = useAppStore(state => state.setFlatsketHorizontalRows);
  const basketWeaveMultiplier = useAppStore(state => state.basketWeaveMultiplier);

  const activeCustomPattern = useAppStore(state => state.activeCustomPattern);
  const setActiveCustomPattern = useAppStore(state => state.setActiveCustomPattern);

  const setPurchasingSettings = useAppStore(state => state.setPurchasingSettings);
  const purchasingSettings = useAppStore(state => state.purchasingSettings);
  const updatePurchasingSetting = useAppStore(state => state.updatePurchasingSetting);
  const integrationData = useAppStore(state => state.integrationData);

  const handleProductSync = (metadata: { name: string; pricingMode: 'carton' | 'sheet' | 'piece'; price: number; cartonSize: number | null }) => {
    setTileName(metadata.name);
    setPurchasingSettings(prev => ({
      ...prev,
      main: {
        ...(prev.main || { purchaseType: 'sheet', sqFtPerCarton: '', pricePerSqFt: 0, pricePerSheet: 0 }),
        purchaseType: metadata.pricingMode,
        pricePerSheet: metadata.pricingMode === 'sheet' || metadata.pricingMode === 'piece' ? metadata.price : (prev.main?.pricePerSheet || 0),
        pricePerSqFt: metadata.pricingMode === 'carton' ? metadata.price : (prev.main?.pricePerSqFt || 0),
        sqFtPerCarton: metadata.cartonSize !== null ? metadata.cartonSize : (prev.main?.sqFtPerCarton || '')
      }
    }));
  };

  const tileColorOverrides = useAppStore(state => state.tileColorOverrides) || {};
  const isLockedForPainting = Object.keys(tileColorOverrides).length > 0;

  const calculateNudgeAmount = (dir: 'up' | 'down' | 'left' | 'right', isShiftKey: boolean): number => {
    if (isShiftKey) {
      return fineTuneIncrement;
    }
    const wUnit = tileWidth + (unit === 'in' ? groutWidth : groutWidth / 10);
    const hUnit = tileHeight + (unit === 'in' ? groutWidth : groutWidth / 10);
    if (shape === 'hexagon') {
      if (dir === 'up' || dir === 'down') {
        const sEff = wUnit / Math.sqrt(3);
        return 1.5 * sEff;
      }
      return wUnit;
    }
    return (dir === 'up' || dir === 'down') ? hUnit : wUnit;
  };

  const handleNudgeClick = (dir: 'up' | 'down' | 'left' | 'right', e: React.MouseEvent) => {
    const amount = calculateNudgeAmount(dir, e.shiftKey);
    onNudge(dir, amount);
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-5">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Settings className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tile Geometry</h3>
      </div>

      <UniversalTileSpecs
        shape={shape}
        onChangeShape={setShape}
        tileWidth={tileWidth}
        onChangeWidth={setTileWidth}
        tileHeight={tileHeight}
        onChangeHeight={setTileHeight}
        pattern={pattern}
        onChangePattern={setPattern}
        isPicket={isPicket}
        onChangePicket={setIsPicket}
        picketLength={picketLength}
        onChangePicketLength={setPicketLength}
        flatsketVerticalRows={flatsketVerticalRows}
        onChangeFlatsketVertical={setFlatsketVerticalRows}
        flatsketHorizontalRows={flatsketHorizontalRows}
        onChangeFlatsketHorizontal={setFlatsketHorizontalRows}
        isLockedForPainting={isLockedForPainting}
        unit={unit}
        basketWeaveMultiplier={basketWeaveMultiplier}
        onProductSync={handleProductSync}
        activeCustomPattern={activeCustomPattern}
        onChangeActiveCustomPattern={setActiveCustomPattern}
      />

      {/* Metadata / Layout */}
      <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
        {!integrationData?.variant_id && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Product Reference Name
            </label>
            <input
              type="text"
              value={tileName}
              onChange={(e) => setTileName(e.target.value)}
              placeholder="e.g. Cle Tile Zellige 4x4"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
          </div>
        )}
        
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Pricing Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 border border-slate-155 rounded">
            <button
              type="button"
              onClick={() => updatePurchasingSetting('main', { purchaseType: 'carton' })}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all ${
                (purchasingSettings.main?.purchaseType || 'carton') === 'carton'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Carton
            </button>
            <button
              type="button"
              onClick={() => updatePurchasingSetting('main', { purchaseType: 'sheet' })}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all ${
                (purchasingSettings.main?.purchaseType || 'carton') === 'sheet'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sheet
            </button>
            <button
              type="button"
              onClick={() => updatePurchasingSetting('main', { purchaseType: 'piece' })}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all ${
                (purchasingSettings.main?.purchaseType || 'carton') === 'piece'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Piece
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="sold-as-mosaic"
            checked={soldAsMosaic}
            onChange={(e) => setSoldAsMosaic(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="sold-as-mosaic" className="text-xs font-bold text-slate-700 select-none">
            Mounted on Mesh Sheets (Mosaic)
          </label>
        </div>
        {soldAsMosaic && (
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-indigo-800/80 mb-1">
                  Sheet Width ({unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  disabled={isLockedForPainting}
                  value={mosaicWidth === 0 ? '' : mosaicWidth}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      setMosaicWidth(0);
                    } else {
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) {
                        setMosaicWidth(val);
                      }
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.max(1, Math.min(100, mosaicWidth || 12));
                    setMosaicWidth(clamped);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200/50 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-indigo-800/80 mb-1">
                  Sheet Height ({unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  disabled={isLockedForPainting}
                  value={mosaicHeight === 0 ? '' : mosaicHeight}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      setMosaicHeight(0);
                    } else {
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) {
                        setMosaicHeight(val);
                      }
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.max(1, Math.min(100, mosaicHeight || 12));
                    setMosaicHeight(clamped);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200/50 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
            <div className="text-[10px] font-mono text-indigo-700 font-semibold flex justify-between items-center pt-1.5 border-t border-indigo-100/60">
              <span>Sheet Sq Footage:</span>
              <span>
                {(((mosaicWidth || 12) * (mosaicHeight || 12)) / (unit === 'in' ? 144 : 929.0304)).toFixed(3)} sq ft / sheet
              </span>
            </div>
          </div>
        )}
      </div>

      {shape !== 'round' && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
            <span>Tile Rotation Angle</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value) || 0)}
              className="flex-1 accent-indigo-600 cursor-pointer"
            />
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max="90"
                value={angle}
                onChange={(e) => {
                  const valStr = e.target.value;
                  if (valStr === '') {
                    setAngle(0);
                  } else {
                    const val = parseInt(valStr);
                    if (!isNaN(val)) {
                      setAngle(Math.max(0, Math.min(90, val)));
                    }
                  }
                }}
                className="w-14 px-2 py-1 text-xs font-semibold text-center text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs font-bold text-slate-400 ml-1">°</span>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase font-mono pr-16">
            <span>0° (Standard)</span>
            <span>45° (Diag)</span>
            <span>90°</span>
          </div>
        </div>
      )}
          {/* Layout Nudge Tool */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Nudge Layout
        </label>
        
        <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded p-4">
          <div className="grid grid-cols-3 grid-rows-3 gap-1">
            <div />
            <button
              onClick={(e) => handleNudgeClick('up', e)}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
              title="Nudge Up (Hold Shift for Fine Tune)"
            >
              <ChevronUp size={16} />
            </button>
            <div />
            <button
              onClick={(e) => handleNudgeClick('left', e)}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
              title="Nudge Left (Hold Shift for Fine Tune)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={onResetAlignment}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
              title="Reset Alignment"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={(e) => handleNudgeClick('right', e)}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
              title="Nudge Right (Hold Shift for Fine Tune)"
            >
              <ChevronRight size={16} />
            </button>
            <div />
            <button
              onClick={(e) => handleNudgeClick('down', e)}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
              title="Nudge Down (Hold Shift for Fine Tune)"
            >
              <ChevronDown size={16} />
            </button>
            <div />
          </div>
          <div className="flex items-center gap-2 w-full mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Fine-Tune Step
            </span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={fineTuneIncrement}
              onChange={(e) => setFineTuneIncrement(Math.max(0.001, parseFloat(e.target.value) || 0.125))}
              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 flex-1"
            />
          </div>
          <p className="text-[9px] text-slate-400 text-center w-full mt-[-4px]">
            Hold <b>SHIFT</b> while clicking to use fine-tune step.
          </p>
        </div>
      </div>

      <BorderConfigPanel border={border} onChange={setBorder} shape={shape} />

      {/* Notes Section */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <label className="flex items-center gap-2 font-bold text-xs text-slate-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasNotes}
            onChange={(e) => setHasNotes(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 accent-indigo-600"
          />
          <span>Notes</span>
        </label>
        
        {hasNotes && (
          <div className="animate-fade-in pt-0.5">
            <textarea
              id="wall-specs-notes"
              rows={3}
              placeholder="Enter installation notes, batch details, or surface prep instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
