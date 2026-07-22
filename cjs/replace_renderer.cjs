const fs = require('fs');
const content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasRenderer.ts', 'utf8');

const regex = /const mainTiles = generateTiles\(\{[\s\S]*?layoutId: 'main',\n        \}\);/;
const replacement = `const mainTiles = subAreaTileMap ? subAreaTileMap['main'] || [] : [];`;

if (regex.test(content)) {
  const newContent = content.replace(regex, replacement);
  fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasRenderer.ts', newContent);
  console.log('Replaced successfully');
} else {
  console.log('Regex did not match');
}
