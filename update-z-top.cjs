const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas3D/useDragController.ts');
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `      // Constrain inside room depth: [-roomDimensions.depth / 2 + halfDepth, roomDimensions.depth / 2 - halfDepth]
      const minZ = -roomDimensions.depth / 2 + halfDepth;
      const maxZ = roomDimensions.depth / 2 - halfDepth;
      zInch = Math.max(minZ, Math.min(maxZ, zInch));

      useAppStore.getState().updateSceneObject(activeId, {`;
    
const newLogic = `      // Constrain inside room depth: [-roomDimensions.depth / 2 + halfDepth, roomDimensions.depth / 2 - halfDepth]
      const minZ = -roomDimensions.depth / 2 + halfDepth;
      const maxZ = roomDimensions.depth / 2 - halfDepth;
      zInch = Math.max(minZ, Math.min(maxZ, zInch));

      if (activeObj.metadata?.showIn2D) {
        zInch = -(roomDimensions.depth / 2) + (activeObj.metadata.dimensions[2] / 2);
      }

      useAppStore.getState().updateSceneObject(activeId, {`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
