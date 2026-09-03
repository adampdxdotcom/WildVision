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
  parentInvert?: boolean;
}

// Recursive top flap hinge chain (rotates on X-axis)
export const TopFlapChain: React.FC<TopFlapChainProps> = ({
  panels,
  index,
  globalTexture,
  globalBumpTexture,
  offsetX,
  parentInvert = false,
}) => {
  if (index >= panels.length) return null;

  const panel = panels[index];
  const isFirst = index === 0;
  const posY = isFirst ? 0 : panels[index - 1].d3Height;

  // Dynamic fold angle conversion (defaults to 90 degrees inward)
  const foldAngleDeg = panel.foldAngle ?? 90;
  const isOutward = foldAngleDeg < -0.01;
  const invertMaterials = parentInvert !== isOutward;
  const foldAngleRad = (foldAngleDeg * Math.PI) / 180;
  const rotX = foldAngleRad;

  const meshX = offsetX !== undefined ? offsetX : panel.d3Width / 2;

  return (
    <group position={[0, posY, 0]} rotation={[rotX, 0, 0]}>
      {/* 3D Crease Line at horizontal fold joint */}
      <lineSegments position={[meshX, 0, 0]}>
        <bufferGeometry
          onUpdate={(geo) => {
            const w2 = panel.d3Width / 2;
            geo.setFromPoints([
              new THREE.Vector3(-w2, 0, 0),
              new THREE.Vector3(w2, 0, 0),
            ]);
          }}
        />
        <lineBasicMaterial color="#334155" linewidth={1.5} opacity={0.35} transparent={true} />
      </lineSegments>

      <group position={[meshX, panel.d3Height / 2, 0]}>
        <WallPanel
          panel={panel}
          margin={0.004}
          globalTexture={globalTexture}
          globalBumpTexture={globalBumpTexture}
          invertMaterials={invertMaterials}
        />
      </group>

      <TopFlapChain
        panels={panels}
        index={index + 1}
        globalTexture={globalTexture}
        globalBumpTexture={globalBumpTexture}
        offsetX={offsetX}
        parentInvert={invertMaterials}
      />
    </group>
  );
};

interface BottomFlapChainProps {
  panels: Panel3D[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
  offsetX?: number;
  parentInvert?: boolean;
}

// Recursive bottom flap hinge chain (rotates on X-axis)
export const BottomFlapChain: React.FC<BottomFlapChainProps> = ({
  panels,
  index,
  globalTexture,
  globalBumpTexture,
  offsetX,
  parentInvert = false,
}) => {
  if (index >= panels.length) return null;

  const panel = panels[index];
  const isFirst = index === 0;
  const posY = isFirst ? 0 : -panels[index - 1].d3Height;

  // Dynamic fold angle conversion (defaults to 90 degrees inward)
  const foldAngleDeg = panel.foldAngle ?? 90;
  const isOutward = foldAngleDeg < -0.01;
  const invertMaterials = parentInvert !== isOutward;
  const foldAngleRad = (foldAngleDeg * Math.PI) / 180;
  const rotX = -foldAngleRad;

  const meshX = offsetX !== undefined ? offsetX : panel.d3Width / 2;

  return (
    <group position={[0, posY, 0]} rotation={[rotX, 0, 0]}>
      {/* 3D Crease Line at horizontal fold joint */}
      <lineSegments position={[meshX, 0, 0]}>
        <bufferGeometry
          onUpdate={(geo) => {
            const w2 = panel.d3Width / 2;
            geo.setFromPoints([
              new THREE.Vector3(-w2, 0, 0),
              new THREE.Vector3(w2, 0, 0),
            ]);
          }}
        />
        <lineBasicMaterial color="#334155" linewidth={1.5} opacity={0.35} transparent={true} />
      </lineSegments>

      <group position={[meshX, -panel.d3Height / 2, 0]}>
        <WallPanel
          panel={panel}
          margin={0.004}
          globalTexture={globalTexture}
          globalBumpTexture={globalBumpTexture}
          isFloor={true}
          invertMaterials={invertMaterials}
        />
      </group>

      <BottomFlapChain
        panels={panels}
        index={index + 1}
        globalTexture={globalTexture}
        globalBumpTexture={globalBumpTexture}
        offsetX={offsetX}
        parentInvert={invertMaterials}
      />
    </group>
  );
};

interface RightHingeChainProps {
  columns: ColumnSegment[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
  accumulatedAngle?: number;
  parentInvert?: boolean;
}

// Recursive column hinge chain pointing right (rotates on Y-axis)
export const RightHingeChain: React.FC<RightHingeChainProps> = ({
  columns,
  index,
  globalTexture,
  globalBumpTexture,
  accumulatedAngle = 0,
  parentInvert = false,
}) => {
  if (index >= columns.length) return null;

  const col = columns[index];
  const main = col.mainRow;
  const prevCol = columns[index - 1];
  const posX = prevCol.d3Width;

  // Dynamic fold angle conversion
  const foldAngleDeg = col.foldAngle ?? 90;
  const isOutward = foldAngleDeg < -0.01;
  const invertMaterials = parentInvert !== isOutward;
  const foldAngleRad = (foldAngleDeg * Math.PI) / 180;
  const rotY = -foldAngleRad;

  const nextAccumulatedAngle = accumulatedAngle + rotY;

  return (
    <group position={[posX, 0, 0]} rotation={[0, rotY, 0]}>
      {/* 3D Crease Line at vertical hinge joint */}
      <lineSegments position={[0, main.d3CenterY, 0]}>
        <bufferGeometry
          onUpdate={(geo) => {
            const h2 = main.d3Height / 2;
            geo.setFromPoints([
              new THREE.Vector3(0, -h2, 0),
              new THREE.Vector3(0, h2, 0),
            ]);
          }}
        />
        <lineBasicMaterial color="#334155" linewidth={1.5} opacity={0.35} transparent={true} />
      </lineSegments>

      {/* Main Wall panel in this column segment */}
      {!main.isGhost && (
        <group position={[col.d3Width / 2, main.d3CenterY, 0]}>
          <WallPanel
            panel={main}
            globalTexture={globalTexture}
            globalBumpTexture={globalBumpTexture}
            invertMaterials={invertMaterials}
          />
        </group>
      )}

      {col.topFlaps.length > 0 && (
        <group position={[0, main.d3CenterY + main.d3Height / 2, 0]}>
          <TopFlapChain
            panels={col.topFlaps}
            index={0}
            globalTexture={globalTexture}
            globalBumpTexture={globalBumpTexture}
            parentInvert={invertMaterials}
          />
        </group>
      )}

      {col.bottomFlaps.length > 0 && (
        <group position={[0, main.d3CenterY - main.d3Height / 2, 0]}>
          <BottomFlapChain
            panels={col.bottomFlaps}
            index={0}
            globalTexture={globalTexture}
            globalBumpTexture={globalBumpTexture}
            parentInvert={invertMaterials}
          />
        </group>
      )}

      <RightHingeChain
        columns={columns}
        index={index + 1}
        globalTexture={globalTexture}
        globalBumpTexture={globalBumpTexture}
        accumulatedAngle={nextAccumulatedAngle}
        parentInvert={invertMaterials}
      />
    </group>
  );
};

interface LeftHingeChainProps {
  columns: ColumnSegment[];
  index: number;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
  accumulatedAngle?: number;
  isRootAdjacent?: boolean;
  parentInvert?: boolean;
}

// Recursive column hinge chain pointing left (rotates on Y-axis)
export const LeftHingeChain: React.FC<LeftHingeChainProps> = ({
  columns,
  index,
  globalTexture,
  globalBumpTexture,
  accumulatedAngle = 0,
  isRootAdjacent = true,
  parentInvert = false,
}) => {
  if (index < 0) return null;

  const col = columns[index];
  const main = col.mainRow;

  const posX = isRootAdjacent ? 0 : -columns[index + 1].d3Width;

  // Dynamic fold angle conversion
  const foldAngleDeg = col.rightFoldAngle ?? col.foldAngle ?? 90;
  const isOutward = foldAngleDeg < -0.01;
  const invertMaterials = parentInvert !== isOutward;
  const foldAngleRad = (foldAngleDeg * Math.PI) / 180;
  const rotY = foldAngleRad;

  const nextAccumulatedAngle = accumulatedAngle + rotY;

  return (
    <group position={[posX, 0, 0]} rotation={[0, rotY, 0]}>
      {/* 3D Crease Line at vertical hinge joint */}
      <lineSegments position={[0, main.d3CenterY, 0]}>
        <bufferGeometry
          onUpdate={(geo) => {
            const h2 = main.d3Height / 2;
            geo.setFromPoints([
              new THREE.Vector3(0, -h2, 0),
              new THREE.Vector3(0, h2, 0),
            ]);
          }}
        />
        <lineBasicMaterial color="#334155" linewidth={1.5} opacity={0.35} transparent={true} />
      </lineSegments>

      {/* Main Wall panel in this column segment expanding leftwards */}
      {!main.isGhost && (
        <group position={[-col.d3Width / 2, main.d3CenterY, 0]}>
          <WallPanel
            panel={main}
            globalTexture={globalTexture}
            globalBumpTexture={globalBumpTexture}
            invertMaterials={invertMaterials}
          />
        </group>
      )}

      {col.topFlaps.length > 0 && (
        <group position={[0, main.d3CenterY + main.d3Height / 2, 0]}>
          <TopFlapChain
            panels={col.topFlaps}
            index={0}
            globalTexture={globalTexture}
            globalBumpTexture={globalBumpTexture}
            offsetX={-col.d3Width / 2}
            parentInvert={invertMaterials}
          />
        </group>
      )}

      {col.bottomFlaps.length > 0 && (
        <group position={[0, main.d3CenterY - main.d3Height / 2, 0]}>
          <BottomFlapChain
            panels={col.bottomFlaps}
            index={0}
            globalTexture={globalTexture}
            globalBumpTexture={globalBumpTexture}
            offsetX={-col.d3Width / 2}
            parentInvert={invertMaterials}
          />
        </group>
      )}

      <LeftHingeChain
        columns={columns}
        index={index - 1}
        globalTexture={globalTexture}
        globalBumpTexture={globalBumpTexture}
        accumulatedAngle={nextAccumulatedAngle}
        isRootAdjacent={false}
        parentInvert={invertMaterials}
      />
    </group>
  );
};
