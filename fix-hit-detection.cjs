const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/TileCanvas/hooks/interactions/index.ts');
let content = fs.readFileSync(file, 'utf8');

const oldLogic1 = `
      const objWx = obj.position[0];
      const objWy = obj.position[1];
      // Box is centered on objWx, objWy
`;
const newLogic1 = `
      const objWx = obj.position[0] + (roomDimensions.width / 2);
      const objWy = obj.position[1] + (roomDimensions.height / 2);
      // Box is centered on objWx, objWy
`;

content = content.replace(oldLogic1.trim(), newLogic1.trim());

const oldLogic2 = `
      const objWx = clickedSceneObject.position[0];
      const objWy = clickedSceneObject.position[1];
      dragMachine.setSceneObjectStartPos({ x: objWx, y: objWy });
`;
const newLogic2 = `
      const objWx = clickedSceneObject.position[0] + (roomDimensions.width / 2);
      const objWy = clickedSceneObject.position[1] + (roomDimensions.height / 2);
      dragMachine.setSceneObjectStartPos({ x: objWx, y: objWy });
`;

content = content.replace(oldLogic2.trim(), newLogic2.trim());

const oldLogic3 = `
        const objWx = obj.position[0];
        const objWy = obj.position[1];
        return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
`;
const newLogic3 = `
        const objWx = obj.position[0] + (roomDimensions.width / 2);
        const objWy = obj.position[1] + (roomDimensions.height / 2);
        return wx >= objWx - width / 2 && wx <= objWx + width / 2 && wy >= objWy - height / 2 && wy <= objWy + height / 2;
`;

content = content.replace(oldLogic3.trim(), newLogic3.trim());

fs.writeFileSync(file, content);
