import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { Lock, Unlock } from 'lucide-react';
import { getInternalAngle, getSignedArea } from '../../../utils/geometry';
import { SubArea } from '../../../types';

interface SubAreaSegmentLengthBadgeProps {
  i: number;
  subAreaId: string;
  A_node: any;
  B_node: any;
  wallToScreen: (x: number, y: number) => { px: number; py: number };
  handleToggleSubAreaLengthConstraint: (subAreaId: string, index: number, currentLen: number) => void;
  handleLengthSubmit: (customIndex?: number | null, customValue?: string) => void;
  initialLength: number;
  autoFocus?: boolean;
}

const SubAreaSegmentLengthBadge: React.FC<SubAreaSegmentLengthBadgeProps> = ({
  i,
  subAreaId,
  A_node,
  B_node,
  wallToScreen,
  handleToggleSubAreaLengthConstraint,
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
        className="flex bg-white border-2 border-amber-600 rounded-full shadow-md overflow-hidden items-center pointer-events-auto shadow-amber-600/20"
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
          type="button"
          className={`pr-2.5 pl-1 py-1 flex items-center justify-center transition-colors ${
            isLLocked ? 'text-amber-600 hover:text-amber-700' : 'text-slate-400 hover:text-amber-500'
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleSubAreaLengthConstraint(subAreaId, i, currentLen);
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

interface SubAreaNodesOverlayProps {
  wallToScreen: (x: number, y: number) => { px: number; py: number };
  dimensions: { width: number; height: number };
  setDraggingSubAreaVertexIndex: (index: number | null) => void;

  // From useInteractiveActions
  getSubAreaVertices: (sa: SubArea) => any[];
  editingAngleIndex: number | null;
  setEditingAngleIndex: (index: number | null) => void;
  editingAngleSubAreaId: string | null;
  setEditingAngleSubAreaId: (id: string | null) => void;
  angleInputValue: string;
  setAngleInputValue: (val: string) => void;
  editingRiseIndex: number | null;
  setEditingRiseIndex: (index: number | null) => void;
  editingRiseSubAreaId: string | null;
  setEditingRiseSubAreaId: (id: string | null) => void;
  riseInputValue: string;
  setRiseInputValue: (val: string) => void;
  handleRiseSubmit: () => void;
  handleAngleSubmit: () => void;

  editingLengthIndex: number | null;
  setEditingLengthIndex: (index: number | null) => void;
  editingLengthSubAreaId: string | null;
  setEditingLengthSubAreaId: (id: string | null) => void;
  lengthInputValue: string;
  setLengthInputValue: (val: string) => void;
  handleLengthSubmit: (customIndex?: number | null, customValue?: string) => void;

  // States from hook (Phase 3)
  subAreas: SubArea[];
  activeSubAreaId: string | null;
  activeTool: string;

  // Interactive Accent Actions from hook (Phase 3)
  handleDeleteSubAreaVertex: (subAreaId: string, index: number) => void;
  handleToggleSubAreaAngleConstraint: (subAreaId: string, index: number, currentAngle: number) => void;
  handleToggleSubAreaLengthConstraint: (subAreaId: string, index: number, currentLen: number) => void;
  handleDoubleClickDeleteSubAreaCurveNode: (subAreaId: string, index: number) => void;
  handleSubAreaVertexClick: (subAreaId: string, index: number, isCurveNode: boolean, currentAngle: number, currentRiseStr: string) => void;
  handleSubAreaVertexMouseDown: (index: number, setDraggingSubAreaVertexIndex: (idx: number | null) => void) => void;
}

export const SubAreaNodesOverlay: React.FC<SubAreaNodesOverlayProps> = ({
  wallToScreen,
  dimensions,
  setDraggingSubAreaVertexIndex,
  getSubAreaVertices,
  editingAngleIndex,
  setEditingAngleIndex,
  editingAngleSubAreaId,
  setEditingAngleSubAreaId,
  angleInputValue,
  setAngleInputValue,
  editingRiseIndex,
  setEditingRiseIndex,
  editingRiseSubAreaId,
  setEditingRiseSubAreaId,
  riseInputValue,
  setRiseInputValue,
  handleRiseSubmit,
  handleAngleSubmit,

  editingLengthIndex,
  setEditingLengthIndex,
  editingLengthSubAreaId,
  setEditingLengthSubAreaId,
  lengthInputValue,
  setLengthInputValue,
  handleLengthSubmit,

  // Hook states
  subAreas,
  activeSubAreaId,
  activeTool,

  // Handlers
  handleDeleteSubAreaVertex,
  handleToggleSubAreaAngleConstraint,
  handleToggleSubAreaLengthConstraint,
  handleDoubleClickDeleteSubAreaCurveNode,
  handleSubAreaVertexClick,
  handleSubAreaVertexMouseDown,
}) => {

  const lockedElements = useAppStore(state => state.lockedElements);
  const onlineUsers = useAppStore(state => state.onlineUsers);
  const user = useAuthStore(state => state.user);

  if (activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'pen' && activeTool !== 'pen-arch' && activeTool !== 'marquee') return null;
  if (!activeSubAreaId) return null;

  const activeSa = subAreas.find((sa) => sa.id === activeSubAreaId);
  if (!activeSa || activeSa.locked) return null;

  const saVertices = getSubAreaVertices(activeSa);

  return (
    <>
      {saVertices.map((v, i) => {
        const pt = wallToScreen(v.x, v.y);
        if (
          pt.px < -20 ||
          pt.py < -20 ||
          pt.px > dimensions.width + 20 ||
          pt.py > dimensions.height + 20
        )
          return null;

        const n = saVertices.length;
        const A = saVertices[(i - 1 + n) % n];
        const B = saVertices[i] as any;
        const C = saVertices[(i + 1) % n];

        const isCCW = getSignedArea(saVertices) >= 0;
        const currentAngle = getInternalAngle(A, B, C, isCCW);

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

        // Segment Length Badge Setup
        const elementId = `subarea_node_${activeSubAreaId}_${i}`;
        const lockUserId = lockedElements[elementId];
        const isLockedByOther = lockUserId && lockUserId !== user?.id;
        const lockUser = isLockedByOther ? onlineUsers[lockUserId] : null;
        const lockColor = lockUser?.cursorColor || '#94a3b8';
        const nextI = (i + 1) % n;
        const dxL = C.x - B.x;
        const dyL = C.y - B.y;
        const currentLen = Math.sqrt(dxL * dxL + dyL * dyL);

        const isSegmentActive =
          (editingLengthIndex === i && editingLengthSubAreaId === activeSubAreaId) ||
          (editingAngleIndex === i && editingAngleSubAreaId === activeSubAreaId) ||
          (editingAngleIndex === nextI && editingAngleSubAreaId === activeSubAreaId);

        return (
          <React.Fragment key={`sa-vertex-${activeSubAreaId}-${i}`}>
            {/* Passive / Active Segment Length edit badge */}
            {isSegmentActive && (
              <SubAreaSegmentLengthBadge
                i={i}
                subAreaId={activeSubAreaId}
                A_node={B}
                B_node={C}
                wallToScreen={wallToScreen}
                handleToggleSubAreaLengthConstraint={handleToggleSubAreaLengthConstraint}
                handleLengthSubmit={handleLengthSubmit}
                initialLength={currentLen}
                autoFocus={editingLengthIndex === i && editingLengthSubAreaId === activeSubAreaId}
              />
            )}

            {/* Accent Tile Angle or Rise Edit Badge */}
            {activeTool === 'select' && (
              isCurveNode ? (
                editingRiseIndex === i && editingRiseSubAreaId === activeSubAreaId ? (
                  <div
                    className="absolute z-30 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ left: badgeX, top: badgeY }}
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRiseSubmit();
                      }}
                    >
                      <input
                        type="number"
                        step="0.01"
                        className="w-16 px-1.5 py-0.5 text-xs text-center border-2 border-[#d97706] rounded bg-white font-mono shadow-md outline-none focus:ring-2 focus:ring-amber-300 pointer-events-auto"
                        value={riseInputValue}
                        onChange={(e) => setRiseInputValue(e.target.value)}
                        onBlur={handleRiseSubmit}
                        autoFocus
                      />
                    </form>
                  </div>
                ) : null
              ) : (
                editingAngleIndex === i && editingAngleSubAreaId === activeSubAreaId ? (
                  <div
                    className="absolute z-30 flex items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ left: badgeX, top: badgeY }}
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAngleSubmit();
                      }}
                      className="inline-flex items-center bg-white border-2 border-amber-500 rounded shadow-md overflow-hidden"
                    >
                      <input
                        type="number"
                        step="0.1"
                        className="w-14 px-1 py-0.5 text-xs text-center font-mono outline-none border-r border-slate-200"
                        value={angleInputValue}
                        onChange={(e) => setAngleInputValue(e.target.value)}
                        onBlur={handleAngleSubmit}
                        autoFocus
                      />
                      <button
                        type="button"
                        className={`p-1 flex items-center justify-center transition-colors ${
                          B.isAngleLocked
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleSubAreaAngleConstraint(activeSubAreaId, i, currentAngle);
                        }}
                        title={B.isAngleLocked ? 'Unlock angle constraint' : 'Lock angle constraint'}
                      >
                        {B.isAngleLocked ? (
                          <Lock size={11} strokeWidth={2.5} />
                        ) : (
                          <Unlock size={11} strokeWidth={2.5} />
                        )}
                      </button>
                    </form>
                  </div>
                ) : null
              )
            )}

            {/* SubArea Grab/Action Dot */}
            <div
              title={
                isLockedByOther ? `Locked by ${lockUser?.name || 'another user'}` :
                activeTool === 'eraser'
                  ? `${B.isCurveNode ? 'Arch' : 'Corner'} Node: Click to delete`
                  : B.isCurveNode
                  ? 'Drag to adjust arch. Double-click to remove.'
                  : 'Drag to move corner'
              }
              className={`absolute flex items-center justify-center w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full border-2 border-white shadow-md transition-transform duration-75 z-25 ${isLockedByOther ? 'pointer-events-none scale-125' : 'pointer-events-auto hover:scale-125'} ${
                isLockedByOther ? '' : activeTool === 'eraser'
                  ? 'bg-rose-500 hover:bg-rose-600 ring-2 ring-rose-300 cursor-pointer'
                  : B.isCurveNode
                  ? 'bg-amber-600 hover:bg-amber-700 cursor-move ring-1 ring-amber-400'
                  : 'bg-amber-500 hover:bg-amber-600 cursor-move ring-1 ring-amber-300'
              }`}
              style={{ left: pt.px, top: pt.py, ...(isLockedByOther ? { backgroundColor: lockColor } : {}) }}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'eraser') {
                  handleDeleteSubAreaVertex(activeSubAreaId, i);
                } else if (activeTool === 'select') {
                  handleSubAreaVertexClick(activeSubAreaId, i, B.isCurveNode, currentAngle, currentRiseStr);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (B.isCurveNode) {
                  handleDoubleClickDeleteSubAreaCurveNode(activeSubAreaId, i);
                }
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleSubAreaVertexMouseDown(i, setDraggingSubAreaVertexIndex);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleSubAreaVertexMouseDown(i, setDraggingSubAreaVertexIndex);
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
