const fs = require('fs');
const content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regex = /const isPainting = state\.colorPattern === 'paint' \|\| state\.subAreas\.some\(sa => sa\.colorPattern === 'paint'\);\n\s*if \(isPainting\) \{\n\s*if \(isDragging\) \{\n\s*handleDragPaint\(clientX, clientY, isOrtho\);\n\s*\}\n\s*return;\n\s*\}/;

const replacement = `const { wx, wy } = screenToWall(clientX, clientY);
    const clickedSa = findBestSubArea(state.subAreas, wx, wy);
    
    let isPaintingMove = false;
    if (isDragging && !draggingSubAreaId && !draggingExtensionId && draggingVertexIndex === null && draggingSubAreaVertexIndex === null && !draggingSegment) {
      if (clickedSa && clickedSa.colorPattern === 'paint') {
        isPaintingMove = true;
      } else if (!clickedSa && state.colorPattern === 'paint') {
        isPaintingMove = true;
      }
    }

    if (isPaintingMove) {
      handleDragPaint(clientX, clientY, isOrtho);
      return;
    }`;

newContent = content.replace(regex, replacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', newContent);
console.log('Replaced successfully');
