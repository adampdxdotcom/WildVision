import React from 'react';
import * as THREE from 'three';
import { FeatureProps } from '../types';
import { useAppStore } from '../../../store/useAppStore';
import { getMaterialFinishProps } from '../materialUtils';
import { useLayoutConfig } from '../LayoutConfigContext';

export const NicheFeature: React.FC<FeatureProps> = ({
  sa,
  panel,
  bounds,
  to3D,
  localX,
  localY = 0,
  d3Width,
  d3Height,
  globalTexture,
  globalBumpTexture,
}) => {
  const context = useLayoutConfig();
  const globalFinishStore = useAppStore(state => state.tileFinish);
  const globalFinish = context ? context.tileFinish : globalFinishStore;
  const resolvedFinish = sa.tileFinish || globalFinish;
  const finishProps = React.useMemo(() => getMaterialFinishProps(resolvedFinish), [resolvedFinish]);

  const depthD3 = to3D(sa.depth ?? 3.5);

  // Support custom slab surfaces if specified for the niche
  const [slabTexture, setSlabTexture] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    if (sa.surfaceUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(sa.surfaceUrl, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        setSlabTexture(loadedTex);
      });
    } else {
      setSlabTexture(null);
    }
  }, [sa.surfaceUrl]);

  // Extract isolated sub-area texture from the full wall canvas
  const isolatedTex = React.useMemo(() => {
    const img = globalTexture?.image as HTMLCanvasElement | HTMLImageElement | undefined;
    if (!img) return null;

    const imgW = (img as any).width || 1024;
    const imgH = (img as any).height || 1024;
    const bW = Math.max(0.001, bounds.width);
    const bH = Math.max(0.001, bounds.height);

    const scaleX = imgW / bW;
    const scaleY = imgH / bH;

    // Convert sub-area physical coords to pixel coordinates on the source canvas image
    const sx = (sa.x - bounds.minX) * scaleX;
    const sy = imgH - (sa.y + sa.height - bounds.minY) * scaleY;
    const sw = sa.width * scaleX;
    const sh = sa.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [globalTexture, sa.x, sa.y, sa.width, sa.height, bounds.minX, bounds.minY, bounds.width, bounds.height]);

  // Extract isolated sub-area bump texture from the full wall bump canvas
  const isolatedBumpTex = React.useMemo(() => {
    const img = globalBumpTexture?.image as HTMLCanvasElement | HTMLImageElement | undefined;
    if (!img) return null;

    const imgW = (img as any).width || 1024;
    const imgH = (img as any).height || 1024;
    const bW = Math.max(0.001, bounds.width);
    const bH = Math.max(0.001, bounds.height);

    const scaleX = imgW / bW;
    const scaleY = imgH / bH;

    const sx = (sa.x - bounds.minX) * scaleX;
    const sy = imgH - (sa.y + sa.height - bounds.minY) * scaleY;
    const sw = sa.width * scaleX;
    const sh = sa.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [globalBumpTexture, sa.x, sa.y, sa.width, sa.height, bounds.minX, bounds.minY, bounds.width, bounds.height]);

  // Cleanup dynamically created textures on unmount or refresh
  React.useEffect(() => {
    return () => {
      isolatedTex?.dispose();
      isolatedBumpTex?.dispose();
      slabTexture?.dispose();
    };
  }, [isolatedTex, isolatedBumpTex, slabTexture]);

  const activeBackingTexture = slabTexture || isolatedTex;
  const sillColor = sa.sillTileColor || sa.tileColor || '#475569';

  return (
    <group>
      {/* Recessed Niche Backing Plane */}
      <mesh position={[localX, localY, -depthD3]} key={isolatedBumpTex ? 'niche_bump' : 'niche_flat'} castShadow receiveShadow>
        <planeGeometry args={[d3Width, d3Height]} />
        {activeBackingTexture ? (
          <meshStandardMaterial
            map={activeBackingTexture}
            bumpMap={isolatedBumpTex || undefined}
            bumpScale={0.8}
            roughness={finishProps.roughness}
            metalness={finishProps.metalness}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={sillColor}
            roughness={finishProps.roughness}
            metalness={finishProps.metalness}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      {/* Connection Sills / Drywall Tunnel Casing */}
      {/* Bottom Sill */}
      <mesh position={[localX, localY - d3Height / 2, -depthD3 / 2]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[d3Width, depthD3]} />
        <meshStandardMaterial color={sillColor} roughness={finishProps.roughness} metalness={finishProps.metalness} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

      {/* Top Sill */}
      <mesh position={[localX, localY + d3Height / 2, -depthD3 / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[d3Width, depthD3]} />
        <meshStandardMaterial color={sillColor} roughness={finishProps.roughness} metalness={finishProps.metalness} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

      {/* Left Sill */}
      <mesh position={[localX - d3Width / 2, localY, -depthD3 / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[depthD3, d3Height]} />
        <meshStandardMaterial color={sillColor} roughness={finishProps.roughness} metalness={finishProps.metalness} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

      {/* Right Sill */}
      <mesh position={[localX + d3Width / 2, localY, -depthD3 / 2]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[depthD3, d3Height]} />
        <meshStandardMaterial color={sillColor} roughness={finishProps.roughness} metalness={finishProps.metalness} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    </group>
  );
};
