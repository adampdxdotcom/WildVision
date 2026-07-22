const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/index.tsx', 'utf8');

code = code.replace(
  "import { broadcastCursor } from '../../hooks/useMultiplayer';",
  "import { broadcastCursor } from '../../utils/syncBroadcaster';"
);

fs.writeFileSync('src/components/TileCanvas/index.tsx', code);
