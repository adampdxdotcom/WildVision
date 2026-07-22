const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/dragHandlers/useHoverHandler.ts', 'utf8');
content = "import React from 'react';\n" + content;
fs.writeFileSync('src/components/TileCanvas/hooks/dragHandlers/useHoverHandler.ts', content);
