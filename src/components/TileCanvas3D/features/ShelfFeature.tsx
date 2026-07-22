import React from 'react';
import * as THREE from 'three';
import { FeatureProps } from '../types';
import { useAppStore } from '../../../store/useAppStore';
import { getMaterialFinishProps } from '../materialUtils';
import { useLayoutConfig } from '../LayoutConfigContext';

export interface ShelfFeatureProps extends FeatureProps {
  isFloorMounted?: boolean;
}

export const ShelfFeature: React.FC<ShelfFeatureProps> = ({
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
  isFloorMounted = false,
}) => {
  const context = useLayoutConfig();
  const globalFinishStore = useAppStore(state => state.tileFinish);
  const globalFinish = context ? context.tileFinish : globalFinishStore;
  const resolvedFinish = sa.tileFinish || globalFinish;
  const finishProps = React.useMemo(() => getMaterialFinishProps(resolvedFinish), [resolvedFinish]);

  const depthD3 = to3D(sa.depth ?? 6.0);

  // Generate the Isolated Sub-Area Texture
  const isolatedTex = React.useMemo(() => {
    const img = globalTexture?.image as HTMLCanvasElement | undefined;
    if (!img) return null;

    const imgW = img.width || 1024;
    const imgH = img.height || 1024;
    const bW = Math.max(0.001, bounds.width);
    const bH = Math.max(0.001, bounds.height);

    const scaleX = imgW / bW;
    const scaleY = imgH / bH;

    // Convert sub-area physical coords to pixel coordinates on the source canvas image
    const sx = (sa.x - bounds.minX) * scaleX;
    const sy = imgH - (sa.y + sa.height - bounds.minY) * scaleY;
    const sw = sa.width * scaleX;
    const sh = sa.height * scaleY;

    // Create offscreen canvas container for the isolated texture
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw only the bench/shelf's tile pattern onto this extracted canvas
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    return tex;
  }, [globalTexture, sa.x, sa.y, sa.width, sa.height, bounds.minX, bounds.minY, bounds.width, bounds.height]);

  // Clone and configure top face texture with seamless repeat wrap relative to Z-depth
  const topTexture = React.useMemo(() => {
    if (!isolatedTex) return null;
    const tex = isolatedTex.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    
    const saDepth = sa.depth ?? 6.0;
    const saHeight = sa.height || 1;
    tex.repeat.set(1, saDepth / saHeight);
    tex.needsUpdate = true;
    return tex;
  }, [isolatedTex, sa.depth, sa.height]);

  // Clone and configure side face textures with seamless repeat wrap relative to Z-depth
  const sideTexture = React.useMemo(() => {
    if (!isolatedTex) return null;
    const tex = isolatedTex.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    
    const saDepth = sa.depth ?? 6.0;
    const saWidth = sa.width || 1;
    tex.repeat.set(saDepth / saWidth, 1);
    tex.needsUpdate = true;
    return tex;
  }, [isolatedTex, sa.depth, sa.width]);

  // Generate the Isolated Sub-Area Bump Texture
  const isolatedBumpTex = React.useMemo(() => {
    const img = globalBumpTexture?.image as HTMLCanvasElement | undefined;
    if (!img) return null;

    const imgW = img.width || 1024;
    const imgH = img.height || 1024;
    const bW = Math.max(0.001, bounds.width);
    const bH = Math.max(0.001, bounds.height);

    const scaleX = imgW / bW;
    const scaleY = imgH / bH;

    // Convert sub-area physical coords to pixel coordinates on the source canvas image
    const sx = (sa.x - bounds.minX) * scaleX;
    const sy = imgH - (sa.y + sa.height - bounds.minY) * scaleY;
    const sw = sa.width * scaleX;
    const sh = sa.height * scaleY;

    // Create offscreen canvas container for the isolated texture
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    return tex;
  }, [globalBumpTexture, sa.x, sa.y, sa.width, sa.height, bounds.minX, bounds.minY, bounds.width, bounds.height]);

  // Clone and configure top face bump texture with seamless repeat wrap relative to Z-depth
  const topBumpTexture = React.useMemo(() => {
    if (!isolatedBumpTex) return null;
    const tex = isolatedBumpTex.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    
    const saDepth = sa.depth ?? 6.0;
    const saHeight = sa.height || 1;
    tex.repeat.set(1, saDepth / saHeight);
    tex.needsUpdate = true;
    return tex;
  }, [isolatedBumpTex, sa.depth, sa.height]);

  // Clone and configure side face bump textures with seamless repeat wrap relative to Z-depth
  const sideBumpTexture = React.useMemo(() => {
    if (!isolatedBumpTex) return null;
    const tex = isolatedBumpTex.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    
    const saDepth = sa.depth ?? 6.0;
    const saWidth = sa.width || 1;
    tex.repeat.set(saDepth / saWidth, 1);
    tex.needsUpdate = true;
    return tex;
  }, [isolatedBumpTex, sa.depth, sa.width]);

  // Handle disposal of created textures on component unmount
  React.useEffect(() => {
    return () => {
      isolatedTex?.dispose();
      topTexture?.dispose();
      sideTexture?.dispose();
      isolatedBumpTex?.dispose();
      topBumpTexture?.dispose();
      sideBumpTexture?.dispose();
    };
  }, [isolatedTex, topTexture, sideTexture, isolatedBumpTex, topBumpTexture, sideBumpTexture]);

  const fallbackColor = sa.tileColor || '#475569';

  // Determine extrusion Z offset in local space.
  // When isFloorMounted === true, the local +Z points upward into the 3D room,
  // so we set localZ to depthD3 / 2 to position the box on top of the floor plane.
  const localZ = depthD3 / 2;

  if (isFloorMounted) {
    return (
      <mesh position={[localX, localY, localZ]} key={isolatedBumpTex ? 'shelf_floor_bump' : 'shelf_floor_flat'}>
        <boxGeometry args={[d3Width, d3Height, depthD3]} />
        
        {/* 0: Right (+X) - vertical face of curb */}
        {topTexture ? (
          <meshStandardMaterial attach="material-0" map={topTexture} bumpMap={topBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        ) : (
          <meshStandardMaterial attach="material-0" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        )}

        {/* 1: Left (-X) - vertical face of curb */}
        {topTexture ? (
          <meshStandardMaterial attach="material-1" map={topTexture} bumpMap={topBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        ) : (
          <meshStandardMaterial attach="material-1" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        )}

        {/* 2: Top (+Y) of box (vertical back face of curb) */}
        {topTexture ? (
          <meshStandardMaterial attach="material-2" map={topTexture} bumpMap={topBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        ) : (
          <meshStandardMaterial attach="material-2" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        )}

        {/* 3: Bottom (-Y) of box (vertical front face of curb) */}
        {topTexture ? (
          <meshStandardMaterial attach="material-3" map={topTexture} bumpMap={topBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        ) : (
          <meshStandardMaterial attach="material-3" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        )}

        {/* 4: Front (+Z) of box - top of curb (faces up into room, displays floor pattern) */}
        {isolatedTex ? (
          <meshStandardMaterial attach="material-4" map={isolatedTex} bumpMap={isolatedBumpTex || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        ) : (
          <meshStandardMaterial attach="material-4" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
        )}

        {/* 5: Back (-Z) of box - bottom of curb touching subfloor */}
        <meshStandardMaterial attach="material-5" color="#334155" roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh position={[localX, localY, localZ]} key={isolatedBumpTex ? 'shelf_wall_bump' : 'shelf_wall_flat'}>
      <boxGeometry args={[d3Width, d3Height, depthD3]} />
      {/* 0: Right (+X) */}
      {sideTexture ? (
        <meshStandardMaterial attach="material-0" map={sideTexture} bumpMap={sideBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      ) : (
        <meshStandardMaterial attach="material-0" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      )}

      {/* 1: Left (-X) */}
      {sideTexture ? (
        <meshStandardMaterial attach="material-1" map={sideTexture} bumpMap={sideBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      ) : (
        <meshStandardMaterial attach="material-1" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      )}

      {/* 2: Top (+Y) */}
      {topTexture ? (
        <meshStandardMaterial attach="material-2" map={topTexture} bumpMap={topBumpTexture || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      ) : (
        <meshStandardMaterial attach="material-2" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      )}

      {/* 3: Bottom (-Y) */}
      <meshStandardMaterial attach="material-3" color="#334155" roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />

      {/* 4: Front (+Z) */}
      {isolatedTex ? (
        <meshStandardMaterial attach="material-4" map={isolatedTex} bumpMap={isolatedBumpTex || undefined} bumpScale={0.8} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      ) : (
        <meshStandardMaterial attach="material-4" color={fallbackColor} roughness={finishProps.roughness} metalness={finishProps.metalness} />
      )}

      {/* 5: Back (-Z) */}
      <meshStandardMaterial attach="material-5" color="#cbd5e1" roughness={0.5} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  );
};
