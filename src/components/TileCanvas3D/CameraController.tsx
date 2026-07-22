import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';

interface CameraControllerProps {
  controlsRef: React.RefObject<any>;
}

export const CameraController: React.FC<CameraControllerProps> = ({ controlsRef }) => {
  const { camera } = useThree();
  const savedCameraFov = useAppStore((state) => state.savedCameraFov);
  const zoom3D = useAppStore((state) => state.zoom3D);
  const reset3DTrigger = useAppStore((state) => state.reset3DTrigger);
  const activeCameraPosition = useAppStore((state) => state.activeCameraPosition);
  const activeCameraTarget = useAppStore((state) => state.activeCameraTarget);
  const activeCameraTrigger = useAppStore((state) => state.activeCameraTrigger);
  const isCameraHeightLocked = useAppStore((state) => state.isCameraHeightLocked);
  const lastResetTrigger = React.useRef(reset3DTrigger);

  const hasRestored = React.useRef(false);

  // Part 1: Restore Last Known View (Remounting)
  React.useEffect(() => {
    const livePos = useAppStore.getState().liveCameraPosition;
    const liveTarget = useAppStore.getState().liveCameraTarget;

    if (livePos && livePos.length === 3 && liveTarget && liveTarget.length === 3 && controlsRef.current) {
      camera.position.set(livePos[0], livePos[1], livePos[2]);
      controlsRef.current.target.set(liveTarget[0], liveTarget[1], liveTarget[2]);
      camera.updateProjectionMatrix();
      controlsRef.current.update();
      hasRestored.current = true;
    }
  }, [camera, controlsRef, controlsRef.current]);

  // Synchronously restore live view state in the first R3F frame when controls are active and ready
  useFrame(() => {
    if (!hasRestored.current && controlsRef.current) {
      const livePos = useAppStore.getState().liveCameraPosition;
      const liveTarget = useAppStore.getState().liveCameraTarget;

      if (livePos && livePos.length === 3) {
        camera.position.set(livePos[0], livePos[1], livePos[2]);
      } else {
        camera.position.set(0, 0, 4.5);
      }

      if (liveTarget && liveTarget.length === 3) {
        controlsRef.current.target.set(liveTarget[0], liveTarget[1], liveTarget[2]);
      } else {
        controlsRef.current.target.set(0, 0, 0);
      }

      camera.updateProjectionMatrix();
      controlsRef.current.update();
      hasRestored.current = true;
    }
  });

  // Track global manual resetting signals
  React.useEffect(() => {
    let changed = false;

    if (reset3DTrigger !== lastResetTrigger.current) {
      lastResetTrigger.current = reset3DTrigger;
      useAppStore.getState().setLiveCamera(null, null);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        camera.position.set(0, 0, 4.5);
        controlsRef.current.update();
      } else {
        camera.position.set(0, 0, 4.5);
      }
      changed = true;
    }

    if (camera && 'fov' in camera) {
      if ((camera as any).fov !== savedCameraFov) {
        (camera as any).fov = savedCameraFov;
        changed = true;
      }
    }

    if (camera) {
      if (camera.zoom !== zoom3D) {
        camera.zoom = zoom3D;
        changed = true;
      }
    }

    if (changed) {
      camera.updateProjectionMatrix();
    }
  }, [camera, controlsRef, savedCameraFov, zoom3D, reset3DTrigger]);

  // Track explicit/niche tool focal points & updates (e.g., gallery restore)
  React.useEffect(() => {
    if (activeCameraTrigger > 0) {
      if (
        activeCameraPosition &&
        activeCameraPosition.length === 3 &&
        activeCameraTarget &&
        activeCameraTarget.length === 3
      ) {
        camera.position.set(
          activeCameraPosition[0],
          activeCameraPosition[1],
          activeCameraPosition[2]
        );

        if (controlsRef.current) {
          controlsRef.current.target.set(
            activeCameraTarget[0],
            activeCameraTarget[1],
            activeCameraTarget[2]
          );
          controlsRef.current.update();
        } else {
          camera.lookAt(
            activeCameraTarget[0],
            activeCameraTarget[1],
            activeCameraTarget[2]
          );
        }

        if (savedCameraFov && camera && 'fov' in camera) {
          (camera as any).fov = savedCameraFov;
        }

        camera.updateProjectionMatrix();

        if (controlsRef.current) {
          controlsRef.current.update();
        }

        // Keep the live state synchronized in the store so other components remain in sync
        useAppStore.getState().setLiveCamera(
          [camera.position.x, camera.position.y, camera.position.z],
          controlsRef.current
            ? [
                controlsRef.current.target.x,
                controlsRef.current.target.y,
                controlsRef.current.target.z,
              ]
            : [
                activeCameraTarget[0],
                activeCameraTarget[1],
                activeCameraTarget[2],
              ]
        );
      }
    }
  }, [
    activeCameraPosition,
    activeCameraTarget,
    activeCameraTrigger,
    camera,
    controlsRef,
    savedCameraFov,
  ]);

  // Synchronize FOV instantly
  React.useEffect(() => {
    if (camera && 'fov' in camera) {
      (camera as any).fov = savedCameraFov;
      camera.updateProjectionMatrix();
    }
  }, [camera, savedCameraFov]);

  // Implement Height Lock Physics (Freeze vertical orbit polar angle)
  React.useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    if (isCameraHeightLocked) {
      const currentPolarAngle = controls.getPolarAngle();
      controls.minPolarAngle = currentPolarAngle;
      controls.maxPolarAngle = currentPolarAngle;
    } else {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
    }
  }, [controlsRef, controlsRef.current, isCameraHeightLocked]);

  return null;
};

