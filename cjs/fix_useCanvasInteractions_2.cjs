const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts.tmp', 'utf8');

// Fix the useState for draggingSubAreaId
code = code.replace(
  "const [draggingSubAreaId, handleSetDraggingSubAreaId] = useState<string | null>(null);",
  "const [draggingSubAreaId, setDraggingSubAreaId] = useState<string | null>(null);"
);

// We need to move wrappedSetters down, below all the useState declarations, because it uses them!
// And we need to make sure handleSetDraggingSubAreaId is used inside handleDragStart and handleDragMove.

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', code);
