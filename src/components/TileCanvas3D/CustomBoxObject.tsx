import * as React from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { SceneObject, BoxFaceConfig } from '../../types';
import { Html, useTexture } from '@react-three/drei';
import { SmartDimensionsHUD } from './SmartDimensionsHUD';

export interface CustomBoxObjectProps {
  data: SceneObject;
  to3D: (val: number) => number;
  from3D: (val: number) => number;
  handlePointerDown: (e: any, id: string) => void;
  isDragging: boolean;
  roomDimensions: { width: number; height: number; depth: number };
}

export const CustomBoxObject: React.FC<CustomBoxObjectProps> = ({
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

  const dims = data.metadata?.dimensions || [24, 24, 24]; // width, height, depth in inches
  const widthInch = dims[0];
  const heightInch = dims[1];
  const depthInch = dims[2];

  const w3D = to3D(widthInch);
  const h3D = to3D(heightInch);
  const d3D = to3D(depthInch);

  // Since position represents the bottom-center of the box,
  // we position the group at [pos[0], pos[1], pos[2]], and shift the mesh locally up by h3D / 2.
  // This ensures the origin (anchor point) sits flush on the floor (Y = position[1]).
  let posX = to3D(data.position[0]);
  let posY = to3D(data.position[1]);
  let posZ = to3D(data.position[2]);

  const isWallLocked = data.metadata?.isWallLocked === true;

  const color = data.metadata?.color || '#333333'; // default dark gray color
  const faces = data.metadata?.faces || {};

  const getFaceConfig = (key: 'top'|'bottom'|'front'|'back'|'left'|'right'): BoxFaceConfig => {
    const face = faces[key];
    return {
      color: face?.color || color,
      image_url: face?.image_url || null
    };
  };

  const faceConfigs = [
    { key: 'right', config: getFaceConfig('right'), width: d3D, height: h3D },  // 0: Right
    { key: 'left', config: getFaceConfig('left'), width: d3D, height: h3D },   // 1: Left
    { key: 'top', config: getFaceConfig('top'), width: w3D, height: d3D },    // 2: Top
    { key: 'bottom', config: getFaceConfig('bottom'), width: w3D, height: d3D }, // 3: Bottom
    { key: 'front', config: getFaceConfig('front'), width: w3D, height: h3D },  // 4: Front
    { key: 'back', config: getFaceConfig('back'), width: w3D, height: h3D },   // 5: Back
  ];

  // 1. Texture Loading Hook
  const uniqueUrls = Array.from(new Set(faceConfigs.map(f => f.config.image_url).filter(Boolean))) as string[];
  const texturesArray = useTexture(uniqueUrls);
  
  const textureMap = React.useMemo(() => {
    const map: Record<string, THREE.Texture> = {};
    uniqueUrls.forEach((url, idx) => {
      const tex = Array.isArray(texturesArray) ? texturesArray[idx] : texturesArray;
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        map[url] = tex;
      }
    });
    return map;
  }, [uniqueUrls, texturesArray]);

  const onDown = (e: any) => {
    if (data.isLocked) return;
    e.stopPropagation();
    handlePointerDown(e, data.id);
  };

  return (
    <group name={data.id} position={[posX, posY, posZ]}>
      <group position={[0, isWallLocked ? 0 : h3D / 2, 0]} rotation={(data.rotation as [number, number, number]) || [0, 0, 0]}>
        <mesh
          castShadow
          receiveShadow
          onPointerDown={onDown}
        >
          <boxGeometry args={[w3D, h3D, d3D]} />
          {/* 2. Declarative Material Mapping */}
          {faceConfigs.map((face, index) => {
            let tex: THREE.Texture | undefined = undefined;
            
            if (face.config.image_url) {
              const baseTexture = textureMap[face.config.image_url];
              if (baseTexture && baseTexture.image) {
                // Clone the texture for this specific face aspect ratio
                tex = baseTexture.clone();
                const imageWidth = (tex.image as any).width || 1;
                const imageHeight = (tex.image as any).height || 1;
                const imageAspect = imageWidth / imageHeight;
                const faceAspect = face.width / face.height;

                if (imageAspect > faceAspect) {
                  const scale = faceAspect / imageAspect;
                  tex.repeat.set(scale, 1);
                  tex.offset.set((1 - scale) / 2, 0);
                } else {
                  const scale = imageAspect / faceAspect;
                  tex.repeat.set(1, scale);
                  tex.offset.set(0, (1 - scale) / 2);
                }
                tex.needsUpdate = true;
              }
            }

            const materialProps: any = {
              attach: `material-${index}`,
              roughness: 0.8,
              metalness: 0.1,
            };

            if (face.config.image_url && tex) {
              materialProps.color = '#ffffff';
              materialProps.map = tex;
            } else {
              materialProps.color = face.config.color || '#333333';
            }

            return (
              <meshStandardMaterial
                key={`${index}-${face.config.color}-${face.config.image_url}`}
                {...materialProps}
              />
            );
          })}
        </mesh>

        {/* Visual outline if selected */}
        {isSelected && (
          <mesh>
            <boxGeometry args={[w3D + 0.01, h3D + 0.01, d3D + 0.01]} />
            <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>

      {/* Floating UI indicating active object status */}
      {isSelected && (
        <Html position={[0, h3D + 0.3, 0]} center style={{ pointerEvents: 'auto' }}>
          <div className="bg-indigo-600/95 text-white text-[10px] px-2.5 py-1 rounded-md shadow-lg border border-indigo-400/50 flex items-center gap-2 select-none font-sans whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider text-[9px]">Custom Box</span>
            <span className="text-indigo-200 font-mono">({widthInch}&quot;×{heightInch}&quot;×{depthInch}&quot;)</span>
            <div className="flex items-center gap-1 pl-1.5 border-l border-indigo-400/40 pointer-events-auto">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  useAppStore.getState().updateSceneObject(data.id, {
                    metadata: {
                      ...data.metadata,
                      color: e.target.value,
                    },
                  });
                }}
                className="w-4 h-4 rounded-xs cursor-pointer border-0 p-0 bg-transparent"
                style={{ verticalAlign: 'middle' }}
                title="Change Box Color"
              />
            </div>
          </div>
        </Html>
      )}

      {/* Internal dimensions input pills when selected and not dragging */}
      {isSelected && !isDragging && (
        <>
          {/* Width Pill (Front bottom edge of the box: X=0, Y=0, Z=d3D/2 + offset) */}
          <Html position={[0, 0, d3D / 2 + 0.2]} center zIndexRange={[100, 0]}>
            <div className="flex flex-col items-center pointer-events-auto select-none font-sans">
              <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-indigo-200 flex items-center gap-1 transition-all hover:border-indigo-400">
                <span className="font-extrabold text-indigo-500 uppercase text-[8px] tracking-wider">Width</span>
                <input 
                  type="number" 
                  min="4"
                  max="200"
                  value={Math.round(widthInch * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      useAppStore.getState().updateSceneObject(data.id, {
                        metadata: {
                          ...data.metadata,
                          dimensions: [val, heightInch, depthInch],
                        },
                      });
                    }
                  }}
                  className="w-10 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
                />
                <span className="text-slate-400 font-medium">in</span>
              </div>
            </div>
          </Html>

          {/* Height Pill (Right side center of the box: X=w3D/2 + offset, Y=h3D/2, Z=0) */}
          <Html position={[w3D / 2 + 0.2, h3D / 2, 0]} center zIndexRange={[100, 0]}>
            <div className="flex items-center pointer-events-auto select-none font-sans">
              <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-indigo-200 flex items-center gap-1 transition-all hover:border-indigo-400">
                <span className="font-extrabold text-indigo-500 uppercase text-[8px] tracking-wider">Height</span>
                <input 
                  type="number" 
                  min="4"
                  max="200"
                  value={Math.round(heightInch * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      useAppStore.getState().updateSceneObject(data.id, {
                        metadata: {
                          ...data.metadata,
                          dimensions: [widthInch, val, depthInch],
                        },
                      });
                    }
                  }}
                  className="w-10 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
                />
                <span className="text-slate-400 font-medium">in</span>
              </div>
            </div>
          </Html>

          {/* Depth Pill (Left side center of the box: X=-w3D/2 - offset, Y=0, Z=0) */}
          <Html position={[-w3D / 2 - 0.2, 0, 0]} center zIndexRange={[100, 0]}>
            <div className="flex items-center pointer-events-auto select-none font-sans">
              <div className="bg-white text-slate-800 text-[10px] px-2 py-1 rounded shadow-md border border-indigo-200 flex items-center gap-1 transition-all hover:border-indigo-400">
                <span className="font-extrabold text-indigo-500 uppercase text-[8px] tracking-wider">Depth</span>
                <input 
                  type="number" 
                  min="4"
                  max="200"
                  value={Math.round(depthInch * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      useAppStore.getState().updateSceneObject(data.id, {
                        metadata: {
                          ...data.metadata,
                          dimensions: [widthInch, heightInch, val],
                        },
                      });
                    }
                  }}
                  className="w-10 bg-transparent text-center font-bold text-indigo-600 focus:outline-hidden appearance-none"
                />
                <span className="text-slate-400 font-medium">in</span>
              </div>
            </div>
          </Html>
        </>
      )}

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
