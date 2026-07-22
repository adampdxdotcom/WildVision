const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/components/SubAreaNodesOverlay.tsx', 'utf8');

if (!code.includes("const user = useAuthStore")) {
  code = code.replace(
    "import { useAppStore } from '../../../store/useAppStore';",
    "import { useAppStore } from '../../../store/useAppStore';\nimport { useAuthStore } from '../../../store/useAuthStore';\nimport { Lock, Unlock } from 'lucide-react';"
  );
}

const hooksStr = `
  const lockedElements = useAppStore(state => state.lockedElements);
  const onlineUsers = useAppStore(state => state.onlineUsers);
  const user = useAuthStore(state => state.user);
`;

code = code.replace(
  "  handleSubAreaVertexMouseDown,\n}) => {",
  "  handleSubAreaVertexMouseDown,\n}) => {\n" + hooksStr
);

code = code.replace(
  "        const nextI = (i + 1) % n;",
  "        const elementId = \`subarea_node_\${activeSubAreaId}_\${i}\`;\n        const lockUserId = lockedElements[elementId];\n        const isLockedByOther = lockUserId && lockUserId !== user?.id;\n        const lockUser = isLockedByOther ? onlineUsers[lockUserId] : null;\n        const lockColor = lockUser?.cursorColor || '#94a3b8';\n        const nextI = (i + 1) % n;"
);

code = code.replace(
  "              title={\n                activeTool === 'eraser'",
  "              title={\n                isLockedByOther ? \`Locked by \${lockUser?.name || 'another user'}\` :\n                activeTool === 'eraser'"
);

code = code.replace(
  "className={`absolute w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-2 border-white shadow-md pointer-events-auto hover:scale-125 transition-transform duration-75 z-25 ${",
  "className={`absolute flex items-center justify-center w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-2 border-white shadow-md transition-transform duration-75 z-25 ${isLockedByOther ? 'pointer-events-none scale-125' : 'pointer-events-auto hover:scale-125'} ${"
);

code = code.replace(
  "activeTool === 'eraser'\n                  ? 'bg-rose-500",
  "isLockedByOther ? '' : activeTool === 'eraser'\n                  ? 'bg-rose-500"
);

code = code.replace(
  "style={{ left: pt.px, top: pt.py }}",
  "style={{ left: pt.px, top: pt.py, ...(isLockedByOther ? { backgroundColor: lockColor } : {}) }}"
);

code = code.replace(
  "handleSubAreaVertexMouseDown(i, setDraggingSubAreaVertexIndex);\n              }}\n            />",
  "handleSubAreaVertexMouseDown(i, setDraggingSubAreaVertexIndex);\n              }}\n            >\n              {isLockedByOther && <Lock size={8} strokeWidth={4} className=\"text-white\" />}\n            </div>"
);

fs.writeFileSync('src/components/TileCanvas/components/SubAreaNodesOverlay.tsx', code);
