import React from 'react';
import * as THREE from 'three';
import { FeatureProps } from '../types';
import { useAppStore } from '../../../store/useAppStore';

export const SlabFeature: React.FC<FeatureProps> = ({
  sa,
  panel,
  bounds,
  to3D,
  localX,
  localY = 0,
  d3Width,
  d3Height,
}) => {
  const [baseTexture, setBaseTexture] = React.useState<THREE.Texture | null>(null);
  
  React.useEffect(() => {
    if (sa.surfaceUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(sa.surfaceUrl, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        setBaseTexture(loadedTex);
      });
    } else {
      setBaseTexture(null);
    }
  }, [sa.surfaceUrl]);

  const texture = React.useMemo(() => {
    if (!baseTexture || !baseTexture.image) return null;
    const tex = baseTexture.clone();
    
    const imageWidth = (tex.image as any).width || 1;
    const imageHeight = (tex.image as any).height || 1;
    const imageAspect = imageWidth / imageHeight;
    
    const faceAspect = sa.width / sa.height;

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
    return tex;
  }, [baseTexture, sa.width, sa.height]);

  const depthD3 = to3D(sa.depth ?? 0.1);
  const fallbackColor = sa.tileColor || '#94a3b8';

  const materialProps = {
    roughness: 0.2,
    metalness: 0.1,
  };

  return (
    <group>
      <mesh position={[localX, localY, depthD3 / 2]}>
        <boxGeometry args={[d3Width, d3Height, depthD3]} />
        {texture ? (
          <>
            {/* BoxGeometry faces: right, left, top, bottom, front, back */}
            <meshStandardMaterial attach="material-0" map={texture} {...materialProps} />
            <meshStandardMaterial attach="material-1" map={texture} {...materialProps} />
            <meshStandardMaterial attach="material-2" map={texture} {...materialProps} />
            <meshStandardMaterial attach="material-3" map={texture} {...materialProps} />
            <meshStandardMaterial attach="material-4" map={texture} {...materialProps} />
            <meshStandardMaterial attach="material-5" map={texture} {...materialProps} />
          </>
        ) : (
          <meshStandardMaterial color={fallbackColor} {...materialProps} />
        )}
      </mesh>
    </group>
  );
};
