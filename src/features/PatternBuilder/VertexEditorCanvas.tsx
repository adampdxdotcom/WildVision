import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Vertex } from './types';
import { Plus, Trash2, Grid, Check, HelpCircle, X } from 'lucide-react';

export default function VertexEditorCanvas() {
  const {
    builderTiles: tiles,
    activeTileIndex,
    selectedVertexIndex,
    setSelectedVertexIndex,
    updateVertexInActive,
    addVertexToActive,
    deleteVertexFromActive,
    snapToGrid,
    snapResolution,
  } = useAppStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingPivot, setIsDraggingPivot] = useState(false);
  const [hoveredVertexIndex, setHoveredVertexIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<Vertex | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const activeTile = tiles[activeTileIndex];

  if (!activeTile) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
        <p className="text-slate-500 font-medium">Select or create a tile to start editing vertices</p>
      </div>
    );
  }

  const S = Math.min(dimensions.width, dimensions.height);

  // Coordinate conversion: normalized [-0.5, 0.5] to screen [0, S]
  const normToScreenX = (x: number) => S / 2 + x * S;
  const normToScreenY = (y: number) => S / 2 + y * S; // screen Y goes down

  // Coordinate conversion: screen [0, S] to normalized [-0.5, 0.5]
  const screenToNorm = (clientX: number, clientY: number, rect: DOMRect): Vertex => {
    const ratioX = (clientX - rect.left) / rect.width;
    const ratioY = (clientY - rect.top) / rect.height;
    let x = ratioX - 0.5;
    let y = ratioY - 0.5;
    // Bound check
    x = Math.max(-0.5, Math.min(0.5, x));
    y = Math.max(-0.5, Math.min(0.5, y));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, index: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedVertexIndex(index);
    setIsDragging(true);
    setIsDraggingPivot(false);
  };

  const handlePivotPointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDraggingPivot(true);
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    
    const norm = screenToNorm(e.clientX, e.clientY, rect);
    setCursorPos(norm);

    if (isDraggingPivot) {
      let finalX = norm.x;
      let finalY = norm.y;
      if (snapToGrid) {
        finalX = Math.round(finalX / snapResolution) * snapResolution;
        finalY = Math.round(finalY / snapResolution) * snapResolution;
      }
      useAppStore.getState().updateBuilderTileProperty(activeTileIndex, 'polarArray', {
        ...(activeTile.polarArray || { instances: 1, angleStep: 90, pivotX: 0, pivotY: 0 }),
        pivotX: finalX,
        pivotY: finalY
      });
    } else if (isDragging && selectedVertexIndex !== null) {
      updateVertexInActive(selectedVertexIndex, norm.x, norm.y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    setIsDraggingPivot(false);
  };

  // Add vertex on double click on the canvas background
  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const norm = screenToNorm(e.clientX, e.clientY, rect);

    let finalX = norm.x;
    let finalY = norm.y;

    if (snapToGrid) {
      finalX = Math.round(finalX / snapResolution) * snapResolution;
      finalY = Math.round(finalY / snapResolution) * snapResolution;
    }

    addVertexToActive({ x: parseFloat(finalX.toFixed(4)), y: parseFloat(finalY.toFixed(4)) });
  };

  // Generate SVG polygon points string
  const pointsString = activeTile.vertices
    .map(v => `${normToScreenX(v.x)},${normToScreenY(v.y)}`)
    .join(' ');

  // Generate Ghost clones for polar array
  const polarClones: string[] = [];
  const instances = activeTile.polarArray?.instances ?? 1;
  const pivotX = activeTile.polarArray?.pivotX ?? 0;
  const pivotY = activeTile.polarArray?.pivotY ?? 0;
  const angleStep = activeTile.polarArray?.angleStep ?? 90;

  if (instances > 1) {
    for (let i = 1; i < instances; i++) {
      const angleRad = (angleStep * i * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      
      const clonePointsStr = activeTile.vertices.map(v => {
        // Translate to origin
        const dx = v.x - pivotX;
        const dy = v.y - pivotY;
        
        // Rotate
        const rx = dx * cosA - dy * sinA;
        const ry = dx * sinA + dy * cosA;
        
        // Translate back
        const finalX = rx + pivotX;
        const finalY = ry + pivotY;
        
        return `${normToScreenX(finalX)},${normToScreenY(finalY)}`;
      }).join(' ');
      
      polarClones.push(clonePointsStr);
    }
  }

  // Grid line coordinates based on resolution or step of 0.05
  const gridSteps: number[] = [];
  const step = snapResolution;
  for (let val = -0.5; val <= 0.5 + 0.001; val += step) {
    gridSteps.push(parseFloat(val.toFixed(4)));
  }

  // Calculate midpoints of lines to offer visual "split edge" buttons
  const edgeMidpoints = activeTile.vertices.map((v, i) => {
    const nextV = activeTile.vertices[(i + 1) % activeTile.vertices.length];
    const midX = (v.x + nextV.x) / 2;
    const midY = (v.y + nextV.y) / 2;
    return {
      x: midX,
      y: midY,
      insertIndex: i + 1, // insert after current index
    };
  });

  const handleSplitEdge = (midpoint: { x: number; y: number; insertIndex: number }) => {
    // Add vertex at midpoint
    const newVertices = [...activeTile.vertices];
    newVertices.splice(midpoint.insertIndex, 0, { x: midpoint.x, y: midpoint.y });
    
    // Direct store manipulation for splitting:
    useAppStore.getState().updateBuilderTileProperty(activeTileIndex, 'vertices', newVertices);
    setSelectedVertexIndex(midpoint.insertIndex);
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 min-w-0">
      {/* Main Coordinate Plane */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-0 relative">
        <svg
          id="vertex-canvas-svg"
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${S} ${S}`}
          preserveAspectRatio="xMidYMid meet"
          className="bg-white rounded-none border border-[#E5E7EB] cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
            {/* Grid Lines */}
            <g stroke="#f1f5f9" strokeWidth="1">
              {gridSteps.map((val, idx) => {
                const screenVal = normToScreenX(val);
                return (
                  <React.Fragment key={idx}>
                    {/* Vertical Grid Line */}
                    <line x1={screenVal} y1={0} x2={screenVal} y2={S} />
                    {/* Horizontal Grid Line */}
                    <line x1={0} y1={screenVal} x2={S} y2={screenVal} />
                  </React.Fragment>
                );
              })}
            </g>

            {/* Main Axes (X = 0, Y = 0) */}
            <g stroke="#94a3b8" strokeWidth="1.5">
              <line x1={S / 2} y1={0} x2={S / 2} y2={S} strokeDasharray="4 4" />
              <line x1={0} y1={S / 2} x2={S} y2={S / 2} strokeDasharray="4 4" />
            </g>

            {/* Boundary Box representing [-0.5, 0.5] bounds */}
            <rect
              x={0}
              y={0}
              width={S}
              height={S}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
            />

            {/* Text labels for boundaries */}
            <text x={8} y={20} className="text-[10px] font-mono fill-slate-400 font-semibold select-none">(-0.5, -0.5)</text>
            <text x={S - 65} y={20} className="text-[10px] font-mono fill-slate-400 font-semibold select-none">(0.5, -0.5)</text>
            <text x={8} y={S - 10} className="text-[10px] font-mono fill-slate-400 font-semibold select-none">(-0.5, 0.5)</text>
            <text x={S - 60} y={S - 10} className="text-[10px] font-mono fill-slate-400 font-semibold select-none">(0.5, 0.5)</text>
            <text x={S / 2 + 6} y={15} className="text-[9px] font-mono fill-slate-500 select-none">Y-Axis</text>
            <text x={S - 45} y={S / 2 - 6} className="text-[9px] font-mono fill-slate-500 select-none">X-Axis</text>

            {/* Render Filled Polygon Shape of Active Tile */}
            {activeTile.vertices.length >= 3 && (
              <>
                {/* Polar Clones */}
                {polarClones.map((clonePts, i) => (
                  <polygon
                    key={`clone-${i}`}
                    points={clonePts}
                    fill={activeTile.color}
                    fillOpacity="0.05"
                    stroke={activeTile.color}
                    strokeWidth="1.5"
                    strokeDasharray="2 4"
                    pointerEvents="none"
                  />
                ))}
                <polygon
                  points={pointsString}
                  fill={activeTile.color}
                  fillOpacity="0.15"
                  stroke={activeTile.color}
                  strokeWidth="2.5"
                  className="transition-colors duration-200"
                />
              </>
            )}

            {/* Render Lines connecting vertices */}
            {activeTile.vertices.map((v, i) => {
              const nextV = activeTile.vertices[(i + 1) % activeTile.vertices.length];
              return (
                <line
                  key={`line-${i}`}
                  x1={normToScreenX(v.x)}
                  y1={normToScreenY(v.y)}
                  x2={normToScreenX(nextV.x)}
                  y2={normToScreenY(nextV.y)}
                  stroke={activeTile.color}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.4"
                />
              );
            })}

            {/* Edge Midpoint Intersections (Add Vertex helper on hover / click) */}
            {edgeMidpoints.map((mid, idx) => {
              const sx = normToScreenX(mid.x);
              const sy = normToScreenY(mid.y);
              return (
                <g key={`midpoint-group-${idx}`} className="group/midpoint cursor-pointer">
                  {/* Larger invisible pointer target for easy clicking */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={12}
                    fill="transparent"
                    onClick={() => handleSplitEdge(mid)}
                  />
                  {/* Split visual dot */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={4}
                    fill="white"
                    stroke={activeTile.color}
                    strokeWidth="1.5"
                    className="opacity-0 group-hover/midpoint:opacity-100 transition-opacity duration-150"
                    onClick={() => handleSplitEdge(mid)}
                  />
                  {/* Subtle tooltip */}
                  <title>Click to add vertex here (split edge)</title>
                </g>
              );
            })}

            {/* Render Vertices as Drag-circles */}
            {activeTile.vertices.map((v, i) => {
              const sx = normToScreenX(v.x);
              const sy = normToScreenY(v.y);
              const isSelected = selectedVertexIndex === i;
              const isHovered = hoveredVertexIndex === i;

              return (
                <g key={i}>
                  {/* Invisible larger touch target circle */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={15}
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => handlePointerDown(e, i)}
                    onPointerEnter={() => setHoveredVertexIndex(i)}
                    onPointerLeave={() => setHoveredVertexIndex(null)}
                  />
                  {/* Visible circle */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isSelected ? 7 : isHovered ? 6 : 4.5}
                    fill={isSelected ? '#ffffff' : activeTile.color}
                    stroke={isSelected ? activeTile.color : '#ffffff'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-all duration-150 shadow-sm"
                    pointerEvents="none"
                  />
                  {/* Vertex Label */}
                  <text
                    x={sx}
                    y={sy - 10}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-slate-600 font-bold select-none pointer-events-none bg-white px-1"
                  >
                    #{i + 1}
                  </text>
                </g>
              );
            })}

            {/* Pivot Node for Polar Array */}
            {activeTile.polarArray && activeTile.polarArray.instances > 1 && (
              <g className="group/pivot">
                {/* Invisible larger touch target circle */}
                <rect
                  x={normToScreenX(activeTile.polarArray.pivotX) - 15}
                  y={normToScreenY(activeTile.polarArray.pivotY) - 15}
                  width={30}
                  height={30}
                  fill="transparent"
                  className="cursor-crosshair active:cursor-grabbing"
                  onPointerDown={handlePivotPointerDown}
                />
                {/* Visible crosshair/square */}
                <rect
                  x={normToScreenX(activeTile.polarArray.pivotX) - 4}
                  y={normToScreenY(activeTile.polarArray.pivotY) - 4}
                  width={8}
                  height={8}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-150 group-hover/pivot:scale-125 shadow-sm"
                  pointerEvents="none"
                />
                <text
                  x={normToScreenX(activeTile.polarArray.pivotX)}
                  y={normToScreenY(activeTile.polarArray.pivotY) - 10}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-emerald-600 font-bold select-none pointer-events-none bg-white px-1 opacity-0 group-hover/pivot:opacity-100 transition-opacity"
                >
                  PIVOT
                </text>
              </g>
            )}
          </svg>

          {/* Mouse Coordinate HUD Overlay */}
          <div className="absolute bottom-4 left-4 bg-black text-white font-mono text-[10px] px-3.5 py-2 rounded-none border border-black shadow-md flex items-center gap-3">
            <div>
              <span className="text-[#9CA3AF] font-semibold mr-1">X:</span>
              <span>{cursorPos ? cursorPos.x.toFixed(3) : '0.000'}</span>
            </div>
            <div className="border-l border-[#6B7280] h-3" />
            <div>
              <span className="text-[#9CA3AF] font-semibold mr-1">Y:</span>
              <span>{cursorPos ? cursorPos.y.toFixed(3) : '0.000'}</span>
            </div>
            {snapToGrid && (
              <>
                <div className="border-l border-[#6B7280] h-3" />
                <div className="text-[#10b981] flex items-center gap-0.5 uppercase tracking-wider text-[9px] font-bold">
                  <Grid className="w-3 h-3" /> Snap
                </div>
              </>
            )}
          </div>

          {/* User Guide Overlay */}
          {showGuide && (
            <div className="absolute top-4 right-4 bg-white/95 border border-[#E5E7EB] text-[#1A1A1E] px-4 py-3 rounded-none shadow-xs text-[10px] max-w-[200px] flex gap-2">
              <HelpCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-black uppercase tracking-wider">Editor Guide</p>
                  <button onClick={() => setShowGuide(false)} className="text-[#9CA3AF] hover:text-black shrink-0 mt-[-2px] mr-[-4px] p-0.5 transition-colors" title="Close Guide">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ul className="list-disc pl-3.5 space-y-1 text-slate-500">
                  <li>Drag vertices with mouse.</li>
                  <li>Click edges to split/subdivide.</li>
                  <li>Double-click to append a vertex.</li>
                </ul>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
