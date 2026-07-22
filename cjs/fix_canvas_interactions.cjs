const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// Update drafting useEffect
content = content.replace(
  "    if (!isActiveContextPainting) {",
  "    if (!(isActiveContextPainting && activeTool === 'paint')) {"
);

content = content.replace(
  "  }, [actualDragging, isActiveContextPainting, setIsDrafting]);",
  "  }, [actualDragging, isActiveContextPainting, activeTool, setIsDrafting]);"
);

// Update cursor effect
content = content.replace(
  "    if (isActiveContextPainting) {\\n      setActiveCursor('crosshair');\\n      return;\\n    }",
  "    if (isActiveContextPainting && activeTool === 'paint') {\\n      setActiveCursor('crosshair');\\n      return;\\n    }"
);

// Update handleDragStart
content = content.replace(
  "    if (isActiveContextPainting) {\\n      const handled = handlePaintStart",
  "    if (isActiveContextPainting && activeTool === 'paint') {\\n      const handled = handlePaintStart"
);

// Update handleDragMove
content = content.replace(
  "    if (isActiveContextPainting) {\\n      if (isDragging) {",
  "    if (isActiveContextPainting && activeTool === 'paint') {\\n      if (isDragging) {"
);

// Update onPointerDown
content = content.replace(
  "      const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint');\\n      if (!isActiveContextPainting) {\\n        setIsDrafting(true);\\n        setIsDragging(true);\\n      }",
  "      const isPaintingNow = ((activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint')) && activeTool === 'paint';\\n      if (!isPaintingNow) {\\n        setIsDrafting(true);\\n        setIsDragging(true);\\n      }"
);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed interactions');
