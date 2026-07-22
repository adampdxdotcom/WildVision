import * as React from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { SceneObject } from '../../types';
import { SmartDimensionsHUD } from './SmartDimensionsHUD';

export interface ClayModelObjectProps {
  data: SceneObject;
  to3D: (val: number) => number;
  from3D: (val: number) => number;
  handlePointerDown: (e: any, id: string) => void;
  isDragging: boolean;
  roomDimensions: { width: number; height: number; depth: number };
}

// Inner component that actually loads the GLTF model
const ClayModelInner: React.FC<ClayModelObjectProps> = ({
  data,
  to3D,
  from3D,
  handlePointerDown,
  isDragging,
  roomDimensions,
}) => {
  const activeObjectId = useAppStore((state) => state.activeObjectId);
  const wallWidth = useAppStore((state) => state.wallWidth);
  const wallHeight = useAppStore((state) => state.wallHeight);
  const isSelected = activeObjectId === data.id;

  const modelUrl = data.metadata?.modelUrl;
  if (!modelUrl) return null;

  // Load GLTF scene
  const { scene } = useGLTF(modelUrl);

  const modelColor = data.color || data.metadata?.color || '#f3f4f6';

  // Clone the scene so that multiple copies of the model don't conflict
  const clonedScene = React.useMemo(() => {
    const cl = scene.clone();
    cl.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Dispose of any existing materials on the clone
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }

        // Apply a high-quality matte clay material
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          roughness: 0.9,
          metalness: 0.0,
        });
      }
    });
    return cl;
  }, [scene, modelColor]);

  // Dimensions of bounding box in inches
  const dims = data.metadata?.dimensions || [24, 24, 24];
  const widthInch = dims[0];
  const heightInch = dims[1];
  const depthInch = dims[2];

  const targetW3D = to3D(widthInch);
  const targetH3D = to3D(heightInch);
  const targetD3D = to3D(depthInch);

  const isWallLocked = data.metadata?.isWallLocked === true;

  // Calculate loaded model's native bounding box and normal scaling factor
  const { scaleFactor, offsetX, offsetY, offsetZ, scaledWidth, scaledHeight, scaledDepth } = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const center = new THREE.Vector3();
    box.getCenter(center);

    const min = box.min;

    // Calculate scaling factor to fit inside the target footprint while maintaining aspect ratio
    const scaleX = size.x > 0 ? targetW3D / size.x : 1;
    const scaleY = size.y > 0 ? targetH3D / size.y : 1;
    const scaleZ = size.z > 0 ? targetD3D / size.z : 1;
    const factor = Math.min(scaleX, scaleY, scaleZ);

    return {
      scaleFactor: factor,
      offsetX: -center.x,
      // We translate the native Y min to 0, so the local origin is at the bottom center of the model.
      // But if isWallLocked is true, we want the local origin to be at the center of the model.
      offsetY: -center.y,
      offsetZ: -center.z,
      scaledWidth: size.x * factor,
      scaledHeight: size.y * factor,
      scaledDepth: size.z * factor,
    };
  }, [clonedScene, targetW3D, targetH3D, targetD3D, isWallLocked]);

  let posX = to3D(data.position[0]);
  let posY = to3D(data.position[1]) + (isWallLocked ? 0 : scaledHeight / 2);
  let posZ = to3D(data.position[2]);

  const onDown = (e: any) => {
    if (data.isLocked) return;
    e.stopPropagation();
    handlePointerDown(e, data.id);
  };

  return (
    <group name={data.id} position={[posX, posY, posZ]}>
      {/* Clickable mesh boundary wrapper for selection and dragging */}
      <group rotation={(data.rotation as [number, number, number]) || [0, 0, 0]}>
        {/* We place a invisible simplified hitbox or use the model group itself */}
        <group 
          position={[offsetX * scaleFactor, offsetY * scaleFactor, offsetZ * scaleFactor]}
          scale={[scaleFactor, scaleFactor, scaleFactor]}
          onPointerDown={onDown}
        >
          <primitive object={clonedScene} />
        </group>

        {/* Visual outline if selected */}
        {isSelected && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[scaledWidth + 0.05, scaledHeight + 0.05, scaledDepth + 0.05]} />
            <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>

      {/* Smart Dimensions HUD */}
      <SmartDimensionsHUD
        targetId={data.id}
        to3D={to3D}
        from3D={from3D}
        roomDimensions={roomDimensions}
        isDragging={isDragging}
      />
    </group>
  );
};

// Outer component with Suspense boundary to prevent throwing errors to the parent
export const ClayModelObject: React.FC<ClayModelObjectProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <ClayModelInner {...props} />
    </React.Suspense>
  );
};
