const THREE = require('three');

const layoutObj = new THREE.Object3D();

// modelGroup
const modelGroup = new THREE.Object3D();
layoutObj.add(modelGroup);

// leftParent (fold)
const leftParent = new THREE.Object3D();
leftParent.rotation.y = 90 * Math.PI / 180;
modelGroup.add(leftParent);

// panelNode
const panelNode = new THREE.Object3D();
leftParent.add(panelNode);

// nicheNode
const nicheNode = new THREE.Object3D();
panelNode.add(nicheNode);

layoutObj.updateMatrixWorld(true);

const worldDir = new THREE.Vector3(0, 0, 1);
worldDir.transformDirection(nicheNode.matrixWorld);

console.log("worldDir:", worldDir.x, worldDir.y, worldDir.z);

