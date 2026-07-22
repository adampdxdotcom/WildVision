const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/dragHandlers/useSelectionHandler.ts', 'utf8');

content = content.replace(
  "  containerRef: React.RefObject<HTMLDivElement>;",
  "  containerRef: React.RefObject<HTMLDivElement>;\n  lastMouseScreenRef: React.MutableRefObject<{ x: number; y: number } | null>;"
);

content = content.replace(
  "  containerRef\n}: UseSelectionHandlerProps",
  "  containerRef,\n  lastMouseScreenRef\n}: UseSelectionHandlerProps"
);

content = content.replace(
  "        setDraggingSegment({",
  "        lastMouseScreenRef.current = { x: clientX, y: clientY };\n        setDraggingSegment({"
);

fs.writeFileSync('src/components/TileCanvas/hooks/dragHandlers/useSelectionHandler.ts', content);
