const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexPaint = /const handleDragPaint = \([\s\S]*?    \}\n  \};\n\n  const handleDragStart/m;
const replacementPaint = `const handleDragPaint = (clientX: number, clientY: number, isShiftPressed: boolean = false): boolean => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const { wx, wy } = screenToWall(clientX, clientY);
    const state = useAppStore.getState();

    const activeSa = activeSubAreaId ? state.subAreas.find(s => s.id === activeSubAreaId) : null;

    if (activeSa && activeSa.colorPattern === 'paint') {
      // 1. Context is Accent
      const tiles = subAreaTileMap?.[activeSa.id] || [];
      for (const tile of tiles) {
        const saW = activeSa.tileWidth || tileWidth;
        const saH = activeSa.tileHeight || tileHeight;
        const tileMaxDim = Math.max(tile.actualWidth || saW, tile.actualHeight || saH);
        const limitSq = (tileMaxDim * tileMaxDim) * 1.5;
        const cx = tile.center.x + activeSa.x;
        const cy = tile.center.y + activeSa.y;
        const dx = wx - cx;
        const dy = wy - cy;
        if (dx * dx + dy * dy < limitSq) {
          const worldVertices = tile.vertices.map(v => ({ x: v.x + activeSa.x, y: v.y + activeSa.y }));
          if (isPointInPolygon(wx, wy, worldVertices)) {
            state.setTileColorOverride(tile.id, isShiftPressed ? null : state.activeBrushColorIndex);
            return true; // Hit a tile
          }
        }
      }
    } else if (!activeSa && state.colorPattern === 'paint') {
      // 2. Context is Main Wall
      const tiles = subAreaTileMap?.['main'] || [];
      for (const tile of tiles) {
        const tileMaxDim = Math.max(tile.actualWidth || tileWidth, tile.actualHeight || tileHeight);
        const limitSq = (tileMaxDim * tileMaxDim) * 1.5;
        const dx = wx - tile.center.x;
        const dy = wy - tile.center.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < limitSq) {
          if (isPointInPolygon(wx, wy, tile.vertices)) {
            state.setTileColorOverride(tile.id, isShiftPressed ? null : state.activeBrushColorIndex);
            return true; // Hit a tile
          }
        }
      }
    }
    return false;
  };

  const handleDragStart`;

content = content.replace(regexPaint, replacementPaint);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced paint effectively');
