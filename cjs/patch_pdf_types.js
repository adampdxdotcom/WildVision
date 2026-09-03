import fs from 'fs';
let code = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

code = code.replace("flatsketHorizontalRows?: number;", "flatsketHorizontalRows?: number;\n  reuseCuts?: boolean;");
code = code.replace("const stats = computeComprehensiveStatistics(params);", "const stats = computeComprehensiveStatistics({ ...params, reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts });");

fs.writeFileSync('src/utils/pdfExport.ts', code);
