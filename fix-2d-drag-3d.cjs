const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/dragHandlers/usePropDragHandler.ts');
let content = fs.readFileSync(file, 'utf8');

const clampLogic = `
    const width = obj.metadata?.dimensions?.[0] || 12;
    const height = obj.metadata?.dimensions?.[1] || 12;
    
    // newWx and newWy are in 2D coordinates (0 to width/height)
    const minX = width / 2;
    const maxX = roomDimensions.width - width / 2;
    const minY = height / 2;
    const maxY = roomDimensions.height - height / 2;

    let clampedX = Math.max(minX, Math.min(maxX, newWx));
    let clampedY = Math.max(minY, Math.min(maxY, newWy));

    // Convert 2D coordinates to 3D coordinates (center = 0, floor = -height/2)
    let pos0 = clampedX - (roomDimensions.width / 2);
    let pos1 = clampedY - (roomDimensions.height / 2);
`;

const oldLogic = `
    const width = obj.metadata?.dimensions?.[0] || 12;
    const height = obj.metadata?.dimensions?.[1] || 12;
    
    const minX = width / 2;
    const maxX = roomDimensions.width - width / 2;
    const minY = height / 2;
    const maxY = roomDimensions.height - height / 2;

    let pos0 = Math.max(minX, Math.min(maxX, newWx));
    let pos1 = Math.max(minY, Math.min(maxY, newWy));
`;

content = content.replace(oldLogic.trim(), clampLogic.trim());
fs.writeFileSync(file, content);
