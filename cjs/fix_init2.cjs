const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// remove duplicate lastMouseScreenRef
content = content.replace("  const lastMouseScreenRef = useRef<{ x: number; y: number } | null>(null);\n\n  const { handleExtrudeStart", "  const { handleExtrudeStart");

const initExtrudeRegex = /  const \{ handleExtrudeStart, handleExtrudeMove \} = useExtrudeHandler\(\{[\s\S]*?    scale,\n  \}\);\n/;

content = content.replace(initExtrudeRegex, `  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({
    wallVertices,
    setWallVertices,
    foldLines,
    setFoldLines,
    stitches,
    setStitches,
    setDraggingSegment,
    lastMouseScreenRef,
    setDragStart,
    setIsDragging,
    setActiveCursor,
    draggingSegment,
    dragStart,
    scale,
  });
`);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed extrude init');
