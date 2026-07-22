const fs = require('fs');
let code = fs.readFileSync('src/store/slices/materialSlice.ts', 'utf8');

// setTileWidth
code = code.replace(
  "    return { tileWidth: nextWidth, tileHeight: nextHeight };\n  }),",
  "    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileWidth', nextWidth);\n    return { tileWidth: nextWidth, tileHeight: nextHeight };\n  }),"
);

// setTileHeight
code = code.replace(
  "    return { tileHeight: shouldLock ? state.tileWidth * state.basketWeaveMultiplier : nextHeight };\n  }),",
  "    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileHeight', nextHeight);\n    return { tileHeight: shouldLock ? state.tileWidth * state.basketWeaveMultiplier : nextHeight };\n  }),"
);

// setPattern
code = code.replace(
  "    return { pattern: nextPattern, tileHeight: nextHeight };\n  }),",
  "    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setPattern', nextPattern);\n    return { pattern: nextPattern, tileHeight: nextHeight };\n  }),"
);

fs.writeFileSync('src/store/slices/materialSlice.ts', code);
