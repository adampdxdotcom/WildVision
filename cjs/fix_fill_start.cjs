const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const fillRegex = /    if \(activeTool === 'fill'\) \{\n      const \{ wx, wy \} = screenToWall\(clientX, clientY\);\n      const regions = sliceWallIntoRegions\(wallVertices, foldLines\);[\s\S]*?      \}\n      setIsDragging\(false\);\n      return;\n    \}/;

const fillReplacement = `    if (activeTool === 'fill') {
      const { wx, wy } = screenToWall(clientX, clientY);
      const handled = handleFillClick(wx, wy);
      if (handled) return;
    }`;

content = content.replace(fillRegex, fillReplacement);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fill refactored');
