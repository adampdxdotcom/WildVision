const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/components/InteractiveNodes.tsx', 'utf8');

code = code.replace(
  "const user = useAppStore(state => state.user);",
  "const user = useAuthStore(state => state.user);"
);

if (!code.includes("import { useAuthStore }")) {
  code = code.replace(
    "import { useAppStore } from '../../../store/useAppStore';",
    "import { useAppStore } from '../../../store/useAppStore';\nimport { useAuthStore } from '../../../store/useAuthStore';"
  );
}

fs.writeFileSync('src/components/TileCanvas/components/InteractiveNodes.tsx', code);
