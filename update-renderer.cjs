const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasRenderer.ts', 'utf8');

code = code.replace(/import \{ renderStagingProps \} from '\.\.\/painters\/stagingPainter';\n/, '');

code = code.replace(/\s*\/\/ Draw staging props on top of the tiles\/sub-areas but behind pins and measurements\n\s*renderStagingProps\(ctx, viewport, sceneObjects, \{ width: wallWidth, height: wallHeight \}, true\);\n/, '\n');

fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasRenderer.ts', code);
