import React from 'react';
import { Lock } from 'lucide-react';
import { useInteractiveActions } from './useInteractiveActions';
import { WallNodesOverlay } from './WallNodesOverlay';
import { SubAreaNodesOverlay } from './SubAreaNodesOverlay';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';

interface InteractiveNodesProps {
  wallToScreen: (x: number, y: number) => { px: number; py: number };
  dimensions: { width: number; height: number };
  setDraggingVertexIndex: (index: number | null) => void;
  setDraggingSubAreaVertexIndex: (index: number | null) => void;
  activeEditingSegmentId: number | null;
  setActiveEditingSegmentId: (index: number | null) => void;
  activeEditingSegmentSubAreaId?: string | null;
  setActiveEditingSegmentSubAreaId?: (id: string | null) => void;
}

export const InteractiveNodes: React.FC<InteractiveNodesProps> = React.memo(({
  wallToScreen,
  dimensions,
  setDraggingVertexIndex,
  setDraggingSubAreaVertexIndex,
  activeEditingSegmentId: editingLengthIndex,
  setActiveEditingSegmentId: setEditingLengthIndex,
  activeEditingSegmentSubAreaId: editingLengthSubAreaId = null,
  setActiveEditingSegmentSubAreaId: setEditingLengthSubAreaId = () => {},
}) => {
  const {
    editingAngleIndex,
    setEditingAngleIndex,
    editingAngleSubAreaId,
    setEditingAngleSubAreaId,
    angleInputValue,
    setAngleInputValue,
    lengthInputValue,
    setLengthInputValue,
    editingRiseIndex,
    setEditingRiseIndex,
    editingRiseSubAreaId,
    setEditingRiseSubAreaId,
    riseInputValue,
    setRiseInputValue,
    getSubAreaVertices,
    handleLengthSubmit,
    handleRiseSubmit,
    handleAngleSubmit,

    // Store read only states/selectors (Phase 3)
    wallVertices,
    subAreas,
    activeSubAreaId,
    activeTool,
    selectedVertexIndices,
    foldLines,
    setFoldLines,
    draftFoldNodeIndex,
    setDraftFoldNodeIndex,

    // Wall Interactivity (Phase 3)
    handleDeleteWallVertex,
    handleToggleWallAngleConstraint,
    handleToggleWallLengthConstraint,
    handleDoubleClickDeleteWallCurveNode,
    handleWallVertexClick,
    handleWallVertexMouseDown,

    // Subarea Interactivity (Phase 3)
    handleDeleteSubAreaVertex,
    handleToggleSubAreaAngleConstraint,
    handleToggleSubAreaLengthConstraint,
    handleDoubleClickDeleteSubAreaCurveNode,
    handleSubAreaVertexClick,
    handleSubAreaVertexMouseDown,
  } = useInteractiveActions(
    editingLengthIndex,
    setEditingLengthIndex,
    editingLengthSubAreaId,
    setEditingLengthSubAreaId
  );

  const viewSettings = useAppStore(state => state.viewSettings);
  const lockedElements = useAppStore(state => state.lockedElements);
  const onlineUsers = useAppStore(state => state.onlineUsers);
  const user = useAuthStore(state => state.user);


  if (!viewSettings.canvas.showNodes) {
    return null;
  }

  return (
    <>
      <WallNodesOverlay
        wallToScreen={wallToScreen}
        dimensions={dimensions}
        setDraggingVertexIndex={setDraggingVertexIndex}
        editingLengthIndex={editingLengthIndex}
        setEditingLengthIndex={setEditingLengthIndex}
        editingAngleIndex={editingAngleIndex}
        setEditingAngleIndex={setEditingAngleIndex}
        angleInputValue={angleInputValue}
        setAngleInputValue={setAngleInputValue}
        lengthInputValue={lengthInputValue}
        setLengthInputValue={setLengthInputValue}
        editingRiseIndex={editingRiseIndex}
        setEditingRiseIndex={setEditingRiseIndex}
        riseInputValue={riseInputValue}
        setRiseInputValue={setRiseInputValue}
        handleLengthSubmit={handleLengthSubmit}
        handleRiseSubmit={handleRiseSubmit}
        handleAngleSubmit={handleAngleSubmit}
        setEditingAngleSubAreaId={setEditingAngleSubAreaId}
        setEditingRiseSubAreaId={setEditingRiseSubAreaId}

        // Phase 3 State Selectors & Event Delegation handlers
        wallVertices={wallVertices}
        activeTool={activeTool}
        selectedVertexIndices={selectedVertexIndices}
        handleDeleteWallVertex={handleDeleteWallVertex}
        handleToggleWallAngleConstraint={handleToggleWallAngleConstraint}
        handleToggleWallLengthConstraint={handleToggleWallLengthConstraint}
        handleDoubleClickDeleteWallCurveNode={handleDoubleClickDeleteWallCurveNode}
        handleWallVertexClick={handleWallVertexClick}
        handleWallVertexMouseDown={handleWallVertexMouseDown}
        foldLines={foldLines}
        setFoldLines={setFoldLines}
        draftFoldNodeIndex={draftFoldNodeIndex}
        setDraftFoldNodeIndex={setDraftFoldNodeIndex}
      />

      
      {subAreas.map((sa) => {
        const lockUserId = lockedElements[`subarea_${sa.id}`];
        const isLockedByOther = lockUserId && lockUserId !== user?.id;
        if (!isLockedByOther) return null;
        const lockUser = onlineUsers[lockUserId];
        const lockColor = lockUser?.cursorColor || '#94a3b8';
        const centerPx = wallToScreen(sa.x + sa.width / 2, sa.y + sa.height / 2);
        return (
          <div
            key={`sa-lock-${sa.id}`}
            className="absolute z-20 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded px-2 py-1 shadow-sm text-xs font-medium text-white"
            style={{ left: centerPx.px, top: centerPx.py, backgroundColor: lockColor }}
          >
            <Lock size={12} className="mr-1" />
            {lockUser?.name || 'Editing'}
          </div>
        );
      })}

      <SubAreaNodesOverlay
        wallToScreen={wallToScreen}
        dimensions={dimensions}
        setDraggingSubAreaVertexIndex={setDraggingSubAreaVertexIndex}
        getSubAreaVertices={getSubAreaVertices}
        editingAngleIndex={editingAngleIndex}
        setEditingAngleIndex={setEditingAngleIndex}
        editingAngleSubAreaId={editingAngleSubAreaId}
        setEditingAngleSubAreaId={setEditingAngleSubAreaId}
        angleInputValue={angleInputValue}
        setAngleInputValue={setAngleInputValue}
        editingRiseIndex={editingRiseIndex}
        setEditingRiseIndex={setEditingRiseIndex}
        editingRiseSubAreaId={editingRiseSubAreaId}
        setEditingRiseSubAreaId={setEditingRiseSubAreaId}
        riseInputValue={riseInputValue}
        setRiseInputValue={setRiseInputValue}
        handleRiseSubmit={handleRiseSubmit}
        handleAngleSubmit={handleAngleSubmit}

        editingLengthIndex={editingLengthIndex}
        setEditingLengthIndex={setEditingLengthIndex}
        editingLengthSubAreaId={editingLengthSubAreaId}
        setEditingLengthSubAreaId={setEditingLengthSubAreaId}
        lengthInputValue={lengthInputValue}
        setLengthInputValue={setLengthInputValue}
        handleLengthSubmit={handleLengthSubmit}

        // Phase 3 State Selectors & Event Delegation handlers
        subAreas={subAreas}
        activeSubAreaId={activeSubAreaId}
        activeTool={activeTool}
        handleDeleteSubAreaVertex={handleDeleteSubAreaVertex}
        handleToggleSubAreaAngleConstraint={handleToggleSubAreaAngleConstraint}
        handleToggleSubAreaLengthConstraint={handleToggleSubAreaLengthConstraint}
        handleDoubleClickDeleteSubAreaCurveNode={handleDoubleClickDeleteSubAreaCurveNode}
        handleSubAreaVertexClick={handleSubAreaVertexClick}
        handleSubAreaVertexMouseDown={handleSubAreaVertexMouseDown}
      />
    </>
  );
});
