const fs = require('fs');
let code = fs.readFileSync('src/hooks/useCloudAutoSave.ts', 'utf8');

// Add onlineUsers and currentProjectPermission to the destructured useAppStore values
if (!code.includes("onlineUsers,")) {
  code = code.replace(
    "    isLockedByAnotherTab,",
    "    isLockedByAnotherTab,\n    onlineUsers,\n    currentProjectPermission,"
  );
}

const delegationLogic = `
    if (!isAutoSaveEnabled) {
      setSaveStatus('idle');
      return;
    }

    const isMultiplayer = Object.keys(onlineUsers || {}).length > 0;
    const isOwner = currentProjectPermission === 'owner';

    // Auto-Save Delegation: In multiplayer, ONLY the owner saves background states to avoid save storms
    if (isMultiplayer && !isOwner) {
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');
`;

code = code.replace(
  "    if (!isAutoSaveEnabled) {\n      setSaveStatus('idle');\n      return;\n    }\n\n    setSaveStatus('saving');",
  delegationLogic
);

// Add them to dependency array
code = code.replace(
  "isAutoSaveEnabled, isLockedByAnotherTab]);",
  "isAutoSaveEnabled, isLockedByAnotherTab, onlineUsers, currentProjectPermission]);"
);

fs.writeFileSync('src/hooks/useCloudAutoSave.ts', code);
