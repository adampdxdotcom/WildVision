import React from 'react';
import { Box, Trash2, RotateCw, Lock, Unlock, Home } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const ClayModelsPanel: React.FC = () => {
  const { 
    roomDimensions,
    sceneObjects,
    addSceneObject,
    updateSceneObject,
    toggleObjectLock,
    removeSceneObject,
    activeObjectId,
    setActiveObjectId,
    libraryModels,
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
      {/* Custom 3D Models (Clay Override) Section */}
      <div className="bg-slate-50 border border-slate-200/60 rounded p-4 mb-3 animate-fade-in">
        <div className="flex flex-col gap-2.5 mb-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-indigo-500" />
                3D Clay Model Library
              </span>
              <span className="text-[9px] text-slate-500 font-medium leading-normal">
                Click any model to spawn it at the floor center
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {libraryModels.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const id = `clay-model-${Date.now()}`;
                  let startX = 0;
                  let startY = 0;
                  const defaultZ = -(roomDimensions.depth / 2) + ((m.dimensions ? m.dimensions[2] : 24) / 2);

                  if (viewMode === '2d') {
                    startX = snapToGrid(0);
                    startY = snapToGrid(0);
                  }

                  addSceneObject({
                    id,
                    type: 'clay_model',
                    position: viewMode === '2d' 
                      ? [startX, startY, defaultZ] 
                      : [0, -roomDimensions.height / 2 + ((m.dimensions ? m.dimensions[1] : 24) / 2), defaultZ],
                    rotation: [0, 0, 0],
                    attachedPlane: viewMode === '2d' ? 'back' : 'floor',
                    metadata: {
                      name: m.name,
                      showIn2D: viewMode === '2d',
                      isWallLocked: viewMode === '2d',
                      dimensions: m.dimensions || [24, 24, 24],
                      modelUrl: m.modelUrl,
                    },
                    color: m.color || '#f3f4f6', // Store the color mapping dynamically
                  });
                  setActiveObjectId(id);
                }}
                className="group relative flex flex-col items-center bg-white border border-slate-200 hover:border-indigo-500 rounded p-2 text-center transition cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50/50 transition">
                  <Box className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-600 transition truncate w-full mt-1.5">
                  {m.name}
                </span>
                <span className="text-[8px] font-mono text-slate-450">
                  {m.dimensions ? `${m.dimensions[0]}x${m.dimensions[1]}x${m.dimensions[2]}"` : 'N/A'}
                </span>
                {m.isCustom && (
                  <span className="absolute top-1 right-1 text-[7px] font-bold bg-indigo-500/10 text-indigo-650 px-1 rounded font-mono">
                    Custom
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Model Inspector (Only visible when activeObjectId points to a clay_model) */}
        {(() => {
          const activeObj = activeObjectId ? sceneObjects[activeObjectId] : null;
          if (!activeObj || activeObj.type !== 'clay_model') return null;
          const dims = activeObj.metadata?.dimensions || [24, 24, 24];

          return (
            <div className="bg-indigo-50 border border-indigo-200/60 rounded p-3 mb-3.5 animate-fade-in text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-indigo-500" />
                  Active Model Controls
                </span>
                <button
                  type="button"
                  onClick={() => setActiveObjectId(null)}
                  className="text-[8px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:border-indigo-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-white p-2.5 rounded border border-indigo-100/80 shadow-2xs">
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Env W (in)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="200"
                    value={dims[0]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 4;
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          dimensions: [val, dims[1], dims[2]],
                        },
                      });
                    }}
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Env H (in)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="200"
                    value={dims[1]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 4;
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          dimensions: [dims[0], val, dims[2]],
                        },
                      });
                    }}
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Env D (in)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="200"
                    value={dims[2]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 4;
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          dimensions: [dims[0], dims[1], val],
                        },
                      });
                    }}
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={activeObj.color || activeObj.metadata?.color || '#f3f4f6'}
                      onChange={(e) => {
                        updateSceneObject(activeObj.id, {
                          color: e.target.value,
                          metadata: {
                            ...activeObj.metadata,
                            color: e.target.value,
                          },
                        });
                      }}
                      className="w-full h-6 rounded cursor-pointer border border-slate-200 p-0"
                    />
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

        {/* List of active clay models */}
        {(() => {
          const models = Object.values(sceneObjects).filter((obj) => obj.type === 'clay_model');
          if (models.length === 0) {
            return (
              <div className="text-center py-4 px-2 border border-dashed border-slate-200 bg-white rounded">
                <span className="text-[10px] font-medium text-slate-400">
                  No 3D models active. Spawn one above.
                </span>
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              {models.map((model, index) => {
                const isSelected = activeObjectId === model.id;
                const dims = model.metadata?.dimensions || [24, 24, 24];
                const displayName = model.metadata?.name || '3D Model';

                return (
                  <div
                    key={model.id}
                    onClick={() => setActiveObjectId(model.id)}
                    className={`p-3 rounded border text-left bg-white transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-50'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                          {displayName} #{index + 1}
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
                            toggleObjectLock(model.id);
                          }}
                          className={`p-1 rounded transition cursor-pointer ${
                            model.isLocked
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={model.isLocked ? "Unlock Object" : "Lock Object"}
                        >
                          {model.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSceneObject(model.id);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Delete Model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bounding envelope scaling inputs */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Env W (in)
                        </label>
                        <input
                          type="number"
                          min="4"
                          max="200"
                          value={dims[0]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(model.id, {
                              metadata: {
                                ...model.metadata,
                                dimensions: [val, dims[1], dims[2]],
                              },
                            });
                          }}
                          className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Env H (in)
                        </label>
                        <input
                          type="number"
                          min="4"
                          max="200"
                          value={dims[1]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(model.id, {
                              metadata: {
                                ...model.metadata,
                                dimensions: [dims[0], val, dims[2]],
                              },
                            });
                          }}
                          className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Env D (in)
                        </label>
                        <input
                          type="number"
                          min="4"
                          max="200"
                          value={dims[2]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(model.id, {
                              metadata: {
                                ...model.metadata,
                                dimensions: [dims[0], dims[1], val],
                              },
                            });
                          }}
                          className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Color
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={model.metadata?.color || '#f3f4f6'}
                            onChange={(e) => {
                              updateSceneObject(model.id, {
                                metadata: {
                                  ...model.metadata,
                                  color: e.target.value,
                                },
                              });
                            }}
                            className="w-full h-6 rounded cursor-pointer border border-slate-200 p-0"
                          />
                        </div>
                      </div>
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
