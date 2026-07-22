const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/index.tsx', 'utf8');

code = code.replace(
  "const initialPos = React.useMemo(() => livePos && livePos.length === 3 ? [livePos[0], livePos[1], livePos[2]] : [0, 0, 4.5], []);",
  "const initialPos = React.useMemo<[number, number, number]>(() => livePos && livePos.length === 3 ? [livePos[0], livePos[1], livePos[2]] : [0, 0, 4.5], []);"
);

fs.writeFileSync('src/components/TileCanvas3D/index.tsx', code);
