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

  const texture = React.useMemo(() => {
    const tex = globalTexture.clone();
    const bW = Math.max(0.001, bounds.width);
    const bH = Math.max(0.001, bounds.height);
    tex.repeat.set(sa.width / bW, sa.height / bH);
    tex.offset.set(
      (sa.x - bounds.minX) / bW,
      (sa.y - bounds.minY) / bH
    );
    tex.needsUpdate = true;
    return tex;
  }, [globalTexture, sa.x, sa.y, sa.width, sa.height, bounds]);

  const bumpTex = React.useMemo(() => {
    if (!globalBumpTexture) return undefined;
    const tex = globalBumpTexture.clone();
    const bW = Math.max(0.001, bounds.width);
    const bH = Math.max(0.001, bounds.height);
    tex.repeat.set(sa.width / bW, sa.height / bH);
    tex.offset.set(
      (sa.x - bounds.minX) / bW,
      (sa.y - bounds.minY) / bH
    );
    tex.needsUpdate = true;
    return tex;
  }, [globalBumpTexture, sa.x, sa.y, sa.width, sa.height, bounds]);

  React.useEffect(() => {
    return () => {
      texture.dispose();
      bumpTex?.dispose();
    };
  }, [texture, bumpTex]);

  const sillColor = sa.sillTileColor || sa.tileColor || '#475569';

  return (
    <group>
      {/* Recessed Niche Backing Plane */}
      <mesh position={[localX, localY, -depthD3]} key={bumpTex ? 'niche_bump' : 'niche_flat'} castShadow receiveShadow>
        <planeGeometry args={[d3Width, d3Height]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={bumpTex || undefined}
          bumpScale={0.8}
          roughness={finishProps.roughness}
          metalness={finishProps.metalness}
          side={THREE.DoubleSide}
        />
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
