const fs = require('fs');
let code = fs.readFileSync('src/features/PatternBuilder/TessellationPreview.tsx', 'utf8');

const regex = /\s*\{\/\* Quick Toolbar \*\/\}[\s\S]*?(?=\s*<\/div>\s*\);\s*\})/m;
if (regex.test(code)) {
  code = code.replace(regex, '');
  
  const hudCode = `
        {/* Floating HUD Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-4 flex flex-wrap items-center gap-6 z-20">
          {/* Theme select */}
          <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-md border border-[#E5E7EB]">
            <button
              onClick={() => setRenderTheme('custom')}
              className={\`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors \${
                renderTheme === 'custom' ? 'bg-white text-black border border-[#E5E7EB] shadow-sm' : 'text-slate-500 hover:text-black'
              }\`}
              title="Tile-defined Colors"
            >
              Colors
            </button>
            <button
              onClick={() => setRenderTheme('blueprint')}
              className={\`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors \${
                renderTheme === 'blueprint' ? 'bg-white text-black border border-[#E5E7EB] shadow-sm' : 'text-slate-500 hover:text-black'
              }\`}
              title="Blueprint styling"
            >
              Blueprint
            </button>
            <button
              onClick={() => setRenderTheme('monochrome')}
              className={\`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors \${
                renderTheme === 'monochrome' ? 'bg-white text-black border border-[#E5E7EB] shadow-sm' : 'text-slate-500 hover:text-black'
              }\`}
              title="High contrast outlines"
            >
              Line-Art
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200"></div>

          {/* Grid Repeat Slider */}
          <div className="flex flex-col gap-1.5 w-[100px]">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Repeat</span>
              <span className="text-black">{gridSize}x{gridSize}</span>
            </label>
            <input
              type="range"
              min="2"
              max="6"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full accent-black h-1 bg-slate-200 cursor-pointer rounded-full"
            />
          </div>

          <div className="w-px h-6 bg-slate-200"></div>

          {/* Preview Zoom Slider */}
          <div className="flex flex-col gap-1.5 w-[100px]">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
              <span className="text-black">{zoom}%</span>
            </label>
            <input
              type="range"
              min="30"
              max="180"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-full accent-black h-1 bg-slate-200 cursor-pointer rounded-full"
            />
          </div>

          <div className="w-px h-6 bg-slate-200"></div>

          {/* Checkboxes */}
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBorders}
                onChange={(e) => setShowBorders(e.target.checked)}
                className="rounded border-slate-300 text-black focus:ring-black w-3.5 h-3.5 cursor-pointer"
              />
              Borders
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highlightActive}
                onChange={(e) => setHighlightActive(e.target.checked)}
                className="rounded border-slate-300 text-black focus:ring-black w-3.5 h-3.5 cursor-pointer"
              />
              Highlight
            </label>
          </div>
        </div>`;

  code = code.replace(/\{\/\* Blueprint watermark \*\/\}([\s\S]*?)<\/div>\s*\{\/\* Quick Toolbar \*\/\}/, '{\/* Blueprint watermark *\/}$1' + hudCode + '\n      </div>\n      {/* Quick Toolbar */}');
  
  // Re-run the regex to remove the old tools
  code = code.replace(/\s*\{\/\* Quick Toolbar \*\/\}[\s\S]*?(?=\s*<\/div>\s*\);\s*\})/m, '');
  
  fs.writeFileSync('src/features/PatternBuilder/TessellationPreview.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Could not find regex target");
}
