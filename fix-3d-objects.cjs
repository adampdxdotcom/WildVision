const fs = require('fs');
const path = require('path');

function updateObject(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we have roomDimensions
    if (!content.includes('const roomDimensions = useAppStore((state) => state.roomDimensions);')) {
        content = content.replace(
            "const activeObjectId = useAppStore((state) => state.activeObjectId);",
            "const activeObjectId = useAppStore((state) => state.activeObjectId);\n  const roomDimensions = useAppStore((state) => state.roomDimensions);"
        );
    }

    const oldPosX = "const posX = to3D(data.position[0]);";
    const oldPosY = "const posY = to3D(data.position[1]);";

    const newPosX = "const posX = to3D(data.metadata?.showIn2D ? data.position[0] - (roomDimensions?.width || 120) / 2 : data.position[0]);";
    const newPosY = "const posY = to3D(data.metadata?.showIn2D ? data.position[1] - (roomDimensions?.height || 96) / 2 : data.position[1]);";

    content = content.replace(oldPosX, newPosX);
    content = content.replace(oldPosY, newPosY);

    fs.writeFileSync(filePath, content);
}

updateObject(path.join(__dirname, 'src/components/TileCanvas3D/CustomBoxObject.tsx'));
updateObject(path.join(__dirname, 'src/components/TileCanvas3D/ClayModelObject.tsx'));
