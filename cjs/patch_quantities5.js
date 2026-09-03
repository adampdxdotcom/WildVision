import fs from 'fs';
let code = fs.readFileSync('src/components/QuantitiesPanel.tsx', 'utf8');

const str = `{((currentArea / 144) * overageMultiplier).toFixed(2)} <span className="text-[12px] font-semibold">sq ft</span>`;
const rep = `{((currentEffectiveAreaSqFt) * overageMultiplier).toFixed(2)} <span className="text-[12px] font-semibold">sq ft</span>`;

code = code.replace(str, rep);
fs.writeFileSync('src/components/QuantitiesPanel.tsx', code);
