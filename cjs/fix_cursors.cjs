const fs = require('fs');

// 1. Update MultiplayerCursors.tsx
let cursorsCode = fs.readFileSync('src/components/TileCanvas/MultiplayerCursors.tsx', 'utf8');

cursorsCode = cursorsCode.replace(
  'export interface MultiplayerCursorsProps {\n  scale: number;\n  panX: number;\n  panY: number;\n}',
  'export interface MultiplayerCursorsProps {\n  wallToScreen: (wx: number, wy: number) => { px: number, py: number };\n}'
);

cursorsCode = cursorsCode.replace(
  'export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({ scale, panX, panY }) => {',
  'export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({ wallToScreen }) => {'
);

cursorsCode = cursorsCode.replace(
  'const screenX = collaborator.cursorX * scale + panX;\n        const screenY = collaborator.cursorY * scale + panY;',
  'const { px: screenX, py: screenY } = wallToScreen(collaborator.cursorX, collaborator.cursorY);'
);

fs.writeFileSync('src/components/TileCanvas/MultiplayerCursors.tsx', cursorsCode);

// 2. Update index.tsx
let indexCode = fs.readFileSync('src/components/TileCanvas/index.tsx', 'utf8');

indexCode = indexCode.replace(
  '<MultiplayerCursors scale={scale} panX={panX} panY={panY} />',
  '<MultiplayerCursors wallToScreen={wallToScreen} />'
);

fs.writeFileSync('src/components/TileCanvas/index.tsx', indexCode);
