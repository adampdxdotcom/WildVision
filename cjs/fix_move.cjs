const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexMove = /    if \(isActiveContextPainting && isDragging && !draggingSubAreaId && !draggingExtensionId && draggingVertexIndex === null && draggingSubAreaVertexIndex === null && !draggingSegment\) \{\n      const hit = handleDragPaint\(clientX, clientY, isOrtho\);\n      if \(hit\) \{\n        return;\n      \}\n    \}\n\n    if \(isPanningCanvas\) \{\n      handlePanMove\(clientX, clientY\);\n      return;\n    \}/;

const replacementMove = `    if (isPanningCanvas) {
      handlePanMove(clientX, clientY);
      return;
    }

    if (isActiveContextPainting) {
      if (isDragging) {
        handleDragPaint(clientX, clientY, isOrtho);
      }
      return; // CRITICAL: Always return here. Never fall through to handleSubAreaDrag or setOffsetX.
    }`;

content = content.replace(regexMove, replacementMove);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced drag move');
