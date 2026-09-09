const fs = require('fs');
const path = 'src/components/TileCanvas3D/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const createWallShape = /g;
const replacement = `console.log('Final holeConfigByPlane:', JSON.stringify(holeConfigByPlane));\n    const createWallShape = `;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
