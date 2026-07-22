const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas3D/useDragController.ts');
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `        const minY = -roomDimensions.height / 2 + bounds.height / 2;
        const maxY = roomDimensions.height / 2 - bounds.height / 2;
        yInch = Math.max(minY, Math.min(maxY, yInch));
      }
    }

    useAppStore.getState().updateSceneObject(activeId, {`;
    
const newLogic = `        const minY = -roomDimensions.height / 2 + bounds.height / 2;
        const maxY = roomDimensions.height / 2 - bounds.height / 2;
        yInch = Math.max(minY, Math.min(maxY, yInch));
      }
    }

    if (activeObj.metadata?.showIn2D) {
      zInch = activeObj.position[2];
    }

    useAppStore.getState().updateSceneObject(activeId, {`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
