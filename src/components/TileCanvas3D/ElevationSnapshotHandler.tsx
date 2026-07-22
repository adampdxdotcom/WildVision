import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { mathCropElevationImage } from '../../utils/imageUtils';

export const ElevationSnapshotHandler: React.FC = () => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const handleCapture = async () => {
      const oldBg = scene.background;
      scene.background = null; // Use null to get transparent background for mathCropElevationImage

      // Force a synchronous frame render
      gl.render(scene, camera);
      
      const rawPngDataUrl = gl.domElement.toDataURL('image/png');
      scene.background = oldBg;
      
      // 1. Calculate the active 3D bounds of the wall being viewed
      const roomDims = useAppStore.getState().roomDimensions;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      // Determine if camera is looking down the Z axis (Front/Back) or X axis (Left/Right)
      const isZAxis = Math.abs(dir.z) > Math.abs(dir.x);
      const activeWidth = isZAxis ? roomDims.width : roomDims.depth;

      const maxBound = Math.max(roomDims.width, roomDims.height, roomDims.depth, 1);
      const w3D = (activeWidth / maxBound) * 5;
      const h3D = (roomDims.height / maxBound) * 5;

      // 2. Pass the raw image and the exact 3D dimensions to the mathematical cropper
      const croppedDataUrl = await mathCropElevationImage(rawPngDataUrl, w3D, h3D);
      
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      
      window.dispatchEvent(new CustomEvent('wildvision:elevation-blob-ready', { detail: blob }));
    };

    window.addEventListener('wildvision:trigger-elevation-capture', handleCapture);
    
    return () => {
      window.removeEventListener('wildvision:trigger-elevation-capture', handleCapture);
    };
  }, [gl, scene, camera]);

  return null;
};
