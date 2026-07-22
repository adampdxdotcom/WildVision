const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

let start = lines.findIndex(l => l.includes('const [projectName, setProjectName] = useState<string>'));
let end = lines.findIndex(l => l.includes('const [activeSidebarTab, setActiveSidebarTab] = useState<number>'));

const stateLines = lines.slice(start, end + 1);
const vars = [];

for (let i = 0; i < stateLines.length; i++) {
  let line = stateLines[i];
  if (line.includes('const [offsetX')) {
    vars.push({ name: 'offsetX', setter: 'setOffsetX', type: 'number', defaultVal: '0' }); // We will deal with defaultVal later
    continue;
  }
  if (line.includes('const [offsetY')) {
    vars.push({ name: 'offsetY', setter: 'setOffsetY', type: 'number', defaultVal: '0' });
    continue;
  }
  if (line.includes('const [wallBorder, setWallBorder]')) {
    vars.push({ name: 'wallBorder', setter: 'setWallBorder', type: 'BorderConfig', defaultVal: `{\n    enabled: false,\n    tileName: 'Border Tile',\n    tileWidth: 4,\n    tileHeight: 2,\n    cornerJoint: 'straight',\n    color: '#1e293b'\n  }` });
    continue;
  }

  const match = line.match(/const \[(.+?), (set[A-Z][a-zA-Z0-9_]*)\] = useState<([^>]+)>\((.*?)\);/s);
  if (match) {
    vars.push({ name: match[1], setter: match[2], type: match[3], defaultVal: match[4] });
  } else if (line.includes('useState') && !line.includes('() => {')) {
     console.log('Skipping unhandled useState:', line);
  }
}

let typeDef = 'export interface AppState {\n';
let defaultDef = '  ';

for (let v of vars) {
  typeDef += `  ${v.name}: ${v.type};\n`;
  typeDef += `  ${v.setter}: (val: ${v.type} | ((prev: ${v.type}) => ${v.type})) => void;\n`;
}
typeDef += '}\n';

let createCall = 'export const useAppStore = create<AppState>((set) => ({\n';
for (let v of vars) {
  if (v.name === 'offsetX') {
    createCall += `  offsetX: calculateCenteredOffsets(96, 24, 'rectangle', 6, 3, 0.125, 'running_50').x,\n`;
  } else if (v.name === 'offsetY') {
    createCall += `  offsetY: calculateCenteredOffsets(96, 24, 'rectangle', 6, 3, 0.125, 'running_50').y,\n`;
  } else if (v.name === 'wallBorder') {
    createCall += `  wallBorder: {\n    enabled: false,\n    tileName: 'Border Tile',\n    tileWidth: 4,\n    tileHeight: 2,\n    cornerJoint: 'straight',\n    color: '#1e293b'\n  },\n`;
  } else {
    createCall += `  ${v.name}: ${v.defaultVal},\n`;
  }
  createCall += `  ${v.setter}: (updater) => set((state) => ({ ${v.name}: typeof updater === 'function' ? (updater as any)(state.${v.name}) : updater })),\n`;
}
createCall += '}));\n';

const fileContent = `import { create } from 'zustand';\nimport { calculateCenteredOffsets } from '../utils/geometry';\nimport { MeasurementUnit, TileShape, RectanglePattern, SubArea, WallExtension, ColorPattern, ColorVariation, BorderConfig } from '../types';\n\n${typeDef}\n${createCall}`;

fs.writeFileSync('src/store/useAppStore.ts', fileContent);
console.log('Store created.');
