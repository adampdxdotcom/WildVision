const fs = require('fs');
let code = fs.readFileSync('src/hooks/useMultiplayer.ts', 'utf8');

code = code.replace(
  "const { currentProjectId, setOnlineUsers, updateCollaboratorCursor, removeCollaborator, applyRemoteSync } = useAppStore();",
  "const { currentProjectId, setOnlineUsers, updateCollaboratorCursor, removeCollaborator, applyRemoteSync, acquireLock, releaseLock } = useAppStore();"
);

code = code.replace(
  "      .on('broadcast', { event: 'state_sync' }, ({ payload }) => {",
  "      .on('broadcast', { event: 'lock_element' }, ({ payload }) => {\n        if (payload.elementId && payload.userId && payload.userId !== user.id) {\n          acquireLock(payload.elementId, payload.userId);\n        }\n      })\n      .on('broadcast', { event: 'unlock_element' }, ({ payload }) => {\n        if (payload.elementId) {\n          releaseLock(payload.elementId);\n        }\n      })\n      .on('broadcast', { event: 'state_sync' }, ({ payload }) => {"
);

code = code.replace(
  "  }, [currentProjectId, user, first_name, last_name, avatar_url, setOnlineUsers, removeCollaborator, updateCollaboratorCursor, applyRemoteSync]);",
  "  }, [currentProjectId, user, first_name, last_name, avatar_url, setOnlineUsers, removeCollaborator, updateCollaboratorCursor, applyRemoteSync, acquireLock, releaseLock]);"
);

fs.writeFileSync('src/hooks/useMultiplayer.ts', code);
