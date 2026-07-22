import React from 'react';
import { SubArea, TileShape, MeasurementUnit, WallExtension, RectanglePattern } from '../../types';
import { Plus, Trash2, Lock, Unlock, GripVertical, Eye, EyeOff, HelpCircle, Copy } from 'lucide-react';
import { getCombinedWallBounds, getTrueArea } from '../../utils/geometry';
import { ActiveAccentEditor } from './ActiveAccentEditor';

interface FeaturesPanelProps {
  subAreas: SubArea[];
  setSubAreas: React.Dispatch<React.SetStateAction<SubArea[]>>;
  activeSubAreaId: string | null;
  setActiveSubAreaId: (id: string | null) => void;
  wallWidth: number;
  wallHeight: number;
  wallExtensions: WallExtension[];
  unit: MeasurementUnit;
  showAccentDistances: boolean;
  setShowAccentDistances: (val: boolean) => void;
}

export const FeaturesPanel: React.FC<FeaturesPanelProps> = ({
  subAreas,
  setSubAreas,
  activeSubAreaId,
  setActiveSubAreaId,
  wallWidth,
  wallHeight,
  wallExtensions,
  unit,
  showAccentDistances,
  setShowAccentDistances,
}) => {

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newSubAreas = [...subAreas];
    const [draggedItem] = newSubAreas.splice(draggedIndex, 1);
    newSubAreas.splice(dropIndex, 0, draggedItem);
    
    setSubAreas(newSubAreas);
    setDraggedIndex(null);
  };

  const handleAddSubArea = () => {
    const isCm = unit === 'cm';
    const saW = isCm ? 60 : 24;
    const saH = isCm ? 40 : 16;
    const saX = Number(((wallWidth - saW) / 2).toFixed(2));
    const saY = Number(((wallHeight - saH) / 2).toFixed(2));

    const newSa: SubArea = {
      id: `sa_${Date.now()}`,
      name: `Accent Panel ${subAreas.length + 1}`,
      x: saX >= 0 ? saX : 0,
      y: saY >= 0 ? saY : 0,
      width: Math.min(saW, wallWidth),
      height: Math.min(saH, wallHeight),
      shape: 'rectangle',
      tileWidth: isCm ? 10 : 4,
      tileHeight: isCm ? 10 : 4,
      pattern: 'stack',
      tileColors: ['#0f766e'], // Teal accent
      colorPattern: 'single',
      groutColor: '#cbd5e1',
      groutWidth: isCm ? 0.3 : 0.125,
      offsetX: 0,
      offsetY: 0,
      tileSpecular: true,
      tileFinish: 'satin',
      tileName: 'Accent Teal Glass Mosaic',
      useLabelColor: true,
      labelColor: '#ffffff',
      customPatternPayload: null,
    };

    setSubAreas((prev) => [...prev, newSa]);
    setActiveSubAreaId(newSa.id);
  };

  const handleDeleteSubArea = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubAreas((prev) => prev.filter((sa) => sa.id !== id));
    if (activeSubAreaId === id) {
      setActiveSubAreaId(null);
    }
  };

  const updateActiveSubArea = (fields: Partial<SubArea>) => {
    if (!activeSubAreaId) return;
    setSubAreas((prev) => {
      const activeSa = prev.find((s) => s.id === activeSubAreaId);
      if (!activeSa) return prev;

      const EXCLUDED_KEYS = [
        'id',
        'name',
        'x',
        'y',
        'width',
        'height',
        'vertices',
        'linkedToId',
        'isLinked',
        'locked',
        'visible',
      ];

      let finalFields = { ...fields };

      if (fields.isLinked === true && activeSa.linkedToId) {
        const master = prev.find((s) => s.id === activeSa.linkedToId);
        if (master) {
          const masterProps: any = {};
          Object.keys(master).forEach((key) => {
            if (!EXCLUDED_KEYS.includes(key)) {
              masterProps[key] = (master as any)[key];
            }
          });
          finalFields = { ...masterProps, ...finalFields };
        }
      }

      const activeMasterId = activeSa.isLinked ? activeSa.linkedToId : activeSa.id;
      const isCurrentlyLinked = finalFields.isLinked !== undefined ? finalFields.isLinked : activeSa.isLinked;
      const shouldSync = isCurrentlyLinked || activeSa.id === activeMasterId;

      return prev.map((sa) => {
        if (sa.id === activeSubAreaId) {
          const merged = { ...sa, ...finalFields };
          if (merged.shape === 'rectangle' && merged.pattern === 'basket_weave') {
            merged.tileHeight = merged.tileWidth * 2;
          }
          return merged;
        }

        const belongsToFamily =
          (sa.linkedToId === activeMasterId && sa.isLinked === true) ||
          sa.id === activeMasterId;

        if (belongsToFamily && shouldSync) {
          const syncFields: any = {};
          Object.keys(fields).forEach((key) => {
            if (!EXCLUDED_KEYS.includes(key)) {
              syncFields[key] = (fields as any)[key];
            }
          });
          const merged = { ...sa, ...syncFields };
          if (merged.shape === 'rectangle' && merged.pattern === 'basket_weave') {
            merged.tileHeight = merged.tileWidth * 2;
          }
          return merged;
        }

        return sa;
      });
    });
  };

  const handleCloneSubArea = (originalSa: SubArea, e: React.MouseEvent) => {
    e.stopPropagation();
    const offset = unit === 'cm' ? 30 : 12;

    const newSa: SubArea = {
      ...originalSa,
      id: `sa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `${originalSa.name} (Copy)`,
      x: originalSa.x + offset,
      y: originalSa.y + offset,
      tileColors: originalSa.tileColors ? [...originalSa.tileColors] : [],
      vertices: originalSa.vertices
        ? originalSa.vertices.map((v) => ({ ...v, x: v.x + offset, y: v.y + offset }))
        : undefined,
      linkedToId: originalSa.linkedToId || originalSa.id,
      isLinked: true,
    };

    if ((originalSa as any).compositeColors) {
      (newSa as any).compositeColors = [...(originalSa as any).compositeColors];
    }
    if (originalSa.shapeSettings) {
      newSa.shapeSettings = JSON.parse(JSON.stringify(originalSa.shapeSettings));
    }
    if (originalSa.border) {
      newSa.border = { ...originalSa.border };
    }

    setSubAreas((prev) => [...prev, newSa]);
    setActiveSubAreaId(newSa.id);
  };

  const activeSa = subAreas.find((sa) => sa.id === activeSubAreaId);

  if (activeSa) {
    return (
      <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-4">
        <ActiveAccentEditor
          activeSa={activeSa}
          updateActiveSubArea={updateActiveSubArea}
          unit={unit}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          wallExtensions={wallExtensions}
          onBack={() => setActiveSubAreaId(null)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 group relative">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <div className="flex items-center gap-1 cursor-help">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Accent Features & Niches</h3>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
          </div>

          {/* Tooltip Popup */}
          <div className="absolute top-full left-0 mt-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none leading-relaxed font-normal normal-case">
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
            If your wall has more than one type of tile, or you'd like to add a cutout like a door or window, do that from this tab. Add the accent area, then customize your tile or cutout.
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddSubArea}
          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-1 px-2.5 rounded border border-indigo-200 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Accent Area
        </button>
      </div>

      {/* Show Distances from Wall Edges Location Markers toggle */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700">Display Edge Distances</span>
          <span className="text-[9px] text-slate-500 font-medium leading-normal">
            Draw markers from wall edges (bottom/left) to accent area boundaries.
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none ml-2 shrink-0">
          <input
            type="checkbox"
            checked={showAccentDistances}
            onChange={(e) => setShowAccentDistances(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-100 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {subAreas.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-2">
          No accent band panels added yet. Click &ldquo;Add Accent Area&rdquo; to insert a custom tile niche.
        </p>
      ) : (
        <div className="space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Created Accent Niches:</span>
          {subAreas.map((sa, index) => {
            const isSelected = sa.id === activeSubAreaId;
            return (
              <div
                key={sa.id}
                draggable={true}
                onDragStart={(e) => setDraggedIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(index)}
                onDragEnd={() => setDraggedIndex(null)}
                onClick={() => setActiveSubAreaId(isSelected ? null : sa.id)}
                className={`p-2.5 rounded border transition cursor-grab active:cursor-grabbing flex justify-between items-center group relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 select-none" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs">{sa.name}</span>
                    <span className="text-[10px] font-mono text-slate-450 mt-0.5">
                      {unit === 'in'
                        ? `${Number(sa.width).toFixed(3)}"x${Number(sa.height).toFixed(3)}" - ${(getTrueArea(sa) / 144).toFixed(3)} sf`
                        : `${Number(sa.width).toFixed(3)}cm x ${Number(sa.height).toFixed(3)}cm - ${(getTrueArea(sa) / 10000).toFixed(3)} sm`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubAreas((prev) =>
                        prev.map((item) =>
                          item.id === sa.id ? { ...item, visible: item.visible === false ? true : false } : item
                        )
                      );
                    }}
                    className={`p-1 rounded border transition cursor-pointer ${
                      sa.visible === false
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-250'
                    }`}
                    title={sa.visible === false ? "Show accent area" : "Hide accent area"}
                  >
                    {sa.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubAreas((prev) =>
                        prev.map((item) =>
                          item.id === sa.id ? { ...item, locked: !item.locked } : item
                        )
                      );
                    }}
                    className={`p-1 rounded border transition cursor-pointer ${
                      sa.locked
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                    title={sa.locked ? "Unlock accent area position" : "Lock accent area position"}
                  >
                    {sa.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  {!sa.linkedToId && (
                    <button
                      type="button"
                      onClick={(e) => handleCloneSubArea(sa, e)}
                      className="p-1 rounded border transition cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      title="Clone accent area"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSubArea(sa.id, e)}
                    className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                    title="Remove accent sub area"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isSelected && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
