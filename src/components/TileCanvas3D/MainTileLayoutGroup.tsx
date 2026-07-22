import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Panel3D } from './types';
import { SmartDimensionsHUD } from './SmartDimensionsHUD';
import { WallPanel } from './WallPanel';
import { TopFlapChain, BottomFlapChain, RightHingeChain, LeftHingeChain } from './HingeChains';

interface MainTileLayoutGroupProps {
  layoutTransform: {
    position: number[];
    attachedPlane: string;
    mountAnchor: string;
  };
  d3Columns: any[];
  texture: THREE.Texture;
  bumpTexture: THREE.Texture | null;
  handlePointerDown: (e: any, targetId: string) => void;
  isDragging: boolean;
  to3D: (val: number) => number;
  from3D: (val: number) => number;
  roomDimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export const MainTileLayoutGroup: React.FC<MainTileLayoutGroupProps> = ({
  layoutTransform,
  d3Columns,
  texture,
  bumpTexture,
  handlePointerDown,
  isDragging,
  to3D,
  from3D,
  roomDimensions,
}) => {
  const modelRef = React.useRef<THREE.Group>(null);

  let rootIdx = 0;
  let maxWidth = 0;
  d3Columns.forEach((col, i) => {
    if (col.width > maxWidth) {
      maxWidth = col.width;
      rootIdx = i;
    }
  });
  const rootCol = d3Columns[rootIdx];

  const totalBottomFlapsHeight = rootCol?.bottomFlaps
    ? rootCol.bottomFlaps.reduce((sum: number, flap: any) => sum + flap.d3Height, 0)
    : 0;

  const getRotation = (attachedPlane: string): [number, number, number] => {
    switch (attachedPlane) {
      case 'left': return [0, Math.PI / 2, 0];
      case 'right': return [0, -Math.PI / 2, 0];
      case 'floor': return [-Math.PI / 2, 0, 0];
      case 'ceiling': return [Math.PI / 2, 0, 0];
      case 'back':
      default:
        return [0, 0, 0];
    }
  };

  const totalDepth3D = (() => {
    let maxD = 0;
    if (rootCol) {
      if (rootCol.topFlaps && rootCol.topFlaps.length > 0) {
        maxD = Math.max(maxD, rootCol.topFlaps[0].d3Height);
      }
      if (rootCol.bottomFlaps && rootCol.bottomFlaps.length > 0) {
        maxD = Math.max(maxD, rootCol.bottomFlaps[0].d3Height);
      }
    }
    const leftCol = d3Columns[rootIdx - 1];
    if (leftCol) {
      maxD = Math.max(maxD, leftCol.d3Width);
    }
    const rightCol = d3Columns[rootIdx + 1];
    if (rightCol) {
      maxD = Math.max(maxD, rightCol.d3Width);
    }
    return maxD;
  })();

  const anchor = layoutTransform.mountAnchor || 'back';
  const localZOffset = anchor === 'back' ? -totalDepth3D / 2 : 0;

  const renderX = -(roomDimensions.width / 2) + layoutTransform.position[0];
  const renderY = -(roomDimensions.height / 2) + layoutTransform.position[1];
  const renderZ = layoutTransform.position[2];

  return (
    <group
      name="main-tile-layout"
      position={[
        to3D(renderX),
        to3D(renderY),
        to3D(renderZ)
      ]}
      rotation={getRotation(layoutTransform.attachedPlane)}
      onPointerDown={(e) => handlePointerDown(e, 'main-tile-layout')}
      raycast={isDragging ? () => {} : undefined}
    >
      {/* Visual Tooltip floating above group center */}
      {isDragging && (
        <Html position={[0, 0.4, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-slate-950/95 text-white text-[11px] px-3 py-1.5 rounded-md shadow-2xl border border-slate-700/60 flex items-center gap-2 select-none font-sans whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Mount: <strong className="uppercase font-extrabold text-indigo-300">{anchor}</strong>
              <span className="text-slate-400 font-normal ml-1.5">(Press Tab to cycle)</span>
            </span>
          </div>
        </Html>
      )}

      {/* Smart Dimensions HUD */}
      <SmartDimensionsHUD
        targetId="main-tile-layout"
        to3D={to3D}
        from3D={from3D}
        roomDimensions={roomDimensions}
        d3Columns={d3Columns}
        isDragging={isDragging}
      />

      <group position={[0, 0, localZOffset]}>
        <group ref={modelRef} position={[-rootCol.d3Width / 2, totalBottomFlapsHeight, 0]}>
          {/* Root Main Wall */}
          {!rootCol.mainRow.isGhost && (
            <group position={[rootCol.d3Width / 2, rootCol.mainRow.d3CenterY, 0]}>
              <WallPanel panel={rootCol.mainRow} globalTexture={texture} globalBumpTexture={bumpTexture || undefined} />
            </group>
          )}

          {/* Root Top/Bottom flaps */}
          {rootCol.topFlaps.length > 0 && (
            <group position={[0, rootCol.mainRow.d3CenterY + rootCol.mainRow.d3Height / 2, 0]}>
              <TopFlapChain panels={rootCol.topFlaps} index={0} globalTexture={texture} globalBumpTexture={bumpTexture || undefined} />
            </group>
          )}

          {rootCol.bottomFlaps.length > 0 && (
            <group position={[0, rootCol.mainRow.d3CenterY - rootCol.mainRow.d3Height / 2, 0]}>
              <BottomFlapChain panels={rootCol.bottomFlaps} index={0} globalTexture={texture} globalBumpTexture={bumpTexture || undefined} />
            </group>
          )}

          {/* Branch Right */}
          <RightHingeChain columns={d3Columns} index={rootIdx + 1} globalTexture={texture} globalBumpTexture={bumpTexture || undefined} />

          {/* Branch Left */}
          <LeftHingeChain columns={d3Columns} index={rootIdx - 1} globalTexture={texture} globalBumpTexture={bumpTexture || undefined} />
        </group>
      </group>
    </group>
  );
};
