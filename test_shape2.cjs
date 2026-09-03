const THREE = require('three');
function to3D(v) { return v * 0.05; }
const roomDimensions = { width: 100, height: 100, depth: 100 }; // 5x5x5 in 3D

const layoutTransform = {
   position: [0, 0, 0], // let's assume it's flush
   attachedPlane: 'left',
   mountAnchor: 'back'
};

const d3Columns = [
   { 
      startX: 0, endX: 40, width: 40, d3Width: to3D(40), foldAngle: 90,
      mainRow: { startY: 0, height: 80, d3Height: to3D(80), d3CenterY: to3D(40), startX: 0, width: 40, d3Width: to3D(40) }
   },
   { 
      startX: 40, endX: 100, width: 60, d3Width: to3D(60),
      mainRow: { startY: 0, height: 80, d3Height: to3D(80), d3CenterY: to3D(40), startX: 40, width: 60, d3Width: to3D(60) }
   }
];
const rootIdx = 1;
const rootCol = d3Columns[1];

const subAreas = [
   { x: 10, y: 30, width: 20, height: 20, hasSill: true, border: { enabled: false } } // Niche on left return
];

const layoutObj = new THREE.Object3D();
const px = -2.5; // flush with left wall
const py = -2.5; // floor
const pz = 0; // center of left wall
layoutObj.position.set(px, py, pz);
layoutObj.rotation.set(0, Math.PI / 2, 0); // attached to left wall

const zOffsetGroup = new THREE.Object3D();
zOffsetGroup.position.set(0, 0, -to3D(40)/2); // maxInward is 40
layoutObj.add(zOffsetGroup);

const modelGroup = new THREE.Object3D();
modelGroup.position.set(-rootCol.d3Width/2, 0, 0);
zOffsetGroup.add(modelGroup);

const panelNodeMap = new Map();
let leftParent = modelGroup;
for (let i = rootIdx - 1; i >= 0; i--) {
   const col = d3Columns[i];
   const prevCol = d3Columns[i + 1];
   const hinge = new THREE.Object3D();
   hinge.position.set(i === rootIdx - 1 ? 0 : -prevCol.d3Width, 0, 0);
   hinge.rotation.y = (col.rightFoldAngle ?? col.foldAngle ?? 90) * Math.PI / 180;
   leftParent.add(hinge);

   const p = new THREE.Object3D();
   p.position.set(-col.d3Width / 2, col.mainRow.d3CenterY, 0);
   hinge.add(p);
   panelNodeMap.set(col.mainRow, p);
   leftParent = hinge;
}

const targetPanel = d3Columns[0].mainRow;
const panelNode = panelNodeMap.get(targetPanel);
const sa = subAreas[0];
const toD3X_sa = (x) => ((x - targetPanel.startX) / targetPanel.width - 0.5) * targetPanel.d3Width;
const toD3Y_sa = (y) => ((y - targetPanel.startY) / targetPanel.height - 0.5) * targetPanel.d3Height;

const nicheNode = new THREE.Object3D();
nicheNode.position.set(
   (toD3X_sa(sa.x) + toD3X_sa(sa.x + sa.width)) / 2,
   (toD3Y_sa(sa.y) + toD3Y_sa(sa.y + sa.height)) / 2,
   0
);
panelNode.add(nicheNode);
layoutObj.updateMatrixWorld(true);

const worldPos = new THREE.Vector3();
nicheNode.getWorldPosition(worldPos);

const worldDir = new THREE.Vector3(0, 0, 1);
worldDir.transformDirection(nicheNode.matrixWorld);

let hitPlane = '';
if (worldDir.z > 0.99) hitPlane = 'back';
else if (worldDir.x > 0.99) hitPlane = 'left';
else if (worldDir.x < -0.99) hitPlane = 'right';
else if (worldDir.y > 0.99) hitPlane = 'floor';
else if (worldDir.y < -0.99) hitPlane = 'ceiling';

console.log("worldPos:", worldPos);
console.log("worldDir:", worldDir);
console.log("hitPlane:", hitPlane);
