import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';

interface WebGLSnapshotHandlerProps {
  controlsRef: React.RefObject<any>;
}

export const RESOLUTION_MAP: Record<
  '1:1' | '4:3' | '16:9' | '9:16',
  Record<'1K' | '2K' | '4K', { w: number; h: number }>
> = {
  '1:1': {
    '1K': { w: 1024, h: 1024 },
    '2K': { w: 2048, h: 2048 },
    '4K': { w: 4096, h: 4096 },
  },
  '4:3': {
    '1K': { w: 1200, h: 900 },
    '2K': { w: 2400, h: 1800 },
    '4K': { w: 4800, h: 3600 },
  },
  '16:9': {
    '1K': { w: 1344, h: 756 },
    '2K': { w: 2560, h: 1440 },
    '4K': { w: 3840, h: 2160 },
  },
  '9:16': {
    '1K': { w: 756, h: 1344 },
    '2K': { w: 1440, h: 2560 },
    '4K': { w: 2160, h: 3840 },
  },
};

export const WebGLSnapshotHandler: React.FC<WebGLSnapshotHandlerProps> = ({ controlsRef }) => {
  const { gl, scene, camera } = useThree();
  const capture3DTrigger = useAppStore((state) => state.capture3DTrigger);
  const renderAspectRatio = useAppStore((state) => state.renderAspectRatio);
  const renderResolution = useAppStore((state) => state.renderResolution);
  const setCaptured3DImage = useAppStore((state) => state.setCaptured3DImage);
  const setCapturedCameraPosition = useAppStore((state) => state.setCapturedCameraPosition);
  const setCapturedCameraTarget = useAppStore((state) => state.setCapturedCameraTarget);
  const setCapturedCameraFov = useAppStore((state) => state.setCapturedCameraFov);

  React.useEffect(() => {
    if (capture3DTrigger > 0) {
      // Capture current camera state details before snapshot
      const currentPos = [camera.position.x, camera.position.y, camera.position.z];
      const currentTarget = controlsRef.current 
        ? [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z] 
        : [0, 0, 0];
      const currentFov = 'fov' in camera ? (camera as any).fov : 70;

      // Save raw arrays and value to Zustand store first
      setCapturedCameraPosition(currentPos);
      setCapturedCameraTarget(currentTarget);
      setCapturedCameraFov(currentFov);

      // 1. Temporary Grid & Axis Deactivation
      const hiddenObjects: { object: THREE.Object3D; originalVisible: boolean }[] = [];
      scene.traverse((object) => {
        if (
          object instanceof THREE.GridHelper ||
          object instanceof THREE.AxesHelper ||
          object.name.toLowerCase().includes('grid') ||
          object.name.toLowerCase().includes('helper')
        ) {
          hiddenObjects.push({ object, originalVisible: object.visible });
          object.visible = false;
        }
      });

      // 2. Transparent/Neutral WebGL Clear Pass
      // Save original scene background and renderer clear state
      const originalBackground = scene.background;
      const originalClearColor = new THREE.Color();
      gl.getClearColor(originalClearColor);
      const originalClearAlpha = gl.getClearAlpha();

      // Temporarily set background to null (so it clears to transparent if alpha: true is enabled)
      scene.background = null;
      gl.setClearColor(0x000000, 0); // transparent background with alpha 0

      // Force a manual render pass to guarantee the buffer is full with the clean snapshot scene
      gl.render(scene, camera);

      // Get WebGL canvas dimensions
      const sourceWidth = gl.domElement.width;
      const sourceHeight = gl.domElement.height;

      // Calculate the maximum inscribed crop rectangle at the target aspect ratio
      let ratioNum = 4 / 3;
      if (renderAspectRatio === '1:1') ratioNum = 1.0;
      else if (renderAspectRatio === '16:9') ratioNum = 16 / 9;
      else if (renderAspectRatio === '9:16') ratioNum = 9 / 16;

      const sourceRatio = sourceWidth / sourceHeight;
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;

      if (sourceRatio > ratioNum) {
        // Wider than target ratio: pillarbox crop
        cropHeight = sourceHeight;
        cropWidth = sourceHeight * ratioNum;
      } else {
        // Taller than target ratio: letterbox crop
        cropWidth = sourceWidth;
        cropHeight = sourceWidth / ratioNum;
      }

      const startX = (sourceWidth - cropWidth) / 2;
      const startY = (sourceHeight - cropHeight) / 2;

      // Look up target width and height from the resolution map
      const resolutionConfig = RESOLUTION_MAP[renderAspectRatio][renderResolution] || { w: 1024, h: 1024 };
      const targetWidth = resolutionConfig.w;
      const targetHeight = resolutionConfig.h;

      // Create off-screen canvas to perform the crop and scale
      let tempCanvas: HTMLCanvasElement | null = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      let ctx: CanvasRenderingContext2D | null = tempCanvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(
          gl.domElement,
          startX,
          startY,
          cropWidth,
          cropHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );
      }

      // Generate Base64 JPEG string
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      setCaptured3DImage(dataUrl);

      // Force the garbage collector to clear the heavy texture buffer to prevent WebGL context loss / memory leaks
      if (tempCanvas) {
        tempCanvas.width = 0;
        tempCanvas.height = 0;
        tempCanvas = null;
      }
      ctx = null;

      // 3. Immediately restore elements and original scene background / clear states
      hiddenObjects.forEach(({ object, originalVisible }) => {
        object.visible = originalVisible;
      });
      scene.background = originalBackground;
      gl.setClearColor(originalClearColor, originalClearAlpha);

      // Force another render with restored states immediately so there is no visual flicker
      gl.render(scene, camera);
    }
  }, [capture3DTrigger, gl, scene, camera, controlsRef, renderAspectRatio, renderResolution, setCaptured3DImage, setCapturedCameraPosition, setCapturedCameraTarget, setCapturedCameraFov]);

  return null;
};
