const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/useDragController.ts', 'utf8');

code = code.replace(
  "let finalYInch = Math.max(-halfRoomH + halfBoxH, Math.min(halfRoomH - halfBoxH, yInch));",
  "let finalYInch = Math.max(0, Math.min(halfRoomH - halfBoxH, yInch));"
);

fs.writeFileSync('src/components/TileCanvas3D/useDragController.ts', code);
