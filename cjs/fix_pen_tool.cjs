const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// Import
content = content.replace(
  "import { useExtrudeHandler } from './dragHandlers/useExtrudeHandler';",
  "import { useExtrudeHandler } from './dragHandlers/useExtrudeHandler';\nimport { usePenToolHandler } from './dragHandlers/usePenToolHandler';"
);

// Remove state
content = content.replace(/  const \[hoverLineIndex, setHoverLineIndex\] = useState<number \| null>\(null\);\n  const \[hoverSplitPoint, setHoverSplitPoint\] = useState<\{ x: number; y: number \} \| null>\(null\);\n/, '');

// Init usePenToolHandler
const initStr = `
  const {
    hoverLineIndex,
    hoverSplitPoint,
    setHoverLineIndex,
    setHoverSplitPoint,
    handlePenHover,
    handlePenClick
  } = usePenToolHandler({
    wallVertices,
    setWallVertices,
    subAreas,
    setSubAreas,
    activeSubAreaId,
    setActiveSubAreaId,
    scale,
    unit,
    activeTool,
    foldLines,
    setFoldLines,
    stitches,
    setStitches,
    setActiveWallExtensionId,
    screenToWall,
    setActiveCursor: (c) => setActiveCursor(c)
  });
`;

content = content.replace(
  "  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({",
  initStr + "\n  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({"
);

// Replace hover logic in handleDragMove
const hoverRegex = /      if \(activeTool === 'pen' \|\| activeTool === 'pen-arch'\) \{\n        const hoverMatch = findPenHoverMatch[\s\S]*?        \} else \{\n          setHoverLineIndex\(null\);\n          setHoverSplitPoint\(null\);\n        \}\n      \}/;

const hoverReplacement = `      if (activeTool === 'pen' || activeTool === 'pen-arch') {
        handlePenHover(clientX, clientY);
      }`;

content = content.replace(hoverRegex, hoverReplacement);

// Replace click logic in handleDragStart
const clickRegex = /    if \(\(activeTool === 'pen' \|\| activeTool === 'pen-arch'\) && hoverLineIndex !== null && hoverSplitPoint\) \{[\s\S]*?        return;\n      \}\n    \}/;

const clickReplacement = `    if ((activeTool === 'pen' || activeTool === 'pen-arch') && hoverSplitPoint) {
       const handled = handlePenClick(clientX, clientY);
       if (handled) {
         setActiveCursor('default');
         return;
       }
    }`;

content = content.replace(clickRegex, clickReplacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed pen tool');
