import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface KeyboardCameraControllerProps {
  controlsRef: React.RefObject<any>;
}

export const KeyboardCameraController: React.FC<KeyboardCameraControllerProps> = ({ controlsRef }) => {
  const keysPressed = React.useRef(new Set<string>());

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input Guard: Do not trigger if typing in a text box or number input
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      
      keysPressed.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Safety clear if window loses focus
    const handleBlur = () => keysPressed.current.clear();
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    const camera = state.camera;
    const controls = controlsRef.current;
    const keys = keysPressed.current;

    if (keys.size === 0) return;

    const moveSpeed = 3.5; // Smooth, gentle speed (units per second)
    const distance = moveSpeed * delta;

    // Get the camera's local directional axes
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    const moveVec = new THREE.Vector3(0, 0, 0);

    if (keys.has('w')) moveVec.add(up);
    if (keys.has('s')) moveVec.sub(up);
    if (keys.has('a')) moveVec.sub(right);
    if (keys.has('d')) moveVec.add(right);
    if (keys.has('e')) moveVec.add(forward);
    if (keys.has('c')) moveVec.sub(forward);

    if (moveVec.lengthSq() > 0) {
      moveVec.normalize().multiplyScalar(distance);
      
      // Move BOTH camera and target to pan instead of orbit
      camera.position.add(moveVec);
      controls.target.add(moveVec);
      controls.update();
    }
  });

  return null;
};
