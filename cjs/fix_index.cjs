const fs = require('fs');

let code = fs.readFileSync('src/components/TileCanvas/index.tsx', 'utf8');

code = code.replace(
  "const cadCoords = screenToWall(px, py);",
  "const cadCoords = screenToWall(e.clientX, e.clientY);"
);

fs.writeFileSync('src/components/TileCanvas/index.tsx', code);
