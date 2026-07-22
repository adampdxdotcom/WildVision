const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// Replace line 681: const { wx, wy } = screenToWall(clientX, clientY); -> // removed duplicate
content = content.replace(/const { wx, wy } = screenToWall\(clientX, clientY\);\s*\n\s*if \(activeSubAreaId\) \{/, 'if (activeSubAreaId) {');

// Replace line 716: const clickedSa = findBestSubArea(subAreas, wx, wy); -> // removed duplicate
content = content.replace(/const clickedSa = findBestSubArea\(subAreas, wx, wy\);\s*\n\s*if \(clickedSa\) \{/, 'if (clickedSa) {');

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced successfully');
