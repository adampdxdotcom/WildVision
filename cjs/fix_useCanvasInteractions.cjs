const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

if (!code.includes("import { broadcastLock, broadcastUnlock }")) {
  code = code.replace(
    "import { useSubAreaDrag } from './dragHandlers/useSubAreaDrag';",
    "import { useSubAreaDrag } from './dragHandlers/useSubAreaDrag';\nimport { broadcastLock, broadcastUnlock } from '../../../utils/syncBroadcaster';\nimport { useAuthStore } from '../../../store/useAuthStore';"
  );
}

// Add state reads:
if (!code.includes("const lockedElements = useAppStore")) {
  code = code.replace(
    "const activeCustomPattern = useAppStore(state => state.activeCustomPattern);",
    "const activeCustomPattern = useAppStore(state => state.activeCustomPattern);\n  const lockedElements = useAppStore(state => state.lockedElements);\n  const acquireLock = useAppStore(state => state.acquireLock);\n  const releaseLock = useAppStore(state => state.releaseLock);\n  const user = useAuthStore(state => state.user);"
  );
}

// Replace setDraggingVertexIndex usage in the hook with a wrapped version.
// First, find where we return it:
code = code.replace(
    "    setDraggingVertexIndex,\n    setDraggingSubAreaVertexIndex,",
    "    setDraggingVertexIndex: handleSetDraggingVertexIndex,\n    setDraggingSubAreaVertexIndex: handleSetDraggingSubAreaVertexIndex,"
);

// Define handleSetDraggingVertexIndex inside the hook:
const wrappedSetters = `
  const handleSetDraggingVertexIndex = (index: number | null) => {
    if (index !== null) {
      const elementId = \`wall_node_\${index}\`;
      if (lockedElements[elementId] && lockedElements[elementId] !== user?.id) return;
      if (user) {
        acquireLock(elementId, user.id);
        broadcastLock(elementId, user.id);
      }
    } else {
      if (draggingVertexIndex !== null && user) {
        const elementId = \`wall_node_\${draggingVertexIndex}\`;
        releaseLock(elementId);
        broadcastUnlock(elementId);
      }
    }
    setDraggingVertexIndex(index);
  };

  const handleSetDraggingSubAreaVertexIndex = (index: number | null) => {
    if (index !== null && activeSubAreaId) {
      const elementId = \`subarea_node_\${activeSubAreaId}_\${index}\`;
      if (lockedElements[elementId] && lockedElements[elementId] !== user?.id) return;
      if (user) {
        acquireLock(elementId, user.id);
        broadcastLock(elementId, user.id);
      }
    } else {
      if (draggingSubAreaVertexIndex !== null && activeSubAreaId && user) {
        const elementId = \`subarea_node_\${activeSubAreaId}_\${draggingSubAreaVertexIndex}\`;
        releaseLock(elementId);
        broadcastUnlock(elementId);
      }
    }
    setDraggingSubAreaVertexIndex(index);
  };

  const handleSetDraggingSubAreaId = (id: string | null) => {
    if (id !== null) {
      const elementId = \`subarea_\${id}\`;
      if (lockedElements[elementId] && lockedElements[elementId] !== user?.id) return;
      if (user) {
        acquireLock(elementId, user.id);
        broadcastLock(elementId, user.id);
      }
    } else {
      if (draggingSubAreaId !== null && user) {
        const elementId = \`subarea_\${draggingSubAreaId}\`;
        releaseLock(elementId);
        broadcastUnlock(elementId);
      }
    }
    setDraggingSubAreaId(id);
  };
`;

code = code.replace(
  "const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);",
  "const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);\n" + wrappedSetters
);

// We need to replace internal usages of setDraggingSubAreaId to handleSetDraggingSubAreaId
code = code.replace(/setDraggingSubAreaId\(/g, "handleSetDraggingSubAreaId(");
// But wait, our wrappedSetters defines it after it might be used!
// Let's place it correctly.

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts.tmp', code);
