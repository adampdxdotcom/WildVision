const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', 'utf8');

code = code.replace(
  "import { useAppStore } from '../../store/useAppStore';",
  "import { useAppStore } from '../../store/useAppStore';\nimport { useAuthStore } from '../../store/useAuthStore';"
);

code = code.replace(
  "  const orthoLock = useAppStore(state => state.orthoLock);",
  "  const orthoLock = useAppStore(state => state.orthoLock);\n  const user = useAuthStore(state => state.user);"
);

code = code.replace(
  "      {orthoLock && (",
  "      {(orthoLock && user) && ("
);

fs.writeFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', code);
