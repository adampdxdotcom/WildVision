import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CanvasLabel } from '../../types';

interface CanvasLabelsOverlayProps {
  wallToScreen: (wx: number, wy: number) => { px: number; py: number };
  screenToWall: (sx: number, sy: number) => { wx: number; wy: number };
  scale: number;
}

export const CanvasLabelsOverlay: React.FC<CanvasLabelsOverlayProps> = React.memo(({
  wallToScreen,
  screenToWall,
  scale,
}) => {
  const canvasLabels = useAppStore(state => state.canvasLabels);
  const setCanvasLabels = useAppStore(state => state.setCanvasLabels);
  const editingLabelId = useAppStore(state => state.editingLabelId);
  const setEditingLabelId = useAppStore(state => state.setEditingLabelId);
  const activeTool = useAppStore(state => state.activeTool);
  const viewSettings = useAppStore(state => state.viewSettings);

  if (!viewSettings.canvas.showLabels) {
    return null;
  }

  const handleLabelPointerDown = (label: CanvasLabel, e: React.PointerEvent) => {
    if (activeTool !== 'select') return;
    if (editingLabelId === label.id) return;
    e.preventDefault();
    e.stopPropagation();

    // Compute the tracking offset in wall coordinates to avoid screen/container relative bugs
    const startMouseWall = screenToWall(e.clientX, e.clientY);
    const offsetX = label.x - startMouseWall.wx;
    const offsetY = label.y - startMouseWall.wy;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentMouseWall = screenToWall(moveEvent.clientX, moveEvent.clientY);
      const wx = currentMouseWall.wx + offsetX;
      const wy = currentMouseWall.wy + offsetY;

      setCanvasLabels((prev) =>
        prev.map((l) => (l.id === label.id ? { ...l, x: wx, y: wy } : l))
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleLabelClick = (label: CanvasLabel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'eraser') {
      setCanvasLabels((prev) => prev.filter((l) => l.id !== label.id));
    } else if (activeTool === 'select' && editingLabelId !== label.id) {
      setEditingLabelId(label.id);
    }
  };

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      id="canvas-labels-overlay-container"
    >
      {canvasLabels.map((label) => {
        const pt = wallToScreen(label.x, label.y);
        const isEditing = editingLabelId === label.id;

        return (
          <div
            key={label.id}
            id={`label-node-${label.id}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto select-none"
            style={{
              left: pt.px,
              top: pt.py,
            }}
          >
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={label.text}
                className="px-2 py-1 text-slate-800 font-bold border-2 border-indigo-500 bg-white rounded shadow-md pointer-events-auto text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                onChange={(e) => {
                  const val = e.target.value;
                  setCanvasLabels((prev) =>
                    prev.map((l) => (l.id === label.id ? { ...l, text: val } : l))
                  );
                }}
                onBlur={() => {
                  setEditingLabelId(null);
                  if (!label.text.trim()) {
                    setCanvasLabels((prev) => prev.filter((l) => l.id !== label.id));
                  }
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    setEditingLabelId(null);
                    if (!label.text.trim()) {
                      setCanvasLabels((prev) => prev.filter((l) => l.id !== label.id));
                    }
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                onClick={(e) => handleLabelClick(label, e)}
                onPointerDown={(e) => handleLabelPointerDown(label, e)}
                className={`px-2 py-1 select-none font-bold text-sm text-center transition-colors rounded ${
                  activeTool === 'select'
                    ? 'cursor-move text-slate-800 hover:bg-slate-100/50'
                    : activeTool === 'eraser'
                      ? 'cursor-pointer text-rose-500 hover:bg-rose-50'
                      : 'text-slate-800'
                }`}
                style={{
                  textShadow: '1px 1px 0px #fff, -1px 1px 0px #fff, 1px -1px 0px #fff, -1px -1px 0px #fff, 0 1px 2px rgba(0,0,0,0.15)',
                }}
              >
                {label.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
