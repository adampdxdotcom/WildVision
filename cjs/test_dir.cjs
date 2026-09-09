const THREE = require('three');

const layoutObj = new THREE.Object3D();
layoutObj.rotation.set(0, 0, 0); // attachedPlane = 'back'

const modelGroup = new THREE.Object3D();
layoutObj.add(modelGroup);

const leftParent = new THREE.Object3D();
leftParent.rotation.y = 90 * Math.PI / 180; // left fold 90 deg
modelGroup.add(leftParent);

const panelNode = new THREE.Object3D();
leftParent.add(panelNode);

const nicheNode = new THREE.Object3D();
panelNode.add(nicheNode);

layoutObj.updateMatrixWorld(true);

const worldDir = new THREE.Vector3(0, 0, 1);
worldDir.transformDirection(nicheNode.matrixWorld);

console.log("World dir:", worldDir.x, worldDir.y, worldDir.z);
