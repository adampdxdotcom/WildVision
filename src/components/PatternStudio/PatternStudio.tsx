import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Vertex, BuilderTile } from '../../store/slices/patternBuilderSlice';
import { 
  X, Save, Plus, Trash2, Move, RotateCcw, 
  HelpCircle, Grid, Layers, ZoomIn, ZoomOut, Copy, Trash
} from 'lucide-react';

export const PatternStudio: React.FC = () => {
  const {
    patternName, setPatternName,
    blockWidth, blockHeight, setBlockDimensions,
    builderTiles,
    activeTileIndex, setActiveTileIndex,
    selectedVertexIndex, setSelectedVertexIndex,
    snapToGrid, setSnapToGrid,
    snapResolution, setSnapResolution,
    isSavingPattern, patternSaveError, savePatternToCloud,
    setViewMode, resetPatternBuilder,
    addBuilderTile, removeBuilderTile,
    updateBuilderTileProperty,
    addVertexToActive, deleteVertexFromActive, updateVertexInActive
  } = useAppStore();

  const [zoom, setZoom] = useState<number>(100); // Zoom percentage
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Interaction refs & states
  const svgRef = useRef<SVGSVGElement | null>(null);
  
  const [tileDragStart, setTileDragStart] = useState<{
    index: number;
    startX: number;
    startY: number;
    startDx: number;
    startDy: number;
  } | null>(null);

  const [vertexDragStart, setVertexDragStart] = useState<{
    tileIndex: number;
    vertexIndex: number;
    startX: number;
    startY: number;
    startVx: number;
    startVy: number;
  } | null>(null);

  // Base canvas scale: 1 grid unit = 8 pixels at 100% zoom
  // e.g. a 50x50 block is 400x400 pixels
  const gridUnitScale = 8;
  const currentScale = gridUnitScale * (zoom / 100);

  // Pixel dimensions of the repeat block
  const blockPixelWidth = blockWidth * currentScale;
  const blockPixelHeight = blockHeight * currentScale;

  // Helper to get SVG points string for any tile's vertices
  const getTilePointsString = (tile: BuilderTile) => {
    return tile.vertices.map(v => {
      const px = (tile.dx + (v.x + 0.5) * tile.w) * currentScale;
      const py = (tile.dy + (v.y + 0.5) * tile.h) * currentScale;
      return `${px},${py}`;
    }).join(' ');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (tileDragStart !== null) {
      const dxPx = e.clientX - tileDragStart.startX;
      const dyPx = e.clientY - tileDragStart.startY;
      const dxUnit = dxPx / currentScale;
      const dyUnit = dyPx / currentScale;

      let nextDx = tileDragStart.startDx + dxUnit;
      let nextDy = tileDragStart.startDy + dyUnit;

      if (snapToGrid) {
        nextDx = Math.round(nextDx / snapResolution) * snapResolution;
        nextDy = Math.round(nextDy / snapResolution) * snapResolution;
      }

      updateBuilderTileProperty(tileDragStart.index, 'dx', parseFloat(nextDx.toFixed(4)));
      updateBuilderTileProperty(tileDragStart.index, 'dy', parseFloat(nextDy.toFixed(4)));
    } else if (vertexDragStart !== null) {
      const dxPx = e.clientX - vertexDragStart.startX;
      const dyPx = e.clientY - vertexDragStart.startY;
      const dxUnit = dxPx / currentScale;
      const dyUnit = dyPx / currentScale;

      const activeTile = builderTiles[vertexDragStart.tileIndex];
      if (activeTile) {
        const dvx = dxUnit / activeTile.w;
        const dvy = dyUnit / activeTile.h;

        const nextVx = vertexDragStart.startVx + dvx;
        const nextVy = vertexDragStart.startVy + dvy;

        updateVertexInActive(vertexDragStart.vertexIndex, nextVx, nextVy);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setTileDragStart(null);
    setVertexDragStart(null);
  };

  const handleAddTile = () => {
    addBuilderTile();
  };

  const handleDuplicateTile = (index: number) => {
    const tile = builderTiles[index];
    if (tile) {
      // Add standard duplicated tile centered near the original
      addBuilderTile();
      const lastIndex = useAppStore.getState().builderTiles.length - 1;
      updateBuilderTileProperty(lastIndex, 'name', `${tile.name} (Copy)`);
      updateBuilderTileProperty(lastIndex, 'w', tile.w);
      updateBuilderTileProperty(lastIndex, 'h', tile.h);
      updateBuilderTileProperty(lastIndex, 'dx', tile.dx + 5);
      updateBuilderTileProperty(lastIndex, 'dy', tile.dy + 5);
      updateBuilderTileProperty(lastIndex, 'color', tile.color);
      updateBuilderTileProperty(lastIndex, 'role', tile.role);
      updateBuilderTileProperty(lastIndex, 'vertices', JSON.parse(JSON.stringify(tile.vertices)));
      setActiveTileIndex(lastIndex);
    }
  };

  const handleLoadPreset = (type: 'star-cross' | 'hex-triangle' | 'pinwheel') => {
    resetPatternBuilder(type);
    setSelectedVertexIndex(null);
  };

  const handleSave = async () => {
    const ok = await savePatternToCloud();
    if (ok) {
      setSuccessMessage('Successfully saved custom pattern & applied to 2D simulator workspace!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    }
  };

  const handleAddVertex = () => {
    // Add new vertex at center of active tile
    addVertexToActive({ x: 0, y: 0 });
  };

  const handleDeleteVertex = () => {
    if (selectedVertexIndex !== null) {
      deleteVertexFromActive(selectedVertexIndex);
    }
  };

  const activeTile = builderTiles[activeTileIndex] || null;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col lg:flex-row gap-5 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-5 overflow-hidden">
      
      {/* LEFT CONTROL PANEL - Repeat block boundaries & preset structures */}
      <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0 min-h-0">
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-rose-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Pattern Repeat Block
            </h2>
            <button 
              onClick={() => handleLoadPreset('star-cross')}
              title="Reset Editor"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Pattern Name
            </label>
            <input
              type="text"
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              placeholder="e.g. Vintage Herringbone"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Block Width
              </label>
              <input
                type="number"
                step="1"
                min="10"
                max="200"
                value={blockWidth}
                onChange={(e) => setBlockDimensions(Math.max(10, parseInt(e.target.value) || 50), blockHeight)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Block Height
              </label>
              <input
                type="number"
                step="1"
                min="10"
                max="200"
                value={blockHeight}
                onChange={(e) => setBlockDimensions(blockWidth, Math.max(10, parseInt(e.target.value) || 50))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 leading-relaxed italic">
            Define boundaries of your repeating tessellation layout block in relative scale units (e.g. inches).
          </p>
        </div>

        {/* TEMPLATE QUICK PRESETS */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Load Studio Preset Templates
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { id: 'star-cross', label: 'Classic Star & Cross' },
              { id: 'hex-triangle', label: 'Hexagon & Triangle Lattice' },
              { id: 'pinwheel', label: 'Pinwheel Alignment' }
            ].map(pres => (
              <button
                key={pres.id}
                onClick={() => handleLoadPreset(pres.id as any)}
                className="w-full px-3 py-1.5 text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                {pres.label}
              </button>
            ))}
          </div>
        </div>

        {/* TILES LIST PANEL */}
        <div className="flex-1 bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Pattern Tiles ({builderTiles.length})
            </span>
            <button
              onClick={handleAddTile}
              className="flex items-center gap-1 px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add Tile
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {builderTiles.map((tile, i) => (
              <div
                key={tile.id}
                onClick={() => setActiveTileIndex(i)}
                className={`p-2 rounded-lg border flex items-center justify-between transition cursor-pointer ${
                  activeTileIndex === i
                    ? 'border-rose-500 bg-rose-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3.5 h-3.5 rounded border"
                    style={{ 
                      backgroundColor: tile.color,
                      borderColor: '#ffffff',
                      opacity: 0.8
                    }}
                  />
                  <div>
                    <p className="text-[11px] font-black capitalize text-slate-200">
                      {tile.name}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      dx: {tile.dx}, dy: {tile.dy} | {tile.vertices.length} Vertices
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTile(i);
                    }}
                    title="Duplicate"
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBuilderTile(i);
                    }}
                    disabled={builderTiles.length <= 1}
                    title="Delete"
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER - VECTOR STUDIO CANVAS */}
      <div className="flex-1 flex flex-col bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden min-h-0 relative">
        {/* Canvas Toolbar / Header */}
        <div className="px-4 py-3 bg-slate-950/85 border-b border-slate-800 flex items-center justify-between gap-4 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-slate-500" />
              Vector Repeat Grid
            </span>
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(prev => Math.max(20, prev - 10))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-400 select-none min-w-[35px] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(300, prev + 10))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <label className="flex items-center gap-1.5 font-semibold text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded text-rose-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer w-3.5 h-3.5"
              />
              Grid
            </label>
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 font-semibold text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer w-3.5 h-3.5"
                />
                Snap
              </label>
              {snapToGrid && (
                <select
                  value={snapResolution}
                  onChange={(e) => setSnapResolution(parseFloat(e.target.value))}
                  className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="0.1">0.1</option>
                  <option value="0.05">0.05</option>
                  <option value="0.025">0.025</option>
                  <option value="0.01">0.01</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Infinite workspace area hosting SVG */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] select-none">
          <div className="relative">
            {/* SVG Visual Canvas */}
            <svg
              ref={svgRef}
              width={blockPixelWidth}
              height={blockPixelHeight}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => {
                setSelectedVertexIndex(null);
              }}
              className="bg-slate-900/40 rounded-lg shadow-2xl relative"
              style={{
                width: blockPixelWidth,
                height: blockPixelHeight,
                touchAction: 'none'
              }}
            >
              {/* Optional Dotted Subdivision Grid Lines Overlay */}
              {showGrid && (
                <>
                  <defs>
                    <pattern id="studioGridSmall" width={currentScale * 5} height={currentScale * 5} patternUnits="userSpaceOnUse">
                      <path d={`M ${currentScale * 5} 0 L 0 0 0 ${currentScale * 5}`} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
                    </pattern>
                    <pattern id="studioGridLarge" width={currentScale * 25} height={currentScale * 25} patternUnits="userSpaceOnUse">
                      <rect width={currentScale * 25} height={currentScale * 25} fill="url(#studioGridSmall)" />
                      <path d={`M ${currentScale * 25} 0 L 0 0 0 ${currentScale * 25}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#studioGridLarge)" />
                </>
              )}

              {/* Block repeatable visual boundaries */}
              <rect
                width="100%"
                height="100%"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="6,4"
                className="opacity-70 pointer-events-none"
              />

              {/* Render User's Tiles */}
              {builderTiles.map((tile, index) => {
                const isSelected = activeTileIndex === index;
                const points = getTilePointsString(tile);

                return (
                  <g key={tile.id}>
                    {/* Render Polygon Body */}
                    <polygon
                      points={points}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTileIndex(index);
                        setSelectedVertexIndex(null);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveTileIndex(index);
                        setSelectedVertexIndex(null);
                        
                        if (svgRef.current) {
                          setTileDragStart({
                            index,
                            startX: e.clientX,
                            startY: e.clientY,
                            startDx: tile.dx,
                            startDy: tile.dy
                          });
                          svgRef.current.setPointerCapture(e.pointerId);
                        }
                      }}
                      className={`cursor-move transition-all duration-100 ${
                        isSelected ? 'drop-shadow-lg' : 'hover:drop-shadow-md'
                      }`}
                      style={{
                        fill: tile.color,
                        fillOpacity: isSelected ? 0.45 : 0.25,
                        stroke: tile.color,
                        strokeWidth: isSelected ? 2.5 : 1.5,
                      }}
                    />

                    {/* Render Vertex Handles of Selected Tile */}
                    {isSelected && tile.vertices.map((v, vIdx) => {
                      const vx = (tile.dx + (v.x + 0.5) * tile.w) * currentScale;
                      const vy = (tile.dy + (v.y + 0.5) * tile.h) * currentScale;
                      const isVertexSelected = selectedVertexIndex === vIdx;

                      return (
                        <circle
                          key={vIdx}
                          cx={vx}
                          cy={vy}
                          r={isVertexSelected ? 6 : 4}
                          fill={isVertexSelected ? '#ffffff' : tile.color}
                          stroke={isVertexSelected ? tile.color : '#ffffff'}
                          strokeWidth={2}
                          className="cursor-pointer hover:scale-125 transition-transform"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSelectedVertexIndex(vIdx);
                            setVertexDragStart({
                              tileIndex: index,
                              vertexIndex: vIdx,
                              startX: e.clientX,
                              startY: e.clientY,
                              startVx: v.x,
                              startVy: v.y
                            });
                            if (svgRef.current) {
                              svgRef.current.setPointerCapture(e.pointerId);
                            }
                          }}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {/* Float Canvas Label */}
            <div className="absolute -top-6 left-0 text-[10px] font-bold text-rose-500 font-mono uppercase tracking-wider">
              Repeat Domain bounds ({blockWidth} × {blockHeight} Units)
            </div>
          </div>
        </div>

        {/* Drag Status Line */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-400 flex justify-between items-center font-mono">
          <span>Drag tile centers to reposition. Drag corner vertices to modify polygon geometry.</span>
          <span>{builderTiles.length} tiles | Snap Resolution: {snapResolution}</span>
        </div>
      </div>

      {/* RIGHT SIDEBAR - TILE INSPECTOR */}
      <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0 min-h-0">
        <div className="flex-1 bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col min-h-0">
          <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest font-mono mb-3.5 flex items-center gap-1.5">
            <Move className="w-4 h-4" />
            Tile Inspector
          </h3>

          {activeTile ? (
            <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 scrollbar-thin">
              <div className="p-3 bg-rose-950/10 border border-rose-900/30 rounded-xl flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-black font-mono text-white"
                  style={{ 
                    backgroundColor: activeTile.color,
                    borderColor: '#ffffff',
                    opacity: 0.8
                  }}
                >
                  #{activeTileIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={activeTile.name}
                    onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-dashed border-slate-700 text-xs font-black text-slate-200 focus:border-rose-500 focus:outline-hidden py-0.5"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold font-mono uppercase mt-0.5">
                    Role: {activeTile.role.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Geometry properties */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Width (w)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={activeTile.w}
                      onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'w', Math.max(1, parseFloat(e.target.value) || 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Height (h)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={activeTile.h}
                      onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'h', Math.max(1, parseFloat(e.target.value) || 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Offset DX
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={activeTile.dx}
                      onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'dx', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Offset DY
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={activeTile.dy}
                      onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'dy', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Tile Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color"
                      value={activeTile.color}
                      onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'color', e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-slate-900 cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={activeTile.color}
                      onChange={(e) => updateBuilderTileProperty(activeTileIndex, 'color', e.target.value)}
                      className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Tessellation Role
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { val: 'primary', label: 'Primary' },
                      { val: 'secondary', label: 'Secondary' }
                    ].map(r => (
                      <button
                        key={r.val}
                        onClick={() => updateBuilderTileProperty(activeTileIndex, 'role', r.val as any)}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                          activeTile.role === r.val
                            ? 'border-rose-500 bg-rose-950/30 text-rose-400'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertices Editor Subpanel */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Vertices ({activeTile.vertices.length})
                    </span>
                    <button
                      onClick={handleAddVertex}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Add Node
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                    {activeTile.vertices.map((v, idx) => {
                      const isSel = selectedVertexIndex === idx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedVertexIndex(idx)}
                          className={`px-2 py-1 rounded text-[10px] font-mono flex items-center justify-between transition cursor-pointer ${
                            isSel ? 'bg-rose-950/20 border border-rose-900/50 text-rose-300' : 'bg-slate-900/40 border border-transparent text-slate-400 hover:bg-slate-800/40'
                          }`}
                        >
                          <span>Vertex {idx + 1}:</span>
                          <div className="flex items-center gap-1.5">
                            <span>x: {v.x.toFixed(2)}</span>
                            <span>y: {v.y.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedVertexIndex !== null && (
                    <div className="p-2.5 bg-slate-950/30 border border-slate-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Selected Node #{selectedVertexIndex + 1}</span>
                        <button
                          onClick={handleDeleteVertex}
                          disabled={activeTile.vertices.length <= 3}
                          className="text-rose-500 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 block uppercase mb-0.5">X (-0.5 to 0.5)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="-0.5"
                            max="0.5"
                            value={activeTile.vertices[selectedVertexIndex]?.x || 0}
                            onChange={(e) => updateVertexInActive(selectedVertexIndex, parseFloat(e.target.value) || 0, activeTile.vertices[selectedVertexIndex]?.y || 0)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 block uppercase mb-0.5">Y (-0.5 to 0.5)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="-0.5"
                            max="0.5"
                            value={activeTile.vertices[selectedVertexIndex]?.y || 0}
                            onChange={(e) => updateVertexInActive(selectedVertexIndex, activeTile.vertices[selectedVertexIndex]?.x || 0, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2.5 grid grid-cols-2 gap-2 border-t border-slate-800/80 mt-auto">
                <button
                  onClick={() => handleDuplicateTile(activeTileIndex)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  Duplicate
                </button>
                <button
                  onClick={() => removeBuilderTile(activeTileIndex)}
                  disabled={builderTiles.length <= 1}
                  className="w-full py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 hover:border-rose-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Delete Tile
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-4 border border-dashed border-slate-800 rounded-xl">
              <Move className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
              <p className="text-xs font-bold text-slate-400 mb-1">No Tile Selected</p>
              <p className="text-[10px] text-slate-500 max-w-[180px]">
                Click on any tile inside the vector repeat block or select it from the Left Panel list to modify its bounds and color matrix.
              </p>
            </div>
          )}
        </div>

        {/* ACTIONS FOOTER BUTTONS */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
          {patternSaveError && (
            <div className="p-2.5 bg-rose-950/30 text-rose-400 border border-rose-900/50 rounded-lg text-[10px] font-mono leading-relaxed">
              {patternSaveError}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 rounded-lg text-[10px] font-semibold leading-relaxed">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setViewMode('2d');
              }}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
              Exit Studio
            </button>

            <button
              onClick={handleSave}
              disabled={isSavingPattern}
              className="py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:text-slate-400 text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-lg shadow-rose-950/30"
            >
              <Save className="w-4 h-4" />
              {isSavingPattern ? 'Saving...' : 'Save & Apply'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
