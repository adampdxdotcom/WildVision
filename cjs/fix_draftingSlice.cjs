const fs = require('fs');

let code = fs.readFileSync('src/store/slices/draftingSlice.ts', 'utf8');

if (!code.includes("import { broadcastStateSync }")) {
  code = code.replace("import { StateCreator } from 'zustand';", "import { StateCreator } from 'zustand';\nimport { broadcastStateSync } from '../../utils/syncBroadcaster';");
}

code = code.replace(
  "    return { wallVertices: nextVertices };\n  }),",
  "    if (!state.isReceivingRemoteUpdate) {\n      broadcastStateSync('setWallVertices', nextVertices);\n    }\n    return { wallVertices: nextVertices };\n  }),"
);

code = code.replace(
  "return { wallVertices: nextVertices };\n    }",
  "if (!state.isReceivingRemoteUpdate) {\n        broadcastStateSync('setWallVertices', nextVertices);\n      }\n      return { wallVertices: nextVertices };\n    }"
);

fs.writeFileSync('src/store/slices/draftingSlice.ts', code);
