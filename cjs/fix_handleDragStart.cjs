const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexStart = /    if \(isActiveContextPainting\) \{\n      const clickedSa = findBestSubArea\(subAreas, wx, wy\);\n      \n      \/\/ If user clicked a different context, switch to it and DO NOT paint or drag\n      if \(clickedSa\?\.id !== activeSubAreaId\) \{\n        setActiveSubAreaId\(clickedSa \? clickedSa\.id : null\);\n        return; \n      \}\n\n      const hit = handleDragPaint\(clientX, clientY, isShiftPressed\);\n      if \(hit\) \{\n        setIsDragging\(true\);\n      \}\n      return; \/\/ CRITICAL: Always return here so it never falls through to wall panning or segment dragging\.\n    \}/;

const replacementStart = `    if (isActiveContextPainting) {
      const clickedSa = findBestSubArea(state.subAreas, wx, wy);
      const clickedSaId = clickedSa ? clickedSa.id : null;
      const currentSaId = activeSubAreaId || null;
      
      // If user clicked a different context, switch to it and DO NOT paint or drag
      if (clickedSaId !== currentSaId) {
        setActiveSubAreaId(clickedSaId);
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
console.log('Replaced handleDragStart');
