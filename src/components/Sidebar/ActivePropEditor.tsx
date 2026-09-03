import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, Box, Trash2, Home, Maximize, Palette, Scissors, Map, Lock } from 'lucide-react';

export const ActivePropEditor: React.FC = () => {
  const { activeObjectId, sceneObjects, setActiveObjectId, updateSceneObject, removeSceneObject, roomDimensions, wallWidth, wallHeight } = useAppStore();

  const activeObject = activeObjectId && sceneObjects ? sceneObjects[activeObjectId] : undefined;

  if (!activeObject || (activeObject.type !== 'custom_box' && activeObject.type !== 'clay_model')) {
    return null;
  }

  const backWallZ = -roomDimensions.depth / 2;
  const leftWallX = -roomDimensions.width / 2;
  const rightWallX = roomDimensions.width / 2;
  
  const boxWidth = activeObject.metadata?.dimensions?.[0] || 0;
  const boxDepth = activeObject.metadata?.dimensions?.[2] || 0;

  const isSnappedToBack = Math.abs(activeObject.position[2] - (backWallZ + boxDepth / 2)) < 0.2;
  const isSnappedToLeft = Math.abs(activeObject.position[0] - (leftWallX + boxWidth / 2)) < 0.2;
  const isSnappedToRight = Math.abs(activeObject.position[0] - (rightWallX - boxWidth / 2)) < 0.2;

  const isSnapped = isSnappedToBack || isSnappedToLeft || isSnappedToRight;
  
  let targetWall: 'back' | 'left' | 'right' = 'back';
  if (isSnappedToBack) targetWall = 'back';
  else if (isSnappedToLeft) targetWall = 'left';
  else if (isSnappedToRight) targetWall = 'right';

  React.useEffect(() => {
    if (!isSnapped && activeObject.metadata?.isWallLocked) {
      updateSceneObject(activeObjectId, {
        metadata: { ...activeObject.metadata, isWallLocked: false }
      });
    }
  }, [isSnapped, activeObjectId, activeObject.metadata?.isWallLocked, updateSceneObject]);

  const handleLockToggle = () => {
    if (!activeObject || !activeObjectId || !isSnapped) return;
    const isCurrentlyLocked = activeObject.metadata?.isWallLocked === true;
    const nextLocked = !isCurrentlyLocked;
    
    const currentX = activeObject.position[0];
    const currentY = activeObject.position[1];
    const currentZ = activeObject.position[2];

    const height = activeObject.metadata?.dimensions?.[1] || 0;
    
    let newY = currentY;

    if (nextLocked) {
      newY = currentY + (height / 2);
    } else {
      newY = currentY - (height / 2);
    }
    
    updateSceneObject(activeObjectId, {
      position: [currentX, newY, currentZ],
      attachedPlane: nextLocked ? targetWall : 'floor',
      metadata: { ...activeObject.metadata, isWallLocked: nextLocked },
    });
  };

  
  const isWallLocked = activeObject.metadata?.isWallLocked === true;
  const objHeight = activeObject.metadata?.dimensions?.[1] || 0;
  const roomFloorY = -roomDimensions.height / 2;

  // Determine the true Y coordinate of the box's bottom edge
  const currentBottomY = isWallLocked 
    ? activeObject.position[1] - (objHeight / 2) 
    : activeObject.position[1];

  // Display 0 when touching the floor
  const displayElevation = Math.max(0, currentBottomY - roomFloorY);
  const maxElevation = Math.max(0, roomDimensions.height - objHeight);

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4">
      <div className="space-y-4 animate-fade-in pr-1.5 overflow-y-auto pb-8">
        <button
          onClick={() => setActiveObjectId(null)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </button>

        <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-3">
            <Box className="w-5 h-5" />
            <h3 className="font-bold text-sm">Editing Prop</h3>
          </div>

          {activeObject.type === 'custom_box' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prop Name</label>
              <input
                type="text"
                value={activeObject.metadata?.name || ''}
                onChange={(e) => updateSceneObject(activeObjectId, { metadata: { ...activeObject.metadata, name: e.target.value } })}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                placeholder="Custom Prop"
              />
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Scissors className="w-3 h-3 text-rose-500" />
              Remove Tiles Behind Object
            </span>
            <button
              onClick={() => updateSceneObject(activeObjectId, { cullTiles: !activeObject.cullTiles })}
              className={`w-8 h-4 rounded-full transition-colors relative ${activeObject.cullTiles ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeObject.cullTiles ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isSnapped ? 'text-slate-500' : 'text-slate-300'}`}>
                <Lock className={`w-3 h-3 ${isSnapped ? 'text-emerald-500' : 'text-slate-300'}`} />
                Lock to Wall
              </span>
              <button
                onClick={handleLockToggle}
                disabled={!isSnapped}
                className={`w-8 h-4 rounded-full transition-colors relative ${
                  !isSnapped ? 'bg-slate-100 cursor-not-allowed' :
                  activeObject.metadata?.isWallLocked ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeObject.metadata?.isWallLocked && isSnapped ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            {!isSnapped && (
              <div className="text-[9px] text-slate-400 italic">
                Drag this object flush against a wall in 3D to enable wall locking.
              </div>
            )}
            {activeObject.metadata?.isWallLocked && isSnapped && (
              <div className="text-[10px] text-slate-500 font-medium">
                Locked to {activeObject.attachedPlane.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Maximize className="w-3 h-3 text-amber-500" />
              Dimensions (W x H x D)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {['Width', 'Height', 'Depth'].map((dim, idx) => (
                <div key={dim} className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400">{dim}</span>
                  <input
                    type="number"
                    min="1"
                    value={activeObject.metadata?.dimensions?.[idx] || 12}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      const newDims = [...(activeObject.metadata?.dimensions || [12, 12, 12])];
                      newDims[idx] = val;
                      updateSceneObject(activeObjectId, { metadata: { ...activeObject.metadata, dimensions: newDims } });
                    }}
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3 h-3 text-fuchsia-500" />
              Color
            </span>
            <input
              type="color"
              value={activeObject.metadata?.color || activeObject.color || '#333333'}
              onChange={(e) => {
                const newColor = e.target.value;
                updateSceneObject(activeObjectId, {
                  color: newColor,
                  metadata: { ...activeObject.metadata, color: newColor }
                });
              }}
              className="w-full h-8 border border-slate-200 rounded cursor-pointer"
            />
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Maximize className="w-3 h-3 text-emerald-500" />
              Elevation from Floor
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={maxElevation}
                step={0.5}
                value={displayElevation}
                onChange={(e) => {
                  const sliderValue = parseFloat(e.target.value) || 0;
  // Convert UI value back to 3D bottom edge, then adjust for anchor type
  const newBottomY = roomFloorY + sliderValue;
  const newTrueY = isWallLocked ? newBottomY + (objHeight / 2) : newBottomY;
                  updateSceneObject(activeObjectId, { position: [activeObject.position[0], newTrueY, activeObject.position[2]] });
                }}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={maxElevation}
                  step={0.5}
                  value={Number(displayElevation.toFixed(2))}
                  onChange={(e) => {
                    const sliderValue = parseFloat(e.target.value) || 0;
  // Convert UI value back to 3D bottom edge, then adjust for anchor type
  const newBottomY = roomFloorY + sliderValue;
  const newTrueY = isWallLocked ? newBottomY + (objHeight / 2) : newBottomY;
                    updateSceneObject(activeObjectId, { position: [activeObject.position[0], newTrueY, activeObject.position[2]] });
                  }}
                  className="w-14 px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-500 text-right pr-4"
                />
                <span className="absolute right-1 top-1 text-[9px] text-slate-400 font-medium">in</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            removeSceneObject(activeObjectId);
            setActiveObjectId(null);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-xs rounded-xl transition-colors border border-red-200"
        >
          <Trash2 className="w-4 h-4" />
          Delete Prop
        </button>
      </div>
    </div>
  );
};
