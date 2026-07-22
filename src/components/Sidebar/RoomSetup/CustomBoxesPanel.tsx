import React from 'react';
import { Home, Box, Trash2, Plus, RotateCw, Lock, Unlock, Copy } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { SurfaceSelector } from '../SurfaceSelector';

export const CustomBoxesPanel: React.FC = () => {
  const { 
    roomDimensions,
    sceneObjects,
    addSceneObject,
    updateSceneObject,
    toggleObjectLock,
    removeSceneObject,
    activeObjectId,
    setActiveObjectId,
    viewMode,
    wallWidth,
    wallHeight,
    gridSize,
    snapToGrid: snapToGridActive
  } = useAppStore();

  const snapToGrid = (val: number) => {
    if (snapToGridActive && gridSize > 0) {
      return Math.round(val / gridSize) * gridSize;
    }
    return val;
  };

  return (
    <>
      {/* Custom Floor Props (Boxes) Section */}
      <div className="bg-slate-50 border border-slate-200/60 rounded p-4 mb-3 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-indigo-500" />
              Custom Floor Props (Boxes)
            </span>
            <span className="text-[9px] text-slate-500 font-medium leading-normal">
              Spawn solid boxes that slide on the floor plane
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const id = `custom-box-${Date.now()}`;
              let startX = 0;
              let startY = 0;
              const defaultZ = -(roomDimensions.depth / 2) + 12;

              if (viewMode === '2d') {
                startX = snapToGrid(0);
                startY = snapToGrid(0);
              }

              addSceneObject({
                id,
                type: 'custom_box',
                position: viewMode === '2d' 
                  ? [startX, startY, defaultZ] 
                  : [0, -roomDimensions.height / 2 + 12, defaultZ],
                rotation: [0, 0, 0],
                attachedPlane: viewMode === '2d' ? 'back' : 'floor',
                metadata: {
                  dimensions: [24, 24, 24], // default 24" cube
                  color: '#333333', // default dark gray
                  active_material_url: null,
                  showIn2D: viewMode === '2d',
                  isWallLocked: viewMode === '2d',
                  faces: {
                    top: { color: '', image_url: null },
                    bottom: { color: '', image_url: null },
                    front: { color: '', image_url: null },
                    back: { color: '', image_url: null },
                    left: { color: '', image_url: null },
                    right: { color: '', image_url: null },
                  }
                },
              });
              setActiveObjectId(id);
            }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Box</span>
          </button>
        </div>

        {/* Selected Box Inspector (Only visible when activeObjectId points to a custom_box) */}
        {(() => {
          const activeObj = activeObjectId ? sceneObjects[activeObjectId] : null;
          if (!activeObj || activeObj.type !== 'custom_box') return null;
          const dims = activeObj.metadata?.dimensions || [24, 24, 24];
          const boxColor = activeObj.metadata?.color || '#333333';

          return (
            <div className="bg-indigo-50 border border-indigo-200/60 rounded p-3 mb-3.5 animate-fade-in text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-indigo-500" />
                  Active Box Controls
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const id = `custom-box-${Date.now()}`;
                      addSceneObject({
                        id,
                        type: 'custom_box',
                        position: [activeObj.position[0] + 6, activeObj.position[1], activeObj.position[2] + 6], // offset 6 inches
                        rotation: [...activeObj.rotation],
                        attachedPlane: activeObj.attachedPlane,
                        isLocked: false,
                        metadata: JSON.parse(JSON.stringify(activeObj.metadata)),
                      });
                      setActiveObjectId(id);
                    }}
                    className="flex items-center gap-1 text-[8px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Box</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveObjectId(null)}
                    className="text-[8px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:border-indigo-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-white p-2.5 rounded border border-indigo-100/80 shadow-2xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">W (in)</label>
                    <input type="number" min="4" max="200" value={dims[0]} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 4;
                      updateSceneObject(activeObj.id, { metadata: { ...activeObj.metadata, dimensions: [val, dims[1], dims[2]] } });
                    }} className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">H (in)</label>
                    <input type="number" min="4" max="200" value={dims[1]} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 4;
                      updateSceneObject(activeObj.id, { metadata: { ...activeObj.metadata, dimensions: [dims[0], val, dims[2]] } });
                    }} className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">D (in)</label>
                    <input type="number" min="4" max="200" value={dims[2]} onChange={(e) => {
                      const val = parseFloat(e.target.value) || 4;
                      updateSceneObject(activeObj.id, { metadata: { ...activeObj.metadata, dimensions: [dims[0], dims[1], val] } });
                    }} className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                {/* Face Selection */}
                <div className="bg-slate-50 rounded border border-slate-200 p-2 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {['all', 'top', 'front', 'left', 'right', 'back'].map(face => {
                      const isAll = face === 'all';
                      let isActive = false;
                      if (isAll) {
                        isActive = ['top', 'front', 'left', 'right', 'back', 'bottom'].every(f => activeObj.metadata?.faces?.[f]?.image_url);
                      } else {
                        isActive = !!activeObj.metadata?.faces?.[face]?.image_url;
                      }

                      return (
                        <button
                          key={face}
                          type="button"
                          onClick={() => {
                            const facesToUpdate = isAll ? ['top', 'front', 'left', 'right', 'back', 'bottom'] : [face];
                            const currentFaces = activeObj.metadata?.faces || {};
                            let updatedFaces = JSON.parse(JSON.stringify(currentFaces));
                            const masterMaterial = activeObj.metadata?.active_material_url || null;
                            
                            const shouldTurnOff = facesToUpdate.every(f => !!updatedFaces[f]?.image_url);

                            facesToUpdate.forEach(f => {
                              const existing = updatedFaces[f] || { color: '', image_url: null };
                              updatedFaces[f] = { ...existing, image_url: shouldTurnOff ? null : masterMaterial };
                            });

                            updateSceneObject(activeObj.id, {
                              metadata: { ...activeObj.metadata, faces: updatedFaces }
                            });
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${isActive ? 'bg-indigo-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200'}`}
                        >
                          {face}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-12 flex-shrink-0">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Color</label>
                      <input
                        type="color"
                        value={activeObj.metadata?.color || '#333333'}
                        onChange={(e) => {
                          updateSceneObject(activeObj.id, {
                            metadata: { ...activeObj.metadata, color: e.target.value }
                          });
                        }}
                        className="w-full h-10 rounded cursor-pointer border border-slate-200 p-0"
                      />
                    </div>
                    <div className="flex-1 relative group">
                      <SurfaceSelector
                        label="Master Material"
                        currentUrl={activeObj.metadata?.active_material_url || undefined}
                        onSelect={(url) => {
                          const currentFaces = activeObj.metadata?.faces || {};
                          let updatedFaces = JSON.parse(JSON.stringify(currentFaces));
                          
                          ['top', 'front', 'left', 'right', 'back', 'bottom'].forEach(f => {
                            if (updatedFaces[f]?.image_url) {
                              updatedFaces[f].image_url = url;
                            }
                          });

                          updateSceneObject(activeObj.id, {
                            metadata: { ...activeObj.metadata, active_material_url: url, faces: updatedFaces }
                          });
                        }}
                      />
                      {activeObj.metadata?.active_material_url && (
                        <button
                          onClick={() => {
                            const currentFaces = activeObj.metadata?.faces || {};
                            let updatedFaces = JSON.parse(JSON.stringify(currentFaces));
                            
                            ['top', 'front', 'left', 'right', 'back', 'bottom'].forEach(f => {
                              if (updatedFaces[f]?.image_url) {
                                updatedFaces[f].image_url = null;
                              }
                            });

                            updateSceneObject(activeObj.id, {
                              metadata: { ...activeObj.metadata, active_material_url: null, faces: updatedFaces }
                            });
                          }}
                          title="Clear Master Material"
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow z-10"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotation Section */}
              <div className="mt-3 pt-3 border-t border-indigo-100/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-indigo-500" />
                    Y-Axis Rotation
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {Math.round((activeObj.rotation?.[1] || 0) * (180 / Math.PI))}°
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={Math.round(((activeObj.rotation?.[1] || 0) * (180 / Math.PI) + 360) % 360)}
                    onChange={(e) => {
                      const deg = parseFloat(e.target.value);
                      const rad = (deg * Math.PI) / 180;
                      updateSceneObject(activeObj.id, {
                        rotation: [0, rad, 0],
                      });
                    }}
                    className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => {
                        const rad = (deg * Math.PI) / 180;
                        updateSceneObject(activeObj.id, {
                          rotation: [0, rad, 0],
                        });
                      }}
                      className={`py-1 text-[9px] font-bold rounded border transition-colors cursor-pointer ${
                        Math.round(((activeObj.rotation?.[1] || 0) * (180 / Math.PI) + 360) % 360) === deg
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Elevation Section */}
              <div className="mt-3 pt-3 border-t border-indigo-100/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-3 h-3 text-emerald-500" />
                    Vertical Elevation
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {Math.round((activeObj.position[1] + roomDimensions.height / 2) * 10) / 10} in
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={Math.max(0, Math.round(activeObj.position[1] + roomDimensions.height / 2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const newY = -roomDimensions.height / 2 + val;
                      updateSceneObject(activeObj.id, {
                        position: [activeObj.position[0], newY, activeObj.position[2]],
                      });
                    }}
                    className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={Math.round((activeObj.position[1] + roomDimensions.height / 2) * 10) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const newY = -roomDimensions.height / 2 + val;
                      updateSceneObject(activeObj.id, {
                        position: [activeObj.position[0], newY, activeObj.position[2]],
                      });
                    }}
                    className="w-14 px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* List of active custom boxes */}
        {(() => {
          const boxes = Object.values(sceneObjects).filter((obj) => obj.type === 'custom_box');
          if (boxes.length === 0) {
            return (
              <div className="text-center py-4 px-2 border border-dashed border-slate-200 bg-white rounded">
                <span className="text-[10px] font-medium text-slate-400">
                  No floor boxes active. Click &quot;Add Box&quot; to spawn one.
                </span>
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              {boxes.map((box, index) => {
                const isSelected = activeObjectId === box.id;
                const dims = box.metadata?.dimensions || [24, 24, 24];
                const boxColor = box.metadata?.color || '#475569';

                return (
                  <div
                    key={box.id}
                    onClick={() => setActiveObjectId(box.id)}
                    className={`p-3 rounded border text-left bg-white transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-50'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          Box #{index + 1}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleObjectLock(box.id);
                          }}
                          className={`p-1 rounded transition cursor-pointer ${
                            box.isLocked
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={box.isLocked ? "Unlock Object" : "Lock Object"}
                        >
                          {box.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = `custom-box-${Date.now()}`;
                            addSceneObject({
                              id,
                              type: 'custom_box',
                              position: [box.position[0] + 6, box.position[1], box.position[2] + 6], // offset 6 inches
                              rotation: [...box.rotation],
                              attachedPlane: box.attachedPlane,
                              isLocked: false,
                              metadata: JSON.parse(JSON.stringify(box.metadata)),
                            });
                            setActiveObjectId(id);
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition cursor-pointer"
                          title="Copy Box"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSceneObject(box.id);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Delete Box"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dimensions & Color editing */}
                    <div className="flex flex-col gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">W (in)</label>
                          <input type="number" min="4" max="200" value={dims[0]} onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(box.id, { metadata: { ...box.metadata, dimensions: [val, dims[1], dims[2]] } });
                          }} className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">H (in)</label>
                          <input type="number" min="4" max="200" value={dims[1]} onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(box.id, { metadata: { ...box.metadata, dimensions: [dims[0], val, dims[2]] } });
                          }} className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">D (in)</label>
                          <input type="number" min="4" max="200" value={dims[2]} onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(box.id, { metadata: { ...box.metadata, dimensions: [dims[0], dims[1], val] } });
                          }} className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>

                      {/* Face Selection */}
                      <div className="bg-white rounded border border-slate-200 p-2 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {['all', 'top', 'front', 'left', 'right', 'back'].map(face => {
                            const isAll = face === 'all';
                            let isActive = false;
                            if (isAll) {
                              isActive = ['top', 'front', 'left', 'right', 'back', 'bottom'].every(f => box.metadata?.faces?.[f]?.image_url);
                            } else {
                              isActive = !!box.metadata?.faces?.[face]?.image_url;
                            }

                            return (
                              <button
                                key={face}
                                onClick={() => {
                                  const facesToUpdate = isAll ? ['top', 'front', 'left', 'right', 'back', 'bottom'] : [face];
                                  const currentFaces = box.metadata?.faces || {};
                                  let updatedFaces = JSON.parse(JSON.stringify(currentFaces));
                                  const masterMaterial = box.metadata?.active_material_url || null;
                                  
                                  const shouldTurnOff = facesToUpdate.every(f => !!updatedFaces[f]?.image_url);

                                  facesToUpdate.forEach(f => {
                                    const existing = updatedFaces[f] || { color: '', image_url: null };
                                    updatedFaces[f] = { ...existing, image_url: shouldTurnOff ? null : masterMaterial };
                                  });

                                  updateSceneObject(box.id, {
                                    metadata: { ...box.metadata, faces: updatedFaces }
                                  });
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >
                                {face}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-12 flex-shrink-0">
                            <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Color</label>
                            <input
                              type="color"
                              value={box.metadata?.color || '#333333'}
                              onChange={(e) => {
                                updateSceneObject(box.id, {
                                  metadata: { ...box.metadata, color: e.target.value }
                                });
                              }}
                              className="w-full h-10 rounded cursor-pointer border border-slate-200 p-0"
                            />
                          </div>
                          <div className="flex-1 relative group">
                            <SurfaceSelector
                              label="Master Material"
                              currentUrl={box.metadata?.active_material_url || undefined}
                              onSelect={(url) => {
                                const currentFaces = box.metadata?.faces || {};
                                let updatedFaces = JSON.parse(JSON.stringify(currentFaces));
                                
                                ['top', 'front', 'left', 'right', 'back', 'bottom'].forEach(f => {
                                  if (updatedFaces[f]?.image_url) {
                                    updatedFaces[f].image_url = url;
                                  }
                                });

                                updateSceneObject(box.id, {
                                  metadata: { ...box.metadata, active_material_url: url, faces: updatedFaces }
                                });
                              }}
                            />
                            {box.metadata?.active_material_url && (
                              <button
                                onClick={() => {
                                  const currentFaces = box.metadata?.faces || {};
                                  let updatedFaces = JSON.parse(JSON.stringify(currentFaces));
                                  
                                  ['top', 'front', 'left', 'right', 'back', 'bottom'].forEach(f => {
                                    if (updatedFaces[f]?.image_url) {
                                      updatedFaces[f].image_url = null;
                                    }
                                  });

                                  updateSceneObject(box.id, {
                                    metadata: { ...box.metadata, active_material_url: null, faces: updatedFaces }
                                  });
                                }}
                                title="Clear Master Material"
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow z-10"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rotation and Elevation Section for the Active Box */}
                      {isSelected && (
                        <div className="bg-white rounded border border-slate-200 p-2.5 mt-2 space-y-3">
                          {/* Y-Axis Rotation */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <RotateCw className="w-3 h-3 text-indigo-500" />
                                Y-Axis Rotation
                              </span>
                              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {Math.round(((box.rotation?.[1] || 0) * (180 / Math.PI) + 360) % 360)}°
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0"
                                max="360"
                                value={Math.round(((box.rotation?.[1] || 0) * (180 / Math.PI) + 360) % 360)}
                                onChange={(e) => {
                                  const deg = parseFloat(e.target.value);
                                  const rad = (deg * Math.PI) / 180;
                                  updateSceneObject(box.id, {
                                    rotation: [0, rad, 0],
                                  });
                                }}
                                className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            <div className="grid grid-cols-4 gap-1 mt-2">
                              {[0, 90, 180, 270].map((deg) => (
                                <button
                                  key={deg}
                                  type="button"
                                  onClick={() => {
                                    const rad = (deg * Math.PI) / 180;
                                    updateSceneObject(box.id, {
                                      rotation: [0, rad, 0],
                                    });
                                  }}
                                  className={`py-1 text-[9px] font-bold rounded border transition-colors cursor-pointer ${
                                    Math.round(((box.rotation?.[1] || 0) * (180 / Math.PI) + 360) % 360) === deg
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {deg}°
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Vertical Elevation */}
                          <div className="pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Home className="w-3 h-3 text-emerald-500" />
                                Vertical Elevation
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {Math.max(0, Math.round(box.position[1] + roomDimensions.height / 2))} in
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0"
                                max="120"
                                value={Math.max(0, Math.round(box.position[1] + roomDimensions.height / 2))}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const newY = -roomDimensions.height / 2 + val;
                                  updateSceneObject(box.id, {
                                    position: [box.position[0], newY, box.position[2]],
                                  });
                                }}
                                className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <input
                                type="number"
                                min="0"
                                max="300"
                                value={Math.max(0, Math.round(box.position[1] + roomDimensions.height / 2))}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const newY = -roomDimensions.height / 2 + val;
                                  updateSceneObject(box.id, {
                                    position: [box.position[0], newY, box.position[2]],
                                  });
                                }}
                                className="w-14 px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

    </>
  );
};
