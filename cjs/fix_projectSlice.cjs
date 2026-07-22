const fs = require('fs');

let code = fs.readFileSync('src/store/slices/projectSlice.ts', 'utf8');

code = code.replace(
  "loadProjectState: (payload: any, projectId: string, projectName: string, ownerId?: string) => void;",
  "loadProjectState: (payload: any, projectId: string, projectName: string, ownerId?: string, explicitPermission?: 'owner' | 'write' | 'read') => void;"
);

code = code.replace(
  "loadProjectState: (payload, projectId, projectName, ownerId) => set((state: any) => {",
  "loadProjectState: (payload, projectId, projectName, ownerId, explicitPermission) => set((state: any) => {"
);

code = code.replace(
  "let permission: 'owner' | 'write' | 'read' = 'owner';\n    if (ownerId && currentUser && ownerId !== currentUser.id) {\n      // If we don't own it but loaded it, assume read-only (unless we add write shares later)\n      permission = 'read';\n    } else if (ownerId && !currentUser) {\n      permission = 'read'; // Not logged in but loaded via share\n    }",
  "let permission: 'owner' | 'write' | 'read' = explicitPermission || 'owner';\n    if (!explicitPermission) {\n      if (ownerId && currentUser && ownerId !== currentUser.id) {\n        permission = 'read';\n      } else if (ownerId && !currentUser) {\n        permission = 'read';\n      }\n    }"
);

fs.writeFileSync('src/store/slices/projectSlice.ts', code);
