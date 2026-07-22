const fs = require('fs');

let file = fs.readFileSync('src/components/Sidebar/Universal/UniversalColorPalette.tsx', 'utf8');

if (!file.includes('MeasurementUnit')) {
  file = file.replace(
    "import { ColorVariation, ColorPattern, ColorCard } from '../../../types';",
    "import { ColorVariation, ColorPattern, ColorCard, MeasurementUnit } from '../../../types';"
  );
}

if (!file.includes('GROUT_COLORS')) {
  const groutColors = `\nconst GROUT_COLORS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Alabaster White', hex: '#f1f5f9' },
  { name: 'Warm Cream', hex: '#fdfbf7' },
  { name: 'Light Gray', hex: '#cbd5e1' },
  { name: 'Cement Gray', hex: '#94a3b8' },
  { name: 'Warm Sand', hex: '#d2b48c' },
  { name: 'Terracotta', hex: '#c84b31' },
  { name: 'Charcoal', hex: '#475569' },
  { name: 'Jet Black', hex: '#000000' },
];\n`;
  file = file.replace("const POPULAR_COLORS = [", groutColors + "const POPULAR_COLORS = [");
}

const propsRegex = /export interface UniversalColorPaletteProps {[\s\S]*?}/;
file = file.replace(propsRegex, `export interface UniversalColorPaletteProps {
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
}`);

const destructureRegex = /export const UniversalColorPalette: React\.FC<UniversalColorPaletteProps> = \({[\s\S]*?}\) => {/;
file = file.replace(destructureRegex, `export const UniversalColorPalette: React.FC<UniversalColorPaletteProps> = ({
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
  };`);

const groutUI = `
      {/* Grout joint width and color (moved here) */}
      {onChangeGroutColor && onChangeGroutWidth && (
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5">
            Grout Color
          </h3>
          
          {/* Grout color list (placed ABOVE width control) */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {GROUT_COLORS.map((c) => (
                <button 
                  key={c.hex}
                  type="button"
                  onClick={() => onChangeGroutColor(c.hex)}
                  className={\`w-6 h-6 rounded-full border transition-all cursor-pointer \${
                    groutColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                      : 'border-slate-300'
                  }\`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Custom:</span>
              <input
                type="color"
                value={groutColor.substring(0, 7)}
                onChange={(e) => onChangeGroutColor(e.target.value)}
                className="w-10 h-6 border border-slate-200 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Grout sizing control (placed BELOW color control) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Grout Joint Width ({unit})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                disabled={isLockedForPainting}
                value={groutWidth === 0 ? '' : groutWidth}
                onChange={(e) => {
                  const valStr = e.target.value;
                  if (valStr === '') {
                    onChangeGroutWidth(0);
                  } else {
                    const val = parseFloat(valStr);
                    if (!isNaN(val)) {
                      onChangeGroutWidth(val);
                    }
                  }
                }}
                onBlur={() => {
                  onChangeGroutWidth(Math.max(0, Math.min(10, groutWidth)));
                }}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              {unit === 'in' ? (
                <div className="flex gap-1">
                  {[16, 8, 4].map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={isLockedForPainting}
                      onClick={() => handleFractionGrout(d)}
                      className={\`px-2 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold rounded border border-slate-200 text-slate-650 transition \${isLockedForPainting ? 'opacity-50 cursor-not-allowed hover:bg-slate-50' : 'cursor-pointer'}\`}
                    >
                      1/{d}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-1">
                  {[1, 3, 5].map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      disabled={isLockedForPainting}
                      onClick={() => onChangeGroutWidth(mm / 10)}
                      className={\`px-2 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold rounded border border-slate-200 text-slate-650 transition \${isLockedForPainting ? 'opacity-50 cursor-not-allowed hover:bg-slate-50' : 'cursor-pointer'}\`}
                    >
                      {mm}mm
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};`;

file = file.replace(/(\s*)<\/div>\n\s*\);\n\s*};\s*$/, groutUI);
fs.writeFileSync('src/components/Sidebar/Universal/UniversalColorPalette.tsx', file);
