const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/dragHandlers/usePinToolHandler.ts', 'utf8');

content = content.replace(
  "import { sliceWallIntoRegions, getRegionCentroid } from '../../utils/interactionHelpers';",
  "import { getRegionCentroid } from '../../utils/interactionHelpers';\nimport { sliceWallIntoRegions } from '../../../../utils/geometry';"
);

fs.writeFileSync('src/components/TileCanvas/hooks/dragHandlers/usePinToolHandler.ts', content);
