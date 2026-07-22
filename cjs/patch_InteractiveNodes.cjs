const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/components/InteractiveNodes.tsx', 'utf8');

if (!code.includes("const lockedElements = useAppStore")) {
  code = code.replace(
    "const viewSettings = useAppStore(state => state.viewSettings);",
    "const viewSettings = useAppStore(state => state.viewSettings);\n  const lockedElements = useAppStore(state => state.lockedElements);\n  const onlineUsers = useAppStore(state => state.onlineUsers);\n  const user = useAppStore(state => state.user);\n"
  );
}

// Add an overlay to show locks on entire subareas
const lockOverlayStr = `
      {subAreas.map((sa) => {
        const lockUserId = lockedElements[\`subarea_\${sa.id}\`];
        const isLockedByOther = lockUserId && lockUserId !== user?.id;
        if (!isLockedByOther) return null;
        const lockUser = onlineUsers[lockUserId];
        const lockColor = lockUser?.cursorColor || '#94a3b8';
        const centerPx = wallToScreen(sa.x + sa.width / 2, sa.y + sa.height / 2);
        return (
          <div
            key={\`sa-lock-\${sa.id}\`}
            className="absolute z-20 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded px-2 py-1 shadow-sm text-xs font-medium text-white"
            style={{ left: centerPx.px, top: centerPx.py, backgroundColor: lockColor }}
          >
            <Lock size={12} className="mr-1" />
            {lockUser?.name || 'Editing'}
          </div>
        );
      })}
`;

if (!code.includes("sa-lock-")) {
  code = code.replace(
    "<SubAreaNodesOverlay",
    lockOverlayStr + "\n      <SubAreaNodesOverlay"
  );
}

// wait, we need to import Lock from lucide-react in InteractiveNodes.tsx
if (!code.includes("import { Lock }")) {
  code = code.replace(
    "import React from 'react';",
    "import React from 'react';\nimport { Lock } from 'lucide-react';"
  );
}

fs.writeFileSync('src/components/TileCanvas/components/InteractiveNodes.tsx', code);
