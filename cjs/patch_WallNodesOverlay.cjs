const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/components/WallNodesOverlay.tsx', 'utf8');

if (!code.includes("const user = useAuthStore")) {
  code = code.replace(
    "import { useAppStore } from '../../../store/useAppStore';",
    "import { useAppStore } from '../../../store/useAppStore';\nimport { useAuthStore } from '../../../store/useAuthStore';"
  );
}

// Add state hooks
code = code.replace(
  "  const [localVal, setLocalVal] = React.useState(initialLength.toFixed(2));",
  "  const [localVal, setLocalVal] = React.useState(initialLength.toFixed(2));"
);

code = code.replace(
  "export const WallNodesOverlay: React.FC<WallNodesOverlayProps> = ({",
  "export const WallNodesOverlay: React.FC<WallNodesOverlayProps> = ({\n  "
);

const hooksStr = `
  const lockedElements = useAppStore(state => state.lockedElements);
  const onlineUsers = useAppStore(state => state.onlineUsers);
  const user = useAuthStore(state => state.user);
`;

code = code.replace(
  "  setDraftFoldNodeIndex,\n}) => {",
  "  setDraftFoldNodeIndex,\n}) => {\n" + hooksStr
);

// Add lock vars inside map
code = code.replace(
  "const currentAngle = getInternalAngle(A, B, C, isCCW);",
  "const currentAngle = getInternalAngle(A, B, C, isCCW);\n        const elementId = \`wall_node_\${i}\`;\n        const lockUserId = lockedElements[elementId];\n        const isLockedByOther = lockUserId && lockUserId !== user?.id;\n        const lockUser = isLockedByOther ? onlineUsers[lockUserId] : null;\n        const lockColor = lockUser?.cursorColor || '#94a3b8';"
);

// Inject logic into className and style and title
code = code.replace(
  "              title={\n                activeTool === 'eraser'",
  "              title={\n                isLockedByOther ? \`Locked by \${lockUser?.name || 'another user'}\` :\n                activeTool === 'eraser'"
);

// Replace class logic
code = code.replace(
  "className={`absolute w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-2 border-white shadow-sm pointer-events-auto transition-transform z-20 ${",
  "className={`absolute flex items-center justify-center w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-2 border-white shadow-sm transition-transform z-20 ${isLockedByOther ? 'pointer-events-none scale-125' : 'pointer-events-auto'} ${"
);

// Style insertion
code = code.replace(
  "style={{ left: pt.px, top: pt.py }}",
  "style={{ left: pt.px, top: pt.py, ...(isLockedByOther ? { backgroundColor: lockColor } : {}) }}"
);

// Handle the background class overriding inline style by stripping bg- classes if locked
code = code.replace(
  "selectedVertexIndices.includes(i)\n                  ? 'bg-[#22c55e]",
  "isLockedByOther ? '' : selectedVertexIndices.includes(i)\n                  ? 'bg-[#22c55e]"
);

// Add the lock icon inside the dot if locked
code = code.replace(
  "handleWallVertexMouseDown(i, setDraggingVertexIndex);\n              }}\n            />",
  "handleWallVertexMouseDown(i, setDraggingVertexIndex);\n              }}\n            >\n              {isLockedByOther && <Lock size={8} strokeWidth={4} className=\"text-white\" />}\n            </div>"
);

fs.writeFileSync('src/components/TileCanvas/components/WallNodesOverlay.tsx', code);
