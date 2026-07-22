import React, { useState, useRef } from 'react';
import { Home, Box, Trash2, Plus, RotateCw, RefreshCw, Lock, Unlock, Palette } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { supabase } from '../../../utils/supabaseClient';

export const ImportedLayoutsPanel: React.FC = () => {
  const { 
    roomDimensions, 
    sceneObjects,
    updateSceneObject,
    toggleObjectLock,
    removeSceneObject,
    activeObjectId,
    setActiveObjectId,
    roomColors
  } = useAppStore();

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const localSyncInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpdateLayoutPayload = (objectId: string, payload: any) => {
    const blueprint = {
      wallWidth: payload.wallWidth,
      wallHeight: payload.wallHeight,
      wallVertices: payload.wallVertices,
      subAreas: payload.subAreas,
      foldLines: payload.foldLines,
      unit: payload.unit,
      shape: payload.shape,
      tileWidth: payload.tileWidth,
      tileHeight: payload.tileHeight,
      pattern: payload.pattern,
      tileColors: payload.tileColors,
      groutColor: payload.groutColor,
      groutWidth: payload.groutWidth,
      tileFinish: payload.tileFinish,
    };

    updateSceneObject(objectId, {
      metadata: {
        ...sceneObjects[objectId]?.metadata,
        name: payload.projectName || sceneObjects[objectId]?.metadata?.name || 'Imported Layout',
        dimensions: [
          payload.wallWidth || 120,
          payload.wallHeight || 96,
          sceneObjects[objectId]?.metadata?.dimensions?.[2] || 4,
        ],
        blueprint,
      },
    });
  };

  const handleLocalSyncChange = (e: React.ChangeEvent<HTMLInputElement>, objectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string || '').trim();
        const data = JSON.parse(text);
        handleUpdateLayoutPayload(objectId, data);
        alert('Layout synced successfully from local JSON!');
      } catch (err) {
        alert('Failed to parse local JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCloudSync = async (objectId: string, sourceId: string) => {
    setSyncingId(objectId);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('state_payload')
        .eq('id', sourceId)
        .single();

      if (error) {
        alert(`Failed to sync from cloud: ${error.message}`);
      } else if (data && data.state_payload) {
        handleUpdateLayoutPayload(objectId, data.state_payload);
      } else {
        alert('Cloud project data not found.');
      }
    } catch (err: any) {
      alert(`Error syncing from cloud: ${err?.message || String(err)}`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <>
      {/* 3D Staging Studio: Imported Layouts */}
      <div className="bg-slate-50 border border-slate-200/60 rounded p-4 mb-3 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-sky-500" />
              3D Staging Studio
            </span>
            <span className="text-[9px] text-slate-500 font-medium leading-normal">
              Import and stage saved layouts into the 3D scene
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              useAppStore.getState().setIsImportLayoutModalOpen(true);
            }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1.5 rounded shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import Layout</span>
          </button>
        </div>

        {/* Selected Imported Layout Inspector (Only visible when activeObjectId points to an imported_layout) */}
        {(() => {
          const activeObj = activeObjectId ? sceneObjects[activeObjectId] : null;
          if (!activeObj || activeObj.type !== 'imported_layout') return null;
          const dims = activeObj.metadata?.dimensions || [60, 60, 4];

          return (
            <div className="bg-sky-50 border border-sky-200/60 rounded p-3 mb-3.5 animate-fade-in text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-sky-500" />
                  Active Layout Controls
                </span>
                <button
                  type="button"
                  onClick={() => setActiveObjectId(null)}
                  className="text-[8px] font-bold text-sky-600 hover:text-sky-800 bg-white border border-sky-200 hover:border-sky-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-white p-2.5 rounded border border-sky-100/80 shadow-2xs">
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Width (in)
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
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Height (in)
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
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Depth (in)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={dims[2]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          dimensions: [dims[0], dims[1], val],
                        },
                      });
                    }}
                    className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Rotation
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const currentRot = activeObj.rotation?.[1] || 0;
                        const newRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                        updateSceneObject(activeObj.id, {
                          rotation: [0, newRot, 0],
                        });
                      }}
                      className="w-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded py-1 cursor-pointer transition"
                      title="Spin Layout"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Elevation Section */}
              <div className="mt-3 pt-3 border-t border-sky-100/80">
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
                    className="flex-1 accent-sky-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
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
                    className="w-14 px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Wall Recess Depth Section */}
              <div className="mt-3 pt-3 border-t border-sky-100/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Box className="w-3 h-3 text-sky-500" />
                    Wall Recess Depth
                  </span>
                  <span className="text-[10px] font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                    {(activeObj.metadata?.recessDepth ?? 0)} in
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="48"
                    value={(activeObj.metadata?.recessDepth ?? 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          recessDepth: val,
                        },
                      });
                    }}
                    className="flex-1 accent-sky-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="48"
                    value={(activeObj.metadata?.recessDepth ?? 0)}
                    onChange={(e) => {
                      const val = Math.min(48, Math.max(0, parseFloat(e.target.value) || 0));
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          recessDepth: val,
                        },
                      });
                    }}
                    className="w-14 px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Tunnel Wall Material Section */}
              <div className="mt-3 pt-3 border-t border-sky-100/80">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Palette className="w-3 h-3 text-sky-500" />
                  Tunnel Wall Material
                </span>

                {/* Match Wall Color Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                  <input
                    type="checkbox"
                    checked={activeObj.metadata?.matchMainWallColor ?? true}
                    onChange={(e) => {
                      updateSceneObject(activeObj.id, {
                        metadata: {
                          ...activeObj.metadata,
                          matchMainWallColor: e.target.checked,
                        },
                      });
                    }}
                    className="w-3.5 h-3.5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-1 cursor-pointer"
                  />
                  <span className="text-[10px] font-medium text-slate-700">
                    Match Wall Color ({activeObj.attachedPlane || 'unattached'})
                  </span>
                </label>

                {/* Color Picker Input */}
                {(() => {
                  const mainWallColor = roomColors?.overrides?.[activeObj.attachedPlane || ''] || roomColors?.base || '#cbd5e1';
                  const matchMainWallColor = activeObj.metadata?.matchMainWallColor ?? true;
                  const activeTunnelColor = matchMainWallColor ? mainWallColor : (activeObj.metadata?.tunnelColor || '#cbd5e1');
                  return (
                    <div 
                      className={`flex items-center gap-2 transition-all ${
                        matchMainWallColor ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="color"
                        value={activeTunnelColor}
                        onChange={(e) => {
                          updateSceneObject(activeObj.id, {
                            metadata: {
                              ...activeObj.metadata,
                              tunnelColor: e.target.value,
                            },
                          });
                        }}
                        className="w-8 h-6 border rounded cursor-pointer bg-transparent"
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-1 border rounded">
                        {activeTunnelColor.toUpperCase()}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Smart Link / Sync Section */}
              <div className="mt-3 pt-3 border-t border-sky-100/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-sky-500" />
                    Smart Link Origin
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    activeObj.sourceType === 'cloud' 
                      ? 'bg-sky-100 text-sky-800' 
                      : activeObj.sourceType === 'local'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {activeObj.sourceType || 'Offline Embed'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {activeObj.sourceType === 'cloud' && (
                    <div className="text-[10px] text-slate-500 leading-normal flex flex-col gap-1 bg-white p-2 rounded border border-sky-100/40">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-400 text-[9px] uppercase tracking-wider">Source ID:</span>
                        <span className="font-mono font-medium text-slate-600 truncate max-w-[120px] text-[10px]" title={activeObj.sourceId || ''}>{activeObj.sourceId}</span>
                      </div>
                      <button
                        type="button"
                        disabled={syncingId === activeObj.id}
                        onClick={() => handleCloudSync(activeObj.id, activeObj.sourceId!)}
                        className="w-full flex items-center justify-center gap-1.5 mt-1 text-[10px] font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400/80 px-2.5 py-2 rounded shadow-2xs transition-all duration-150 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingId === activeObj.id ? 'animate-spin' : ''}`} />
                        <span>{syncingId === activeObj.id ? 'Syncing...' : 'Refresh / Sync Cloud'}</span>
                      </button>
                    </div>
                  )}

                  {activeObj.sourceType === 'local' && (
                    <div className="text-[10px] text-slate-500 leading-normal flex flex-col gap-1 bg-white p-2 rounded border border-amber-100/40">
                      <div className="text-amber-700 font-medium text-[9px] mb-1">
                        Select updated local export JSON to sync modifications.
                      </div>
                      <input
                        type="file"
                        ref={localSyncInputRef}
                        accept=".json"
                        onChange={(e) => handleLocalSyncChange(e, activeObj.id)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => localSyncInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 px-2.5 py-2 rounded transition-all duration-150 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Upload & Sync Local</span>
                      </button>
                    </div>
                  )}

                  {!activeObj.sourceType && (
                    <div className="text-[10px] text-slate-400 leading-relaxed bg-white p-2 rounded border border-slate-100 text-center">
                      This is a static legacy layout. Upgrade it by re-importing using the Smart Link feature.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* List of active imported layouts */}
        {(() => {
          const layouts = Object.values(sceneObjects).filter((obj) => obj.type === 'imported_layout');
          if (layouts.length === 0) {
            return (
              <div className="text-center py-4 px-2 border border-dashed border-slate-200 bg-white rounded">
                <span className="text-[10px] font-medium text-slate-400">
                  No imported layouts active. Import one above.
                </span>
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              {layouts.map((layout, index) => {
                const isSelected = activeObjectId === layout.id;
                const dims = layout.metadata?.dimensions || [60, 60, 4];
                const displayName = layout.metadata?.name || 'Imported Layout';

                return (
                  <div
                    key={layout.id}
                    onClick={() => setActiveObjectId(layout.id)}
                    className={`p-3 rounded border text-left bg-white transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-50'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                          {displayName} #{index + 1}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-sky-600 uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleObjectLock(layout.id);
                          }}
                          className={`p-1 rounded transition cursor-pointer ${
                            layout.isLocked
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={layout.isLocked ? "Unlock Object" : "Lock Object"}
                        >
                          {layout.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSceneObject(layout.id);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Delete Layout"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bounding envelope scaling inputs */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Width (in)
                        </label>
                        <input
                          type="number"
                          min="4"
                          max="200"
                          value={dims[0]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(layout.id, {
                              metadata: {
                                ...layout.metadata,
                                dimensions: [val, dims[1], dims[2]],
                              },
                            });
                          }}
                          className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Height (in)
                        </label>
                        <input
                          type="number"
                          min="4"
                          max="200"
                          value={dims[1]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 4;
                            updateSceneObject(layout.id, {
                              metadata: {
                                ...layout.metadata,
                                dimensions: [dims[0], val, dims[2]],
                              },
                            });
                          }}
                          className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Depth (in)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={dims[2]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            updateSceneObject(layout.id, {
                              metadata: {
                                ...layout.metadata,
                                dimensions: [dims[0], dims[1], val],
                              },
                            });
                          }}
                          className="w-full px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                        />
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
