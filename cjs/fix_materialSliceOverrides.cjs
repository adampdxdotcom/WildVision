const fs = require('fs');
let code = fs.readFileSync('src/store/slices/materialSlice.ts', 'utf8');

// 1. setTileColorOverride
code = code.replace(
  "return { tileColorOverrides: nextOverrides };\n  }),",
  "if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileColorOverride', { tileId, colorIndex });\n    return { tileColorOverrides: nextOverrides };\n  }),"
);

// 2. clearAllTileColorOverrides
code = code.replace(
  "clearAllTileColorOverrides: () => {\n    set({ tileColorOverrides: {} });",
  "clearAllTileColorOverrides: () => {\n    set((state: any) => {\n      if (!state.isReceivingRemoteUpdate) broadcastStateSync('clearAllTileColorOverrides', null);\n      return { tileColorOverrides: {} };\n    });"
);

// 3. removeTileColor
code = code.replace(
  "return {\n      tileColors: nextTileColors,\n      tileColorOverrides: nextOverrides,\n      activeBrushColorIndex: nextActiveBrush\n    };\n  }),",
  "if (!state.isReceivingRemoteUpdate) broadcastStateSync('removeTileColor', index);\n    return {\n      tileColors: nextTileColors,\n      tileColorOverrides: nextOverrides,\n      activeBrushColorIndex: nextActiveBrush\n    };\n  }),"
);

fs.writeFileSync('src/store/slices/materialSlice.ts', code);
