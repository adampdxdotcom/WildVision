const THREE = require('three');

const layoutObj = new THREE.Object3D();
layoutObj.position.set(0, 0, -30); // back wall is at Z = -30, let's say depth is 60

const modelGroup = new THREE.Object3D();
modelGroup.position.set(-20, 0, 0); // width is 40, so left edge is at -20
layoutObj.add(modelGroup);

// left fold
const hinge = new THREE.Object3D();
hinge.position.set(0, 0, 0);
hinge.rotation.y = 90 * Math.PI / 180;
modelGroup.add(hinge);

// panel
const p = new THREE.Object3D();
p.position.set(-15, 0, 0); // left return is 30 wide, so center is at -15
hinge.add(p);

layoutObj.updateMatrixWorld(true);
const worldPos = new THREE.Vector3();
p.getWorldPosition(worldPos);

console.log("World Pos:", worldPos.x, worldPos.y, worldPos.z);
console.log("hx (left plane mapped):", -worldPos.z, "hY:", worldPos.y);

