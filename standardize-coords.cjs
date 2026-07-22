const fs = require('fs');
const path = require('path');

function clean3DObject(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        "const posX = to3D(data.metadata?.showIn2D ? data.position[0] - (roomDimensions?.width || 120) / 2 : data.position[0]);",
        "const posX = to3D(data.position[0]);"
    );
    content = content.replace(
        "const posY = to3D(data.metadata?.showIn2D ? data.position[1] - (roomDimensions?.height || 96) / 2 : data.position[1]);",
        "const posY = to3D(data.position[1]);"
    );

    fs.writeFileSync(filePath, content);
}

clean3DObject(path.join(__dirname, 'src/components/TileCanvas3D/CustomBoxObject.tsx'));
clean3DObject(path.join(__dirname, 'src/components/TileCanvas3D/ClayModelObject.tsx'));
