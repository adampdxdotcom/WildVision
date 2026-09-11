import React from 'react';
import * as THREE from 'three';
import { SubArea } from '../../../types';

interface CutoutFeatureProps {
  sa: SubArea;
  localX: number;
  localY: number;
  d3Width: number;
  d3Height: number;
  to3D: (inches: number) => number;
  cutoutColor?: string | null;
}

export const CutoutFeature: React.FC<CutoutFeatureProps> = ({
  sa,
  localX,
  localY,
  d3Width,
  d3Height,
  to3D,
  cutoutColor,
}) => {
  const wallDepthD3 = to3D(4); // standard 4" framing stud depth in 3D world units
  const sillColor = sa.sillTileColor || '#475569';

  return (
    <group>
      {/* Optional solid color backing plane */}
      {cutoutColor && (
        <mesh position={[localX, localY, -wallDepthD3]} castShadow receiveShadow>
          <planeGeometry args={[d3Width, d3Height]} />
          <meshStandardMaterial
            color={cutoutColor}
            roughness={0.8}
            metalness={0.1}
            side={THREE.DoubleSide}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* Sill casing / trim inside the cutout opening */}
      {sa.hasSill && (
        <>
          {/* Bottom Sill */}
          <mesh position={[localX, localY - d3Height / 2, -wallDepthD3 / 2]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <planeGeometry args={[d3Width, wallDepthD3]} />
            <meshStandardMaterial color={sillColor} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
          </mesh>

          {/* Top Sill */}
          <mesh position={[localX, localY + d3Height / 2, -wallDepthD3 / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <planeGeometry args={[d3Width, wallDepthD3]} />
            <meshStandardMaterial color={sillColor} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
          </mesh>

          {/* Left Sill */}
          <mesh position={[localX - d3Width / 2, localY, -wallDepthD3 / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
            <planeGeometry args={[wallDepthD3, d3Height]} />
            <meshStandardMaterial color={sillColor} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
          </mesh>

          {/* Right Sill */}
          <mesh position={[localX + d3Width / 2, localY, -wallDepthD3 / 2]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
            <planeGeometry args={[wallDepthD3, d3Height]} />
            <meshStandardMaterial color={sillColor} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
          </mesh>
        </>
      )}
    </group>
  );
};
