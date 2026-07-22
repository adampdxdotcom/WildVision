const fs = require('fs');
let code = fs.readFileSync('src/store/slices/draftingSlice.ts', 'utf8');

code = code.replace(
  "    return {\n      wallVertices: nextVertices,\n      wallWidth: calculatedWidth,\n      wallHeight: calculatedHeight,\n    };\n  }),",
  "    if (!state.isReceivingRemoteUpdate) {\n      broadcastStateSync('setWallVertices', nextVertices);\n    }\n    return {\n      wallVertices: nextVertices,\n      wallWidth: calculatedWidth,\n      wallHeight: calculatedHeight,\n    };\n  }),"
);

fs.writeFileSync('src/store/slices/draftingSlice.ts', code);
