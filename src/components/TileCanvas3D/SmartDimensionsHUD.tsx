import * as React from 'react';
import { Html } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';

export interface SmartDimensionsHUDProps {
  targetId: string;
  to3D: (val: number) => number;
  from3D: (val: number) => number;
  roomDimensions: { width: number; height: number; depth: number };
  d3Columns?: any[];
  isDragging: boolean;
}

export const SmartDimensionsHUD: React.FC<SmartDimensionsHUDProps> = ({
  targetId,
  to3D,
  from3D,
  roomDimensions,
  d3Columns = [],
  isDragging,
}) => {
  const activeObjectId = useAppStore((state) => state.activeObjectId);
  const sceneObjects = useAppStore((state) => state.sceneObjects);

  const isSelected = activeObjectId === targetId;
  const targetObj = sceneObjects[targetId];

  const isBox = targetObj ? (targetObj.type === 'custom_box' || targetObj.type === 'clay_model' || targetObj.type === 'imported_layout') : false;
  const dims = targetObj?.metadata?.dimensions || [24, 24, 24];
  const widthInch = dims[0];
  const heightInch = dims[1];
  const depthInch = dims[2];

  // Rotate dimensions for the Y-axis rotation
  const theta = targetObj?.rotation?.[1] || 0;
  const cosT = Math.abs(Math.cos(theta));
  const sinT = Math.abs(Math.sin(theta));
  const effectiveWidth = widthInch * cosT + depthInch * sinT;
  const effectiveDepth = widthInch * sinT + depthInch * cosT;

  const activeDims = React.useMemo(() => {
    if (!targetObj) {
      return { distLeft: 0, distBottom: 0, rootHalfWidth_inch: 0, localHingeY_inch: 0, wallW: 0, wallH: 0 };
    }

    if (isBox) {
      const [x, y, z] = targetObj.position;
      // Distance from box's left edge (x - effectiveWidth / 2) to the room's left wall (-roomDimensions.width / 2)
      const distLeft = (x - effectiveWidth / 2) - (-roomDimensions.width / 2);
      // Distance from box's back edge (z - effectiveDepth / 2) to the room's back wall (-roomDimensions.depth / 2)
      const distBottom = (z - effectiveDepth / 2) - (-roomDimensions.depth / 2);
      return { distLeft, distBottom, rootHalfWidth_inch: 0, localHingeY_inch: 0, wallW: 0, wallH: 0 };
    } else {
      const layoutTransform = {
        position: targetObj.position,
        attachedPlane: targetObj.attachedPlane as any,
        mountAnchor: targetObj.metadata?.mountAnchor || 'back'
      };

      let wallW = roomDimensions.width;
      let wallH = roomDimensions.height;
      
      let currentX = layoutTransform.position[0];
      let currentY = layoutTransform.position[1];

      if (layoutTransform.attachedPlane === 'left' || layoutTransform.attachedPlane === 'right') {
        wallW = roomDimensions.depth;
        currentX = layoutTransform.attachedPlane === 'left' ? layoutTransform.position[2] : -layoutTransform.position[2];
      } else if (layoutTransform.attachedPlane === 'floor' || layoutTransform.attachedPlane === 'ceiling') {
        wallH = roomDimensions.depth;
        currentY = layoutTransform.attachedPlane === 'floor' ? -layoutTransform.position[2] : layoutTransform.position[2];
      }

      let rootHalfWidth_inch = 0;
      let localHingeY_inch = 0;

      if (d3Columns && d3Columns.length > 0) {
        let rootIdx = 0;
        let maxWidth = 0;
        d3Columns.forEach((col, i) => { if (col.width > maxWidth) { maxWidth = col.width; rootIdx = i; } });
        const rootCol = d3Columns[rootIdx];
        if (rootCol) {
          rootHalfWidth_inch = from3D(rootCol.d3Width / 2);
          const totalBottomFlapsHeight = rootCol.bottomFlaps ? rootCol.bottomFlaps.reduce((sum, flap) => sum + flap.d3Height, 0) : 0;
          localHingeY_inch = from3D(totalBottomFlapsHeight + rootCol.mainRow.d3CenterY - (rootCol.mainRow.d3Height / 2));
        }
      }

      const distLeft = (currentX - rootHalfWidth_inch) - (-wallW / 2);
      const distBottom = (currentY + localHingeY_inch) - (-wallH / 2);

      return { distLeft, distBottom, rootHalfWidth_inch, localHingeY_inch, wallW, wallH };
    }
  }, [targetObj, isBox, widthInch, depthInch, roomDimensions, d3Columns, from3D]);

  if (!isSelected || isDragging || !targetObj) return null;

  const handleDimensionChange = (axis: 'left' | 'bottom', newValue: number) => {
    if (isNaN(newValue)) return;
    
    if (isBox) {
      const [x, y, z] = targetObj.position;
      const currentPos = [x, y, z];

      if (axis === 'left') {
        let newX = newValue - roomDimensions.width / 2 + effectiveWidth / 2;
        const halfWidth = effectiveWidth / 2;
        const minX = -roomDimensions.width / 2 + halfWidth;
        const maxX = roomDimensions.width / 2 - halfWidth;
        newX = Math.max(minX, Math.min(maxX, newX));
        currentPos[0] = newX;
      } else if (axis === 'bottom') {
        let newZ = newValue - roomDimensions.depth / 2 + effectiveDepth / 2;
        const halfDepth = effectiveDepth / 2;
        const minZ = -roomDimensions.depth / 2 + halfDepth;
        const maxZ = roomDimensions.depth / 2 - halfDepth;
        newZ = Math.max(minZ, Math.min(maxZ, newZ));
        currentPos[2] = newZ;
      }

      useAppStore.getState().updateSceneObject(targetId, {
        position: currentPos,
      });
    } else {
      const layoutTransform = {
        position: targetObj.position,
        attachedPlane: targetObj.attachedPlane as any,
        mountAnchor: targetObj.metadata?.mountAnchor || 'back'
      };

      const { rootHalfWidth_inch, localHingeY_inch, wallW, wallH } = activeDims;
      let nextPos = [...layoutTransform.position];

      if (axis === 'left') {
        const newCenterLocalX = (-wallW / 2) + newValue + rootHalfWidth_inch;
        if (layoutTransform.attachedPlane === 'left') nextPos[2] = newCenterLocalX;
        else if (layoutTransform.attachedPlane === 'right') nextPos[2] = -newCenterLocalX;
        else nextPos[0] = newCenterLocalX;
      } else if (axis === 'bottom') {
        const newCenterLocalY = (-wallH / 2) + newValue - localHingeY_inch;
        if (layoutTransform.attachedPlane === 'floor') nextPos[2] = -newCenterLocalY;
        else if (layoutTransform.attachedPlane === 'ceiling') nextPos[2] = newCenterLocalY;
        else nextPos[1] = newCenterLocalY;
      }

      useAppStore.getState().updateSceneObject(targetId, {
        position: nextPos,
      });
    }
  };

  if (isBox) {
    const elevation = targetObj ? (targetObj.position[1] + roomDimensions.height / 2) : 0;

    return (
      <>
        {/* Distance to Back Wall (Z-axis, labeled as ↕) */}
        <Html position={[0, to3D(heightInch / 2), -to3D(effectiveDepth / 2) - 0.2]} center zIndexRange={[100, 0]}>
          <div className="flex flex-col items-center pointer-events-auto select-none font-sans">
            <div className="w-0.5 h-6 bg-indigo-500/50 border-x border-white/50 border-dashed mb-1"></div>
            <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-slate-200 flex items-center gap-1">
              <span className="font-bold text-slate-400">↕</span>
              <input 
                type="number" 
                value={Math.round(activeDims.distBottom * 100) / 100}
                onChange={(e) => handleDimensionChange('bottom', parseFloat(e.target.value))}
                className="w-12 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
              />
              <span className="text-slate-400">in</span>
            </div>
          </div>
        </Html>

        {/* Distance to Left Wall (X-axis, labeled as ↔) */}
        <Html position={[-to3D(effectiveWidth / 2) - 0.2, to3D(heightInch / 2), 0]} center zIndexRange={[100, 0]}>
          <div className="flex items-center pointer-events-auto select-none font-sans">
            <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-slate-200 flex items-center gap-1">
              <span className="font-bold text-slate-400">↔</span>
              <input 
                type="number" 
                value={Math.round(activeDims.distLeft * 100) / 100}
                onChange={(e) => handleDimensionChange('left', parseFloat(e.target.value))}
                className="w-12 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
              />
              <span className="text-slate-400">in</span>
            </div>
            <div className="h-0.5 w-6 bg-indigo-500/50 border-y border-white/50 border-dashed ml-1"></div>
          </div>
        </Html>

        {/* Elevation / Dist. to Floor (Vertical axis, labeled as ⇡) */}
        <Html position={[to3D(effectiveWidth / 2) + 0.3, to3D(heightInch / 2), 0]} center zIndexRange={[100, 0]}>
          <div className="flex items-center pointer-events-auto select-none font-sans">
            <div className="h-0.5 w-6 bg-emerald-500/50 border-y border-white/50 border-dashed mr-1"></div>
            <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-emerald-200 flex items-center gap-1 transition-all hover:border-emerald-400">
              <span className="font-bold text-emerald-500">⇡ Elevation</span>
              <input 
                type="number" 
                value={Math.round(elevation * 10) / 10}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    const newY = -roomDimensions.height / 2 + val;
                    useAppStore.getState().updateSceneObject(targetId, {
                      position: [targetObj.position[0], newY, targetObj.position[2]],
                    });
                  }
                }}
                className="w-12 bg-transparent text-center font-bold text-emerald-600 focus:outline-hidden appearance-none"
              />
              <span className="text-slate-400">in</span>
            </div>
          </div>
        </Html>
      </>
    );
  }

  return (
    <>
      {/* Distance to Bottom Edge */}
      <Html position={[0, -to3D(activeDims.localHingeY_inch) - 0.2, 0]} center zIndexRange={[100, 0]}>
        <div className="flex flex-col items-center pointer-events-auto select-none font-sans">
          <div className="w-0.5 h-6 bg-indigo-500/50 border-x border-white/50 border-dashed mb-1"></div>
          <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-slate-200 flex items-center gap-1">
            <span className="font-bold text-slate-400">↕</span>
            <input 
              type="number" 
              value={Math.round(activeDims.distBottom * 100) / 100}
              onChange={(e) => handleDimensionChange('bottom', parseFloat(e.target.value))}
              className="w-12 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
            />
            <span className="text-slate-400">in</span>
          </div>
        </div>
      </Html>

      {/* Distance to Left Edge */}
      <Html position={[-to3D(activeDims.rootHalfWidth_inch) - 0.2, 0, 0]} center zIndexRange={[100, 0]}>
        <div className="flex items-center pointer-events-auto select-none font-sans">
          <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-slate-200 flex items-center gap-1">
            <span className="font-bold text-slate-400">↔</span>
            <input 
              type="number" 
              value={Math.round(activeDims.distLeft * 100) / 100}
              onChange={(e) => handleDimensionChange('left', parseFloat(e.target.value))}
              className="w-12 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
            />
            <span className="text-slate-400">in</span>
          </div>
          <div className="h-0.5 w-6 bg-indigo-500/50 border-y border-white/50 border-dashed ml-1"></div>
        </div>
      </Html>
    </>
  );
};
