const fs = require('fs');

let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

// 1. Add new imports
const importRegex = /import \{ usePaintModeHandler \}/;
const newImports = `import { getDistanceToSegment, getRegionCentroid } from '../utils/interactionHelpers';\nimport { useExtrudeHandler } from './dragHandlers/useExtrudeHandler';\nimport { useFillHandler } from './dragHandlers/useFillHandler';\nimport { usePaintModeHandler }`;
content = content.replace(importRegex, newImports);

// Remove the inline `getRegionCentroid` definition (if it's there)
const centroidRegex = /function getRegionCentroid\([\s\S]*?\}\n\n/;
content = content.replace(centroidRegex, '');

// Remove the inline `getDistanceToSegment` definition (at the bottom)
const distanceRegex = /function getDistanceToSegment\([\s\S]*?\}\n/;
content = content.replace(distanceRegex, '');

// 2. Replace the fill handler
const fillRegex = /    if \(activeTool === 'fill'\) \{\n      const \{ wx, wy \} = screenToWall\(clientX, clientY\);\n      const regions = sliceWallIntoRegions\(wallVertices, foldLines\);\n[\s\S]*?      \}\n      setIsDragging\(false\);\n      return;\n    \}/;

const fillReplacement = `    if (activeTool === 'fill') {
      const { wx, wy } = screenToWall(clientX, clientY);
      const handled = handleFillClick(wx, wy);
      if (handled) return;
    }`;

content = content.replace(fillRegex, fillReplacement);

// 3. Replace the extrude start handler
const extrudeStartRegex = /    if \(activeTool === 'extrude'\) \{\n      if \(hoveredSegment && wallVertices && hoveredSegment\.type === 'wall'\) \{\n        const \{ indexA, indexB \} = hoveredSegment;\n[\s\S]*?      \}\n    \}/;

const extrudeStartReplacement = `    if (activeTool === 'extrude') {
      const handled = handleExtrudeStart(clientX, clientY, hoveredSegment);
      if (handled) return;
    }`;

content = content.replace(extrudeStartRegex, extrudeStartReplacement);


// 4. Replace the extrude move handler
// Looking for `if (activeTool === 'extrude') {` inside `if (draggingSegment && wallVertices && !isFreeform) {` ?
// Wait, in `handleDragMove` earlier I saw:
const extrudeMoveRegex = /        if \(activeTool === 'extrude'\) \{\n          const n = wallVertices\.length;\n          const idxParentA = \(draggingSegment\.indexA - 1 \+ n\) % n;[\s\S]*?          \}\n        \}/;

const extrudeMoveReplacement = `        if (activeTool === 'extrude') {
          // Handled externally inside the useExtrudeHandler hook, but we need to run it instead of inline.
          // Wait, actually, the isPositionValid logic is there. We need to pass the proposed X/Y and the handler will override finalAX/finalAY.
          // Let's check how we structured it. 
        }`;
// Wait, my `handleExtrudeMove` in `useExtrudeHandler` handles the ENTIRE `if (draggingSegment && wallVertices)` block!
// Wait! Let's check my `useExtrudeHandler` again. 
