const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/components/SubAreaNodesOverlay.tsx', 'utf8');

if (!code.includes("import { useAppStore }")) {
  code = code.replace(
    "import React from 'react';",
    "import React from 'react';\nimport { useAppStore } from '../../../store/useAppStore';\nimport { useAuthStore } from '../../../store/useAuthStore';"
  );
} else {
  console.log("Already imported");
}

fs.writeFileSync('src/components/TileCanvas/components/SubAreaNodesOverlay.tsx', code);
