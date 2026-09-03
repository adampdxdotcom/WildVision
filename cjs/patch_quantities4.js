import fs from 'fs';
let code = fs.readFileSync('src/components/QuantitiesPanel.tsx', 'utf8');

const str1 = `            <div className="h-6 flex items-center">
              <span className="font-semibold text-slate-500">
                {isMosaic ? 'Cut Sheets Need' : 'Cut Tiles Need'}
              </span>
            </div>`;

const rep1 = `            <div className="h-6 flex items-center">
              <span className="font-semibold text-slate-500">
                {isMosaic ? 'Cut Sheets Need' : (reuseCuts ? 'Equivalent Cut Tiles' : 'Cut Pieces Need')}
              </span>
            </div>`;

code = code.replace(str1, rep1);

const str2 = `            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{activeReport.cutTilesCount}</span>
            </div>`;

const rep2 = `            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{Math.ceil(reuseCuts ? (activeReport.fractionalCutCount || 0) : (activeReport.strictCutCount || activeReport.cutTilesCount))}</span>
            </div>`;

code = code.replace(str2, rep2);

fs.writeFileSync('src/components/QuantitiesPanel.tsx', code);
