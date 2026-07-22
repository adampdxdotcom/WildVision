const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regex = /import \{ usePaintModeHandler \} from '\.\/dragHandlers\/usePaintModeHandler';/;
const replacement = `import { getDistanceToSegment, getRegionCentroid } from '../utils/interactionHelpers';
import { useExtrudeHandler } from './dragHandlers/useExtrudeHandler';
import { useFillHandler } from './dragHandlers/useFillHandler';
import { usePaintModeHandler } from './dragHandlers/usePaintModeHandler';`;

content = content.replace(regex, replacement);

const centroidRegex = /function getRegionCentroid\([\s\S]*?\}\n\n/;
content = content.replace(centroidRegex, '');

const distanceRegex = /function getDistanceToSegment\([\s\S]*?\}\n/;
content = content.replace(distanceRegex, '');

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Imports fixed');
