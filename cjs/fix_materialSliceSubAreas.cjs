const fs = require('fs');
let code = fs.readFileSync('src/store/slices/materialSlice.ts', 'utf8');

code = code.replace(
  "setSubAreas: (updater) => set((state: any) => ({ subAreas: typeof updater === 'function' ? updater(state.subAreas) : updater })),",
  "setSubAreas: (updater) => set((state: any) => {\n    const nextVal = typeof updater === 'function' ? updater(state.subAreas) : updater;\n    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setSubAreas', nextVal);\n    return { subAreas: nextVal };\n  }),"
);

// We should also patch groutColor, groutWidth, tileName, tileColors if they failed. Let's check them.
code = code.replace(
  "setGroutWidth: (updater) => set((state: any) => ({ groutWidth: typeof updater === 'function' ? updater(state.groutWidth) : updater })),",
  "setGroutWidth: (updater) => set((state: any) => {\n    const nextVal = typeof updater === 'function' ? updater(state.groutWidth) : updater;\n    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setGroutWidth', nextVal);\n    return { groutWidth: nextVal };\n  }),"
);

code = code.replace(
  "setTileName: (updater) => set((state: any) => ({ tileName: typeof updater === 'function' ? updater(state.tileName) : updater })),",
  "setTileName: (updater) => set((state: any) => {\n    const nextVal = typeof updater === 'function' ? updater(state.tileName) : updater;\n    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileName', nextVal);\n    return { tileName: nextVal };\n  }),"
);

code = code.replace(
  "setTileColors: (updater) => set((state: any) => ({ tileColors: typeof updater === 'function' ? updater(state.tileColors) : updater })),",
  "setTileColors: (updater) => set((state: any) => {\n    const nextVal = typeof updater === 'function' ? updater(state.tileColors) : updater;\n    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileColors', nextVal);\n    return { tileColors: nextVal };\n  }),"
);

code = code.replace(
  "setGroutColor: (updater) => set((state: any) => ({ groutColor: typeof updater === 'function' ? updater(state.groutColor) : updater })),",
  "setGroutColor: (updater) => set((state: any) => {\n    const nextVal = typeof updater === 'function' ? updater(state.groutColor) : updater;\n    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setGroutColor', nextVal);\n    return { groutColor: nextVal };\n  }),"
);

fs.writeFileSync('src/store/slices/materialSlice.ts', code);
