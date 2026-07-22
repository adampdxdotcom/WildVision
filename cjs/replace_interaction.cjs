const fs = require('fs');
const content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexAllTiles = /const getAllTiles = \(\): TileInstance\[\] => \{[\s\S]*?\n  \};\n\n  const handleDragPaint/;
let newContent = content.replace(regexAllTiles, 'const handleDragPaint');

const regexDragPaint = /const handleDragPaint = \([\s\S]*?\n  \};\n\n  const handleDragStart/;
const replacementDragPaint = `const handleDragPaint = (clientX: number, clientY: number, isShiftPressed: boolean = false) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { wx, wy } = screenToWall(clientX, clientY);
    const state = useAppStore.getState();

    // a) Check if hovered over an Accent
    const hoveredSa = findBestSubArea(state.subAreas, wx, wy);
    if (hoveredSa && hoveredSa.colorPattern === 'paint') {
      const saTilesRaw = subAreaTileMap[hoveredSa.id];
      if (saTilesRaw) {
        for (const tile of saTilesRaw) {
          const tileMaxDim = Math.max(tile.actualWidth || tileWidth, tile.actualHeight || tileHeight);
          const limitSq = (tileMaxDim * tileMaxDim) * 1.5;
          const cx = tile.center.x + hoveredSa.x;
          const cy = tile.center.y + hoveredSa.y;
          const dx = wx - cx;
          const dy = wy - cy;
          if (dx * dx + dy * dy < limitSq) {
            const worldVertices = tile.vertices.map(v => ({ x: v.x + hoveredSa.x, y: v.y + hoveredSa.y }));
            if (isPointInPolygon(wx, wy, worldVertices)) {
              state.setTileColorOverride(tile.id, isShiftPressed ? null : state.activeBrushColorIndex);
              return; // Hit a tile, we can stop!
            }
          }
        }
      }
    }

    // b) If no Accent is hit or handled, check the mainTiles as normal if the global colorPattern === 'paint'.
    if (state.colorPattern === 'paint' && subAreaTileMap['main']) {
      for (const tile of subAreaTileMap['main']) {
        const tileMaxDim = Math.max(tile.actualWidth || tileWidth, tile.actualHeight || tileHeight);
        const limitSq = (tileMaxDim * tileMaxDim) * 1.5;
        const dx = wx - tile.center.x;
        const dy = wy - tile.center.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < limitSq) {
          if (isPointInPolygon(wx, wy, tile.vertices)) {
            state.setTileColorOverride(tile.id, isShiftPressed ? null : state.activeBrushColorIndex);
            return; // Hit a tile, we can stop!
          }
        }
      }
    }
  };

  const handleDragStart`;

newContent = newContent.replace(regexDragPaint, replacementDragPaint);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', newContent);
console.log('Replaced successfully');
