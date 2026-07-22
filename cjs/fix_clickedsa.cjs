const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

content = content.replace(/    if \(clickedSa\) \{/, `    const clickedSa = findBestSubArea(subAreas, wx, wy);
    if (clickedSa) {`);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed clickedSa');
