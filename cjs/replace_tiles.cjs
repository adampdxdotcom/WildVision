const fs = require('fs');
const content = fs.readFileSync('src/components/TileCanvas/canvasPainter.ts', 'utf8');

const regex = /const saTiles: TileInstance\[\] = \[\];[\s\S]*?\/\/ 4\. Filter and mask organic edge tiles/;
const replacement = `let saTiles: TileInstance[] = [];
    if (subAreaTileMap && subAreaTileMap[sa.id]) {
      const generated = subAreaTileMap[sa.id];
      saTiles = generated.map(t => ({
        ...t,
        center: { x: t.center.x + sa.x, y: t.center.y + sa.y },
        vertices: t.vertices.map(v => ({ x: v.x + sa.x, y: v.y + sa.y })),
      }));
    }

    // 4. Filter and mask organic edge tiles`;

if (regex.test(content)) {
  const newContent = content.replace(regex, replacement);
  fs.writeFileSync('src/components/TileCanvas/canvasPainter.ts', newContent);
  console.log('Replaced successfully');
} else {
  console.log('Regex did not match');
}
