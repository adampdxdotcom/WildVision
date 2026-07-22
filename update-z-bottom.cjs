const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas3D/useDragController.ts');
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `    if (activeObj.metadata?.showIn2D) {
      zInch = activeObj.position[2];
    }

    useAppStore.getState().updateSceneObject(activeId, {`;
    
const newLogic = `    if (activeObj.metadata?.showIn2D) {
      zInch = -(roomDimensions.depth / 2) + (activeObj.metadata.dimensions[2] / 2);
    }

    useAppStore.getState().updateSceneObject(activeId, {`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
