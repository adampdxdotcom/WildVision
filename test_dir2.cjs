const THREE = require('three');

const layoutObj = new THREE.Object3D();
layoutObj.rotation.set(0, Math.PI / 2, 0);

const child = new THREE.Object3D();
layoutObj.add(child);

layoutObj.updateMatrixWorld(true);

const dir = new THREE.Vector3(0, 0, 1);
dir.transformDirection(child.matrixWorld);

console.log("dir:", dir.x, dir.y, dir.z);
