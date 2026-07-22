const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/interactions/index.ts');
let content = fs.readFileSync(file, 'utf8');

const oldDragStartCall = `      handleDragStart(e.clientX, e.clientY, e.shiftKey);
    }
  };`;
const newDragStartCall = `      const hitProp = handleDragStart(e.clientX, e.clientY, e.shiftKey);
      if (hitProp) {
        e.stopPropagation();
      }
    }
  };`;

content = content.replace(oldDragStartCall, newDragStartCall);

const oldDragStartReturn = `    if (clickedSceneObject) {
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
    } else {`;
const newDragStartReturn = `    if (clickedSceneObject) {
      setActiveObjectId(clickedSceneObject.id);
      setActiveSubAreaId(null);
      setActiveWallExtensionId(null);
      dragMachine.setDraggingSceneObjectId(clickedSceneObject.id);
      setDragStart({ x: clientX, y: clientY });
      
      const objWx = clickedSceneObject.position[0] + (roomDimensions.width / 2);
      const objWy = clickedSceneObject.position[1] + (roomDimensions.height / 2);
      dragMachine.setSceneObjectStartPos({ x: objWx, y: objWy });
      
      setActiveCursor('move');
      return true;
    } else {`;

content = content.replace(oldDragStartReturn, newDragStartReturn);

fs.writeFileSync(file, content);
