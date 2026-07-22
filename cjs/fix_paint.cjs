const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// Update useEffect for actualDragging
content = content.replace(/const isAnyPaintActive = colorPattern === 'paint' \|\| subAreas\.some\(sa => sa\.colorPattern === 'paint'\);\n\s*if \(!isAnyPaintActive\) \{/, `const activeSa = activeSubAreaId ? subAreas.find(s => s.id === activeSubAreaId) : null;
    const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint');
    if (!isActiveContextPainting) {`);
    
// Update onPointerDown
content = content.replace(/const isAnyPaintActive = colorPattern === 'paint' \|\| subAreas\.some\(sa => sa\.colorPattern === 'paint'\);\n\s*if \(!isAnyPaintActive\) \{/, `const activeSa = activeSubAreaId ? subAreas.find(s => s.id === activeSubAreaId) : null;
      const isActiveContextPainting = (activeSa && activeSa.colorPattern === 'paint') || (!activeSa && colorPattern === 'paint');
      if (!isActiveContextPainting) {`);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced effectively');
