const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

content = content.replace(
  "import { usePenToolHandler } from './dragHandlers/usePenToolHandler';",
  "import { usePenToolHandler } from './dragHandlers/usePenToolHandler';\nimport { useSelectionHandler } from './dragHandlers/useSelectionHandler';"
);

const initHookStr = `
  const { handleSelectionClick } = useSelectionHandler({
    wallVertices: wallVertices || [],
    subAreas,
    activeSubAreaId,
    setActiveEditingSegmentId,
    setActiveEditingSegmentSubAreaId,
    setDraggingSegment,
    setDragStart,
    setIsDragging,
    setActiveCursor: (c) => setActiveCursor(c),
    wallToScreen,
    containerRef,
    lastMouseScreenRef
  });
`;

content = content.replace(
  "  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({",
  initHookStr + "\n  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({"
);

// Look for:
//     if (activeTool === 'select') {
// ...
//         if (dist < 22) {
//           setActiveEditingSegmentId(i);
//           if (setActiveEditingSegmentSubAreaId) {
//             setActiveEditingSegmentSubAreaId(null);
//           }
//           hitSegment = true;
//           setIsDragging(false);
//           return;
//         }
//       }
//     }

const targetRegex = /    if \(activeTool === 'select'\) \{[\s\S]*?            setIsDragging\(false\);\n            return;\n          \}\n        \}\n      \}\n    \}/;

const targetReplacement = `    if (activeTool === 'select') {
      hitSegment = handleSelectionClick(clientX, clientY, hoveredSegment);
      if (hitSegment) return;
    }`;

content = content.replace(targetRegex, targetReplacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed selection tool');
