const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

// 1. Add PerspectiveCamera, OrthographicCamera to import
code = code.replace(
  "import { OrbitControls, Html, Environment } from '@react-three/drei';",
  "import { OrbitControls, Html, Environment, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';"
);

// 2. We need to disable rotation and panning when orthoLock is active
code = code.replace(
  "<OrbitControls",
  "<OrbitControls\n            enableRotate={!orthoLock}\n            enablePan={!orthoLock}"
);

fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
