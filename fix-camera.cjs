const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

code = code.replace(
  "const frustumHeight = 2 * distance * Math.tan((savedCameraFov / 2) * (Math.PI / 180));\n        const calculatedZoom = Math.max(1, size.height / frustumHeight);",
  "const optimalFrustumHeight = 6;\n        const calculatedZoom = Math.max(1, size.height / optimalFrustumHeight);"
);

fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
