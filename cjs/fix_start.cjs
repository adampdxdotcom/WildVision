const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexStart = /    if \(isActiveContextPainting\) \{\n      const hit = handleDragPaint\(clientX, clientY, isShiftPressed\);\n      if \(hit\) \{\n        setIsDragging\(true\);\n        return;\n      \}\n    \}/;

const replacementStart = `    if (isActiveContextPainting) {
      const clickedSa = findBestSubArea(subAreas, wx, wy);
      
      // If user clicked a different context, switch to it and DO NOT paint or drag
      if (clickedSa?.id !== activeSubAreaId) {
        setActiveSubAreaId(clickedSa ? clickedSa.id : null);
        return; 
      }

      const hit = handleDragPaint(clientX, clientY, isShiftPressed);
      if (hit) {
        setIsDragging(true);
      }
      return; // CRITICAL: Always return here so it never falls through to wall panning or segment dragging.
    }`;

content = content.replace(regexStart, replacementStart);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced drag start');
