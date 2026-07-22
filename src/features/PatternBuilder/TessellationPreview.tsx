import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Layers, ZoomIn, Eye, Download, Info, Grid, Maximize, Palette } from 'lucide-react';

export default function TessellationPreview() {
  const {
    patternName,
    blockWidth,
    blockHeight,
    builderTiles: tiles,
    activeTileIndex
  } = useAppStore();

  const [gridSize, setGridSize] = useState<number>(4); // default 4x4 repeating block
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [highlightActive, setHighlightActive] = useState<boolean>(false);
  const [renderTheme, setRenderTheme] = useState<'custom' | 'blueprint' | 'monochrome'>('custom');
  const [zoom, setZoom] = useState<number>(100); // Zoom level in percentage
  
  const svgPreviewRef = useRef<SVGSVGElement | null>(null);

  // Generate an array for repeating grid loop
  const columns = Array.from({ length: gridSize }, (_, i) => i);
  const rows = Array.from({ length: gridSize }, (_, i) => i);

  // Calculate total bounding box dimensions for rendering
  const totalWidth = gridSize * blockWidth;
  const totalHeight = gridSize * blockHeight;

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 min-w-0 bg-white border border-[#E5E7EB] rounded-none">
      {/* Repeating Canvas Box */}
      <div className="flex-1 w-full h-full min-h-0 bg-[#1A1A1E] border border-black rounded-none relative overflow-hidden flex items-center justify-center p-4">
        {/* Dynamic Zoom Wrapper */}
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transition: 'transform 0.15s ease-out',
            width: totalWidth,
            height: totalHeight,
          }}
          className="relative origin-center flex items-center justify-center"
        >
          <svg
            id="tessellation-svg"
            ref={svgPreviewRef}
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            className="overflow-visible select-none"
          >
            {/* Background for blueprint theme */}
            {renderTheme === 'blueprint' && (
              <rect width={totalWidth} height={totalHeight} fill="#0f172a" />
            )}

            {/* Render full repeating tessellation lattice */}
            {columns.map((col) =>
              rows.map((row) => {
                const blockX = col * blockWidth;
                const blockY = row * blockHeight;

                return (
                  <g key={`block-${col}-${row}`} id={`macroblock-cell-${col}-${row}`}>
                    
                    {/* Render macro block borders if toggled */}
                    {showBorders && (
                      <rect
                        x={blockX}
                        y={blockY}
                        width={blockWidth}
                        height={blockHeight}
                        fill="none"
                        stroke={renderTheme === 'blueprint' ? '#1e293b' : '#334155'}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.6"
                      />
                    )}

                    {/* Render each tile in this block */}
                    {tiles.map((tile, tileIdx) => {
                      const isActive = tileIdx === activeTileIndex;
                      const tileGlobalX = blockX + tile.dx;
                      const tileGlobalY = blockY + tile.dy;

                      // Styling computed dynamically
                      let tileFill = tile.color;
                      let tileStroke = '#1e293b';
                      let tileStrokeWidth = '1.2';
                      let opacity = '1';

                      if (renderTheme === 'blueprint') {
                        tileFill = 'transparent';
                        tileStroke = isActive && highlightActive ? '#60a5fa' : '#38bdf8';
                        tileStrokeWidth = isActive && highlightActive ? '2.5' : '1.2';
                        opacity = isActive && highlightActive ? '1' : '0.75';
                      } else if (renderTheme === 'monochrome') {
                        tileFill = isActive && highlightActive ? '#f1f5f9' : '#1e293b';
                        tileStroke = '#f8fafc';
                        tileStrokeWidth = isActive && highlightActive ? '2.5' : '1';
                      } else {
                        // Custom colors
                        if (highlightActive && !isActive) {
                          opacity = '0.35';
                        }
                        tileStroke = isActive && highlightActive ? '#ffffff' : '#0f172a';
                        tileStrokeWidth = isActive && highlightActive ? '2' : '1';
                      }

                      const clones = [];
                      const instances = tile.polarArray?.instances || 1;
                      for (let i = 0; i < instances; i++) {
                        let pointsStr = '';
                        if (i > 0 && tile.polarArray) {
                          const theta = tile.polarArray.angleStep * i * (Math.PI / 180);
                          pointsStr = tile.vertices.map((v) => {
                            const dx = v.x - tile.polarArray!.pivotX;
                            const dy = v.y - tile.polarArray!.pivotY;
                            const rotatedX = tile.polarArray!.pivotX + (dx * Math.cos(theta) - dy * Math.sin(theta));
                            const rotatedY = tile.polarArray!.pivotY + (dx * Math.sin(theta) + dy * Math.cos(theta));
                            return `${tileGlobalX + rotatedX * tile.w},${tileGlobalY + rotatedY * tile.h}`;
                          }).join(' ');
                        } else {
                          pointsStr = tile.vertices
                            .map((v) => `${tileGlobalX + v.x * tile.w},${tileGlobalY + v.y * tile.h}`)
                            .join(' ');
                        }
                        
                        if (pointsStr.length > 0) {
                          clones.push(
                            <polygon
                              key={`clone-${i}`}
                              points={pointsStr}
                              fill={tileFill}
                              stroke={tileStroke}
                              strokeWidth={tileStrokeWidth}
                              opacity={opacity}
                              className="transition-all duration-150 hover:stroke-amber-400 cursor-pointer"
                            >
                              <title>{`${tile.name} (${tile.role})`}</title>
                            </polygon>
                          );
                        }
                      }

                      return (
                        <g key={`tile-${tileIdx}`} id={`lattice-tile-${tile.id}`}>
                          {clones}
                        </g>
                      );
                    })}
                  </g>
                );
              })
            )}
          </svg>
        </div>

        {/* Quick HUD guide indicator */}
        <div className="absolute bottom-4 right-4 bg-black/90 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-black/50 px-4 py-2.5 rounded-none flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white" />
            <span>Unit: <strong className="text-white font-semibold font-mono">{blockWidth}x{blockHeight}PX</strong></span>
          </div>
          <div className="w-px bg-slate-800 h-3" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white" />
            <span>Tiles: <strong className="text-white font-semibold font-mono">{tiles.length}</strong></span>
          </div>
        </div>

        {/* Blueprint watermark */}
        {renderTheme === 'blueprint' && (
          <div className="absolute top-4 left-4 font-mono text-[9px] text-sky-500/40 select-none pointer-events-none uppercase tracking-widest leading-relaxed">
            SYSTEM GRID: SECURE LOCAL DRAFTING<br />
            LATTICE PRESET INTERLOCK EVALUATION
          </div>
        )}

        {/* Floating HUD Controls */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-4 flex flex-wrap items-center gap-6 z-20">
          {/* Theme select */}
          <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-md border border-[#E5E7EB]">
            <button
              onClick={() => setRenderTheme('custom')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors ${
                renderTheme === 'custom' ? 'bg-white text-black border border-[#E5E7EB] shadow-sm' : 'text-slate-500 hover:text-black'
              }`}
              title="Tile-defined Colors"
            >
              Colors
            </button>
            <button
              onClick={() => setRenderTheme('blueprint')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors ${
                renderTheme === 'blueprint' ? 'bg-white text-black border border-[#E5E7EB] shadow-sm' : 'text-slate-500 hover:text-black'
              }`}
              title="Blueprint styling"
            >
              Blueprint
            </button>
            <button
              onClick={() => setRenderTheme('monochrome')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors ${
                renderTheme === 'monochrome' ? 'bg-white text-black border border-[#E5E7EB] shadow-sm' : 'text-slate-500 hover:text-black'
              }`}
              title="High contrast outlines"
            >
              Line-Art
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200"></div>

          {/* Grid Repeat Slider */}
          <div className="flex flex-col gap-1.5 w-[100px]">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Repeat</span>
              <span className="text-black">{gridSize}x{gridSize}</span>
            </label>
            <input
              type="range"
              min="2"
              max="6"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full accent-black h-1 bg-slate-200 cursor-pointer rounded-full"
            />
          </div>

          <div className="w-px h-6 bg-slate-200"></div>

          {/* Preview Zoom Slider */}
          <div className="flex flex-col gap-1.5 w-[100px]">
            <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
              <span className="text-black">{zoom}%</span>
            </label>
            <input
              type="range"
              min="30"
              max="180"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-full accent-black h-1 bg-slate-200 cursor-pointer rounded-full"
            />
          </div>

          <div className="w-px h-6 bg-slate-200"></div>

          {/* Checkboxes */}
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBorders}
                onChange={(e) => setShowBorders(e.target.checked)}
                className="rounded border-slate-300 text-black focus:ring-black w-3.5 h-3.5 cursor-pointer"
              />
              Borders
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highlightActive}
                onChange={(e) => setHighlightActive(e.target.checked)}
                className="rounded border-slate-300 text-black focus:ring-black w-3.5 h-3.5 cursor-pointer"
              />
              Highlight
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
