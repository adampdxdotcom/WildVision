const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// 1. Import
content = content.replace(
  "import { useExtrudeHandler } from './dragHandlers/useExtrudeHandler';",
  "import { useExtrudeHandler } from './dragHandlers/useExtrudeHandler';\nimport { useSegmentDragHandler } from './dragHandlers/useSegmentDragHandler';"
);

// 2. Initialize
const initHookStr = `  const { handleSegmentDragMove } = useSegmentDragHandler({
    wallVertices,
    setWallVertices,
    unit,
    scale,
    dragStart,
    draggingSegment,
    lastMouseScreenRef
  });\n\n`;

content = content.replace(
  "  const lastMouseScreenRef = useRef<{ x: number; y: number } | null>(null);\n\n",
  "  const lastMouseScreenRef = useRef<{ x: number; y: number } | null>(null);\n\n" + initHookStr
);

// 3. Replace handleDragMove logic
const targetRegex = /    if \(draggingSegment && wallVertices\) \{\n      const origA = draggingSegment\.origA;[\s\S]*?lastMouseScreenRef\.current = \{ x: clientX, y: clientY \};\n      return;\n    \}/;

const targetReplacement = `    if (draggingSegment && wallVertices) {
      const handled = handleSegmentDragMove(clientX, clientY, isFreeform);
      if (handled) return;
    }`;

content = content.replace(targetRegex, targetReplacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed segment drag');
