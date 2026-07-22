const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// The block to remove inside handleDragMove:
const regex = /        if \(activeTool === 'extrude'\) \{\n          const n = wallVertices\.length;\n          const idxParentA = \(draggingSegment\.indexA - 1 \+ n\) % n;[\s\S]*?          \}\n        \}/;

content = content.replace(regex, "");

// Replace the extrude start block:
const startRegex = /    if \(activeTool === 'extrude'\) \{\n      if \(hoveredSegment && wallVertices && hoveredSegment\.type === 'wall'\) \{\n        const \{ indexA, indexB \} = hoveredSegment;[\s\S]*?      \}\n    \}/;
const startReplacement = `    if (activeTool === 'extrude') {
      const handled = handleExtrudeStart(clientX, clientY, hoveredSegment);
      if (handled) return;
    }`;
content = content.replace(startRegex, startReplacement);


// Inject extrude move at the top of draggingSegment block
const moveRegex = /    if \(draggingSegment && wallVertices\) \{/;
const moveReplacement = `    if (activeTool === 'extrude' && draggingSegment) {
      const handled = handleExtrudeMove(clientX, clientY, isFreeform);
      if (handled) return;
    }

    if (draggingSegment && wallVertices) {`;
content = content.replace(moveRegex, moveReplacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Extrude refactored');
