import React from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';

interface EnvironmentShellProps {
  roomShapes: {
    floorShape: THREE.Shape;
    backShape: THREE.Shape;
    leftShape: THREE.Shape;
    rightShape: THREE.Shape;
    ceilingShape: THREE.Shape;
  };
  roomColors: {
    overrides: {
      floor?: string;
      back?: string;
      left?: string;
      right?: string;
      ceiling?: string;
    };
    base: string;
  };
  rWidth: number;
  rDepth: number;
  rHeight: number;
  layoutTransform: {
    attachedPlane: string;
    mountAnchor: string;
  };
  handlePlanePointerMove: (plane: string, event: any) => void;
  setIsSelected: (selected: boolean) => void;
}

export const EnvironmentShell: React.FC<EnvironmentShellProps> = ({
  roomShapes,
  roomColors,
  rWidth,
  rDepth,
  rHeight,
  layoutTransform,
  handlePlanePointerMove,
  setIsSelected,
}) => {
  return (
    <>
      {/* Floor Plane */}
      <mesh 
        name="subfloorPlane" 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -rHeight / 2 - 0.005, 0]} 
        receiveShadow
        onPointerMove={(e) => handlePlanePointerMove('floor', e)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsSelected(false);
          useAppStore.getState().setActiveObjectId(null);
        }}
      >
        <shapeGeometry 
          key={`floor-wall-${layoutTransform.attachedPlane === 'floor' ? layoutTransform.mountAnchor : 'solid'}-${roomShapes.floorShape.uuid}`} 
          args={[roomShapes.floorShape]} 
          onUpdate={(self) => {
            const posAttr = self.getAttribute('position');
            if (posAttr) {
              const uvs = [];
              for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                uvs.push((x + rWidth / 2) / rWidth, (y + rDepth / 2) / rDepth); 
              }
              self.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              self.attributes.uv.needsUpdate = true;
            }
          }}
        />
        <meshStandardMaterial 
          color={roomColors.overrides.floor || roomColors.base} 
          roughness={1} 
          metalness={0} 
        />
      </mesh>

      {/* Back Wall Plane */}
      <mesh 
        name="backWallPlane" 
        position={[0, 0, -rDepth / 2 - 0.005]} 
        receiveShadow
        onPointerMove={(e) => handlePlanePointerMove('back', e)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsSelected(false);
          useAppStore.getState().setActiveObjectId(null);
        }}
      >
        <shapeGeometry 
          key={`back-wall-${layoutTransform.attachedPlane === 'back' ? layoutTransform.mountAnchor : 'solid'}-${roomShapes.backShape.uuid}`} 
          args={[roomShapes.backShape]} 
          onUpdate={(self) => {
            const posAttr = self.getAttribute('position');
            if (posAttr) {
              const uvs = [];
              for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                uvs.push((x + rWidth / 2) / rWidth, (y + rHeight / 2) / rHeight); 
              }
              self.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              self.attributes.uv.needsUpdate = true;
            }
          }}
        />
        <meshStandardMaterial 
          color={roomColors.overrides.back || roomColors.base} 
          roughness={1} 
          metalness={0} 
        />
      </mesh>

      {/* Left Wall Plane */}
      <mesh 
        name="leftWallPlane" 
        rotation={[0, Math.PI / 2, 0]} 
        position={[-rWidth / 2 - 0.005, 0, 0]} 
        receiveShadow
        onPointerMove={(e) => handlePlanePointerMove('left', e)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsSelected(false);
          useAppStore.getState().setActiveObjectId(null);
        }}
      >
        <shapeGeometry 
          key={`left-wall-${layoutTransform.attachedPlane === 'left' ? layoutTransform.mountAnchor : 'solid'}-${roomShapes.leftShape.uuid}`} 
          args={[roomShapes.leftShape]} 
          onUpdate={(self) => {
            const posAttr = self.getAttribute('position');
            if (posAttr) {
              const uvs = [];
              for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                uvs.push((x + rDepth / 2) / rDepth, (y + rHeight / 2) / rHeight); 
              }
              self.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              self.attributes.uv.needsUpdate = true;
            }
          }}
        />
        <meshStandardMaterial 
          color={roomColors.overrides.left || roomColors.base} 
          roughness={1} 
          metalness={0} 
        />
      </mesh>

      {/* Right Wall Plane */}
      <mesh 
        name="rightWallPlane" 
        rotation={[0, -Math.PI / 2, 0]} 
        position={[rWidth / 2 + 0.005, 0, 0]} 
        receiveShadow
        onPointerMove={(e) => handlePlanePointerMove('right', e)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsSelected(false);
          useAppStore.getState().setActiveObjectId(null);
        }}
      >
        <shapeGeometry 
          key={`right-wall-${layoutTransform.attachedPlane === 'right' ? layoutTransform.mountAnchor : 'solid'}-${roomShapes.rightShape.uuid}`} 
          args={[roomShapes.rightShape]} 
          onUpdate={(self) => {
            const posAttr = self.getAttribute('position');
            if (posAttr) {
              const uvs = [];
              for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                uvs.push((x + rDepth / 2) / rDepth, (y + rHeight / 2) / rHeight); 
              }
              self.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              self.attributes.uv.needsUpdate = true;
            }
          }}
        />
        <meshStandardMaterial 
          color={roomColors.overrides.right || roomColors.base} 
          roughness={1} 
          metalness={0} 
        />
      </mesh>

      {/* Ceiling Plane */}
      <mesh 
        name="ceilingPlane" 
        rotation={[Math.PI / 2, 0, 0]} 
        position={[0, rHeight / 2 + 0.005, 0]} 
        receiveShadow
        onPointerMove={(e) => handlePlanePointerMove('ceiling', e)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsSelected(false);
          useAppStore.getState().setActiveObjectId(null);
        }}
      >
        <shapeGeometry 
          key={`ceiling-wall-${layoutTransform.attachedPlane === 'ceiling' ? layoutTransform.mountAnchor : 'solid'}-${roomShapes.ceilingShape.uuid}`} 
          args={[roomShapes.ceilingShape]} 
          onUpdate={(self) => {
            const posAttr = self.getAttribute('position');
            if (posAttr) {
              const uvs = [];
              for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                uvs.push((x + rWidth / 2) / rWidth, (y + rDepth / 2) / rDepth); 
              }
              self.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              self.attributes.uv.needsUpdate = true;
            }
          }}
        />
        <meshStandardMaterial 
          color={roomColors.overrides.ceiling || roomColors.base} 
          roughness={1} 
          metalness={0} 
        />
      </mesh>
    </>
  );
};
