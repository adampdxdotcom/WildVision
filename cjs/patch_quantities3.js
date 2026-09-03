import fs from 'fs';
let code = fs.readFileSync('src/components/QuantitiesPanel.tsx', 'utf8');

code = code.replace(/      currArea,\n      overageMult,/g, "      currArea,\n      effectiveAreaSqFt,\n      overageMult,");
code = code.replace("const currentArea = activeStats ? activeStats.currArea : 0;", "const currentArea = activeStats ? activeStats.currArea : 0;\n  const currentEffectiveAreaSqFt = activeStats ? activeStats.effectiveAreaSqFt : 0;");
code = code.replace("((c.currArea || 0) / 144).toFixed(2)", "((c.effectiveAreaSqFt || 0)).toFixed(2)");

fs.writeFileSync('src/components/QuantitiesPanel.tsx', code);
