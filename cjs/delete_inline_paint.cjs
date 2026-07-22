const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// 1. Delete handleDragPaint
const regexPaint = /  const handleDragPaint = \([\s\S]*?    return false;\n  \};\n\n/m;
content = content.replace(regexPaint, "");

// 2. Rewrite handleDragStart paint section
const regexStart = /    const activeSa = activeSubAreaId \? state\.subAreas\.find\(s => s\.id === activeSubAreaId\) : null;\n    const isActiveContextPainting = \(activeSa && activeSa\.colorPattern === 'paint'\) || \(!activeSa && state\.colorPattern === 'paint'\);\n\n    if \(isActiveContextPainting\) \{\n      const clickedSa = findBestSubArea\(state\.subAreas, wx, wy\);\n      const clickedSaId = clickedSa \? clickedSa\.id : null;\n      const currentSaId = activeSubAreaId \|\| null;\n      \n      \/\/ If user clicked a different context, switch to it and DO NOT paint or drag\n      if \(clickedSaId !== currentSaId\) \{\n        setActiveSubAreaId\(clickedSaId\);\n        return; \n      \}\n\n      const hit = handleDragPaint\(clientX, clientY, isShiftPressed\);\n      if \(hit\) \{\n        setIsDragging\(true\);\n      \}\n      return; \/\/ CRITICAL: Always return here so it never falls through to wall panning or segment dragging\.\n    \}/m;

const replacementStart = `    if (isActiveContextPainting) {
      const handled = handlePaintStart(clientX, clientY, isShiftPressed);
      if (handled) {
        setIsDragging(true);
        return;
      }
    }`;
content = content.replace(regexStart, replacementStart);

// 3. Rewrite handleDragMove paint section
const regexMove = /    const activeSa = activeSubAreaId \? state\.subAreas\.find\(s => s\.id === activeSubAreaId\) : null;\n    const isActiveContextPainting = \(activeSa && activeSa\.colorPattern === 'paint'\) || \(!activeSa && state\.colorPattern === 'paint'\);\n\n    if \(isPanningCanvas\) \{\n      handlePanMove\(clientX, clientY\);\n      return;\n    \}\n\n    if \(isActiveContextPainting\) \{\n      if \(isDragging\) \{\n        handleDragPaint\(clientX, clientY, isOrtho\);\n      \}\n      return; \/\/ CRITICAL: Always return here\. Never fall through to handleSubAreaDrag or setOffsetX\.\n    \}/m;

const replacementMove = `    if (isPanningCanvas) {
      handlePanMove(clientX, clientY);
      return;
    }

    if (isActiveContextPainting) {
      if (isDragging) {
        handlePaintMove(clientX, clientY, isOrtho);
      }
      return; // CRITICAL: Always return here. Never fall through to handleSubAreaDrag or setOffsetX.
    }`;
content = content.replace(regexMove, replacementMove);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Deleted inline paint logic');
