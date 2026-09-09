const fs = require('fs');
const path = 'src/components/TileCanvas3D/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /holeConfigByPlane\[hitPlane\]\.push\(\{/g;
const replacement = `console.log('Pushing hole to', hitPlane, { xLeft: hX - saD3Width / 2, xRight: hX + saD3Width / 2, yBottom: hY - saD3Height / 2, yTop: hY + saD3Height / 2 });
                  holeConfigByPlane[hitPlane].push({`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
