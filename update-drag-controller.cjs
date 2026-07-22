const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/useDragController.ts', 'utf8');

code = code.replace(
  /const initialClientYRef = React\.useRef<number>\(0\);\n\s*const initialYInchRef = React\.useRef<number>\(0\);/,
  `const initialClientYRef = React.useRef<number>(0);\n  const initialYInchRef = React.useRef<number>(0);\n  const initialXInchRef = React.useRef<number>(0);\n  const initialZInchRef = React.useRef<number>(0);`
);

code = code.replace(
  /initialYInchRef\.current = currentPos\[1\];/,
  `initialYInchRef.current = currentPos[1];\n    initialXInchRef.current = currentPos[0];\n    initialZInchRef.current = currentPos[2];`
);

// Replace the isShift block
const shiftBlockRegex = /if \(isShift && \(activeObj\.type === 'custom_box' \|\| activeObj\.type === 'clay_model' \|\| activeObj\.type === 'imported_layout'\)\) \{[\s\S]*?return;\n\s*\}/;

const newShiftBlock = `if (activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout') {
      if (isShift) {
        const clientY = e.nativeEvent?.clientY || 0;
        const deltaYPixels = clientY - initialClientYRef.current;
        const deltaYInch = -deltaYPixels * 0.35;
        const yInch = initialYInchRef.current + deltaYInch;

        const dims = activeObj.metadata?.dimensions || [24, 24, 24];
        const height = dims[1];
        const halfRoomH = roomDimensions.height / 2;
        const halfBoxH = height / 2;

        let finalYInch = Math.max(0, Math.min(halfRoomH - halfBoxH, yInch));
        
        const roomFloorY = -halfRoomH;
        cachedElevationRef.current = finalYInch - roomFloorY;

        useAppStore.getState().updateSceneObject(activeId, {
          position: [initialXInchRef.current, finalYInch, initialZInchRef.current],
          attachedPlane: 'floor',
        });
        return;
      }
    }`;

code = code.replace(shiftBlockRegex, newShiftBlock);

// Replace the yInch extraction and locking
const yInchRegex = /let yInch = from3D\(e\.point\.y\) \+ \(dragOffsetRef\.current\?\.y \|\| 0\);/;
const newYInch = `let yInch = from3D(e.point.y) + (dragOffsetRef.current?.y || 0);

    if (!isShift && (activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout')) {
      const isTileLayout = activeId === 'main-tile-layout' || activeObj.type === 'imported_layout';
      if (isTileLayout) {
        yInch = activeObj.position[1] - (roomDimensions.height / 2);
      } else {
        yInch = activeObj.position[1];
      }
    }`;
code = code.replace(yInchRegex, newYInch);

// Remove the floor and ceiling planeKey modifications for yInch if it's locked
const planeKeyRegex = /\} else if \(planeKey === 'floor'\) \{\n\s*yInch = -roomDimensions\.height \/ 2;\n\s*\} else if \(planeKey === 'ceiling'\) \{\n\s*yInch = roomDimensions\.height \/ 2;\n\s*\}/;
const newPlaneKey = `} else if (planeKey === 'floor') {
      if (!(activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout')) {
        yInch = -roomDimensions.height / 2;
      }
    } else if (planeKey === 'ceiling') {
      if (!(activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout')) {
        yInch = roomDimensions.height / 2;
      }
    }`;
code = code.replace(planeKeyRegex, newPlaneKey);

// Clamp storeY
const storeYRegex = /let storeY = yInch;\n\s*if \(isTileLayout\) \{\n\s*storeX = xInch - \(-\(roomDimensions\.width \/ 2\)\);\n\s*storeY = yInch - \(-\(roomDimensions\.height \/ 2\)\);\n\s*\}/;
const newStoreY = `let storeY = yInch;
    
    if (isTileLayout) {
      storeX = xInch - (-(roomDimensions.width / 2));
      storeY = yInch - (-(roomDimensions.height / 2));
    }

    storeY = Math.max(0, storeY);`;
code = code.replace(storeYRegex, newStoreY);

fs.writeFileSync('src/components/TileCanvas3D/useDragController.ts', code);
