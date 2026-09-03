import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { getInternalAngle, getSignedArea } from '../../../utils/geometry';
import { FoldLine } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';

interface SegmentLengthBadgeProps {
  i: number;
  nLen: number;
  A_node: any;
  B_node: any;
  wallToScreen: (x: number, y: number) => { px: number; py: number };
  handleToggleWallLengthConstraint: (index: number, currentLen: number) => void;
  handleLengthSubmit: (customIndex?: number | null, customValue?: string) => void;
  initialLength: number;
  autoFocus?: boolean;
}

const SegmentLengthBadge: React.FC<SegmentLengthBadgeProps> = ({
  i,
  nLen,
  A_node,
  B_node,
  wallToScreen,
  handleToggleWallLengthConstraint,
  handleLengthSubmit,
  initialLength,
  autoFocus = false,
}) => {
  const [localVal, setLocalVal] = React.useState(initialLength.toFixed(2));

  React.useEffect(() => {
    setLocalVal(initialLength.toFixed(2));
  }, [initialLength]);

  const midX = (A_node.x + B_node.x) / 2;
  const midY = (A_node.y + B_node.y) / 2;
  const ptMid = wallToScreen(midX, midY);

  const dxL = B_node.x - A_node.x;
  const dyL = B_node.y - A_node.y;
  const currentLen = Math.sqrt(dxL * dxL + dyL * dyL);

  let badgeX = ptMid.px;
  let badgeY = ptMid.py;
  if (currentLen > 0.1) {
    const nx = dyL / currentLen;
    const ny = dxL / currentLen;
    const offsetPixels = 16;
    badgeX = ptMid.px + nx * offsetPixels;
    badgeY = ptMid.py + ny * offsetPixels;
  }
  const isLLocked = A_node.isLengthLocked;

  const handleSubmit = () => {
    handleLengthSubmit(i, localVal);
  };

  return (
    <div
      className="absolute z-30 flex items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{ left: badgeX, top: badgeY }}
    >
      <div
        className="flex bg-white border-2 border-indigo-500 rounded-full shadow-md overflow-hidden items-center pointer-events-auto shadow-indigo-500/20"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <input
            type="number"
            step="0.01"
            className="w-20 px-2 py-0.5 text-xs text-center bg-white font-mono outline-none border-r border-slate-200"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={(e) => {
              if (e.relatedTarget && (e.relatedTarget as HTMLElement).getAttribute?.('data-node-edit-input') === 'true') {
                return;
              }
              handleSubmit();
            }}
            autoFocus={autoFocus}
            data-node-edit-input="true"
          />
        </form>
        <button
          className={`pr-2.5 pl-1 py-1 flex items-center justify-center transition-colors ${
            isLLocked ? 'text-indigo-600 hover:text-indigo-700' : 'text-slate-400 hover:text-indigo-500'
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleWallLengthConstraint(i, currentLen);
          }}
          title={isLLocked ? 'Unlock segment length' : 'Lock segment length'}
          data-node-edit-input="true"
        >
          {isLLocked ? <Lock size={12} strokeWidth={2.5} /> : <Unlock size={12} strokeWidth={2.5} />}
          <span className="text-[11px] font-mono font-semibold text-slate-600 ml-1">]</span>
        </button>
      </div>
    </div>
  );
};

interface WallNodesOverlayProps {
  wallToScreen: (x: number, y: number) => { px: number; py: number };
  dimensions: { width: number; height: number };
  setDraggingVertexIndex: (index: number | null) => void;
  editingLengthIndex: number | null;
  setEditingLengthIndex: (index: number | null) => void;

  // From useInteractiveActions
  editingAngleIndex: number | null;
  setEditingAngleIndex: (index: number | null) => void;
  angleInputValue: string;
  setAngleInputValue: (val: string) => void;
  lengthInputValue: string;
  setLengthInputValue: (val: string) => void;
  editingRiseIndex: number | null;
  setEditingRiseIndex: (index: number | null) => void;
  riseInputValue: string;
  setRiseInputValue: (val: string) => void;
  handleLengthSubmit: (customIndex?: number | null, customValue?: string) => void;
  handleRiseSubmit: () => void;
  handleAngleSubmit: () => void;
  setEditingAngleSubAreaId: (id: string | null) => void;
  setEditingRiseSubAreaId: (id: string | null) => void;

  // Render variables from custom hook (Phase 3)
  wallVertices: any[] | null;
  activeTool: string;
  selectedVertexIndices: number[];

  // Interactive Wall Actions from custom hook (Phase 3)
  handleDeleteWallVertex: (index: number) => void;
  handleToggleWallAngleConstraint: (index: number, currentAngle: number) => void;
  handleToggleWallLengthConstraint: (index: number, currentLen: number) => void;
  handleDoubleClickDeleteWallCurveNode: (index: number) => void;
  handleWallVertexClick: (index: number, isCurveNode: boolean, currentAngle: number, currentRiseStr: string) => void;
  handleWallVertexMouseDown: (index: number, setDraggingVertexIndex: (idx: number | null) => void) => void;
  foldLines: FoldLine[];
  setFoldLines: (val: FoldLine[] | ((prev: FoldLine[]) => FoldLine[])) => void;
  draftFoldNodeIndex: number | null;
  setDraftFoldNodeIndex: (val: number | null | ((prev: number | null) => number | null)) => void;
}

export const WallNodesOverlay: React.FC<WallNodesOverlayProps> = ({
  
  wallToScreen,
  dimensions,
  setDraggingVertexIndex,
  editingLengthIndex,
  setEditingLengthIndex,
  editingAngleIndex,
  setEditingAngleIndex,
  angleInputValue,
  setAngleInputValue,
  lengthInputValue,
  setLengthInputValue,
  editingRiseIndex,
  setEditingRiseIndex,
  riseInputValue,
  setRiseInputValue,
  handleLengthSubmit,
  handleRiseSubmit,
  handleAngleSubmit,
  setEditingAngleSubAreaId,
  setEditingRiseSubAreaId,

  // Phase 3 props
  wallVertices,
  activeTool,
  selectedVertexIndices,
  handleDeleteWallVertex,
  handleToggleWallAngleConstraint,
  handleToggleWallLengthConstraint,
  handleDoubleClickDeleteWallCurveNode,
  handleWallVertexClick,
  handleWallVertexMouseDown,
  foldLines,
  setFoldLines,
  draftFoldNodeIndex,
  setDraftFoldNodeIndex,
}) => {

  const lockedElements = useAppStore(state => state.lockedElements);
  const onlineUsers = useAppStore(state => state.onlineUsers);
  const user = useAuthStore(state => state.user);

  const stitches = useAppStore(state => state.stitches);
  const setStitches = useAppStore(state => state.setStitches);
  const draftStitchNodeIndex = useAppStore(state => state.draftStitchNodeIndex);
  const setDraftStitchNodeIndex = useAppStore(state => state.setDraftStitchNodeIndex);
  const setIsCanvasDirty = useAppStore(state => state.setIsCanvasDirty);

  if (
    activeTool !== 'select' &&
    activeTool !== 'extrude' &&
    activeTool !== 'eraser' &&
    activeTool !== 'fold-line' &&
    activeTool !== 'pen' &&
    activeTool !== 'pen-arch' &&
    activeTool !== 'marquee' &&
    activeTool !== 'stitch'
  ) {
    return null;
  }

  return (
    <>
      {wallVertices?.map((v, i) => {
        const pt = wallToScreen(v.x, v.y);
        if (
          pt.px < -20 ||
          pt.py < -20 ||
          pt.px > dimensions.width + 20 ||
          pt.py > dimensions.height + 20
        )
          return null;

        const n = wallVertices.length;
        const A = wallVertices[(i - 1 + n) % n];
        const B = wallVertices[i];
        const C = wallVertices[(i + 1) % n];
        const isCCW = getSignedArea(wallVertices) >= 0;
        const currentAngle = getInternalAngle(A, B, C, isCCW);
        const elementId = `wall_node_${i}`;
        const lockUserId = lockedElements[elementId];
        const isLockedByOther = lockUserId && lockUserId !== user?.id;
        const lockUser = isLockedByOther ? onlineUsers[lockUserId] : null;
        const lockColor = lockUser?.cursorColor || '#94a3b8';

        // Calculate the inward bisector vector on the screen
        const ptA = wallToScreen(A.x, A.y);
        const ptC = wallToScreen(C.x, C.y);
        const sAngleBA = Math.atan2(ptA.py - pt.py, ptA.px - pt.px);
        const sAngleBC = Math.atan2(ptC.py - pt.py, ptC.px - pt.px);

        let bisectAngle = (sAngleBA + sAngleBC) / 2;
        let diff = Math.abs(sAngleBA - sAngleBC);
        if (diff > Math.PI) {
          bisectAngle += Math.PI;
        }
        if (currentAngle > 180) {
          bisectAngle += Math.PI;
        }

        const badgeDistance = 25;
        const badgeX = pt.px + Math.cos(bisectAngle) * badgeDistance;
        const badgeY = pt.py + Math.sin(bisectAngle) * badgeDistance;

        const isALocked = (A as any).isAngleLocked && !(A as any).isCurveNode;
        const isCLocked = (C as any).isAngleLocked && !(C as any).isCurveNode;
        const isFrozen = isALocked && isCLocked;

        const isCurveNode = (B as any).isCurveNode;
        let currentRiseStr = '';
        if (isCurveNode) {
          const midX = (A.x + C.x) / 2;
          const midY = (A.y + C.y) / 2;
          const rise = Math.sqrt(Math.pow(B.x - midX, 2) + Math.pow(B.y - midY, 2));
          currentRiseStr = rise.toFixed(2);
        }

        return (
          <React.Fragment key={`vertex-${i}`}>
            {/* Angle or Rise Edit Badge */}
            {activeTool === 'select' && (
              isCurveNode ? (
                editingRiseIndex === i && (
                  <div
                    className="absolute z-30 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ left: badgeX, top: badgeY }}
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRiseSubmit();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        step="0.01"
                        className="w-16 px-1.5 py-0.5 text-xs text-center border-2 border-indigo-500 rounded bg-white font-mono shadow-md outline-none focus:ring-2 focus:ring-indigo-300 pointer-events-auto"
                        value={riseInputValue}
                        onChange={(e) => setRiseInputValue(e.target.value)}
                        onBlur={handleRiseSubmit}
                        autoFocus
                      />
                    </form>
                  </div>
                )
              ) : (
                editingAngleIndex === i ? (
                  <div
                    className="absolute z-30 flex items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ left: badgeX, top: badgeY }}
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAngleSubmit();
                      }}
                      className="inline-flex items-center bg-white border-2 border-indigo-500 rounded shadow-md overflow-hidden"
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        step="0.1"
                        className="w-16 px-1.5 py-0.5 text-xs text-center font-mono outline-none border-r border-slate-200"
                        value={angleInputValue}
                        onChange={(e) => setAngleInputValue(e.target.value)}
                        onBlur={(e) => {
                          if (e.relatedTarget && (e.relatedTarget as HTMLElement).getAttribute?.('data-node-edit-input') === 'true') {
                            return;
                          }
                          handleAngleSubmit();
                        }}
                        autoFocus
                        data-node-edit-input="true"
                      />
                      <button
                        type="button"
                        className={`p-1 flex items-center justify-center transition-colors ${
                          (B as any).isAngleLocked
                            ? 'text-indigo-600 hover:text-indigo-700'
                            : 'text-slate-400 hover:text-indigo-500'
                        }`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleWallAngleConstraint(i, currentAngle);
                        }}
                        title={(B as any).isAngleLocked ? 'Unlock angle constraint' : 'Lock angle constraint'}
                        data-node-edit-input="true"
                      >
                        {(B as any).isAngleLocked ? (
                          <Lock size={11} strokeWidth={2.5} />
                        ) : (
                          <Unlock size={11} strokeWidth={2.5} />
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  true && (
                    <div
                      className="absolute z-30 flex items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto select-none"
                      style={{ left: badgeX, top: badgeY }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleWallAngleConstraint(i, currentAngle);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={(B as any).isAngleLocked ? "Click to Unlock angle constraint" : "Click to Lock angle constraint"}
                        className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold border-2 rounded-full shadow-md transition-colors pointer-events-auto ${
                          (B as any).isAngleLocked
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 hover:bg-slate-50 shadow-indigo-500/15"
                            : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50 shadow-slate-500/15"
                        }`}
                      >
                        {(B as any).isAngleLocked ? (
                          <Lock size={10} strokeWidth={3} className="text-indigo-600" />
                        ) : (
                          <Unlock size={10} strokeWidth={3} className="text-slate-400" />
                        )}
                        <span>{currentAngle.toFixed(1)}°</span>
                      </button>
                    </div>
                  )
                )
              )
            )}

            {/* Length Edit Badge */}
            {activeTool === 'select' && (() => {
              const nLen = wallVertices.length;
              const nextI = (i + 1) % nLen;
              const A_node = wallVertices[i] as any;
              const B_node = wallVertices[nextI] as any;
              if (A_node.isCurveNode || B_node.isCurveNode) return null;

              // Display the length badge if this segment is actively selected for editing,
              // or if either adjacent corner node of this segment is selected for editing.
              const isSegmentActive =
                editingLengthIndex === i ||
                editingAngleIndex === i ||
                editingAngleIndex === nextI;

              if (!isSegmentActive) return null;

              const dxL = B_node.x - A_node.x;
              const dyL = B_node.y - A_node.y;
              const currentLen = Math.sqrt(dxL * dxL + dyL * dyL);

              return (
                <SegmentLengthBadge
                  i={i}
                  nLen={nLen}
                  A_node={A_node}
                  B_node={B_node}
                  wallToScreen={wallToScreen}
                  handleToggleWallLengthConstraint={handleToggleWallLengthConstraint}
                  handleLengthSubmit={handleLengthSubmit}
                  initialLength={currentLen}
                  autoFocus={editingLengthIndex === i}
                />
              );
            })()}

            {/* Vertex Grab Dot */}
            <div
              title={
                isLockedByOther ? `Locked by ${lockUser?.name || 'another user'}` :
                activeTool === 'eraser'
                  ? `${(B as any).isCurveNode ? 'Arch' : 'Corner'} Node: Click to delete`
                  : activeTool === 'fold-line'
                  ? draftFoldNodeIndex === i
                    ? 'Selected start node. Click another node to create fold line, or click again to cancel'
                    : draftFoldNodeIndex === null
                    ? 'Click to set start of fold line'
                    : 'Click to set end of fold line'
                  : activeTool === 'stitch'
                  ? draftStitchNodeIndex === i
                    ? 'Selected start node. Click another node to stitch, or click again to cancel'
                    : draftStitchNodeIndex === null
                    ? 'Click to set first node of stitch connection'
                    : 'Click to set second node of stitch connection'
                  : (B as any).isCurveNode
                  ? 'Drag to adjust arch. Double-click to remove.'
                  : 'Drag to move corner'
              }
              className={`absolute flex items-center justify-center w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-2 border-white shadow-sm transition-transform z-20 ${isLockedByOther ? 'pointer-events-none scale-125' : 'pointer-events-auto'} ${
                isLockedByOther ? '' : selectedVertexIndices.includes(i)
                  ? 'bg-[#22c55e] hover:bg-[#16a34a] ring-2 ring-[#86efac] cursor-move scale-125'
                  : activeTool === 'eraser'
                  ? 'bg-rose-500 hover:bg-rose-600 ring-2 ring-rose-300 cursor-pointer hover:scale-125'
                  : activeTool === 'fold-line'
                  ? draftFoldNodeIndex === i
                    ? 'bg-amber-400 hover:bg-amber-500 ring-4 ring-amber-200 animate-pulse cursor-pointer scale-125'
                    : foldLines.some(f => f.startNodeIndex === i || f.endNodeIndex === i)
                    ? 'bg-[#22c55e] hover:bg-[#16a34a] ring-2 ring-[#86efac] cursor-pointer scale-125'
                    : 'bg-slate-400 hover:bg-slate-500 cursor-pointer hover:scale-125'
                  : activeTool === 'stitch'
                  ? draftStitchNodeIndex === i
                    ? 'bg-fuchsia-400 hover:bg-fuchsia-500 ring-4 ring-fuchsia-200 animate-pulse cursor-pointer scale-125'
                    : stitches.some(s => s.nodeAIndex === i || s.nodeBIndex === i)
                    ? 'bg-fuchsia-500 hover:bg-fuchsia-600 ring-2 ring-fuchsia-300 cursor-pointer scale-125'
                    : 'bg-slate-400 hover:bg-slate-500 cursor-pointer hover:scale-125'
                  : (B as any).isCurveNode
                  ? 'bg-red-500 hover:bg-red-600 cursor-move hover:scale-125'
                  : 'bg-blue-500 hover:bg-blue-600 cursor-move hover:scale-125'
              }`}
              style={{ left: pt.px, top: pt.py, ...(isLockedByOther ? { backgroundColor: lockColor } : {}) }}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'eraser') {
                  handleDeleteWallVertex(i);
                } else if (activeTool === 'fold-line') {
                  if (draftFoldNodeIndex === null) {
                    setDraftFoldNodeIndex(i);
                  } else if (draftFoldNodeIndex === i) {
                    setDraftFoldNodeIndex(null);
                  } else {
                    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
                    const newFold = {
                      id,
                      startNodeIndex: draftFoldNodeIndex,
                      endNodeIndex: i,
                      foldAngle: 90
                    };
                    setFoldLines([...foldLines, newFold]);
                    setDraftFoldNodeIndex(null);
                    setIsCanvasDirty(true);
                  }
                } else if (activeTool === 'stitch') {
                  if (draftStitchNodeIndex === null) {
                    setDraftStitchNodeIndex(i);
                  } else if (draftStitchNodeIndex === i) {
                    setDraftStitchNodeIndex(null);
                  } else {
                    const nodeA = wallVertices[draftStitchNodeIndex];
                    const nodeB = wallVertices[i];
                    if (nodeA && nodeB) {
                      const dx = Math.abs(nodeA.x - nodeB.x);
                      const dy = Math.abs(nodeA.y - nodeB.y);
                      if (Math.abs(dx - dy) > 1) {
                        alert('Discrepancy: The segments leading to these nodes are not equal lengths (ΔX: ' + dx.toFixed(1) + ', ΔY: ' + dy.toFixed(1) + '). They will not meet perfectly when folded.');
                      } else {
                        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
                        setStitches([...stitches, { id, nodeAIndex: draftStitchNodeIndex, nodeBIndex: i }]);
                        setDraftStitchNodeIndex(null);
                        setIsCanvasDirty(true);
                      }
                    }
                  }
                } else if (activeTool === 'select') {
                  handleWallVertexClick(i, (B as any).isCurveNode, currentAngle, currentRiseStr);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'fold-line' || activeTool === 'stitch' || activeTool === 'extrude') return;
                if ((B as any).isCurveNode) {
                  handleDoubleClickDeleteWallCurveNode(i);
                }
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (activeTool === 'fold-line' || activeTool === 'stitch' || activeTool === 'extrude') return;
                handleWallVertexMouseDown(i, setDraggingVertexIndex);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (activeTool === 'fold-line' || activeTool === 'stitch' || activeTool === 'extrude') return;
                handleWallVertexMouseDown(i, setDraggingVertexIndex);
              }}
            >
              {isLockedByOther && <Lock size={8} strokeWidth={4} className="text-white" />}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};
