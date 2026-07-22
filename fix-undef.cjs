const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas3D/useDragController.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "-(roomDimensions.depth / 2) + (activeObj.metadata.dimensions[2] / 2)",
  "-(roomDimensions.depth / 2) + ((activeObj.metadata.dimensions?.[2] || 24) / 2)"
);
content = content.replace(
  "-(roomDimensions.depth / 2) + (activeObj.metadata.dimensions[2] / 2)",
  "-(roomDimensions.depth / 2) + ((activeObj.metadata.dimensions?.[2] || 24) / 2)"
);

fs.writeFileSync(file, content);
