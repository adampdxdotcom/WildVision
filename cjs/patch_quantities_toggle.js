import fs from 'fs';
let code = fs.readFileSync('src/components/QuantitiesPanel.tsx', 'utf8');

const toggleMarkup = `      {/* Tile Count Method Toggle */}
      {activeTab !== 'totals' && (
         <div className="mt-5 mb-1 px-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] font-bold text-slate-700 tracking-wide font-mono">
                Calculation Method
              </span>
              <div className="relative flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setReuseCuts(false)}
                  className={\`px-3 py-1 rounded-full text-[10px] font-bold transition-all \${!reuseCuts ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                  Strict Pieces
                </button>
                <button
                  type="button"
                  onClick={() => setReuseCuts(true)}
                  className={\`px-3 py-1 rounded-full text-[10px] font-bold transition-all \${reuseCuts ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                  Reuse Cuts
                </button>
              </div>
            </label>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
               {reuseCuts 
                  ? "Cut pieces are mathematically combined into full tiles with a 15% kerf penalty. This produces a lower raw material count assuming perfect installer recycling." 
                  : "Every cut piece, regardless of size, counts as one full tile. This produces a higher raw count but ensures you have enough material even with no recycling."}
            </p>
         </div>
      )}

      {/* Purchasing & Cost Calculations Section */}`;

code = code.replace("{/* Purchasing & Cost Calculations Section */}", toggleMarkup);
fs.writeFileSync('src/components/QuantitiesPanel.tsx', code);
