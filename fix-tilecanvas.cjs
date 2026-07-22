const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/index.tsx');
let content = fs.readFileSync(file, 'utf8');

// Revert the first one
content = content.replace(
  "  const rawSubAreas = useAppStore(state => state.subAreas);\n  const sceneObjects = useAppStore(state => state.sceneObjects);\n  const wallWidth = useAppStore(state => state.wallWidth);\n  const wallHeight = useAppStore(state => state.wallHeight);\n  const subAreas = React.useMemo(() => getCombinedSubAreas(rawSubAreas, sceneObjects, { width: wallWidth, height: wallHeight }), [rawSubAreas, sceneObjects, wallWidth, wallHeight]);",
  "  const subAreas = useAppStore(state => state.subAreas);"
);

// Apply to the second one (inside TileCanvas)
content = content.replace(
  "  const subAreas = useAppStore(state => state.subAreas);\n  const setSubAreas = useAppStore(state => state.setSubAreas);",
  "  const rawSubAreas = useAppStore(state => state.subAreas);\n  const sceneObjects = useAppStore(state => state.sceneObjects);\n  const subAreas = React.useMemo(() => getCombinedSubAreas(rawSubAreas, sceneObjects, { width: wallWidth, height: wallHeight }), [rawSubAreas, sceneObjects, wallWidth, wallHeight]);\n  const setSubAreas = useAppStore(state => state.setSubAreas);"
);

fs.writeFileSync(file, content);
