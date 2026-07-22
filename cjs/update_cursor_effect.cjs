const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexCursorEffect = /  useEffect\(\(\) => \{\n    if \(isPanningCanvas\) \{[\s\S]*?    \} else \{\n      setActiveCursor\(isBgUnlocked && backgroundImage \? 'grab' : 'default'\);\n    \}\n  \}, \[isPanningCanvas, isBgUnlocked, backgroundImage, activeTool\]\);/;

const replacementCursorEffect = `  useEffect(() => {
    if (isActiveContextPainting) {
      setActiveCursor('crosshair');
      return;
    }
    if (isPanningCanvas) {
      setActiveCursor('grabbing');
    } else if (activeTool === 'pen' || activeTool === 'pen-arch') {
      setActiveCursor('crosshair');
    } else if (activeTool === 'eraser') {
      setActiveCursor('cell');
    } else if (activeTool === 'marquee') {
      setActiveCursor('crosshair');
    } else if (activeTool === 'fill') {
      setActiveCursor('copy');
    } else {
      setActiveCursor(isBgUnlocked && backgroundImage ? 'grab' : 'default');
    }
  }, [isPanningCanvas, isBgUnlocked, backgroundImage, activeTool, isActiveContextPainting]);`;

content = content.replace(regexCursorEffect, replacementCursorEffect);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced cursor effect');
