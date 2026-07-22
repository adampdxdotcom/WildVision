const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// The garbage is between the replaced block and if (activeTool === 'extrude')
const searchRegex = /    if \(activeTool === 'pin'\) \{\n      const handled = handlePinClick\(clientX, clientY\);\n      if \(handled\) return;\n    \}\s+break;\n        \}\n      \}\n\n      if \(clickedPinCentroid\) \{\n        if \(clickedPinIsActive\) \{\n          setAnchoredRegionCenter\(null\);\n        \} else \{\n          setAnchoredRegionCenter\(clickedPinCentroid\);\n        \}\n        setIsDragging\(false\);\n        return;\n      \}\n    \}\n/g;

content = content.replace(searchRegex, "    if (activeTool === 'pin') {\n      const handled = handlePinClick(clientX, clientY);\n      if (handled) return;\n    }\n");

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
