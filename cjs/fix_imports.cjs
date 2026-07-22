const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

content = `import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { getSubAreaVertices, isPointInPolygon, sliceWallIntoRegions, doLineSegmentsIntersect, getTessellatedPath } from '../../../utils/geometry';
` + content;

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Fixed imports');
