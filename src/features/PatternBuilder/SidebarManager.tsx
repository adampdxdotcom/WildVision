import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Upload, Download, Plus, Copy, Trash2, Layers, Shuffle, CheckCircle, AlertTriangle, Eye, RefreshCw, Save } from 'lucide-react';
import { BuilderTile as Tile } from '../../store/slices/patternBuilderSlice';
import TessellationPreview from './TessellationPreview';

export default function SidebarManager() {
  const {
    patternName,
    setPatternName,
    blockWidth,
    blockHeight,
    setBlockDimensions,
    builderTiles: tiles,
    activeTileIndex,
    setActiveTileIndex,
    addBuilderTile: addTile,
    removeBuilderTile: removeTile,
    updateBuilderTileProperty: updateTileProperty,
    loadFromSchema,
    resetPatternBuilder: resetToDefault,
    savePatternToCloud,
    isSavingPattern,
    patternSaveError,
    selectedVertexIndex,
    setSelectedVertexIndex,
    updateVertexInActive,
    addVertexToActive,
    deleteVertexFromActive,
    snapToGrid,
    setSnapToGrid,
    snapResolution,
    setSnapResolution,
    customPatternsList,
    fetchCustomPatternsList,
    deletePatternFromCloud
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [patternToDelete, setPatternToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shapes' | 'file'>('shapes');

  const activeTile = tiles[activeTileIndex];

  const EDITOR_BASE_UNIT = 50;

  // Export JSON file
  const handleExportJSON = () => {
    try {
      const exportData = {
        patternName,
        blockWidth: blockWidth / EDITOR_BASE_UNIT,
        blockHeight: blockHeight / EDITOR_BASE_UNIT,
        tiles: tiles.map(({ id, name, w, h, dx, dy, role, color, vertices, polarArray }) => ({
          id,
          name,
          shape: "custom_polygon",
          w: w / EDITOR_BASE_UNIT,
          h: h / EDITOR_BASE_UNIT,
          dx: dx / EDITOR_BASE_UNIT,
          dy: dy / EDITOR_BASE_UNIT,
          role,
          color,
          vertices,
          polarArray: polarArray ? { ...polarArray } : undefined
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Clean slug name
      const slug = patternName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      link.download = `${slug || 'tessellation-pattern'}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess("Successfully exported pattern to JSON!");
    } catch (e: any) {
      showError("Export failed: " + e.message);
    }
  };

  const handleExportPatternSVG = () => {
    const svgElement = document.getElementById('tessellation-svg');
    if (!svgElement) {
      showError("Could not find SVG preview to export.");
      return;
    }
    try {
      const svgContent = svgElement.outerHTML;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const slug = patternName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.download = `${slug || 'tessellation'}-tiled-grid.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSuccess("Successfully exported SVG image!");
    } catch (e) {
      console.error("Failed to export SVG image", e);
      showError("Failed to export SVG image.");
    }
  };

  const handleApplyPattern = () => {
    const patternData = {
      patternName,
      blockWidth: blockWidth / EDITOR_BASE_UNIT,
      blockHeight: blockHeight / EDITOR_BASE_UNIT,
      tiles: tiles.map(({ id, name, w, h, dx, dy, role, color, vertices, polarArray }) => ({
        id,
        name,
        shape: "custom_polygon",
        w: w / EDITOR_BASE_UNIT,
        h: h / EDITOR_BASE_UNIT,
        dx: dx / EDITOR_BASE_UNIT,
        dy: dy / EDITOR_BASE_UNIT,
        role,
        color,
        vertices,
        polarArray: polarArray ? { ...polarArray } : undefined
      }))
    };

    useAppStore.setState({
      activeCustomPattern: patternData,
      shape: 'custom_polygon',
      pattern: 'custom_json',
      viewMode: '2d'
    });
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Basic schema verification
        if (!parsed || (typeof parsed !== 'object')) {
          throw new Error("Invalid JSON structure. Root must be an object.");
        }

        loadFromSchema(parsed);
        showSuccess("Successfully imported tessellation pattern!");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        showError("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Duplicate the active tile
  const handleDuplicateTile = () => {
    if (!activeTile) return;
    const duplicatedTile: Tile = {
      ...activeTile,
      id: Math.random().toString(36).substr(2, 9),
      name: `${activeTile.name} (Copy)`,
      dx: activeTile.dx + 10, // slightly offset
      dy: activeTile.dy + 10,
      vertices: activeTile.vertices.map(v => ({ ...v })) // deep copy vertices
    };

    // Add to store
    const store = useAppStore.getState();
    const newTiles = [...tiles, duplicatedTile];
    store.updateBuilderTileProperty(activeTileIndex, 'vertices', activeTile.vertices); // ensure store synced
    useAppStore.setState({
      builderTiles: newTiles,
      activeTileIndex: newTiles.length - 1,
      selectedVertexIndex: null
    });
    showSuccess(`Duplicated "${activeTile.name}"`);
  };

  const handleSaveAndApply = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const ok = await savePatternToCloud();
    if (ok) {
      showSuccess("Pattern successfully saved to cloud!");
    } else {
      const state = useAppStore.getState();
      showError(state.patternSaveError || "Failed to save custom pattern.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4">
      
      {/* Pattern Studio Tabs */}
      <div className="space-y-1.5 animate-fade-in shrink-0">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-center transition-all cursor-pointer ${
              activeTab === 'shapes' 
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-black' 
                : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
            }`}
          >
            <Layers className={`w-4 h-4 mb-1 ${activeTab === 'shapes' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider leading-none">Shapes</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-center transition-all cursor-pointer ${
              activeTab === 'file' 
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-black' 
                : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
            }`}
          >
            <Save className={`w-4 h-4 mb-1 ${activeTab === 'file' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider leading-none">File</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-6 bg-white border border-[#E5E7EB] p-6 rounded-none">
        
        {activeTab === 'file' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Pattern Workspace</h2>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#1A1A1E] mb-1.5 uppercase tracking-wider">Pattern Name</label>
                <input
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="e.g. Damascus Star"
                  className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-3 py-2 text-xs text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black font-medium transition-all"
                />
              </div>

              {/* Save Pattern Button */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => resetToDefault('blank')} 
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white border border-[#E5E7EB] text-[#1A1A1E] hover:bg-[#F3F4F6] px-3 py-3 rounded-none cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" /> 
                  New
                </button>
                <button
                  onClick={handleSaveAndApply}
                  disabled={isSavingPattern}
                  className="flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-3 rounded-none cursor-pointer transition-colors shadow-xs"
                >
                  {isSavingPattern ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Cloud...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Pattern to Cloud
                    </>
                  )}
                </button>
              </div>

              {/* Import/Export buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-[#E5E7EB] text-[#1A1A1E] hover:bg-[#F3F4F6] px-3 py-2.5 rounded-none cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-black" />
                  Import
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportJSON}
                  accept=".json"
                  className="hidden"
                />

                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white hover:bg-[#2D2D2E] px-3 py-2.5 rounded-none cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>

                <button
                  onClick={handleExportPatternSVG}
                  className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white hover:bg-[#2D2D2E] px-3 py-2.5 rounded-none cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  SVG
                </button>
              </div>

              <button
                onClick={handleApplyPattern}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-600 text-indigo-700 hover:bg-indigo-100 px-3 py-3 rounded-none cursor-pointer transition-colors shadow-xs"
              >
                <Layers className="w-4 h-4" />
                Apply Pattern to Layout
              </button>

              {/* Status Banners */}
              {successMsg && (
                <div className="flex items-start gap-2 bg-[#F3F4F6] border-l-4 border-black text-[#1A1A1E] p-3 text-xs rounded-none">
                  <CheckCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border-l-4 border-red-600 text-red-900 p-3 text-xs rounded-none">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <hr className="border-[#E5E7EB] my-2" />
              <div className="flex flex-col gap-2">
                <h2 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Cloud Library</h2>
                {customPatternsList && customPatternsList.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto scrollbar-thin">
                    {customPatternsList.map((pattern: any) => {
                      const isBuiltIn = [
                        'classic star & cross', 'honeycomb hex', 'square pinwheel', 'octagon & dot',
                        'octagon_dot', 'star-cross', 'hex-triangle', 'pinwheel', 'star', 'cross'
                      ].includes((pattern.name || '').trim().toLowerCase());

                      return (
                        <div 
                          key={pattern.id}
                          className="flex flex-col p-3 bg-white border border-[#E5E7EB] rounded-none group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#1A1A1E]">{pattern.name}</span>
                              <span className="text-[9px] font-mono text-[#9CA3AF] uppercase">
                                Tiles: {pattern.pattern_data?.tiles?.length || 0}
                              </span>
                            </div>
                            {patternToDelete === pattern.id ? null : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    if (isBuiltIn) {
                                      showError("Cannot modify or overwrite built-in patterns.");
                                      return;
                                    }
                                    try {
                                      loadFromSchema(pattern.pattern_data, pattern.id);
                                      showSuccess(`Loaded custom pattern "${pattern.name}"`);
                                    } catch (err: any) {
                                      showError("Failed to load pattern: " + err.message);
                                    }
                                  }}
                                  className="text-[9px] font-bold uppercase tracking-wider bg-black hover:bg-[#2D2D2E] text-white px-2 py-1.5 transition-colors"
                                >
                                  Load
                                </button>
                                {!isBuiltIn && (
                                  <button
                                    onClick={() => setPatternToDelete(pattern.id)}
                                    className="text-slate-400 hover:text-red-600 p-1.5 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {patternToDelete === pattern.id && (
                            <div className="mt-3 flex flex-col gap-2 border-t border-red-100 pt-2">
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Delete this pattern forever?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    const success = await deletePatternFromCloud(pattern.id);
                                    if (success) {
                                      showSuccess("Pattern deleted.");
                                      setPatternToDelete(null);
                                    } else {
                                      showError("Failed to delete pattern.");
                                    }
                                  }}
                                  className="flex-1 text-[10px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 transition-colors"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setPatternToDelete(null)}
                                  className="flex-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[#9CA3AF] text-xs font-mono border border-dashed border-[#E5E7EB] bg-[#F9F9FB] uppercase">
                    No Saved Custom Patterns Found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shapes' && (
          <>
            {/* SECTION: Macro-block grid size */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Macro-Block Lattice</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Block Width</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="500"
                value={blockWidth}
                onChange={(e) => setBlockDimensions(parseFloat(e.target.value) || 0, blockHeight)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none pl-3 pr-8 py-2 text-xs font-mono text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] text-[#9CA3AF] font-mono">PX</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Block Height</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="500"
                value={blockHeight}
                onChange={(e) => setBlockDimensions(blockWidth, parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none pl-3 pr-8 py-2 text-xs font-mono text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] text-[#9CA3AF] font-mono">PX</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-[#E5E7EB]" />

      {/* SECTION: Tile Manager List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Lattice Tiles ({tiles.length})
          </h2>
          <button
            onClick={addTile}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black bg-[#F3F4F6] hover:bg-[#E5E7EB] px-2.5 py-1.5 rounded-none transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Tile
          </button>
        </div>

        <div className="flex flex-col max-h-[190px] overflow-y-auto border border-[#E5E7EB]">
          {tiles.map((t, idx) => {
            const isActive = idx === activeTileIndex;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTileIndex(idx)}
                className={`flex items-center justify-between gap-2 p-3 border-b border-[#E5E7EB] last:border-b-0 cursor-pointer group transition-all ${
                  isActive
                    ? 'bg-[#F3F4F6] border-l-4 border-black pl-2'
                    : 'bg-white hover:bg-[#F9F9FB]'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden w-full">
                  <span
                    className="w-3 h-3 rounded-none shrink-0 border border-black/10"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className={`text-xs truncate font-mono ${isActive ? 'text-black font-semibold' : 'text-slate-600'}`}>
                    {t.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono bg-[#E5E7EB] px-1.5 py-0.5 rounded-none text-black font-semibold capitalize">
                    {t.role}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTile(idx);
                    }}
                    disabled={tiles.length <= 1}
                    className="opacity-0 group-hover:opacity-100 disabled:opacity-0 text-slate-400 hover:text-black p-1 transition-all cursor-pointer"
                    title="Delete Tile"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-[#E5E7EB]" />

      {/* SECTION: Active Tile Attributes */}
      {activeTile ? (
        <div className="flex flex-col gap-4 bg-white p-4 rounded-none border border-[#E5E7EB]">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h3 className="text-[10px] font-bold text-black font-mono uppercase tracking-widest">Properties: {activeTile.name}</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDuplicateTile}
                className="text-slate-500 hover:text-black p-1 transition-colors"
                title="Duplicate Tile Shape"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => removeTile(activeTileIndex)}
                disabled={tiles.length <= 1}
                className="text-slate-500 hover:text-black disabled:opacity-30 p-1 transition-colors"
                title="Delete Tile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Name Input */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Tile Name</label>
              <input
                type="text"
                value={activeTile.name}
                onChange={(e) => updateTileProperty(activeTileIndex, 'name', e.target.value)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            {/* Scale X / Y (w & h) */}
            <div>
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Tile Width</label>
              <input
                type="number"
                value={activeTile.w}
                onChange={(e) => updateTileProperty(activeTileIndex, 'w', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Tile Height</label>
              <input
                type="number"
                value={activeTile.h}
                onChange={(e) => updateTileProperty(activeTileIndex, 'h', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono"
              />
            </div>

            {/* Offsets (dx & dy) */}
            <div>
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Offset DX</label>
              <input
                type="number"
                value={activeTile.dx}
                onChange={(e) => updateTileProperty(activeTileIndex, 'dx', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Offset DY</label>
              <input
                type="number"
                value={activeTile.dy}
                onChange={(e) => updateTileProperty(activeTileIndex, 'dy', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono"
              />
            </div>

            {/* Role selection & color */}
            <div>
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Lattice Role</label>
              <select
                value={activeTile.role}
                onChange={(e) => updateTileProperty(activeTileIndex, 'role', e.target.value as 'primary' | 'secondary')}
                className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Theme Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={activeTile.color}
                  onChange={(e) => updateTileProperty(activeTileIndex, 'color', e.target.value)}
                  className="w-8 h-8 bg-transparent border-0 rounded-none cursor-pointer p-0 block shrink-0"
                />
                <input
                  type="text"
                  value={activeTile.color}
                  onChange={(e) => updateTileProperty(activeTileIndex, 'color', e.target.value)}
                  className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1 text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#E5E7EB]" />

            {/* Polar Array Section */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-black uppercase tracking-widest font-mono">Polar Array</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Instances</label>
                  <input
                    type="number"
                    min="1"
                    value={activeTile.polarArray?.instances ?? 1}
                    onChange={(e) => updateTileProperty(activeTileIndex, 'polarArray', { ...(activeTile.polarArray || { angleStep: 90, pivotX: 0, pivotY: 0 }), instances: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Angle Step (°)</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={activeTile.polarArray?.angleStep ?? 90}
                      onChange={(e) => updateTileProperty(activeTileIndex, 'polarArray', { ...(activeTile.polarArray || { instances: 1, pivotX: 0, pivotY: 0 }), angleStep: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#F9F9FB] border border-[#E5E7EB] border-r-0 rounded-none px-2 py-1.5 text-xs font-mono text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black min-w-0"
                    />
                    <button
                      onClick={() => {
                        const instances = activeTile.polarArray?.instances || 1;
                        if (instances > 0) {
                          updateTileProperty(activeTileIndex, 'polarArray', { ...(activeTile.polarArray || { pivotX: 0, pivotY: 0, instances }), angleStep: 360 / instances });
                        }
                      }}
                      className="bg-black text-white hover:bg-[#2D2D2E] px-2 text-[9px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                      title="Auto 360°"
                    >
                      360°
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Pivot X</label>
                  <input
                    type="number"
                    step="0.1"
                    value={activeTile.polarArray?.pivotX ?? 0}
                    onChange={(e) => updateTileProperty(activeTileIndex, 'polarArray', { ...(activeTile.polarArray || { instances: 1, angleStep: 90, pivotY: 0 }), pivotX: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#1A1A1E] mb-1 uppercase tracking-wider">Pivot Y</label>
                  <input
                    type="number"
                    step="0.1"
                    value={activeTile.polarArray?.pivotY ?? 0}
                    onChange={(e) => updateTileProperty(activeTileIndex, 'polarArray', { ...(activeTile.polarArray || { instances: 1, angleStep: 90, pivotX: 0 }), pivotY: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E7EB] rounded-none px-2 py-1.5 text-xs font-mono text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            {/* Top Controls from Canvas */}
            <div className="flex flex-col gap-3 bg-[#F9F9FB] p-3 rounded-none border border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-none" style={{ backgroundColor: activeTile.color }} />
                <h3 className="font-bold text-[#1A1A1E] text-[10px] uppercase tracking-wider">
                  Editing Vertices: <span className="font-mono text-black font-semibold">{activeTile.name}</span>
                </h3>
              </div>

              {/* Snapping Controls */}
              <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-wider font-medium">
                <label className="flex items-center gap-2 text-[#1A1A1E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="rounded-none border-[#E5E7EB] text-black focus:ring-black w-3.5 h-3.5"
                  />
                  Snap Grid
                </label>

                {snapToGrid && (
                  <select
                    value={snapResolution}
                    onChange={(e) => setSnapResolution(parseFloat(e.target.value))}
                    className="bg-white border border-[#E5E7EB] rounded-none px-2 py-1 font-mono text-[9px] text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-black flex-1"
                  >
                    <option value="0.05">0.05 (20 divs)</option>
                    <option value="0.025">0.025 (40 divs)</option>
                    <option value="0.01">0.01 (100 divs)</option>
                  </select>
                )}
              </div>
            </div>

            <hr className="border-[#E5E7EB]" />

          {/* Vertex Coordinates Section */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-black uppercase tracking-widest font-mono flex items-center gap-1">
                Vertices ({activeTile.vertices.length})
              </span>
              <button
                onClick={() => {
                  addVertexToActive({ x: 0, y: 0 });
                }}
                className="flex items-center gap-1 text-[9px] bg-black text-white hover:bg-[#2D2D2E] px-2.5 py-1 rounded-none font-bold uppercase tracking-wider transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Vertex
              </button>
            </div>
            
            <div className="max-h-[160px] overflow-y-auto border border-[#E5E7EB]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F9F9FB] text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest border-b border-[#E5E7EB]">
                    <th className="py-1.5 px-2 w-10 font-mono">Index</th>
                    <th className="py-1.5 px-2 font-sans text-center">X [-0.5, 0.5]</th>
                    <th className="py-1.5 px-2 font-sans text-center">Y [-0.5, 0.5]</th>
                    <th className="py-1.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                  {activeTile.vertices.map((v, i) => {
                    const isSelected = selectedVertexIndex === i;
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedVertexIndex(i)}
                        className={`hover:bg-[#F9F9FB] cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#F3F4F6] font-semibold text-black border-l-2 border-black pl-1' : 'text-slate-600'
                        }`}
                      >
                        <td className="py-1 px-2 font-mono text-[#9CA3AF]">#{i + 1}</td>
                        <td className="py-1 px-1">
                          <input
                            type="number"
                            step={snapResolution}
                            min="-0.5"
                            max="0.5"
                            value={v.x}
                            onChange={(e) => updateVertexInActive(i, parseFloat(e.target.value) || 0, v.y)}
                            className="w-full bg-transparent border-0 border-b border-dashed border-[#E5E7EB] focus:border-black focus:ring-0 font-mono p-0 text-[11px] text-center"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="number"
                            step={snapResolution}
                            min="-0.5"
                            max="0.5"
                            value={v.y}
                            onChange={(e) => updateVertexInActive(i, v.x, parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border-0 border-b border-dashed border-[#E5E7EB] focus:border-black focus:ring-0 font-mono p-0 text-[11px] text-center"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVertexFromActive(i);
                            }}
                            disabled={activeTile.vertices.length <= 3}
                            className="text-[#9CA3AF] hover:text-black disabled:opacity-30 p-0.5 rounded-none transition-colors"
                            title="Delete Vertex"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[#9CA3AF] text-xs font-mono uppercase">
          No Tile Selection Active
        </div>
      )}

      <hr className="border-[#E5E7EB]" />

      {/* QUICK PRESETS */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-1">
          <Shuffle className="w-3 h-3 text-black" />
          Lattice Templates
        </span>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => resetToDefault('star-cross')}
            className="flex items-center justify-between text-xs font-mono border border-[#E5E7EB] text-slate-700 hover:bg-[#F3F4F6] px-3 py-2 rounded-none text-left transition-all"
          >
            <span>Star & Cross</span>
            <span className="text-[9px] font-mono text-black font-bold bg-[#E5E7EB] px-1.5 py-0.5 rounded-none uppercase">Classic</span>
          </button>
          <button
            onClick={() => resetToDefault('hex-triangle')}
            className="flex items-center justify-between text-xs font-mono border border-[#E5E7EB] text-slate-700 hover:bg-[#F3F4F6] px-3 py-2 rounded-none text-left transition-all"
          >
            <span>Honeycomb Hex</span>
            <span className="text-[9px] font-mono text-black font-bold bg-[#E5E7EB] px-1.5 py-0.5 rounded-none uppercase">6-Fold</span>
          </button>
          <button
            onClick={() => resetToDefault('pinwheel')}
            className="flex items-center justify-between text-xs font-mono border border-[#E5E7EB] text-slate-700 hover:bg-[#F3F4F6] px-3 py-2 rounded-none text-left transition-all"
          >
            <span>Square Pinwheel</span>
            <span className="text-[9px] font-mono text-black font-bold bg-[#E5E7EB] px-1.5 py-0.5 rounded-none uppercase">Rotation</span>
          </button>
        </div>
      </div>
      </>
      )}

    </div>
    </div>
  );
}
