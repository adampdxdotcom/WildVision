import React, { useState } from 'react';
import { SubArea, MeasurementUnit, WallExtension, TileFinish, TileShape, RectanglePattern, ColorPattern, ColorVariation } from '../../types';
import { Lock, Unlock, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { BorderConfigPanel } from './BorderConfigPanel';
import { AccentFurnitureSubPanel } from './AccentPanels/AccentFurnitureSubPanel';
import { SurfaceSelector } from './SurfaceSelector';
import { UniversalTileSpecs } from './Universal/UniversalTileSpecs';
import { UniversalColorPalette } from './Universal/UniversalColorPalette';
import { UniversalGroutControls } from './Universal/UniversalGroutControls';
import { useAppStore } from '../../store/useAppStore';

interface ActiveAccentEditorProps {
  activeSa: SubArea;
  updateActiveSubArea: (fields: Partial<SubArea>) => void;
  unit: MeasurementUnit;
  wallWidth: number;
  wallHeight: number;
  wallExtensions: WallExtension[];
  onBack?: () => void;
}

export const ActiveAccentEditor: React.FC<ActiveAccentEditorProps> = ({
  activeSa,
  updateActiveSubArea,
  unit,
  wallWidth,
  wallHeight,
  wallExtensions,
  onBack,
}) => {
  const rawType = (activeSa.accentType as string) || (activeSa.isCutout ? 'cutout' : (activeSa.hasSill ? 'niche' : 'flat'));
  const resolvedType = (rawType === 'bench' ? 'shelf' : rawType) as 'flat' | 'niche' | 'shelf' | 'cutout' | 'slab';

  const [fineTuneIncrement, setFineTuneIncrement] = useState<number>(0.125);
  const setIsCanvasDirty = useAppStore(state => state.setIsCanvasDirty);
  const subAreas = useAppStore(state => state.subAreas);
  const tileColorOverrides = useAppStore(state => state.tileColorOverrides) || {};
  const activeBrushColorIndex = useAppStore(state => state.activeBrushColorIndex) ?? 1;
  const setTileColorOverride = useAppStore(state => state.setTileColorOverride);
  const setActiveBrushColorIndex = useAppStore(state => state.setActiveBrushColorIndex);
  const hasPaintOverrides = Object.keys(tileColorOverrides).some(k => k.startsWith(activeSa.id));

  const setPurchasingSettings = useAppStore(state => state.setPurchasingSettings);
  const purchasingSettings = useAppStore(state => state.purchasingSettings);
  const updatePurchasingSetting = useAppStore(state => state.updatePurchasingSetting);
  const integrationData = useAppStore(state => state.integrationData);

  const handleProductSync = (metadata: { name: string; pricingMode: 'carton' | 'sheet' | 'piece'; price: number; cartonSize: number | null }) => {
    updateActiveSubArea({ tileName: metadata.name });
    setPurchasingSettings((prev: any) => ({
      ...prev,
      [activeSa.id]: {
        ...(prev[activeSa.id] || { purchaseType: 'sheet', sqFtPerCarton: '', pricePerSqFt: 0, pricePerSheet: 0 }),
        purchaseType: metadata.pricingMode,
        pricePerSheet: metadata.pricingMode === 'sheet' || metadata.pricingMode === 'piece' ? metadata.price : (prev[activeSa.id]?.pricePerSheet || 0),
        pricePerSqFt: metadata.pricingMode === 'carton' ? metadata.price : (prev[activeSa.id]?.pricePerSqFt || 0),
        sqFtPerCarton: metadata.cartonSize !== null ? metadata.cartonSize : (prev[activeSa.id]?.sqFtPerCarton || '')
      }
    }));
  };
  
  const calculateNudgeAmount = (dir: 'up' | 'down' | 'left' | 'right', isShiftKey: boolean): number => {
    if (isShiftKey) {
      return fineTuneIncrement;
    }
    const tileWidth = activeSa.tileWidth || 6;
    const tileHeight = activeSa.tileHeight || 3;
    const shape = activeSa.shape || 'rectangle';
    const groutWidth = activeSa.groutWidth ?? (unit === 'cm' ? 0.3 : 0.125);

    const wUnit = tileWidth + (unit === 'in' ? groutWidth : groutWidth / 10);
    const hUnit = tileHeight + (unit === 'in' ? groutWidth : groutWidth / 10);

    if (shape === 'hexagon') {
      if (dir === 'up' || dir === 'down') {
        const sEff = wUnit / Math.sqrt(3);
        return 1.5 * sEff;
      }
      return wUnit;
    }
    if ((shape as string) === 'penny') {
      if (dir === 'up' || dir === 'down') {
        return wUnit * (Math.sqrt(3) / 2);
      }
      return wUnit;
    }
    if (shape === 'diamond') {
      if (dir === 'up' || dir === 'down') {
        return 0.5 * tileHeight + (unit === 'in' ? groutWidth : groutWidth / 10);
      }
      return wUnit;
    }
    if (shape === 'scallop') {
      if (dir === 'up' || dir === 'down') {
        return tileWidth / 2 + (unit === 'in' ? groutWidth : groutWidth / 10);
      }
      return wUnit;
    }
    if (shape === 'triangle') {
      if (dir === 'left' || dir === 'right') {
        return wUnit / 2;
      }
      const actualTileH = tileWidth * (Math.sqrt(3) / 2);
      return actualTileH + (unit === 'in' ? groutWidth : groutWidth / 10);
    }
    if ((shape as string) === 'versailles') {
      return unit === 'in' ? 16 : 40.64;
    }
    if (dir === 'left' || dir === 'right') {
      return wUnit;
    }
    return hUnit;
  };

  const handleNudgeClick = (dir: 'up' | 'down' | 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const amountInUnits = calculateNudgeAmount(dir, e.shiftKey);
    const currentX = activeSa.offsetX || 0;
    const currentY = activeSa.offsetY || 0;
    
    switch (dir) {
      case 'left':
        updateActiveSubArea({ offsetX: Number((currentX - amountInUnits).toFixed(4)) });
        break;
      case 'right':
        updateActiveSubArea({ offsetX: Number((currentX + amountInUnits).toFixed(4)) });
        break;
      case 'down':
        updateActiveSubArea({ offsetY: Number((currentY - amountInUnits).toFixed(4)) });
        break;
      case 'up':
        updateActiveSubArea({ offsetY: Number((currentY + amountInUnits).toFixed(4)) });
        break;
    }
    setIsCanvasDirty(true);
  };

  const handleResetNudge = (e: React.MouseEvent) => {
    e.preventDefault();
    updateActiveSubArea({ offsetX: 0, offsetY: 0 });
    setIsCanvasDirty(true);
  };

  const savedProfiles = subAreas.filter(
    sa => sa.isMaterialParent && sa.id !== activeSa.id
  );

  return (
    <div className="space-y-4 animate-slide-up">
      {onBack && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition font-semibold text-xs cursor-pointer"
          >
            <span className="text-[14px]">←</span>
            <span>Back to Accent List</span>
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Focus Mode
          </span>
        </div>
      )}

      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">
          ✏️ EDITING ACCENT FEATURE
        </span>
        <button
          type="button"
          onClick={() => updateActiveSubArea({ locked: !activeSa.locked })}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-tight cursor-pointer transition flex items-center gap-1 shadow-2xs ${
            activeSa.locked
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold'
          }`}
        >
          {activeSa.locked ? (
            <>
              <Lock className="w-3 text-indigo-600 h-3" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="w-3 text-slate-500 h-3" />
              Move Mode
            </>
          )}
        </button>
      </div>

      {/* Mirror Settings to Original Toggle for Linked Clones */}
      {activeSa.linkedToId && (
        <div className="p-3 bg-white border border-slate-200 rounded flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-700">Mirror Settings to Original</span>
            <span className="text-[9px] text-slate-500 font-medium leading-normal">
              When mirrored, tile and grout changes apply to all linked copies.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none ml-2 shrink-0">
            <input
              type="checkbox"
              checked={activeSa.isLinked || false}
              onChange={(e) => updateActiveSubArea({ isLinked: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-100 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 animate-transition"></div>
          </label>
        </div>
      )}

      {/* Name Rename */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1">
          Accent Area Name
        </label>
        <input
          type="text"
          value={activeSa.name}
          onChange={(e) => updateActiveSubArea({ name: e.target.value })}
          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800"
        />
      </div>

      {/* Accent Tile Name */}
      {!integrationData?.variant_id && (
        <div className="space-y-2">
          {savedProfiles.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1">
                Apply Saved Tile Profile
              </label>
              <select
                value={activeSa.linkedMaterialId || ''}
                onChange={(e) =>
                  updateActiveSubArea({
                    linkedMaterialId: e.target.value === '' ? undefined : e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="">-- Custom / Independent --</option>
                {savedProfiles.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.tileName || 'Unnamed Tile'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!activeSa.linkedMaterialId && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1">
                Accent Tile Name / Label
              </label>
              <input
                type="text"
                placeholder="e.g. Glass Teal Mosaic, Charcoal Hex"
                value={activeSa.tileName || ''}
                onChange={(e) => updateActiveSubArea({ tileName: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              />

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none mt-2">
                <input
                  type="checkbox"
                  disabled={!!integrationData?.variant_id}
                  checked={!!activeSa.isMaterialParent}
                  onChange={(e) => updateActiveSubArea({ isMaterialParent: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 accent-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span>Save as Reusable Tile Profile</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Pricing Mode & Mounted on Mesh Controls */}
      <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Pricing Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 border border-slate-155 rounded">
            <button
              type="button"
              onClick={() => updatePurchasingSetting(activeSa.id, { purchaseType: 'carton' })}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                (purchasingSettings[activeSa.id]?.purchaseType || 'carton') === 'carton'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Carton
            </button>
            <button
              type="button"
              onClick={() => updatePurchasingSetting(activeSa.id, { purchaseType: 'sheet' })}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                (purchasingSettings[activeSa.id]?.purchaseType || 'carton') === 'sheet'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sheet
            </button>
            <button
              type="button"
              onClick={() => updatePurchasingSetting(activeSa.id, { purchaseType: 'piece' })}
              className={`py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                (purchasingSettings[activeSa.id]?.purchaseType || 'carton') === 'piece'
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
            id={`sold-as-mosaic-${activeSa.id}`}
            checked={!!activeSa.soldAsMosaic}
            onChange={(e) => updateActiveSubArea({ soldAsMosaic: e.target.checked })}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor={`sold-as-mosaic-${activeSa.id}`} className="text-xs font-bold text-slate-700 select-none cursor-pointer">
            Mounted on Mesh Sheets (Mosaic)
          </label>
        </div>

        {activeSa.soldAsMosaic && (
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
                  disabled={hasPaintOverrides}
                  value={activeSa.mosaicWidth === 0 ? '' : (activeSa.mosaicWidth ?? 12)}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      updateActiveSubArea({ mosaicWidth: 0 });
                    } else {
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) {
                        updateActiveSubArea({ mosaicWidth: val });
                      }
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.max(1, Math.min(100, activeSa.mosaicWidth || 12));
                    updateActiveSubArea({ mosaicWidth: clamped });
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
                  disabled={hasPaintOverrides}
                  value={activeSa.mosaicHeight === 0 ? '' : (activeSa.mosaicHeight ?? 12)}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      updateActiveSubArea({ mosaicHeight: 0 });
                    } else {
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) {
                        updateActiveSubArea({ mosaicHeight: val });
                      }
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.max(1, Math.min(100, activeSa.mosaicHeight || 12));
                    updateActiveSubArea({ mosaicHeight: clamped });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200/50 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-mono"
                />
              </div>
            </div>
            <div className="text-[10px] font-mono text-indigo-700 font-semibold flex justify-between items-center pt-1.5 border-t border-indigo-100/60">
              <span>Sheet Sq Footage:</span>
              <span>
                {(((activeSa.mosaicWidth || 12) * (activeSa.mosaicHeight || 12)) / (unit === 'in' ? 144 : 929.0304)).toFixed(3)} sq ft / sheet
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Feature Type Selector */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1">
          Feature Type
        </label>
        <select
          value={resolvedType}
          onChange={(e) => {
            const type = e.target.value as 'flat' | 'niche' | 'shelf' | 'cutout' | 'slab';
            const updates: Partial<SubArea> = {
              accentType: type,
              isCutout: type === 'cutout',
            };
            if (type === 'shelf') {
              updates.depth = activeSa.depth ?? 6.0;
            } else if (type === 'niche') {
              updates.depth = activeSa.depth ?? 3.5;
            }
            updateActiveSubArea(updates);
          }}
          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
        >
          <option value="flat">Flat (Tile Inlay)</option>
          <option value="niche">Niche (Recessed)</option>
          <option value="shelf">Shelf / Bench</option>
          <option value="cutout">Cutout / Wall Opening</option>
          <option value="slab">Solid Surface (Slab)</option>
        </select>
      </div>

      {/* 0. Slab / Solid Surface Panel */}
      {resolvedType === 'slab' && !activeSa.linkedMaterialId && (
        <div className="p-3 bg-white border border-slate-200 rounded">
          <SurfaceSelector
            label="Slab Material"
            currentUrl={activeSa.surfaceUrl}
            onSelect={(url) => updateActiveSubArea({ surfaceUrl: url })}
          />
        </div>
      )}

      {/* 1. Tile Specifications Sub Panel (Universal) */}
      {resolvedType !== 'slab' && resolvedType !== 'cutout' && !activeSa.linkedMaterialId && (
        <div className="bg-white rounded border border-slate-200 p-4 shadow-xs space-y-4">
          <UniversalTileSpecs
            shape={activeSa.shape || 'rectangle'}
            onChangeShape={(val) => updateActiveSubArea({ shape: val })}
            tileWidth={activeSa.tileWidth || 6}
            onChangeWidth={(val) => updateActiveSubArea({ tileWidth: val })}
            tileHeight={activeSa.tileHeight || 3}
            onChangeHeight={(val) => updateActiveSubArea({ tileHeight: val })}
            pattern={activeSa.pattern || 'stack'}
            onChangePattern={(val) => updateActiveSubArea({ pattern: val })}
            isPicket={activeSa.shapeSettings?.rectangle?.isPicket || false}
            onChangePicket={(val) => updateActiveSubArea({
              shapeSettings: {
                ...activeSa.shapeSettings,
                rectangle: { ...(activeSa.shapeSettings?.rectangle || {}), isPicket: val }
              }
            })}
            picketLength={activeSa.shapeSettings?.rectangle?.picketLength || 1}
            onChangePicketLength={(val) => updateActiveSubArea({
              shapeSettings: {
                ...activeSa.shapeSettings,
                rectangle: { ...(activeSa.shapeSettings?.rectangle || {}), picketLength: val }
              }
            })}
            flatsketVerticalRows={activeSa.shapeSettings?.rectangle?.flatsketVerticalRows || 2}
            onChangeFlatsketVertical={(val) => updateActiveSubArea({
              shapeSettings: {
                ...activeSa.shapeSettings,
                rectangle: { ...(activeSa.shapeSettings?.rectangle || {}), flatsketVerticalRows: val }
              }
            })}
            flatsketHorizontalRows={activeSa.shapeSettings?.rectangle?.flatsketHorizontalRows || 3}
            onChangeFlatsketHorizontal={(val) => updateActiveSubArea({
              shapeSettings: {
                ...activeSa.shapeSettings,
                rectangle: { ...(activeSa.shapeSettings?.rectangle || {}), flatsketHorizontalRows: val }
              }
            })}
            isLockedForPainting={hasPaintOverrides}
            unit={unit}
            basketWeaveMultiplier={activeSa.shapeSettings?.rectangle?.basketWeaveMultiplier || 1}
            onProductSync={handleProductSync}
            activeCustomPattern={activeSa.customPatternPayload || null}
            onChangeActiveCustomPattern={(pattern) => updateActiveSubArea({ customPatternPayload: pattern })}
          />
          {/* Layout Nudge Tool */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Nudge Layout
            </label>
            
            <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded p-4">
              <div className="grid grid-cols-3 grid-rows-3 gap-1">
                <div />
                <button
                  type="button"
                  onClick={(e) => handleNudgeClick('up', e)}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
                  title="Nudge Up (Hold Shift for Fine Tune)"
                >
                  <ChevronUp size={16} />
                </button>
                <div />
                <button
                  type="button"
                  onClick={(e) => handleNudgeClick('left', e)}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
                  title="Nudge Left (Hold Shift for Fine Tune)"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleResetNudge}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
                  title="Reset Alignment"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleNudgeClick('right', e)}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
                  title="Nudge Right (Hold Shift for Fine Tune)"
                >
                  <ChevronRight size={16} />
                </button>
                <div />
                <button
                  type="button"
                  onClick={(e) => handleNudgeClick('down', e)}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform cursor-pointer"
                  title="Nudge Down (Hold Shift for Fine Tune)"
                >
                  <ChevronDown size={16} />
                </button>
                <div />
              </div>
              <div className="flex items-center gap-2 w-full mt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Fine-Tune Step
                </span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={fineTuneIncrement}
                  onChange={(e) => setFineTuneIncrement(Math.max(0.001, parseFloat(e.target.value) || 0.125))}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-500 flex-1"
                />
              </div>
              <p className="text-[9px] text-slate-400 text-center w-full mt-[-4px]">
                Hold <b>SHIFT</b> while clicking to use fine-tune step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Color & Shading Sub Panel (Universal) */}
      {resolvedType !== 'cutout' && resolvedType !== 'slab' && !activeSa.linkedMaterialId && (
        <div className="space-y-4">
          <UniversalColorPalette
            unit={unit}
            isLockedForPainting={hasPaintOverrides}
            tileColors={activeSa.tileColors || ['#f8fafc']}
            onChangeColors={(val) => updateActiveSubArea({ tileColors: val })}
            colorPattern={activeSa.colorPattern || 'single'}
            onChangePattern={(val) => updateActiveSubArea({ colorPattern: val })}
            activeBrushColorIndex={activeBrushColorIndex}
            onSetBrushIndex={setActiveBrushColorIndex}
            hasPaintOverrides={hasPaintOverrides}
            onResetPaint={() => {
              Object.keys(tileColorOverrides).forEach(key => {
                if (key.startsWith(activeSa.id)) {
                  setTileColorOverride(key, null);
                }
              });
              setIsCanvasDirty(true);
            }}
            tileSpecular={(activeSa.tileFinish as string) || 'matte'}
            onChangeSpecular={(val) => updateActiveSubArea({ tileFinish: val as TileFinish })}
            tileFinish={(activeSa.colorVariation as ColorVariation) || 'V1'}
            onChangeFinish={(val) => updateActiveSubArea({ colorVariation: val })}
            activeCustomPattern={activeSa.customPatternPayload || null}
            shape={activeSa.shape || 'rectangle'}
            tilesPerStripe={activeSa.tilesPerStripe || 1}
            onChangeTilesPerStripe={(val) => updateActiveSubArea({ tilesPerStripe: val })}
            compositeColors={(activeSa.shapeSettings?.rectangle?.compositeColors as Record<string, string>) || {}}
            onChangeCompositeColor={(name, hex) => {
              updateActiveSubArea({
                shapeSettings: {
                  ...activeSa.shapeSettings,
                  rectangle: { ...(activeSa.shapeSettings?.rectangle || {}), compositeColors: { ...(activeSa.shapeSettings?.rectangle?.compositeColors || {}), [name]: hex } }
                }
              });
            }}
            materialTexture={activeSa.materialTexture || 'none'}
            onChangeMaterialTexture={(val) => updateActiveSubArea({ materialTexture: val })}
            soldAsMosaic={activeSa.soldAsMosaic || false}
            activePattern={activeSa.pattern || 'stack'}
          />
          <div className="bg-white rounded border border-slate-200 p-4 shadow-xs">
            <UniversalGroutControls
              groutWidth={activeSa.groutWidth ?? (unit === 'cm' ? 0.3 : 0.125)}
              onChangeGroutWidth={(val) => updateActiveSubArea({ groutWidth: val })}
              groutColor={activeSa.groutColor || '#ffffff'}
              onChangeGroutColor={(val) => updateActiveSubArea({ groutColor: val })}
              unit={unit}
              isLockedForPainting={hasPaintOverrides}
            />
          </div>
        </div>
      )}

      {/* Linked Material Banner */}
      {!!activeSa.linkedMaterialId && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
          Material settings are linked to the parent tile profile.
        </div>
      )}

      {/* 3. Options & Add-ons Sub Panel */}
      {(resolvedType !== 'slab' || true) && (
        <AccentFurnitureSubPanel
          activeSa={activeSa}
          updateActiveSubArea={updateActiveSubArea}
          unit={unit}
          resolvedType={resolvedType as any}
        />
      )}

      {/* 4. Border config panel */}
      {resolvedType !== 'cutout' && resolvedType !== 'slab' && !activeSa.linkedMaterialId && (
        <BorderConfigPanel 
          border={activeSa.border} 
          onChange={(border) => updateActiveSubArea({ border })}
          shape={activeSa.shape || 'rectangle'} 
        />
      )}

      {/* Accent Area Notes */}
      <div className="pt-3 border-t border-slate-150 space-y-2">
        <label className="flex items-center gap-2 font-bold text-xs text-slate-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activeSa.hasNotes || false}
            onChange={(e) => {
              const checked = e.target.checked;
              updateActiveSubArea({
                hasNotes: checked,
                ...(checked ? { notes: activeSa.notes || '' } : {})
              });
            }}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 accent-amber-600"
          />
          <span>Notes</span>
        </label>
        
        {activeSa.hasNotes && (
          <div className="animate-fade-in pt-0.5">
            <textarea
              id={`accent-notes-${activeSa.id}`}
              rows={2}
              placeholder={`Enter unique specifications or instructions for ${activeSa.name}...`}
              value={activeSa.notes || ''}
              onChange={(e) => updateActiveSubArea({ notes: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
