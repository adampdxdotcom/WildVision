const fs = require('fs');
let code = fs.readFileSync('src/store/slices/collaborationSlice.ts', 'utf8');

if (!code.includes("clearLocksForUser")) {
  code = code.replace(
    "  releaseLock: (elementId: string) => void;",
    "  releaseLock: (elementId: string) => void;\n  clearLocksForUser: (userId: string) => void;"
  );

  code = code.replace(
    "  applyRemoteSync: (actionType, payload) => {",
    "  clearLocksForUser: (userId) => set((state) => {\n    const newLocks = { ...state.lockedElements };\n    let changed = false;\n    Object.entries(newLocks).forEach(([elementId, lockUserId]) => {\n      if (lockUserId === userId) {\n        delete newLocks[elementId];\n        changed = true;\n      }\n    });\n    return changed ? { lockedElements: newLocks } : {};\n  }),\n  applyRemoteSync: (actionType, payload) => {"
  );
  
  fs.writeFileSync('src/store/slices/collaborationSlice.ts', code);
}
