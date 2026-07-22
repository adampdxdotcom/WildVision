const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/interactions/index.ts');
let content = fs.readFileSync(file, 'utf8');

const sceneObjectCheck = `
    const clickedSceneObject = Object.values(sceneObjects).find(obj => {
      if (!obj.metadata?.showIn2D) return false;
      const width = obj.metadata?.dimensions?.[0] || 12;
      const height = obj.metadata?.dimensions?.[1] || 12; // Use height in 2D (which is position[1] map)
      const objWx = obj.position[0] + (roomDimensions.width / 2);
      const objWy = obj.position[1] + (roomDimensions.height / 2);
      // Box is centered on objWx, objWy
      return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
    });

    if (clickedSceneObject) {
      setActiveObjectId(clickedSceneObject.id);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
      dragMachine.setDraggingSceneObjectId(clickedSceneObject.id);
      setDragStart({ x: clientX, y: clientY });
      
      const objWx = clickedSceneObject.position[0] + (roomDimensions.width / 2);
      const objWy = clickedSceneObject.position[1] + (roomDimensions.height / 2);
      dragMachine.setSceneObjectStartPos({ x: objWx, y: objWy });
      
      setActiveCursor('move');
      return;
    } else {
      setActiveObjectId(null);
    }
`;

// Remove the existing scene object check from its original location
const startIndex = content.indexOf('    const clickedSceneObject = Object.values(sceneObjects).find(obj => {');
const endIndex = content.indexOf('    const clickedExt = wallExtensions.find(');
if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
}

// Inject it just before `let hitSegment = false;`
content = content.replace('    let hitSegment = false;', sceneObjectCheck.trim() + '\n\n    let hitSegment = false;');

fs.writeFileSync(file, content);
