const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/dragHandlers/usePropDragHandler.ts');
let content = fs.readFileSync(file, 'utf8');

const clampLogic = `
    const width = obj.metadata?.dimensions?.[0] || 12;
    const height = obj.metadata?.dimensions?.[1] || 12;
    
    const minX = width / 2;
    const maxX = roomDimensions.width - width / 2;
    const minY = height / 2;
    const maxY = roomDimensions.height - height / 2;

    let pos0 = Math.max(minX, Math.min(maxX, newWx));
    let pos1 = Math.max(minY, Math.min(maxY, newWy));
`;

content = content.replace(
  "    let pos0 = newWx;\n    let pos1 = newWy;\n        if (!obj.metadata?.showIn2D) {\n      // If it wasn't spawned in 2D, we might need to convert it back to 3D coordinates.\n      // But the prompt says map 2D X to position[0] directly. Let's just do it.\n      // Wait, if it wasn't spawned in 2D, but it's being dragged in 2D? (which is impossible if showIn2D is false, because we filter by showIn2D in index.ts)\n    }",
  clampLogic.trim()
);

fs.writeFileSync(file, content);
