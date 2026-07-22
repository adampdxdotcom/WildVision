const fs = require('fs');
const content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

let newContent = content;

// 2. Update onPointerDown
const regexOnPointerDown = /if \(e\.button === 0\) \{\n\s*\/\/ only primary click\n\s*if \(colorPattern === 'paint'\) \{\n\s*handleDragStart\(e\.clientX, e\.clientY, e\.shiftKey\);\n\s*return;\n\s*\}\n\s*setIsDrafting\(true\);\n\s*setIsDragging\(true\);\n\s*handleDragStart\(e\.clientX, e\.clientY, e\.shiftKey\);\n\s*\}/;

const replacementOnPointerDown = `if (e.button === 0) {
      // only primary click
      const isAnyPaintActive = colorPattern === 'paint' || subAreas.some(sa => sa.colorPattern === 'paint');
      if (!isAnyPaintActive) {
        setIsDrafting(true);
        setIsDragging(true);
      }
      handleDragStart(e.clientX, e.clientY, e.shiftKey);
    }`;

newContent = newContent.replace(regexOnPointerDown, replacementOnPointerDown);

// 3. Update the actualDragging Effect
const regexEffect = /useEffect\(\(\) => \{\n\s*if \(colorPattern === 'paint'\) \{\n\s*setIsDrafting\(false\);\n\s*\} else \{\n\s*setIsDrafting\(actualDragging\);\n\s*\}\n\s*\}, \[actualDragging, colorPattern, setIsDrafting\]\);/;

const replacementEffect = `useEffect(() => {
    const isAnyPaintActive = colorPattern === 'paint' || subAreas.some(sa => sa.colorPattern === 'paint');
    if (!isAnyPaintActive) {
      setIsDrafting(actualDragging);
    } else {
      setIsDrafting(false);
    }
  }, [actualDragging, colorPattern, subAreas, setIsDrafting]);`;

newContent = newContent.replace(regexEffect, replacementEffect);

// 4. Verify handleDragStart interception
const regexDragStart = /const handleDragStart = \([\s\S]*?const isPainting = state\.colorPattern === 'paint' \|\| state\.subAreas\.some\(sa => sa\.colorPattern === 'paint'\);\n\s*if \(isPainting\) \{\n\s*setIsDragging\(true\);\n\s*handleDragPaint\(clientX, clientY, isShiftPressed\);\n\s*return;\n\s*\}/;

const replacementDragStart = `const handleDragStart = (clientX: number, clientY: number, isShiftPressed: boolean = false) => {
    const state = useAppStore.getState();
    const { wx, wy } = screenToWall(clientX, clientY);
    const clickedSa = findBestSubArea(state.subAreas, wx, wy);
    
    let isClickingPaintableTarget = false;
    if (clickedSa && clickedSa.colorPattern === 'paint') {
      isClickingPaintableTarget = true;
    } else if (!clickedSa && state.colorPattern === 'paint') {
      isClickingPaintableTarget = true;
    }

    if (isClickingPaintableTarget) {
      setIsDragging(true);
      handleDragPaint(clientX, clientY, isShiftPressed);
      return;
    }`;

newContent = newContent.replace(regexDragStart, replacementDragStart);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', newContent);
console.log('Replaced successfully');
