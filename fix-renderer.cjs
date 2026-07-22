const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/useCanvasRenderer.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  const sceneObjects = useAppStore(state => state.sceneObjects);\n  const wallWidth = useAppStore(state => state.wallWidth);\n  const wallHeight = useAppStore(state => state.wallHeight);\n  const subAreas = React.useMemo(() => getCombinedSubAreas(rawSubAreas, sceneObjects, { width: wallWidth, height: wallHeight }), [rawSubAreas, sceneObjects, wallWidth, wallHeight]);",
  "  const sceneObjects = useAppStore(state => state.sceneObjects);\n  const subAreas = React.useMemo(() => getCombinedSubAreas(rawSubAreas, sceneObjects, { width: wallWidth, height: wallHeight }), [rawSubAreas, sceneObjects, wallWidth, wallHeight]);"
);

content = content.replace(
  "  const sceneObjects = useAppStore(state => state.sceneObjects || {});\n",
  ""
);

fs.writeFileSync(file, content);
