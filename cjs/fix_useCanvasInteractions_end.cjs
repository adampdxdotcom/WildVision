const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

code = code.replace(
  "setDraggingVertexIndex(null);\n    setDraggingSubAreaVertexIndex(null);",
  "handleSetDraggingVertexIndex(null);\n    handleSetDraggingSubAreaVertexIndex(null);"
);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', code);
