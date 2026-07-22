const fs = require('fs');
let code = fs.readFileSync('src/store/slices/collaborationSlice.ts', 'utf8');

code = code.replace(
  "  applyRemoteSync: (actionType: string, payload: any) => void;\n}",
  "  applyRemoteSync: (actionType: string, payload: any) => void;\n  lockedElements: Record<string, string>;\n  acquireLock: (elementId: string, userId: string) => void;\n  releaseLock: (elementId: string) => void;\n}"
);

code = code.replace(
  "  isReceivingRemoteUpdate: false,\n  setIsReceivingRemoteUpdate: (val) => set({ isReceivingRemoteUpdate: val }),",
  "  isReceivingRemoteUpdate: false,\n  setIsReceivingRemoteUpdate: (val) => set({ isReceivingRemoteUpdate: val }),\n  lockedElements: {},\n  acquireLock: (elementId, userId) => set((state) => ({\n    lockedElements: { ...state.lockedElements, [elementId]: userId }\n  })),\n  releaseLock: (elementId) => set((state) => {\n    const newLocks = { ...state.lockedElements };\n    delete newLocks[elementId];\n    return { lockedElements: newLocks };\n  }),"
);

fs.writeFileSync('src/store/slices/collaborationSlice.ts', code);
