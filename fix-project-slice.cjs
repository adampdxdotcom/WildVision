const fs = require('fs');
let code = fs.readFileSync('src/store/slices/projectSlice.ts', 'utf8');

// 1. Add to interface
code = code.replace(
  /  setIsReadOnly: \(readOnly: boolean\) => void;\n\}/,
  `  setIsReadOnly: (readOnly: boolean) => void;\n  pdfElevationUrl: string | null;\n  setPdfElevationUrl: (url: string | null) => void;\n}`
);

// 2. Add to initialization and setter
code = code.replace(
  /  setIsReadOnly: \(readOnly\) => set\(\{ isReadOnly: readOnly \}\),/,
  `  setIsReadOnly: (readOnly) => set({ isReadOnly: readOnly }),\n  pdfElevationUrl: null,\n  setPdfElevationUrl: (url) => set({ pdfElevationUrl: url }),`
);

// 3. Add to resetToBlankWorkspace
code = code.replace(
  /    activeCustomPattern: null,/,
  `    activeCustomPattern: null,\n    pdfElevationUrl: null,`
);

fs.writeFileSync('src/store/slices/projectSlice.ts', code);
