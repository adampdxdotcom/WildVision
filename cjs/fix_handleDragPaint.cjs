const fs = require('fs');
let content = fs.readFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', 'utf8');

const regexPaint = /const handleDragPaint = \([\s\S]*?    return false;\n  \};\n\n  const handleDragStart/m;

const replacementPaint = `const handleDragPaint = (clientX: number, clientY: number, isShiftPressed: boolean = false): boolean => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const { wx, wy } = screenToWall(clientX, clientY);
    const state = useAppStore.getState();

    const activeSa = activeSubAreaId ? state.subAreas.find(s => s.id === activeSubAreaId) : null;
    const targetTiles = activeSa ? (subAreaTileMap?.[activeSa.id] || []) : (subAreaTileMap?.['main'] || []);

    const saX = activeSa ? activeSa.x : 0;
    const saY = activeSa ? activeSa.y : 0;

    for (const tile of targetTiles) {
      const w = activeSa ? (activeSa.tileWidth || tileWidth) : tileWidth;
      const h = activeSa ? (activeSa.tileHeight || tileHeight) : tileHeight;
      const tileMaxDim = Math.max(tile.actualWidth || w, tile.actualHeight || h);
      const limitSq = (tileMaxDim * tileMaxDim) * 1.5;
      
      const cx = tile.center.x + saX;
      const cy = tile.center.y + saY;
      const dx = wx - cx;
      const dy = wy - cy;
      
      if (dx * dx + dy * dy < limitSq) {
        const worldVertices = tile.vertices.map(v => ({ x: v.x + saX, y: v.y + saY }));
        if (isPointInPolygon(wx, wy, worldVertices)) {
          state.setTileColorOverride(tile.id, isShiftPressed ? null : state.activeBrushColorIndex);
          return true; // Hit a tile
        }
      }
    }
    return false;
  };

  const handleDragStart`;

content = content.replace(regexPaint, replacementPaint);
fs.writeFileSync('src/components/TileCanvas/hooks/useCanvasInteractions.ts', content);
console.log('Replaced handleDragPaint');
