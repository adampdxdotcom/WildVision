import React from 'react';
import { Palette, Plus, Trash2, Upload, Grid, Paintbrush, Info } from 'lucide-react';
import { ColorVariation, ColorPattern, ColorCard, MeasurementUnit } from '../../../types';
import { availableMaterialTextures, useAppStore } from '../../../store/useAppStore';
import { getSwappedSvgText, getPatternBlobUrl, ensureColorCard, getCardPatternImageAndBlob } from '../../../utils/svgPatternManager';
import { getAvailableSetNames } from '../../../utils/printSetManager';
import { UniversalGroutControls } from './UniversalGroutControls';

export interface UniversalColorPaletteProps {
  tileColors: (string | ColorCard)[];
  onChangeColors: (colors: (string | ColorCard)[]) => void;
  colorPattern: ColorPattern;
  onChangePattern: (pattern: ColorPattern) => void;
  activeBrushColorIndex: number;
  onSetBrushIndex: (index: number) => void;
  hasPaintOverrides: boolean;
  onResetPaint: () => void;
  tileSpecular: string;
  onChangeSpecular: (val: string) => void;
  tileFinish: ColorVariation;
  onChangeFinish: (val: ColorVariation) => void;
  activeCustomPattern: any;
  shape?: string;
  tilesPerStripe?: number;
  onChangeTilesPerStripe?: (val: number) => void;
  compositeColors?: Record<string, string>;
  onChangeCompositeColor?: (name: string, hex: string) => void;
  materialTexture?: string;
  onChangeMaterialTexture?: (val: string) => void;
  soldAsMosaic?: boolean;
  activePattern?: string;
  setGroutWidth?: (val: number) => void;
  groutWidth?: number;
  onChangeGroutWidth?: (width: number) => void;
  groutColor?: string;
  onChangeGroutColor?: (color: string) => void;
  unit?: MeasurementUnit;
  isLockedForPainting?: boolean;
}


const GROUT_COLORS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Alabaster White', hex: '#f1f5f9' },
  { name: 'Warm Cream', hex: '#fdfbf7' },
  { name: 'Light Gray', hex: '#cbd5e1' },
  { name: 'Cement Gray', hex: '#94a3b8' },
  { name: 'Warm Sand', hex: '#d2b48c' },
  { name: 'Terracotta', hex: '#c84b31' },
  { name: 'Charcoal', hex: '#475569' },
  { name: 'Jet Black', hex: '#000000' },
];
const POPULAR_COLORS = [
  { name: 'Ceramic White', hex: '#f8fafc' },
  { name: 'Warm White', hex: '#fdfbf7' },
  { name: 'Sage Green', hex: '#6b8e23' },
  { name: 'Clay Coral', hex: '#e97451' },
  { name: 'Ocean Navy', hex: '#1e3a5f' },
  { name: 'Slate Gray', hex: '#4b5563' },
  { name: 'Onyx Black', hex: '#111827' },
  { name: 'Teal Glaze', hex: '#0f766e' },
  { name: 'Mustard Yellow', hex: '#ca8a04' },
];

export const UniversalColorPalette: React.FC<UniversalColorPaletteProps> = ({
  tileColors,
  onChangeColors,
  colorPattern,
  onChangePattern,
  activeBrushColorIndex,
  onSetBrushIndex,
  hasPaintOverrides,
  onResetPaint,
  tileSpecular,
  onChangeSpecular,
  tileFinish,
  onChangeFinish,
  activeCustomPattern,
  shape,
  tilesPerStripe = 1,
  onChangeTilesPerStripe,
  compositeColors = {},
  onChangeCompositeColor,
  materialTexture = 'none',
  onChangeMaterialTexture,
  soldAsMosaic,
  activePattern,
  setGroutWidth,
  groutWidth = 0.125,
  onChangeGroutWidth,
  groutColor = '#ffffff',
  onChangeGroutColor,
  unit = 'in',
  isLockedForPainting = false,
}) => {
  const handleFractionGrout = (denom: number) => {
    if (!onChangeGroutWidth) return;
    const inchesValue = 1 / denom;
    if (unit === 'in') {
      onChangeGroutWidth(inchesValue);
    } else {
      onChangeGroutWidth(Number((inchesValue * 2.54).toFixed(3)));
    }
  };
                
          
  // Paint Mode Selectors
            
  const disableColorWithTexture = useAppStore(state => state.disableColorWithTexture);
  const setDisableColorWithTexture = useAppStore(state => state.setDisableColorWithTexture);

  const [expandedCardIndex, setExpandedCardIndex] = React.useState<number | null>(null);
  const [uploadingCardIndex, setUploadingCardIndex] = React.useState<number | null>(null);
  const [patternTabMap, setPatternTabMap] = React.useState<Record<number, 'svg' | 'printSet'>>({});
  const cardFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCardSvgUpload = (file: File, index: number) => {
    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
      alert('Please upload a valid .svg file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const updated = tileColors.map((color, i) => {
          if (i === index) {
            const card = ensureColorCard(color, index);
            return {
              ...card,
              pattern: {
                svgText: text,
                accentColor: card.pattern?.accentColor || '#000000',
              },
            };
          }
          return color;
        });
        onChangeColors(updated);
        
      }
    };
    reader.readAsText(file);
  };

  const handleUpdatePrintConfig = (index: number, setName: string, opacity: number) => {
    const updated = tileColors.map((color, i) => {
      if (i === index) {
        const card = ensureColorCard(color, index);
        return {
          ...card,
          printConfig: {
            setName,
            opacity,
          },
        };
      }
      return color;
    });
    onChangeColors(updated);
  };

  const handleClearPattern = (index: number) => {
    const updated = tileColors.map((color, i) => {
      if (i === index) {
        const card = ensureColorCard(color, index);
        return {
          ...card,
          pattern: null,
          printConfig: undefined,
        };
      }
      return color;
    });
    onChangeColors(updated);
  };

  const togglePatternForCard = (index: number) => {
    const updated = tileColors.map((color, i) => {
      if (i === index) {
        const card = ensureColorCard(color, index);
        if (card.pattern || card.printConfig) {
          return {
            ...card,
            pattern: null,
            printConfig: undefined,
          };
        } else {
          return {
            ...card,
            pattern: {
              svgText: null,
              accentColor: '#000000',
            },
          };
        }
      }
      return color;
    });
    onChangeColors(updated);

    const target = updated[index];
    if (target && typeof target !== 'string' && (target.pattern || target.printConfig)) {
      setExpandedCardIndex(index);
    } else {
      setExpandedCardIndex(null);
    }
    
  };

  const handleSvgUpload = (file: File) => {
    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
      alert('Please upload a valid .svg file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        
        
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSvgUpload(e.dataTransfer.files[0]);
    }
  };

  const getSwappedSvgHtml = (svgText: string, tileColor: string, accentColor: string) => {
    return getSwappedSvgText(svgText, tileColor, accentColor);
  };

  const handlePatternChange = (newPattern: ColorPattern) => {
    if (colorPattern === 'paint' && newPattern !== 'paint' && hasPaintOverrides) {
      onResetPaint();
    }

    onChangePattern(newPattern);
    
    if (newPattern === 'paint') {
      const setActiveTool = useAppStore.getState().setActiveTool;
      setActiveTool('paint');
    }
    
    const card0 = ensureColorCard(tileColors[0] || '#f1f5f9', 0);
    if (newPattern === 'single') {
      onChangeColors([card0]);
    } else if (newPattern === 'checkerboard') {
      if (tileColors.length < 2) {
        onChangeColors([card0, ensureColorCard('#cbd5e1', 1)]);
      } else {
        onChangeColors([card0, ensureColorCard(tileColors[1] || '#cbd5e1', 1)]);
      }
    } else if (newPattern === '3d_cube_3_colors') {
      if (tileColors.length < 3) {
        onChangeColors([
          card0,
          ensureColorCard(tileColors[1] || '#cbd5e1', 1),
          ensureColorCard(tileColors[2] || '#4b5563', 2),
        ]);
      } else {
        onChangeColors([
          card0,
          ensureColorCard(tileColors[1], 1),
          ensureColorCard(tileColors[2], 2),
        ]);
      }
    } else if (newPattern === 'paint' || newPattern === 'random' || newPattern === 'random_pieces' || newPattern === 'horizontal_stripes' || newPattern === 'vertical_stripes') {
      if (newPattern === 'random_pieces' && shape === 'pebble') {
        onChangeColors([
          ensureColorCard('#f1f5f9', 0),
          ensureColorCard('#cbd5e1', 1),
          ensureColorCard('#727880', 2),
          ensureColorCard('#3f4347', 3),
        ]);
        if (setGroutWidth) setGroutWidth(0.0625);
      } else if (tileColors.length < 2) {
        onChangeColors([card0, ensureColorCard('#cbd5e1', 1)]);
      }
    }
    
  };

  const handleUpdateColor = (index: number, val: string) => {
    const updated = tileColors.map((color, i) => {
      if (i === index) {
        const card = ensureColorCard(color, index);
        return {
          ...card,
          hex: val,
        };
      }
      return color;
    });
    onChangeColors(updated);
    
  };

  const handleAddColor = () => {
    if (tileColors.length < 6) {
      const newCard: ColorCard = {
        id: String(Math.random()),
        hex: '#cbd5e1',
        pattern: null,
      };
      onChangeColors([...tileColors, newCard]);
      
    }
  };

  const handleRemoveColor = (index: number) => {
    const updated = tileColors.filter((_, i) => i !== index);
    onChangeColors(updated);
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Palette className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Wall Material Styling</h3>
      </div>

      {/* Main Color and Texture Section */}
      <div>
        <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5">
          Color and Texture
        </h3>

        <div className="space-y-3">
          {/* Main Tile Texture */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
              <span>Main Tile Texture (3D Depth)</span>
              <span className="text-[9px] text-indigo-500 normal-case font-semibold">Seamless PNG</span>
            </label>
            <select
              id="material-texture-select"
              value={materialTexture}
              onChange={(e) => { if (onChangeMaterialTexture) onChangeMaterialTexture(e.target.value); }}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
            >
              <option value="none">None (Plain Ceramic)</option>
              {availableMaterialTextures.map((tex) => (
                <option key={tex.id} value={tex.id}>
                  {tex.label}
                </option>
              ))}
            </select>

            {materialTexture && materialTexture !== 'none' && (
              <div className="flex items-center gap-2 mt-2 bg-slate-50 border border-slate-200 rounded p-2">
                <input
                  id="disable-tile-color-checkbox"
                  type="checkbox"
                  checked={disableColorWithTexture}
                  onChange={(e) => {
                    setDisableColorWithTexture(e.target.checked);
                    useAppStore.getState().setIsCanvasDirty(true);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="disable-tile-color-checkbox" className="text-[10px] font-bold uppercase tracking-wider text-slate-600 cursor-pointer select-none">
                  Disable Tile Color
                </label>
              </div>
            )}
          </div>

          {/* Main Tile Finish */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Main Tile Finish
            </label>
            <select
              id="tile-finish-select"
              value={tileSpecular}
              onChange={(e) => onChangeSpecular(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
            >
              <option value="matte">Matte</option>
              <option value="satin">Satin (Default)</option>
              <option value="glossy">Glossy</option>
            </select>
          </div>

          {/* Main Color Pattern */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Main Color Pattern
            </label>
            <select
              value={colorPattern}
              onChange={(e) => handlePatternChange(e.target.value as ColorPattern)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
            >
              <option value="single">Single Solid Color</option>
              {shape === 'diamond' && (activePattern === '3d_cube' || activePattern === 'star_lattice') && (
                <option value="3d_cube_3_colors">3D Cube - 3 Colors (Top, Left, Right)</option>
              )}
              <option value="checkerboard">Checkerboard Grid (2 Colors)</option>
              <option value="random">Randomized Color Blend (By Sheet)</option>
              {soldAsMosaic && (
                <option value="random_pieces">Randomized Pieces (Inside Sheet)</option>
              )}
              <option value="horizontal_stripes">Horizontal Stripes (2+ Colors)</option>
              <option value="vertical_stripes">Vertical Stripes (2+ Colors)</option>
              <option value="paint">Custom Paint</option>
            </select>
            {(colorPattern === 'horizontal_stripes' || colorPattern === 'vertical_stripes') && (
              <div className="mt-2.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tiles Per Stripe
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tilesPerStripe}
                  onChange={(e) => onChangeTilesPerStripe(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-700 p-1.5 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colors Section */}
      <div className="border-t border-slate-100 pt-3 space-y-3.5">
        <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
          Colors
        </h3>

        {/* Paint Mode warning banner */}
        {colorPattern === 'paint' && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-800 text-[11px] flex gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <p>
              Select a brush and click tiles on the canvas to paint. Structural changes are disabled while paint is active.
            </p>
          </div>
        )}

        {/* POPULAR PRESET BUBBLES - modifies primary Color 1 */}
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Primary Color Presets
          </span>
          <div className="flex flex-wrap gap-2 mb-2">
            {POPULAR_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => handleUpdateColor(0, c.hex)}
                className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                  ensureColorCard(tileColors[0], 0).hex.toLowerCase() === c.hex.toLowerCase()
                    ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                    : 'border-slate-300'
                 }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* DYNAMIC COLOR PICKERS BASED ON PATTERN */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pattern Colors
          </label>
        
        <div className="space-y-2">
          {tileColors.map((rawColor, idx) => {
            const card = ensureColorCard(rawColor, idx);
            const isPatternActive = !!card.pattern || !!card.printConfig;
            const { blobUrl } = getCardPatternImageAndBlob(card);

            return (
              <div key={card.id || idx} className="space-y-2">
                {/* Main Color Card row */}
                <div className="flex items-center gap-2 justify-between bg-slate-50 p-2 rounded border border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={card.hex.substring(0, 7)}
                      onChange={(e) => handleUpdateColor(idx, e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-800 font-semibold font-sans">
                        {colorPattern === 'paint' && idx === 0 ? 'Base Canvas Color' : `Color ${idx + 1}`}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono uppercase">{card.hex}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Paint Brush Selector */}
                    {colorPattern === 'paint' && (
                      <button
                        type="button"
                        onClick={() => onSetBrushIndex(idx)}
                        className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-center border gap-1 text-[10px] font-bold ${
                          activeBrushColorIndex === idx
                            ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                        title={`Select as Active Brush (Color ${idx + 1})`}
                      >
                        <Paintbrush className="w-3.5 h-3.5" />
                        <span>Brush</span>
                      </button>
                    )}

                    {/* Pattern/Grid toggle button */}
                    <button
                      type="button"
                      onClick={() => togglePatternForCard(idx)}
                      className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-center border ${
                        isPatternActive
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                      title={isPatternActive ? "Disable tile pattern" : "Add tile pattern"}
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="text"
                      value={card.hex.toUpperCase()}
                      onChange={(e) => handleUpdateColor(idx, e.target.value)}
                      maxLength={7}
                      className="w-16 bg-white border border-slate-200 text-[10px] font-mono text-slate-500 p-1 text-center rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />

                    {(colorPattern === 'paint' || colorPattern === 'random' || colorPattern === 'random_pieces' || colorPattern === 'horizontal_stripes' || colorPattern === 'vertical_stripes') && tileColors.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(idx)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Remove this color"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Nested Pocket - Slides open when pattern or print set is active */}
                {isPatternActive && (() => {
                  const activeTab = patternTabMap[idx] || (card.printConfig ? 'printSet' : 'svg');
                  const availableSetNames = getAvailableSetNames();
                  const currentSetName = card.printConfig?.setName || availableSetNames[0] || '';
                  const currentOpacity = card.printConfig?.opacity ?? 1.0;

                  return (
                    <div className="ml-2 pl-3 border-l-2 border-indigo-200 py-1.5 space-y-2">
                      <div className="bg-white rounded border border-slate-200/80 p-3 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                            Pattern (Color {idx + 1})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClearPattern(idx)}
                            className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Clear
                          </button>
                        </div>

                        {/* Segmented Toggle System */}
                        <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setPatternTabMap((prev) => ({ ...prev, [idx]: 'svg' }))}
                            className={`flex-1 py-1 text-center rounded transition-all cursor-pointer ${
                              activeTab === 'svg'
                                ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Vector SVG
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPatternTabMap((prev) => ({ ...prev, [idx]: 'printSet' }));
                              if (!card.printConfig && availableSetNames.length > 0) {
                                handleUpdatePrintConfig(idx, availableSetNames[0], 1.0);
                              }
                            }}
                            className={`flex-1 py-1 text-center rounded transition-all cursor-pointer ${
                              activeTab === 'printSet'
                                ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Print Set
                          </button>
                        </div>

                        {/* Tab 1: Vector SVG */}
                        {activeTab === 'svg' && (
                          <>
                            {!card.pattern?.svgText ? (
                              <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleCardSvgUpload(e.dataTransfer.files[0], idx);
                                  }
                                }}
                                onClick={() => {
                                  setUploadingCardIndex(idx);
                                  setTimeout(() => {
                                    cardFileInputRef.current?.click();
                                  }, 50);
                                }}
                                className="border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 rounded p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                              >
                                <Upload className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-600">Upload SVG Pattern</span>
                                <span className="text-[8px] text-slate-400">Click or Drag SVG</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded border border-slate-200/50">
                                {/* 1:1 Preview Thumbnail */}
                                <div
                                  className="w-12 h-12 rounded border border-slate-200/60 shadow-xs flex items-center justify-center bg-white flex-shrink-0 relative overflow-hidden"
                                  style={{ backgroundColor: card.hex }}
                                >
                                  {blobUrl ? (
                                    <img
                                      src={blobUrl}
                                      alt="Pattern"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : null}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                    Pattern Accent Color
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="color"
                                      value={card.pattern.accentColor || '#000000'}
                                      onChange={(e) => {
                                        const updated = tileColors.map((color, i) => {
                                          if (i === idx) {
                                            const currentCard = ensureColorCard(color, idx);
                                            return {
                                              ...currentCard,
                                              pattern: currentCard.pattern ? {
                                                ...currentCard.pattern,
                                                accentColor: e.target.value,
                                              } : null,
                                            };
                                          }
                                          return color;
                                        });
                                        onChangeColors(updated);
                                      }}
                                      className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                                    />
                                    <input
                                      type="text"
                                      value={(card.pattern.accentColor || '#000000').toUpperCase()}
                                      onChange={(e) => {
                                        const updated = tileColors.map((color, i) => {
                                          if (i === idx) {
                                            const currentCard = ensureColorCard(color, idx);
                                            return {
                                              ...currentCard,
                                              pattern: currentCard.pattern ? {
                                                ...currentCard.pattern,
                                                accentColor: e.target.value,
                                              } : null,
                                            };
                                          }
                                          return color;
                                        });
                                        onChangeColors(updated);
                                      }}
                                      maxLength={7}
                                      className="w-14 bg-white border border-slate-200 text-[9px] font-mono text-slate-500 p-0.5 text-center rounded focus:outline-hidden font-semibold"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Tab 2: Print Set */}
                        {activeTab === 'printSet' && (
                          <div className="space-y-2.5 bg-slate-50 p-2.5 rounded border border-slate-200/50">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Select Print Set
                              </label>
                              <select
                                value={currentSetName}
                                onChange={(e) => handleUpdatePrintConfig(idx, e.target.value, currentOpacity)}
                                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
                              >
                                {availableSetNames.length === 0 ? (
                                  <option value="">No Print Sets Found</option>
                                ) : (
                                  availableSetNames.map((setName) => (
                                    <option key={setName} value={setName}>
                                      {setName}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                  Print Opacity
                                </label>
                                <span className="text-[10px] font-mono font-bold text-indigo-600">
                                  {Math.round(currentOpacity * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={currentOpacity}
                                onChange={(e) => handleUpdatePrintConfig(idx, currentSetName, parseFloat(e.target.value))}
                                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Hidden card-specific file input */}
        <input
          type="file"
          ref={cardFileInputRef}
          onChange={(e) => {
            if (uploadingCardIndex !== null && e.target.files && e.target.files[0]) {
              handleCardSvgUpload(e.target.files[0], uploadingCardIndex);
            }
          }}
          accept=".svg"
          className="hidden"
        />

        {/* RANDOM/STRIPES/PAINT PATTERN - ADD COLOR BUTTON */}
        {(colorPattern === 'paint' || colorPattern === 'random' || colorPattern === 'random_pieces' || colorPattern === 'horizontal_stripes' || colorPattern === 'vertical_stripes') && tileColors.length < 6 && (
          <button
            type="button"
            onClick={handleAddColor}
            className="flex items-center gap-1.5 w-full justify-center py-1.5 border border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 transition-all rounded text-[11px] font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Color ({tileColors.length}/6)
          </button>
        )}

        {/* RESET PAINT BUTTON */}
        {colorPattern === 'paint' && (
          <button
            type="button"
            onClick={() => {
              onResetPaint();
              
            }}
            className="flex items-center gap-1.5 w-full justify-center py-1.5 border border-amber-300 hover:border-amber-400 text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 transition-all rounded text-[11px] font-bold cursor-pointer mt-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Paint
          </button>
        )}
      </div>
    </div>

      {(() => {
        let schema = activeCustomPattern;
        if (!schema && (shape === 'custom_polygon' || activePattern === 'custom_json')) {
          schema = {
            patternName: 'Star & Cross',
            blockWidth: 1.0,
            blockHeight: 1.0,
            tiles: [
              {
                w: 1.0,
                h: 1.0,
                dx: 0.0,
                dy: 0.0,
                shape: 'cross' as any,
                role: 'primary' as any,
                name: 'Cross',
              },
              {
                w: 1.0,
                h: 1.0,
                dx: 0.5,
                dy: 0.5,
                shape: 'star' as any,
                role: 'secondary' as any,
                name: 'Star',
              }
            ]
          };
        }

        if (!schema) return null;

        let parsedSchema = schema;
        if (typeof parsedSchema === 'string') {
          try {
            parsedSchema = JSON.parse(parsedSchema);
          } catch (e) {
            parsedSchema = null;
          }
        }

        if (!parsedSchema || !Array.isArray(parsedSchema.tiles)) return null;

        const uniqueNames: string[] = [];
        const seen = new Set<string>();
        parsedSchema.tiles.forEach((t: any) => {
          const nameStr = t.name || t.shape || t.role || '';
          if (nameStr && !seen.has(nameStr)) {
            seen.add(nameStr);
            uniqueNames.push(nameStr);
          }
        });

        return uniqueNames.map((name, index) => {
          let defaultColor = '#888888';
          if (index === 0) defaultColor = '#ffffff';
          else if (index === 1) defaultColor = '#000000';

          const currentColor = compositeColors[name] || defaultColor;
          return (
            <div key={name} className="border-t border-slate-100 pt-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {name} Color
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { name: 'Onyx Black', hex: '#111827' },
                  { name: 'Slate Gray', hex: '#334155' },
                  { name: 'Pure White', hex: '#ffffff' },
                  { name: 'Clay Coral', hex: '#e97451' },
                  { name: 'Teal Glaze', hex: '#0f766e' },
                  { name: 'Warm Sand', hex: '#d97706' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => { if (onChangeCompositeColor) onChangeCompositeColor(name, c.hex); }}
                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                      currentColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                        : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Custom:</span>
                <input
                  type="color"
                  value={currentColor.substring(0, 7)}
                  onChange={(e) => { if (onChangeCompositeColor) onChangeCompositeColor(name, e.target.value); }}
                  className="w-10 h-6 border border-slate-200 rounded cursor-pointer p-0 bg-transparent"
                />
              </div>
            </div>
          );
        });
      })()}

      {/* Deterministic Color Shading Variation Option */}
      {tileFinish !== undefined && onChangeFinish !== undefined && (
        <div className="border-t border-slate-100 pt-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Color Shading Variation (V1-V4)
          </label>
          <div className="flex gap-2">
            {(['V1', 'V2', 'V3', 'V4'] as const).map((v) => {
              const isActive = tileFinish === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChangeFinish(v)}
                  className={`flex-1 aspect-square flex items-center justify-center rounded-2xl border text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm ring-2 ring-indigo-500/20 ring-offset-1'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            {tileFinish === 'V1' && "Uniform — No color variation between individual tiles."}
            {tileFinish === 'V2' && "Slight (+/- 3% Lightness) — Replicates subtle, artisanal glazing."}
            {tileFinish === 'V3' && "Moderate (+/- 8% Lightness) — Replicates natural clay and zellige-style movement."}
            {tileFinish === 'V4' && "Substantial (+/- 15% Lightness & Saturation) — Replicates dramatic color blends."}
          </p>
        </div>
      )}
      {/* Grout joint width and color (moved here) */}
      {onChangeGroutColor && onChangeGroutWidth && (
        <UniversalGroutControls
          groutWidth={groutWidth}
          onChangeGroutWidth={onChangeGroutWidth}
          groutColor={groutColor}
          onChangeGroutColor={onChangeGroutColor}
          unit={unit}
          isLockedForPainting={isLockedForPainting}
        />
      )}
    </div>
  );
};