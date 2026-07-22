import React from 'react';
import * as THREE from 'three';
import { Panel3D, ColumnSegment } from './types';
import { WallPanel } from './WallPanel';

interface TopFlapChainProps {
  panels: Panel3D[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
  offsetX?: number;
}

// Recursive top flap hinge chain (rotates on X-axis)
export const TopFlapChain: React.FC<TopFlapChainProps> = ({ panels, index, globalTexture, globalBumpTexture, offsetX }) => {
  if (index >= panels.length) return null;

  const panel = panels[index];
  const isFirst = index === 0;
  const posY = isFirst ? 0 : panels[index - 1].d3Height;

  // Inward fold: rotating by Math.PI / 2 about X-axis
  const rotX = Math.PI / 2;

  const meshX = offsetX !== undefined ? offsetX : panel.d3Width / 2;

  return (
    <group position={[0, posY, 0]} rotation={[rotX, 0, 0]}>
      {/* Group to hold both front (tile) and back (watermarked) faces slightly offset to prevent Z-fighting */}
      <group position={[meshX, panel.d3Height / 2, 0]}>
        <WallPanel panel={panel} margin={0.004} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
      </group>

      <TopFlapChain panels={panels} index={index + 1} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} offsetX={offsetX} />
    </group>
  );
};

interface BottomFlapChainProps {
  panels: Panel3D[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
  offsetX?: number;
}

// Recursive bottom flap hinge chain (rotates on X-axis)
export const BottomFlapChain: React.FC<BottomFlapChainProps> = ({ panels, index, globalTexture, globalBumpTexture, offsetX }) => {
  if (index >= panels.length) return null;

  const panel = panels[index];
  const isFirst = index === 0;
  const posY = isFirst ? 0 : -panels[index - 1].d3Height;

  // Inward fold: rotating by -Math.PI / 2 about X-axis
  const rotX = -Math.PI / 2;

  const meshX = offsetX !== undefined ? offsetX : panel.d3Width / 2;

  return (
    <group position={[0, posY, 0]} rotation={[rotX, 0, 0]}>
      {/* Group to hold both front (tile) and back (watermarked) faces slightly offset to prevent Z-fighting */}
      <group position={[meshX, -panel.d3Height / 2, 0]}>
        <WallPanel panel={panel} margin={0.004} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} isFloor={true} />
      </group>

      <BottomFlapChain panels={panels} index={index + 1} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} offsetX={offsetX} />
    </group>
  );
};

interface RightHingeChainProps {
  columns: ColumnSegment[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
}

// Recursive column hinge chain pointing right (rotates on Y-axis)
export const RightHingeChain: React.FC<RightHingeChainProps> = ({ columns, index, globalTexture, globalBumpTexture }) => {
  if (index >= columns.length) return null;

  const col = columns[index];
  const main = col.mainRow;
  const prevCol = columns[index - 1];
  const posX = prevCol.d3Width;
  const rotY = -Math.PI / 2;

  return (
    <group position={[posX, 0, 0]} rotation={[0, rotY, 0]}>
      {/* Main Wall panel in this column segment (Dual sided) */}
      {!main.isGhost && (
        <group position={[col.d3Width / 2, main.d3CenterY, 0]}>
          <WallPanel panel={main} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
        </group>
      )}

      {col.topFlaps.length > 0 && (
        <group position={[0, main.d3CenterY + main.d3Height / 2, 0]}>
          <TopFlapChain panels={col.topFlaps} index={0} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
        </group>
      )}

      {col.bottomFlaps.length > 0 && (
        <group position={[0, main.d3CenterY - main.d3Height / 2, 0]}>
          <BottomFlapChain panels={col.bottomFlaps} index={0} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
        </group>
      )}

      <RightHingeChain columns={columns} index={index + 1} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
    </group>
  );
};

interface LeftHingeChainProps {
  columns: ColumnSegment[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
}

// Recursive column hinge chain pointing left (rotates on Y-axis)
export const LeftHingeChain: React.FC<LeftHingeChainProps> = ({ columns, index, globalTexture, globalBumpTexture }) => {
  if (index < 0) return null;

  const col = columns[index];
  const main = col.mainRow;
  const rotY = Math.PI / 2;

  return (
    <group position={[0, 0, 0]} rotation={[0, rotY, 0]}>
      {/* Main Wall panel in this column segment expanding leftwards (Dual sided) */}
      {!main.isGhost && (
        <group position={[-col.d3Width / 2, main.d3CenterY, 0]}>
          <WallPanel panel={main} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
        </group>
      )}

      {col.topFlaps.length > 0 && (
        <group position={[0, main.d3CenterY + main.d3Height / 2, 0]}>
          <TopFlapChain panels={col.topFlaps} index={0} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} offsetX={-col.d3Width / 2} />
        </group>
      )}

      {col.bottomFlaps.length > 0 && (
        <group position={[0, main.d3CenterY - main.d3Height / 2, 0]}>
          <BottomFlapChain panels={col.bottomFlaps} index={0} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} offsetX={-col.d3Width / 2} />
        </group>
      )}

      <LeftHingeChain columns={columns} index={index - 1} globalTexture={globalTexture} globalBumpTexture={globalBumpTexture} />
    </group>
  );
};
