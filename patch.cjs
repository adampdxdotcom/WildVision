const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/TileCanvas3D/ClayModelObject.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'offsetY: isWallLocked ? -center.y : -min.y',
  'offsetY: isWallLocked ? (-min.y - (targetH3D / 2) / factor) : -min.y'
);

fs.writeFileSync(filePath, content);
console.log('patched');
