const fs = require('fs');
let code = fs.readFileSync('src/store/slices/materialSlice.ts', 'utf8');

const targetStr = "    return {\n      tileColors: nextTileColors,\n      tileColorOverrides: nextOverrides,\n      activeBrushColorIndex: nextActiveBrush,\n      isCanvasDirty: true,\n    };\n  }),";

code = code.replace(
  targetStr,
  "    if (!state.isReceivingRemoteUpdate) broadcastStateSync('removeTileColor', index);\n" + targetStr
);

fs.writeFileSync('src/store/slices/materialSlice.ts', code);
