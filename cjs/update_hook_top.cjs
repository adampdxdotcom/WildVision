const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexActualDragging = /  const actualDragging = !!\(/;
const replacementActualDragging = `  const activeSa = activeSubAreaId ? subAreas.find(s => s.id === activeSubAreaId) : null;
  const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint');

  const actualDragging = !!(`;

content = content.replace(regexActualDragging, replacementActualDragging);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced top of hook');
