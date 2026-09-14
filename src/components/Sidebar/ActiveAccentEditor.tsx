import React from 'react';
import { SubArea, MeasurementUnit, WallExtension, TileFinish, TileShape, RectanglePattern, ColorPattern, ColorVariation } from '../../types';
import { Lock, Unlock, Grid, Paintbrush } from 'lucide-react';
import { BorderConfigPanel } from './BorderConfigPanel';
import { AccentFurnitureSubPanel } from './AccentPanels/AccentFurnitureSubPanel';
import { SurfaceSelector } from './SurfaceSelector';
import { UniversalTileSpecs } from './Universal/UniversalTileSpecs';
import { UniversalColorPalette } from './Universal/UniversalColorPalette';
import { UniversalGroutControls } from './Universal/UniversalGroutControls';
import { NudgeControls } from './NudgeControls';
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

  const rawCutoutColor = activeSa.tileColors && activeSa.tileColors[0]
    ? (typeof activeSa.tileColors[0] === 'string' ? activeSa.tileColors[0] : (activeSa.tileColors[0] as any).hex)
    : (activeSa.tileColor || null);
  const activeCutoutColorHex = rawCutoutColor || '#f8fafc';

  const setIsCanvasDirty = useAppStore(state => state.setIsCanvasDirty);
  const subAreas = useAppStore(state => state.subAreas);
  const mainTileName = useAppStore(state => state.tileName);
  const mainOffsetX = useAppStore(state => state.offsetX) ?? 0;
  const mainOffsetY = useAppStore(state => state.offsetY) ?? 0;
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
  
  const handleNudge = (dir: 'up' | 'down' | 'left' | 'right', amount: number) => {
    const currentX = activeSa.offsetX || 0;
    const currentY = activeSa.offsetY || 0;
    
    switch (dir) {
      case 'left':
        updateActiveSubArea({ offsetX: Number((currentX - amount).toFixed(4)) });
        break;
      case 'right':
        updateActiveSubArea({ offsetX: Number((currentX + amount).toFixed(4)) });
        break;
      case 'down':
        updateActiveSubArea({ offsetY: Number((currentY - amount).toFixed(4)) });
        break;
      case 'up':
        updateActiveSubArea({ offsetY: Number((currentY + amount).toFixed(4)) });
        break;
    }
    setIsCanvasDirty(true);
  };

  const handleResetNudge = () => {
    updateActiveSubArea({ offsetX: 0, offsetY: 0 });
    setIsCanvasDirty(true);
  };

  const isUsingMainWallTile = activeSa.linkedMaterialId === 'main';
  const isLinkedToOtherProfile = !!activeSa.linkedMaterialId && !isUsingMainWallTile;

  const targetMainOffsetX = Number((mainOffsetX - (activeSa.x || 0)).toFixed(4));
  const targetMainOffsetY = Number((mainOffsetY - (activeSa.y || 0)).toFixed(4));

  const isAlignedWithMain =
    Math.abs((activeSa.offsetX || 0) - targetMainOffsetX) < 0.005 &&
    Math.abs((activeSa.offsetY || 0) - targetMainOffsetY) < 0.005;

  const handleAlignToMainWall = (e: React.MouseEvent) => {
    e.preventDefault();
    updateActiveSubArea({
      offsetX: targetMainOffsetX,
      offsetY: targetMainOffsetY,
    });
    setIsCanvasDirty(true);
  };

  const savedProfiles = subAreas.filter(
    sa => sa.isMaterialParent && sa.id !== activeSa.id
  );

  const fallbackDepth = unit === 'cm' ? 15.0 : 6.0;
  const [depthInput, setDepthInput] = React.useState<string>(() => {
    return activeSa.depth !== undefined && activeSa.depth !== null
      ? String(activeSa.depth)
      : String(fallbackDepth);
  });

  React.useEffect(() => {
    if (activeSa.depth !== undefined && activeSa.depth !== null) {
      if (parseFloat(depthInput) !== activeSa.depth) {
        setDepthInput(String(activeSa.depth));
      }
    } else {
      setDepthInput(String(fallbackDepth));
    }
  }, [activeSa.id, activeSa.depth, unit, fallbackDepth]);

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setDepthInput(rawVal);
    if (rawVal === '') {
      return;
    }
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      const rounded = Math.round(parsed * 1000) / 1000;
      updateActiveSubArea({ depth: rounded });
      setIsCanvasDirty(true);
    }
  };

  const handleDepthBlur = () => {
    const parsed = parseFloat(depthInput);
    if (isNaN(parsed) || parsed <= 0) {
      setDepthInput(String(fallbackDepth));
      updateActiveSubArea({ depth: fallbackDepth });
      setIsCanvasDirty(true);
    } else {
      const maxLimit = unit === 'cm' ? 500 : 200;
      const clamped = Math.max(0.001, Math.min(maxLimit, parsed));
      const rounded = Math.round(clamped * 1000) / 1000;
      setDepthInput(String(rounded));
      updateActiveSubArea({ depth: rounded });
      setIsCanvasDirty(true);
    }
  };

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

      {/* Accent Tile Name / Profile */}
      {!integrationData?.variant_id && resolvedType !== 'cutout' && (
        <div className="space-y-2">
          {!isUsingMainWallTile && (savedProfiles.length > 0 || isLinkedToOtherProfile) && (
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
                    {sa.tileName || sa.name || 'Unnamed Profile'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isLinkedToOtherProfile && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1">
                Accent Tile Name / Label
              </label>
              <input
                type="text"
                placeholder="e.g. Glass Teal Mosaic, Charcoal Hex"
                disabled={isUsingMainWallTile}
                value={isUsingMainWallTile ? (mainTileName || 'Main Wall Tile') : (activeSa.tileName || '')}
                onChange={(e) => updateActiveSubArea({ tileName: e.target.value })}
                className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden ${
                  isUsingMainWallTile ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                }`}
              />

              <div className="flex items-center gap-4 flex-wrap mt-2">
                <label
                  className={`flex items-center gap-2 text-xs font-semibold select-none ${
                    isUsingMainWallTile
                      ? 'text-slate-400 opacity-50 cursor-not-allowed'
                      : 'text-slate-700 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!!integrationData?.variant_id || isUsingMainWallTile}
                    checked={!isUsingMainWallTile && !!activeSa.isMaterialParent}
                    onChange={(e) => updateActiveSubArea({ isMaterialParent: e.target.checked })}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 accent-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span>Save as Reusable Tile Profile</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={!!integrationData?.variant_id}
                    checked={isUsingMainWallTile}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateActiveSubArea({
                          linkedMaterialId: 'main',
                          isMaterialParent: false,
                        });
                      } else {
                        updateActiveSubArea({
                          linkedMaterialId: undefined,
                        });
                      }
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span>Use Main Wall Tile</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing Mode Controls */}
      {resolvedType !== 'cutout' && (
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
            {(purchasingSettings[activeSa.id]?.purchaseType || 'carton') === 'sheet' && (
              <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 mt-1.5">
                Sheet sizing, coverage, and pricing are configured on the <span className="font-semibold text-indigo-600">Quantities</span> tab.
              </p>
            )}
          </div>
        </div>
      )}

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
              updates.depth = activeSa.depth ?? (unit === 'cm' ? 15.0 : 6.0);
            } else if (type === 'niche') {
              updates.depth = activeSa.depth ?? (unit === 'cm' ? 9.0 : 3.5);
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

      {/* Bench / Shelf Depth Setting */}
      {resolvedType === 'shelf' && (
        <div className="space-y-1 animate-fade-in">
          <label htmlFor="bench-shelf-depth-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-455">
            Bench / Shelf Depth ({unit === 'cm' ? 'cm' : 'inches'})
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              id="bench-shelf-depth-input"
              step="0.001"
              min="0.001"
              max={unit === 'cm' ? 500 : 200}
              value={depthInput}
              placeholder={unit === 'cm' ? '15.000' : '6.000'}
              onChange={handleDepthChange}
              onBlur={handleDepthBlur}
              className="w-full px-2.5 py-1.5 pr-14 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            />
            <span className="absolute right-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
              {unit === 'cm' ? 'cm' : 'in'}
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 leading-tight">
            Sets the floor footprint and 3D extrusion depth (up to 3 decimal places).
          </p>
        </div>
      )}

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

      {/* 0.5. Cutout Solid Fill Color Panel */}
      {resolvedType === 'cutout' && (
        <div className="bg-white rounded border border-slate-200 p-3.5 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="space-y-0.5">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                <Paintbrush className="w-3.5 h-3.5 text-slate-500" />
                Cutout Solid Color
              </label>
              <p className="text-[10px] text-slate-500 font-medium">
                Apply a solid paint or opening background color.
              </p>
            </div>
            {rawCutoutColor && (
              <button
                type="button"
                onClick={() => {
                  updateActiveSubArea({ tileColors: undefined, tileColor: undefined });
                  setIsCanvasDirty(true);
                }}
                className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Color picker and hex input */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <input
                type="color"
                value={activeCutoutColorHex}
                onChange={(e) => {
                  const newHex = e.target.value;
                  updateActiveSubArea({ tileColors: [newHex], tileColor: newHex });
                  setIsCanvasDirty(true);
                }}
                className="w-9 h-9 rounded border border-slate-300 p-0.5 cursor-pointer bg-white shadow-xs"
                title="Choose cutout color"
              />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600">Hex:</span>
                <input
                  type="text"
                  value={activeCutoutColorHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
                      updateActiveSubArea({ tileColors: [val], tileColor: val });
                      setIsCanvasDirty(true);
                    }
                  }}
                  className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-semibold text-slate-800"
                  placeholder="#f8fafc"
                />
              </div>
              <span className="text-[9.5px] text-slate-400 block">
                {rawCutoutColor ? 'Solid fill applied' : 'Default empty opening'}
              </span>
            </div>
          </div>

          {/* Preset Swatches */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Popular Opening & Drywall Tones
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'Pure White', hex: '#ffffff' },
                { name: 'Drywall Off-White', hex: '#f8fafc' },
                { name: 'Soft Gray', hex: '#e2e8f0' },
                { name: 'Slate Gray', hex: '#94a3b8' },
                { name: 'Dark Slate', hex: '#475569' },
                { name: 'Charcoal', hex: '#1e293b' },
                { name: 'Deep Black', hex: '#0f172a' },
                { name: 'Warm Cream', hex: '#fef3c7' },
                { name: 'Warm Taupe', hex: '#d6d3d1' },
                { name: 'Navy', hex: '#1e3a8a' },
                { name: 'Forest', hex: '#14532d' },
              ].map((swatch) => {
                const isSelected = activeCutoutColorHex.toLowerCase() === swatch.hex.toLowerCase() && !!rawCutoutColor;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => {
                      updateActiveSubArea({ tileColors: [swatch.hex], tileColor: swatch.hex });
                      setIsCanvasDirty(true);
                    }}
                    className={`w-5.5 h-5.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1 border-slate-500 scale-110'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                    title={`${swatch.name} (${swatch.hex})`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Linked Material Banner (shown when linked to Main Wall or Profile) */}
      {!!activeSa.linkedMaterialId && (() => {
        const isMain = activeSa.linkedMaterialId === 'main';
        const parent = isMain ? null : subAreas.find((s) => s.id === activeSa.linkedMaterialId);
        const parentName = isMain
          ? (mainTileName || 'Main Wall Tile')
          : (parent ? (parent.tileName || parent.name || 'Master Profile') : 'Master Profile');
        return (
          <div className={`p-3 rounded text-xs space-y-1.5 shadow-xs border ${
            isMain
              ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                  isMain ? 'bg-indigo-500' : 'bg-amber-500'
                }`} />
                {isMain ? 'Linked to Main Wall Tile' : 'Linked to Reusable Tile Profile'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate max-w-[150px] ${
                  isMain ? 'bg-indigo-200/70 text-indigo-950' : 'bg-amber-200/70 text-amber-950'
                }`}
                title={parentName}
              >
                {parentName}
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isMain ? 'text-indigo-850' : 'text-amber-800'}`}>
              {isMain ? (
                <>
                  Tile shape, dimensions, colors, pattern, finish, and grout are actively synced with the{' '}
                  <span className="font-semibold text-indigo-950">Main Wall</span>. Any changes made to the
                  Main Wall will automatically update this accent area.
                </>
              ) : (
                <>
                  Tile shape, dimensions, colors, pattern, finish, and grout are actively synced with{' '}
                  <span className="font-semibold text-amber-950">{parentName}</span>. Any changes made to the
                  master profile automatically update this accent area.
                </>
              )}
            </p>
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => updateActiveSubArea({ linkedMaterialId: undefined })}
                className={`text-[11px] font-semibold underline cursor-pointer ${
                  isMain ? 'text-indigo-900 hover:text-indigo-950' : 'text-amber-900 hover:text-amber-950'
                }`}
              >
                Detach & edit independently
              </button>
            </div>
          </div>
        );
      })()}

      {/* 1. Tile Specifications Sub Panel (Universal) - for unlinked tiled features */}
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
        </div>
      )}

      {/* Layout Nudge Tool - Available for all tiled features (unlinked and children) */}
      {resolvedType !== 'slab' && resolvedType !== 'cutout' && (
        <div className="bg-white rounded border border-slate-200 p-4 shadow-xs space-y-3">
          <NudgeControls
            unit={unit}
            offsetX={activeSa.offsetX || 0}
            offsetY={activeSa.offsetY || 0}
            onNudge={handleNudge}
            onReset={handleResetNudge}
            resetTitle="Reset Alignment (0,0)"
          />

          {/* Align to Main Wall Option - Below nudge layout info, ONLY present if "main wall tile" is selected */}
          {isUsingMainWallTile && (
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleAlignToMainWall}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold shadow-xs transition-all cursor-pointer border ${
                  isAlignedWithMain
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
                title="Align this accent area's grout joints with the main wall pattern"
              >
                <Grid size={14} className={isAlignedWithMain ? 'text-emerald-600' : 'text-indigo-600'} />
                <span>{isAlignedWithMain ? '✓ Aligned with Main Wall Grout' : 'Align Grout with Main Wall'}</span>
              </button>
              <p className="text-[10px] text-slate-500 text-center leading-tight">
                {isAlignedWithMain
                  ? 'Grout lines currently match and flow continuously from the main wall.'
                  : 'Snap tile grout lines to run continuously with the surrounding wall pattern.'}
              </p>
            </div>
          )}
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
            disableColorWithTexture={activeSa.disableColorWithTexture ?? false}
            onChangeDisableColorWithTexture={(val) => updateActiveSubArea({ disableColorWithTexture: val })}
            textureOpacity={activeSa.textureOpacity ?? 0.8}
            onChangeTextureOpacity={(val) => updateActiveSubArea({ textureOpacity: val })}
            textureScale={activeSa.textureScale ?? 1.0}
            onChangeTextureScale={(val) => updateActiveSubArea({ textureScale: val })}
            textureScaleRandom={activeSa.textureScaleRandom ?? false}
            onChangeTextureScaleRandom={(val) => updateActiveSubArea({ textureScaleRandom: val })}
            textureRotationMode={activeSa.textureRotationMode || 'random'}
            onChangeTextureRotationMode={(val) => updateActiveSubArea({ textureRotationMode: val })}
            textureRotationAngle={activeSa.textureRotationAngle ?? 0}
            onChangeTextureRotationAngle={(val) => updateActiveSubArea({ textureRotationAngle: val })}
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
