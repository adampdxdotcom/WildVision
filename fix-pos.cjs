const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/dragHandlers/usePropDragHandler.ts');
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `    let pos0 = newWx;
    let pos1 = newWy;
        
    if (!obj.metadata?.showIn2D) {
      // If it wasn't spawned in 2D, we might need to convert it back to 3D coordinates.
      // But the prompt says map 2D X to position[0] directly. Let's just do it.
      // Wait, if it wasn't spawned in 2D, but it's being dragged in 2D? (which is impossible if showIn2D is false, because we filter by showIn2D in index.ts)
    }`;

const newLogic = `    let pos0 = newWx - (roomDimensions.width / 2);
    let pos1 = newWy - (roomDimensions.height / 2);`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
