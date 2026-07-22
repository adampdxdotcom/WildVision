const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/interactions/index.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const { handleSceneObjectDragMove } = usePropDragHandler({",
  "const { handlePropDragMove } = usePropDragHandler({"
);

content = content.replace(
  "const handled = handleSceneObjectDragMove(",
  "const handled = handlePropDragMove("
);

// We need to fix the hit detection to not subtract roomDimensions if showIn2D is true
const oldHitDetection = `
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
    }`;

const newHitDetection = `
    const clickedSceneObject = Object.values(sceneObjects).find(obj => {
      if (!obj.metadata?.showIn2D) return false;
      const width = obj.metadata?.dimensions?.[0] || 12;
      const height = obj.metadata?.dimensions?.[1] || 12; // Use height in 2D (which is position[1] map)
      const objWx = obj.position[0];
      const objWy = obj.position[1];
      // Box is centered on objWx, objWy
      return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
    });

    if (clickedSceneObject) {
      setActiveObjectId(clickedSceneObject.id);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
      dragMachine.setDraggingSceneObjectId(clickedSceneObject.id);
      setDragStart({ x: clientX, y: clientY });
      
      const objWx = clickedSceneObject.position[0];
      const objWy = clickedSceneObject.position[1];
      dragMachine.setSceneObjectStartPos({ x: objWx, y: objWy });
      
      setActiveCursor('move');
      return;
    } else {
      setActiveObjectId(null);
    }`;

content = content.replace(oldHitDetection, newHitDetection);

// Handle cursor update for hover
const oldHover = `
      const hoveredSceneObject = Object.values(sceneObjects).find(obj => {
        if (!obj.metadata?.showIn2D) return false;
        const width = obj.metadata?.dimensions?.[0] || 12;
        const height = obj.metadata?.dimensions?.[1] || 12;
        const objWx = obj.position[0] + (roomDimensions.width / 2);
        const objWy = obj.position[1] + (roomDimensions.height / 2);
        return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
      });`;
      
const newHover = `
      const hoveredSceneObject = Object.values(sceneObjects).find(obj => {
        if (!obj.metadata?.showIn2D) return false;
        const width = obj.metadata?.dimensions?.[0] || 12;
        const height = obj.metadata?.dimensions?.[1] || 12;
        const objWx = obj.position[0];
        const objWy = obj.position[1];
        return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
      });`;

content = content.replace(oldHover, newHover);

fs.writeFileSync(file, content);
