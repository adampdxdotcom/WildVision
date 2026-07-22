const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const extrudeInitRegex = /  const \{ handleExtrudeStart, handleExtrudeMove \} = useExtrudeHandler\(\{[\s\S]*?    scale,\n  \}\);\n/;
const extrudeStr = content.match(extrudeInitRegex)[0];

content = content.replace(extrudeInitRegex, "");

const lastMouseRegex = /  const lastMouseScreenRef = useRef<\{ x: number; y: number \} \| null>\(null\);\n/;
content = content.replace(lastMouseRegex, `  const lastMouseScreenRef = useRef<{ x: number; y: number } | null>(null);\n\n${extrudeStr}`);

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Moved extrude init');
