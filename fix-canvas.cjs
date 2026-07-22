const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

const regex = /<Canvas\s+camera={{[\s\S]*?}}/g;
code = code.replace(regex, '<Canvas');

fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
