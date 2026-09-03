import * as React from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { SceneObject } from '../../types';
import { Html } from '@react-three/drei';
import { LayoutConfigContext } from './LayoutConfigContext';
import { WallPanel } from './WallPanel';
import { TopFlapChain, BottomFlapChain, RightHingeChain, LeftHingeChain } from './HingeChains';
import { useImportedTileTexture, useImportedBackingTexture } from './useImportedTextures';
import { useImportedD3Columns } from './useImportedD3Columns';

export interface ImportedLayoutObjectProps {
  data: SceneObject;
  to3D: (val: number) => number;
  from3D: (val: number) => number;
  handlePointerDown: (e: any, id: string) => void;
  isDragging: boolean;
  roomDimensions: { width: number; height: number; depth: number };
}

export const ImportedLayoutObject: React.FC<ImportedLayoutObjectProps> = ({
  data,
  to3D,
  from3D,
  handlePointerDown,
  isDragging,
  roomDimensions,
}) => {
  const activeObjectId = useAppStore((state) => state.activeObjectId);
  const roomColors = useAppStore((state) => state.roomColors);
  const isSelected = activeObjectId === data.id;

  const dims = data.metadata?.dimensions || [60, 60, 4]; // width, height, thickness in inches
  const widthInch = dims[0];
  const heightInch = dims[1];
  const depthInch = dims[2];

  const w3D = to3D(widthInch);
  const h3D = to3D(heightInch);
  const d3D = to3D(depthInch);

  const renderX = -(roomDimensions.width / 2) + data.position[0];
  const renderY = -(roomDimensions.height / 2) + data.position[1];

  const posX = to3D(renderX);
  const posY = to3D(renderY);
  const posZ = to3D(data.position[2]);

  const onDown = (e: any) => {
    const isPublicViewer = useAppStore.getState().isPublicViewer;
    const isReadOnly = useAppStore.getState().isReadOnly;
    if (data.isLocked || isPublicViewer || isReadOnly) return;
    e.stopPropagation();
    handlePointerDown(e, data.id);
  };

  const blueprint = data.metadata?.blueprint;

  // Generate color texture and grayscale bump/depth map for this imported layout
  const { color: texture, bump: bumpTexture } = useImportedTileTexture(blueprint);
  const backingTexture = useImportedBackingTexture(blueprint);

  // Compute physical columns and panel folding alignments
  const { columns: d3Columns, rootIdx, totalBottomFlapsHeight } = useImportedD3Columns(
    blueprint,
    texture,
    backingTexture,
    bumpTexture,
    to3D
  );

  const hasColumns = d3Columns && d3Columns.length > 0;
  const rootCol = hasColumns ? d3Columns[rootIdx] : null;

  const layoutConfig = React.useMemo(() => {
    if (!blueprint) return null;
    return {
      wallWidth: blueprint.wallWidth || 120,
      wallHeight: blueprint.wallHeight || 96,
      wallExtensions: blueprint.wallExtensions || [],
      wallVertices: blueprint.wallVertices || [],
      subAreas: blueprint.subAreas || [],
      tileFinish: blueprint.tileFinish || 'matte',
    };
  }, [blueprint]);

  const getRotation = (attachedPlane?: string): [number, number, number] => {
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

  const dynamicRotation = getRotation(data.attachedPlane);

  const { outwardReturnDepth, inwardDepth } = React.useMemo(() => {
    let maxOutward = 0;
    let maxInward = 0;

    if (rootCol) {
      if (rootCol.topFlaps && rootCol.topFlaps.length > 0) {
        const fa = rootCol.topFlaps[0].foldAngle ?? 90;
        if (fa < 0) maxOutward = Math.max(maxOutward, rootCol.topFlaps[0].d3Height);
        else maxInward = Math.max(maxInward, rootCol.topFlaps[0].d3Height);
      }
      if (rootCol.bottomFlaps && rootCol.bottomFlaps.length > 0) {
        const fa = rootCol.bottomFlaps[0].foldAngle ?? 90;
        if (fa < 0) maxOutward = Math.max(maxOutward, rootCol.bottomFlaps[0].d3Height);
        else maxInward = Math.max(maxInward, rootCol.bottomFlaps[0].d3Height);
      }
    }
    if (d3Columns) {
      const leftCol = d3Columns[rootIdx - 1];
      if (leftCol) {
        const fa = leftCol.rightFoldAngle ?? leftCol.foldAngle ?? 90;
        if (fa < 0) maxOutward = Math.max(maxOutward, leftCol.d3Width);
        else maxInward = Math.max(maxInward, leftCol.d3Width);
      }
      const rightCol = d3Columns[rootIdx + 1];
      if (rightCol) {
        const fa = rightCol.foldAngle ?? 90;
        if (fa < 0) maxOutward = Math.max(maxOutward, rightCol.d3Width);
        else maxInward = Math.max(maxInward, rightCol.d3Width);
      }
    }
    return { outwardReturnDepth: maxOutward, inwardDepth: maxInward };
  }, [rootCol, d3Columns, rootIdx]);

  const recessDepth = data.metadata?.recessDepth || 0;
  const recess3D = to3D(recessDepth);

  const anchor = data.metadata?.mountAnchor || 'back';
  let normalZOffset = 0;
  if (outwardReturnDepth > 0) {
    if (anchor === 'back') normalZOffset = outwardReturnDepth;
    else if (anchor === 'center') normalZOffset = outwardReturnDepth / 2;
  } else if (inwardDepth > 0) {
    if (anchor === 'back') normalZOffset = -inwardDepth / 2;
  }
  const localZOffset = normalZOffset - recess3D;

  return (
    <group name={data.id} position={[posX, posY, posZ]} onPointerDown={onDown}>
      <group rotation={dynamicRotation}>
        {blueprint && rootCol && layoutConfig ? (
          /* Render the actual folded, textured room layout in the 3D scene */
          <LayoutConfigContext.Provider value={layoutConfig}>
            <group position={[0, 0, localZOffset]}>
              <group position={[-rootCol.d3Width / 2, totalBottomFlapsHeight, 0]}>
              {/* Root Main Wall */}
              {!rootCol.mainRow.isGhost && (
                <group position={[rootCol.d3Width / 2, rootCol.mainRow.d3CenterY, 0]}>
                  <WallPanel panel={rootCol.mainRow} globalTexture={texture!} globalBumpTexture={bumpTexture || undefined} />
                </group>
              )}

              {/* Root Top/Bottom flaps */}
              {rootCol.topFlaps.length > 0 && (
                <group position={[0, rootCol.mainRow.d3CenterY + rootCol.mainRow.d3Height / 2, 0]}>
                  <TopFlapChain panels={rootCol.topFlaps} index={0} globalTexture={texture!} globalBumpTexture={bumpTexture || undefined} />
                </group>
              )}

              {rootCol.bottomFlaps.length > 0 && (
                <group position={[0, rootCol.mainRow.d3CenterY - rootCol.mainRow.d3Height / 2, 0]}>
                  <BottomFlapChain panels={rootCol.bottomFlaps} index={0} globalTexture={texture!} globalBumpTexture={bumpTexture || undefined} />
                </group>
              )}

              {/* Branch Right */}
              <RightHingeChain columns={d3Columns} index={rootIdx + 1} globalTexture={texture!} globalBumpTexture={bumpTexture || undefined} />

              {/* Branch Left */}
              <LeftHingeChain columns={d3Columns} index={rootIdx - 1} globalTexture={texture!} globalBumpTexture={bumpTexture || undefined} />
              </group>
            </group>
          </LayoutConfigContext.Provider>
        ) : null}

        {/* Recess Alcove Lining / Tunnel Meshes */}
        {recessDepth > 0 && (() => {
          const matchMainWallColor = data.metadata?.matchMainWallColor ?? true;
          const tunnelColor = data.metadata?.tunnelColor || '#cbd5e1';
          const backWallColor = roomColors?.overrides?.back || roomColors?.base || '#cbd5e1';
          
          // Evaluate casing color dynamically, programmatically darkening it by ~12% (multiply by 0.88) if Match Wall Color is active
          const casingColorObj = new THREE.Color(matchMainWallColor ? backWallColor : tunnelColor);
          if (matchMainWallColor) {
            casingColorObj.multiplyScalar(0.88);
          }
          const activeTunnelColor = '#' + casingColorObj.getHexString();

          // Crease outline color dynamically darkened by an additional 30% from the casing color (multiply by 0.7)
          const creaseColorObj = casingColorObj.clone().multiplyScalar(0.7);
          const creaseColor = '#' + creaseColorObj.getHexString();

          return (
            <group name="alcove-lining">
              {/* Left lining */}
              <mesh position={[-w3D / 2, 0, normalZOffset - recess3D / 2]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[recess3D, h3D]} />
                <meshBasicMaterial color={activeTunnelColor} side={THREE.DoubleSide} />
              </mesh>

              {/* Right lining */}
              <mesh position={[w3D / 2, 0, normalZOffset - recess3D / 2]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[recess3D, h3D]} />
                <meshBasicMaterial color={activeTunnelColor} side={THREE.DoubleSide} />
              </mesh>

              {/* Top lining */}
              <mesh position={[0, h3D / 2, normalZOffset - recess3D / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w3D, recess3D]} />
                <meshBasicMaterial color={activeTunnelColor} side={THREE.DoubleSide} />
              </mesh>

              {/* Bottom lining */}
              <mesh position={[0, -h3D / 2, normalZOffset - recess3D / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w3D, recess3D]} />
                <meshBasicMaterial color={activeTunnelColor} side={THREE.DoubleSide} />
              </mesh>

              {/* Symmetrical Crease outlines with enabled polygonOffset to cure Z-Fighting */}
              <lineSegments position={[0, 0, normalZOffset - recess3D / 2]}>
                <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(w3D, h3D, recess3D)]} />
                <lineBasicMaterial 
                  attach="material" 
                  color={creaseColor} 
                  linewidth={2} 
                  polygonOffset={true}
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                />
              </lineSegments>
            </group>
          );
        })()}

        {/* Selection boundary box visual indicator (Flat so it doesn't inflate Z-depth) */}
        {isSelected && (
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[w3D + 0.04, h3D + 0.04]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.5} />
          </mesh>
        )}
      </group>

      {/* Floating UI indicating active object status */}
      {isSelected && (
        <Html position={[0, h3D + 0.3, 0]} center style={{ pointerEvents: 'auto' }}>
          <div className="bg-sky-600/95 text-white text-[10px] px-2.5 py-1 rounded-md shadow-lg border border-sky-400/50 flex flex-col items-center gap-1 select-none font-sans whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Imported Layout</span>
              <span className="text-sky-100 font-mono">({widthInch}&quot;×{heightInch}&quot;×{depthInch}&quot;)</span>
            </div>
            {isDragging && (
              <div className="text-[9px] text-sky-200 border-t border-sky-500/50 pt-0.5 mt-0.5 flex gap-1 w-full justify-center">
                Mount: <strong className="uppercase font-bold text-white">{anchor}</strong> <span className="text-sky-300/80">(Press Tab to cycle)</span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
