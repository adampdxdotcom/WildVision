import * as THREE from 'three';
const root = new THREE.Object3D();
// rotate 90 degrees left around Y
root.rotation.set(0, Math.PI / 2, 0); 
root.updateMatrixWorld(true);
const dir = new THREE.Vector3(0, 0, 1);
dir.transformDirection(root.matrixWorld);
console.log("Rounded normal:", dir.x.toFixed(2), dir.y.toFixed(2), dir.z.toFixed(2));
