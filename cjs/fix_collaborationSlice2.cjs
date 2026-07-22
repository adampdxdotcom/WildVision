const fs = require('fs');
let code = fs.readFileSync('src/store/slices/collaborationSlice.ts', 'utf8');

code = code.replace(
  "        case 'setTileColorOverrides':\n          if (store.setTileColorOverrides) store.setTileColorOverrides(payload);\n          break;",
  "        case 'setTileColorOverride':\n          if (store.setTileColorOverride) store.setTileColorOverride(payload.tileId, payload.colorIndex);\n          break;\n        case 'clearAllTileColorOverrides':\n          if (store.clearAllTileColorOverrides) store.clearAllTileColorOverrides();\n          break;\n        case 'removeTileColor':\n          if (store.removeTileColor) store.removeTileColor(payload);\n          break;"
);

fs.writeFileSync('src/store/slices/collaborationSlice.ts', code);
