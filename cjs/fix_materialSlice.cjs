const fs = require('fs');
let code = fs.readFileSync('src/store/slices/materialSlice.ts', 'utf8');

if (!code.includes("import { broadcastStateSync }")) {
  code = code.replace("import { StateCreator } from 'zustand';", "import { StateCreator } from 'zustand';\nimport { broadcastStateSync } from '../../utils/syncBroadcaster';");
}

const functionNames = [
  'setTileWidth',
  'setTileHeight',
  'setPattern',
  'setGroutWidth',
  'setGroutColor',
  'setTileName',
  'setTileColors',
  'setSubAreas',
  'setTileColorOverrides'
];

function patchSingleLine(fnName) {
  const regex = new RegExp(`${fnName}: \\(updater\\) => set\\(\\(state: any\\) => \\(\\{ ${fnName}: typeof updater === 'function' \\? updater\\(state\\.${fnName}\\) : updater \\}\\)\\)`);
  if (regex.test(code)) {
    code = code.replace(regex, `${fnName}: (updater) => set((state: any) => {\n    const nextVal = typeof updater === 'function' ? updater(state.${fnName}) : updater;\n    if (!state.isReceivingRemoteUpdate) broadcastStateSync('${fnName}', nextVal);\n    return { ${fnName}: nextVal };\n  })`);
  }
}

function patchMultiLine(fnName, returnLine) {
    const fnRegex = new RegExp(`${fnName}: \\(updater\\) => set\\(\\(state: any\\) => \\{[\\s\\S]*?return \\{([\\s\\S]*?)\\};\\n  \\}\\),`);
    
    if (fnRegex.test(code)) {
        const match = code.match(fnRegex);
        if (match) {
             const replacement = match[0].replace(
                 `return {${match[1]}};`,
                 `if (!state.isReceivingRemoteUpdate) {\n      broadcastStateSync('${fnName}', nextVal);\n    }\n    return {${match[1]}};`
             );
             // we need to set nextVal = typeof updater === 'function' ? updater(...) : updater;
             // Oh actually, wait. let's write a targeted replace for multi-line.
        }
    }
}

// Single-line ones:
patchSingleLine('setGroutWidth');
patchSingleLine('setTileName');
patchSingleLine('setTileColors');
patchSingleLine('setSubAreas');

// Special ones: setGroutColor, setTileColorOverrides might be multi-line or single-line. Let's check them.

fs.writeFileSync('src/store/slices/materialSlice.ts', code);
