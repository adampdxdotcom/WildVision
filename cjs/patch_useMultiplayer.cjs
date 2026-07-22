const fs = require('fs');
let code = fs.readFileSync('src/hooks/useMultiplayer.ts', 'utf8');

if (!code.includes("clearLocksForUser")) {
  code = code.replace(
    "const { currentProjectId, setOnlineUsers, updateCollaboratorCursor, removeCollaborator, applyRemoteSync, acquireLock, releaseLock } = useAppStore();",
    "const { currentProjectId, setOnlineUsers, updateCollaboratorCursor, removeCollaborator, applyRemoteSync, acquireLock, releaseLock, clearLocksForUser } = useAppStore();"
  );
  
  code = code.replace(
    "        if (leftPresences.length > 0) {\n          const p = leftPresences[0] as any;\n          removeCollaborator(p.id);\n        }",
    "        if (leftPresences.length > 0) {\n          const p = leftPresences[0] as any;\n          removeCollaborator(p.id);\n          clearLocksForUser(p.id);\n        }"
  );

  code = code.replace(
    "removeCollaborator, updateCollaboratorCursor, applyRemoteSync, acquireLock, releaseLock]);",
    "removeCollaborator, updateCollaboratorCursor, applyRemoteSync, acquireLock, releaseLock, clearLocksForUser]);"
  );

  fs.writeFileSync('src/hooks/useMultiplayer.ts', code);
}
