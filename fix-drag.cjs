const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/useDragController.ts', 'utf8');

code = code.replace(
  'yInch = Math.max(0, Math.min(halfRoomH_y - halfBoxH_y, yInch));',
  'yInch = Math.max(roomFloorY, Math.min(halfRoomH_y - boxH_y, yInch));'
);

code = code.replace(
  `    if (isTileLayout) {
      storeX = xInch - (-(roomDimensions.width / 2));
      storeY = yInch - (-(roomDimensions.height / 2));
    }

    storeY = Math.max(0, storeY);`,
  `    if (isTileLayout) {
      storeX = xInch - (-(roomDimensions.width / 2));
      storeY = yInch - (-(roomDimensions.height / 2));
      storeY = Math.max(0, storeY);
    }`
);

fs.writeFileSync('src/components/TileCanvas3D/useDragController.ts', code);
