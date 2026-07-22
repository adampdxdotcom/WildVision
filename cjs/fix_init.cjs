const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regex = /  const \{ isActiveContextPainting, handlePaintStart, handlePaintMove \} = usePaintModeHandler\(\{[\s\S]*?  \}\);/;

const replacement = `  const { isActiveContextPainting, handlePaintStart, handlePaintMove } = usePaintModeHandler({
    colorPattern,
    subAreas,
    activeSubAreaId,
    setActiveSubAreaId,
    subAreaTileMap: subAreaTileMap || {},
    screenToWall,
  });

  const { handleFillClick } = useFillHandler({
    wallVertices: wallVertices || [],
    foldLines,
    subAreas,
    setSubAreas,
    setActiveSubAreaId,
    setActiveTool,
    setIsDragging,
    unit
  });

  const lastMouseScreenRef = useRef<{ x: number; y: number } | null>(null);

  const { handleExtrudeStart, handleExtrudeMove } = useExtrudeHandler({
    wallVertices,
    setWallVertices,
    foldLines,
    setFoldLines,
    stitches,
    setStitches,
    setDraggingSegment: (val: any) => setDraggingSegment(val),
    lastMouseScreenRef,
    setDragStart,
    setIsDragging,
    setActiveCursor,
    draggingSegment: null, // this will be tricky, wait!
    dragStart,
    scale,
  });
`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Hooks initialized');
