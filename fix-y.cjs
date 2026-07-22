const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/useDragController.ts', 'utf8');

code = code.replace(
  "yInch = Math.max(-halfRoomH_y + halfBoxH_y, Math.min(halfRoomH_y - halfBoxH_y, yInch));",
  "yInch = Math.max(0, Math.min(halfRoomH_y - halfBoxH_y, yInch));"
);

fs.writeFileSync('src/components/TileCanvas3D/useDragController.ts', code);
