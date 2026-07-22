const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

content = content.replace(
  "import { useSelectionHandler } from './dragHandlers/useSelectionHandler';",
  "import { useSelectionHandler } from './dragHandlers/useSelectionHandler';\nimport { useHoverHandler } from './dragHandlers/useHoverHandler';"
);

const initHoverHandler = `
  const { handleHoverCheck } = useHoverHandler({
    wallVertices: wallVertices || [],
    foldLines,
    wallToScreen,
    containerRef,
    setHoveredSegment,
    setActiveCursor: (c) => setActiveCursor(c)
  });
`;

content = content.replace(
  "  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({",
  initHoverHandler + "\n  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({"
);

// We want to replace the massive block inside handleDragMove
// From:
//       if ((activeTool === 'select' || activeTool === 'extrude') && wallVertices && wallVertices.length >= 3) {
// ...
//         if (hoverDimension) {
//           setActiveCursor('pointer');
//           return;
//         }
//       }
const targetRegex = /      if \(\(activeTool === 'select' \|\| activeTool === 'extrude'\) && wallVertices && wallVertices\.length >= 3\) \{[\s\S]*?        if \(hoverDimension\) \{\n          setActiveCursor\('pointer'\);\n          return;\n        \}\n      \}/;

const targetReplacement = `      if (activeTool === 'select' || activeTool === 'extrude') {
        const isHovering = handleHoverCheck(clientX, clientY, activeTool);
        if (isHovering) return;
      }`;

content = content.replace(targetRegex, targetReplacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
