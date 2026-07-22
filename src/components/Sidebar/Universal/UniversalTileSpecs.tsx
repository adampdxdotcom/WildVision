import React from 'react';
import { TileShape, RectanglePattern, MeasurementUnit } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

export interface UniversalTileSpecsProps {
  shape: TileShape;
  onChangeShape: (shape: TileShape) => void;
  tileWidth: number;
  onChangeWidth: (val: number) => void;
  tileHeight: number;
  onChangeHeight: (val: number) => void;
  pattern: RectanglePattern;
  onChangePattern: (pattern: RectanglePattern) => void;
  isPicket: boolean;
  onChangePicket: (val: boolean) => void;
  picketLength: number;
  onChangePicketLength: (val: number) => void;
  flatsketVerticalRows: number;
  onChangeFlatsketVertical: (val: number) => void;
  flatsketHorizontalRows: number;
  onChangeFlatsketHorizontal: (val: number) => void;
  isLockedForPainting: boolean;
  unit: MeasurementUnit;
  basketWeaveMultiplier?: number;
  onProductSync?: (metadata: { name: string; pricingMode: 'carton' | 'sheet' | 'piece'; price: number; cartonSize: number | null }) => void;
  activeCustomPattern: any;
  onChangeActiveCustomPattern: (pattern: any) => void;
}

export const UniversalTileSpecs: React.FC<UniversalTileSpecsProps> = ({
  shape,
  onChangeShape,
  tileWidth,
  onChangeWidth,
  tileHeight,
  onChangeHeight,
  pattern,
  onChangePattern,
  isPicket,
  onChangePicket,
  picketLength,
  onChangePicketLength,
  flatsketVerticalRows,
  onChangeFlatsketVertical,
  flatsketHorizontalRows,
  onChangeFlatsketHorizontal,
  isLockedForPainting,
  unit,
  basketWeaveMultiplier = 2,
  onProductSync,
  activeCustomPattern,
  onChangeActiveCustomPattern,
}) => {
  const linkedSubfloorProjectId = useAppStore(state => state.linkedSubfloorProjectId);
  const subfloorProducts = useAppStore(state => state.subfloorProducts);
  const setIntegrationData = useAppStore(state => state.setIntegrationData);
  const integrationData = useAppStore(state => state.integrationData);
  const setTileColors = useAppStore(state => state.setTileColors);
  const setSoldAsMosaic = useAppStore(state => state.setSoldAsMosaic);
  const setMosaicWidth = useAppStore(state => state.setMosaicWidth);
  const setMosaicHeight = useAppStore(state => state.setMosaicHeight);
  const customPatternsList = useAppStore(state => state.customPatternsList);

  const handleProductSelect = (variantId: string) => {
    if (!variantId) {
      setIntegrationData(null);
      return;
    }

    const prod = subfloorProducts.find(p => p.variant_id === variantId);
    if (!prod) return;

    // Save integration metadata
    setIntegrationData({
      variant_id: prod.variant_id,
      carton_size: prod.carton_size !== null ? prod.carton_size : undefined,
      product_name: prod.product_name,
      variant_name: prod.variant_name,
      retail_price: prod.retail_price !== null ? prod.retail_price : prod.unit_cost !== null ? prod.unit_cost : undefined,
      unit_cost: prod.unit_cost !== null ? prod.unit_cost : undefined,
      pricing_unit: prod.pricing_unit !== null ? prod.pricing_unit : undefined,
    });

    // Color Assignment
    if (prod.hex_color) {
      setTileColors([prod.hex_color]);
    }

    if (onProductSync) {
      const price = prod.retail_price !== null ? prod.retail_price : (prod.unit_cost !== null ? prod.unit_cost : 0);
      
      let pricingMode: 'carton' | 'sheet' | 'piece' = 'carton';
      const pricingUnit = prod.pricing_unit?.toLowerCase() || '';
      if (pricingUnit.includes('ea') || pricingUnit.includes('piece')) {
        pricingMode = 'piece';
      } else if (pricingUnit.includes('sheet')) {
        pricingMode = 'sheet';
      }

      onProductSync({
        name: `${prod.product_name} - ${prod.variant_name}`,
        pricingMode,
        price,
        cartonSize: prod.carton_size
      });
    }

    if (!prod.dimensions) return;

    // Robust parsing: strip quotation marks and split by x or X
    const cleanStr = prod.dimensions.replace(/["']/g, '').trim();
    const parts = cleanStr.split(/x/i).map(s => s.trim());
    
    if (parts.length >= 2) {
      let w = parseFloat(parts[0]);
      let h = parseFloat(parts[1]);

      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        // Explicitly treat these parsed numbers as inches. If currently in Metric, convert to cm.
        if (unit === 'cm') {
          w = parseFloat((w * 2.54).toFixed(2));
          h = parseFloat((h * 2.54).toFixed(2));
        }

        const isSheet = prod.pricing_unit && prod.pricing_unit.toLowerCase().includes('sheet');

        if (isSheet) {
          setSoldAsMosaic(true);
          setMosaicWidth(w);
          setMosaicHeight(h);

          if (prod.visual_shape === 'round') {
            onChangeShape('round');
            onChangeWidth(1);
            onChangeHeight(1);
          } else if (prod.visual_shape === 'hexagon') {
            onChangeShape('hexagon');
            onChangeWidth(2);
            onChangeHeight(2);
          } else {
            onChangeShape('rectangle');
            onChangeWidth(2);
            onChangeHeight(2);
          }
        } else {
          setSoldAsMosaic(false);
          onChangeWidth(w);
          onChangeHeight(h);
          if (
            prod.visual_shape === 'rectangle' ||
            prod.visual_shape === 'chevron' ||
            prod.visual_shape === 'hexagon' ||
            prod.visual_shape === 'octagon_dot' ||
            prod.visual_shape === 'round' ||
            prod.visual_shape === 'diamond' ||
            prod.visual_shape === 'triangle' ||
            prod.visual_shape === 'scallop' ||
            prod.visual_shape === 'pebble'
          ) {
            onChangeShape(prod.visual_shape as TileShape);
          } else {
            onChangeShape('rectangle');
          }
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Step 6: Material Syncing UI */}
      {linkedSubfloorProjectId !== null && (
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2 animate-fade-in">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-900">
            Import Subfloor Material
          </label>
          <select
            value={integrationData?.variant_id || ''}
            onChange={(e) => handleProductSelect(e.target.value)}
            disabled={isLockedForPainting}
            className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="">Select Subfloor Material...</option>
            {subfloorProducts.map((p) => (
              <option key={p.variant_id} value={p.variant_id}>
                {p.is_project_sample ? '★ [Selected] ' : ''}{p.product_name} - {p.variant_name} ({p.dimensions})
              </option>
            ))}
          </select>
          {integrationData && (
            <div className="flex justify-between items-center text-[9px] text-indigo-750 font-semibold uppercase font-mono px-0.5 pt-0.5">
              <span>Carton size: {integrationData.carton_size} pcs</span>
              <span>ID: {integrationData.variant_id}</span>
            </div>
          )}
        </div>
      )}

      {/* Shape choices segment */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tile Shape</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {(['rectangle', 'chevron', 'hexagon', 'octagon_dot', 'round', 'diamond', 'triangle', 'scallop', 'pebble'] as TileShape[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={isLockedForPainting}
              onClick={() => onChangeShape(s)}
              className={`py-2 px-1 text-[9px] sm:text-[10px] font-bold rounded border transition text-center ${
                shape === s
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-extrabold'
                  : 'border-slate-200 text-slate-600'
              } ${isLockedForPainting ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer hover:bg-slate-50'}`}
            >
              {s === 'octagon_dot' ? 'PATTERNS' : s === 'diamond' ? 'RHOMBUS' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic size inputs depending on shape */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded border border-slate-200/60">
        {(shape === 'hexagon' || shape === 'round' || shape === 'octagon_dot' || shape === 'triangle' || shape === 'scallop') ? (
          <div className="col-span-2 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {shape === 'hexagon' 
                  ? (isPicket ? `Picket Width (${unit})` : `Flat-to-Flat Width (${unit})`)
                  : shape === 'octagon_dot'
                    ? `Octagon Width / Dot Pitch (${unit})`
                    : shape === 'triangle'
                      ? `Triangle Side Width (${unit})`
                      : shape === 'scallop'
                        ? `Scallop Arc Width (${unit})`
                        : `Penny Diameter (${unit})`}
              </label>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.1"
                disabled={isLockedForPainting}
                value={tileWidth === 0 ? '' : tileWidth}
                onChange={(e) => {
                  const valStr = e.target.value;
                  if (valStr === '') {
                    onChangeWidth(0);
                    onChangeHeight(0);
                  } else {
                    const val = parseFloat(valStr);
                    if (!isNaN(val)) {
                      onChangeWidth(val);
                      onChangeHeight(val);
                    }
                  }
                }}
                onBlur={() => {
                  const clamped = Math.max(0.5, Math.min(100, tileWidth || 1));
                  onChangeWidth(clamped);
                  onChangeHeight(clamped);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
            </div>

            {shape === 'hexagon' && (
              <div className="space-y-2 pt-1 border-t border-slate-200/60 mt-1">
                <label className={`inline-flex items-center gap-2 select-none ${isLockedForPainting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isPicket}
                    disabled={isLockedForPainting}
                    onChange={(e) => onChangePicket(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Picket Style</span>
                </label>

                {isPicket && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Tip-to-Tip Length ({unit.toUpperCase()})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      disabled={isLockedForPainting}
                      value={picketLength === 0 ? '' : picketLength}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (valStr === '') {
                          onChangePicketLength(0);
                        } else {
                          const val = parseFloat(valStr);
                          if (!isNaN(val)) {
                            onChangePicketLength(val);
                          }
                        }
                      }}
                      onBlur={() => {
                        const clamped = Math.max(1, Math.min(100, picketLength || 8));
                        onChangePicketLength(clamped);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
         ) : (
          <>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {(shape as string) === 'pebble' ? `Sheet Width (${unit})` : `Tile Width (${unit})`}
              </label>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.1"
                disabled={isLockedForPainting}
                value={tileWidth === 0 ? '' : tileWidth}
                onChange={(e) => {
                  const valStr = e.target.value;
                  if (valStr === '') {
                    onChangeWidth(0);
                  } else {
                    const val = parseFloat(valStr);
                    if (!isNaN(val)) {
                      onChangeWidth(val);
                    }
                  }
                }}
                onBlur={() => {
                  const clamped = Math.max(0.5, Math.min(100, tileWidth || 1));
                  onChangeWidth(clamped);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {(shape as string) === 'pebble' ? `Sheet Height (${unit})` : `Tile Height (${unit})`}
                {pattern === 'basket_weave' && shape === 'rectangle' && (
                  <span className="text-indigo-650 font-bold ml-1.5">(LOCKED {basketWeaveMultiplier}:1)</span>
                )}
              </label>
              {shape === 'diamond' && (pattern === '3d_cube' || pattern === 'star_lattice') ? (
                <div className="flex items-center text-left min-h-[38px] px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-700 font-semibold select-none leading-normal">
                  Height mathematically locked to maintain 60° geometry.
                </div>
              ) : (
                <input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.1"
                  disabled={isLockedForPainting || pattern === 'versailles' || (pattern === 'basket_weave' && shape === 'rectangle')}
                  value={pattern === 'basket_weave' && shape === 'rectangle' ? tileWidth * basketWeaveMultiplier : (tileHeight === 0 ? '' : tileHeight)}
                  onChange={(e) => {
                    if (pattern === 'basket_weave' && shape === 'rectangle') return;
                    const valStr = e.target.value;
                    if (valStr === '') {
                      onChangeHeight(0);
                    } else {
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) {
                        onChangeHeight(val);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (pattern === 'basket_weave' && shape === 'rectangle') return;
                    const clamped = Math.max(0.5, Math.min(100, tileHeight || 1));
                    onChangeHeight(clamped);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Pattern style chooser for rectangles and diamonds */}
      {(shape === 'rectangle' || shape === 'diamond' || shape === 'octagon_dot') && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
          {shape !== 'octagon_dot' && (
            <>
              <label htmlFor="pattern" className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                Joint Stagger Pattern
              </label>
              <select
                id="pattern"
                value={pattern}
                disabled={isLockedForPainting}
                onChange={(e) => onChangePattern(e.target.value as RectanglePattern)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {shape === 'rectangle' ? (
                  <>
                    <option value="stack">Stack Bond (Straight grid)</option>
                    <option value="running_50">Running Bond (50% classic subway)</option>
                    <option value="third_33">Third Bond (33% clean stagger)</option>
                    <option value="plank">Plank (Vertical Column Stagger)</option>
                    <option value="herringbone">Herringbone (45° Interlocking)</option>
                    <option value="basket_weave">Basket Weave (Alternating Blocks)</option>
                    <option value="versailles">Versailles (Repeating Multi-Size Pattern)</option>
                    <option value="flatsket">Flatsket Weave (Alternating Bands)</option>
                    <option value="custom_json">Custom Pattern (JSON)</option>
                  </>
                ) : (
                  <>
                    <option value="stack">Standard Rhombus Grid</option>
                    <option value="3d_cube">3D Box (Tumbling Blocks)</option>
                  </>
                )}
              </select>
            </>
          )}

          {(shape === 'octagon_dot' || pattern === 'custom_json') && customPatternsList && customPatternsList.length > 0 && (
            <div className={shape === 'octagon_dot' ? "" : "pt-1"}>
              <label htmlFor="customPattern" className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                Select Custom Pattern
              </label>
              <select
                id="customPattern"
                value={customPatternsList.find(p => JSON.stringify(p.pattern_data) === JSON.stringify(activeCustomPattern))?.id || ''}
                disabled={isLockedForPainting}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedPattern = customPatternsList.find(p => p.id === selectedId);
                  if (selectedPattern) {
                    onChangeActiveCustomPattern(selectedPattern.pattern_data);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 bg-indigo-50/30 rounded text-xs font-semibold text-indigo-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="" disabled>Choose a saved pattern...</option>
                {customPatternsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {shape === 'rectangle' && pattern === 'flatsket' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Vertical Band (Rows)
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={isLockedForPainting}
                  value={flatsketVerticalRows}
                  onChange={(e) => onChangeFlatsketVertical(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Horizontal Band (Rows)
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={isLockedForPainting}
                  value={flatsketHorizontalRows}
                  onChange={(e) => onChangeFlatsketHorizontal(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
