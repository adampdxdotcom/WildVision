import React from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { getCombinedWallBounds, getCircleThroughPoints } from '../../utils/geometry';
import { getMaterialFinishProps } from './materialUtils';
import { Panel3D } from './types';
import { NicheFeature } from './features/NicheFeature';
import { ShelfFeature } from './features/ShelfFeature';
import { SlabFeature } from './features/SlabFeature';
import { isSubAreaInBenchMode } from '../TileCanvas/painters';
import { useLayoutConfig } from './LayoutConfigContext';

export interface WallPanelProps {
  panel: Panel3D;
  globalTexture: THREE.Texture;
  globalBumpTexture?: THREE.Texture;
  margin?: number;
  isFloor?: boolean;
  invertMaterials?: boolean;
}

export const WallPanel: React.FC<WallPanelProps> = ({ panel, globalTexture, globalBumpTexture, margin, isFloor, invertMaterials }) => {
  const context = useLayoutConfig();

  const wallWidthStore = useAppStore((state) => state.wallWidth);
  const wallHeightStore = useAppStore((state) => state.wallHeight);
  const wallExtensionsStore = useAppStore((state) => state.wallExtensions);
  const wallVerticesStore = useAppStore((state) => state.wallVertices);
  const subAreasStore = useAppStore((state) => state.subAreas);
  const tileFinishStore = useAppStore((state) => state.tileFinish);

  const wallWidth = context ? context.wallWidth : wallWidthStore;
  const wallHeight = context ? context.wallHeight : wallHeightStore;
  const wallExtensions = context ? context.wallExtensions : (wallExtensionsStore || []);
  const wallVertices = context ? context.wallVertices : wallVerticesStore;
  const subAreas = context ? context.subAreas : subAreasStore;
  const tileFinish = context ? context.tileFinish : tileFinishStore;

  const finishProps = React.useMemo(() => getMaterialFinishProps(tileFinish), [tileFinish]);

  const isInv = invertMaterials ?? panel.invertMaterials ?? false;

  const frontMap = isInv ? panel.backingTexture : panel.texture;
  const frontBumpMap = isInv ? undefined : (panel.bumpTexture || undefined);
  const frontRoughness = isInv ? 0.6 : finishProps.roughness;
  const frontMetalness = isInv ? 0.03 : finishProps.metalness;

  const backMap = isInv ? panel.texture : panel.backingTexture;
  const backBumpMap = isInv ? (panel.bumpTexture || undefined) : undefined;
  const backRoughness = isInv ? finishProps.roughness : 0.6;
  const backMetalness = isInv ? finishProps.metalness : 0.03;

  const bounds = React.useMemo(() => {
    return getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);
  }, [wallWidth, wallHeight, wallExtensions, wallVertices]);

  const maxBound = Math.max(bounds.width, bounds.height || 1);
  const scaleFactor = 5;
  const to3D = React.useCallback((val: number) => (val / maxBound) * scaleFactor, [maxBound]);

  const width = margin ? Math.max(0.001, panel.d3Width - margin) : panel.d3Width;
  const height = margin ? Math.max(0.001, panel.d3Height - margin) : panel.d3Height;

  // Find intersecting subareas with cutout or niche
  const { intersectingSubAreas, shape } = React.useMemo(() => {
    const holes: THREE.Path[] = [];
    const intersecting: any[] = [];

    for (const sa of subAreas) {
      const rawType = (sa.accentType as string) || (sa.isCutout ? 'cutout' : (sa.hasSill ? 'niche' : 'flat'));
      const resolvedType = (rawType === 'bench' ? 'shelf' : rawType) as 'flat' | 'niche' | 'shelf' | 'cutout';
      
      let isBenchFootprintOnFloor = false;
      let effectiveMinY = sa.y;
      let effectiveMaxY = sa.y + sa.height;

      if (resolvedType === 'shelf' && isSubAreaInBenchMode(sa) && Math.abs(sa.y - (panel.startY + panel.height)) < 0.1) {
        isBenchFootprintOnFloor = true;
        const depthVal = sa.depth ?? 6.0;
        effectiveMinY = sa.y - depthVal;
        effectiveMaxY = sa.y;
      }

      const oMinX = Math.max(sa.x, panel.startX);
      const oMaxX = Math.min(sa.x + sa.width, panel.startX + panel.width);
      const oMinY = Math.max(effectiveMinY, panel.startY);
      const oMaxY = Math.min(effectiveMaxY, panel.startY + panel.height);

      if (oMinX < oMaxX - 0.01 && oMinY < oMaxY - 0.01) {
        let isOwner = true;
        if (resolvedType === 'shelf') {
          if (isFloor) {
            // For a Floor-Only Curb (drawn entirely inside the floor's bounds), the Floor Panel MUST set isOwner = true (since it is drawn only on the floor).
            // For a Wall-Anchored Bench (drawn on the wall, touching the fold):
            // - The Wall Panel MUST set isOwner = true.
            // - The Floor Panel MUST set isOwner = false (but still push it to intersectingSubAreas to cut the floor cutout hole).
            const isWallAnchored = isSubAreaInBenchMode(sa);
            if (isWallAnchored) {
              isOwner = false;
            } else {
              isOwner = true;
            }
          } else {
            isOwner = true;
          }
        }

        intersecting.push({ sa, resolvedType, isOwner });

        if (resolvedType === 'cutout' || resolvedType === 'niche') {
          const borderThickness = sa.border?.enabled ? Math.min(sa.border.tileWidth, sa.border.tileHeight) : 0;
          const isCutoutVal = resolvedType === 'cutout';
          const inset = isCutoutVal ? -borderThickness : borderThickness;

          const activeX = sa.x + inset;
          const activeWidth = Math.max(0.01, sa.width - 2 * inset);
          const activeY = sa.y + inset;
          const activeHeight = Math.max(0.01, sa.height - 2 * inset);

          const toD3X = (x: number) => ((x - panel.startX) / panel.width - 0.5) * panel.d3Width;
          const toD3Y = (y: number) => ((y - panel.startY) / panel.height - 0.5) * panel.d3Height;

          const halfW = panel.d3Width / 2;
          const halfH = panel.d3Height / 2;
          const clampX = (val: number) => Math.max(-halfW, Math.min(halfW, val));
          const clampY = (val: number) => Math.max(-halfH, Math.min(halfH, val));

          const xLeft = toD3X(activeX);
          const xRight = toD3X(activeX + activeWidth);
          const yBottom = toD3Y(activeY);
          const yTop = toD3Y(activeY + activeHeight);
          const rW = xRight - xLeft;
          const rH = yTop - yBottom;

          const holePath = new THREE.Path();

          if (sa.vertices && sa.vertices.length >= 3) {
            // Map the vertices to 3D local coordinate space
            const scaledPts = sa.vertices.map((v) => ({
              x: clampX(toD3X(v.x)),
              y: clampY(toD3Y(v.y)),
              isCurveNode: v.isCurveNode,
            }));

            let startIndex = scaledPts.findIndex((p) => !p.isCurveNode);
            if (startIndex === -1) startIndex = 0;

            const pts = [];
            for (let i = 0; i < scaledPts.length; i++) {
              pts.push(scaledPts[(startIndex + i) % scaledPts.length]);
            }

            holePath.moveTo(pts[0].x, pts[0].y);
            for (let i = 0; i < pts.length; i++) {
              const nextPt = pts[(i + 1) % pts.length];
              if (nextPt.isCurveNode) {
                const A = pts[i];
                const B = nextPt;
                const C = pts[(i + 2) % pts.length];

                const circle = getCircleThroughPoints(A, B, C);
                if (circle) {
                  const { cx: cxArc, cy: cyArc, r: rArc } = circle;

                  let startAngle = Math.atan2(A.y - cyArc, A.x - cxArc);
                  let endAngle = Math.atan2(C.y - cyArc, C.x - cxArc);
                  let midAngle = Math.atan2(B.y - cyArc, B.x - cxArc);

                  let diff = endAngle - startAngle;
                  while (diff < 0) diff += 2 * Math.PI;
                  let midDiff = midAngle - startAngle;
                  while (midDiff < 0) midDiff += 2 * Math.PI;

                  const clockwise = midDiff > diff;

                  holePath.absarc(cxArc, cyArc, rArc, startAngle, endAngle, clockwise);
                } else {
                  holePath.lineTo(C.x, C.y);
                }
                i++; // skip B
              } else {
                holePath.lineTo(nextPt.x, nextPt.y);
              }
            }
            holePath.closePath();
          } else {
            switch (sa.boundaryShape) {
              case 'oval': {
                const px = (xLeft + xRight) / 2;
                const py = (yBottom + yTop) / 2;
                const rx = rW / 2;
                const ry = rH / 2;
                holePath.absellipse(clampX(px), clampY(py), rx, ry, 0, Math.PI * 2, true, 0);
                break;
              }
              case 'custom_arches': {
                const depthD3 = sa.archDepth || 0;
                const innerXMin = xLeft + (sa.activeArches?.left ? depthD3 : 0);
                const innerXMax = xRight - (sa.activeArches?.right ? depthD3 : 0);
                const innerYMin = yBottom + (sa.activeArches?.bottom ? depthD3 : 0);
                const innerYMax = yTop - (sa.activeArches?.top ? depthD3 : 0);

                const rxHorizontal = Math.max(0, (innerXMax - innerXMin) / 2);
                const ryHorizontal = depthD3;
                const rxVertical = depthD3;
                const ryVertical = Math.max(0, (innerYMax - innerYMin) / 2);

                holePath.moveTo(clampX(innerXMin), clampY(innerYMin));

                // 1. Bottom Edge
                if (sa.activeArches?.bottom) {
                  holePath.absellipse(clampX((innerXMin + innerXMax) / 2), clampY(innerYMin), rxHorizontal, ryHorizontal, Math.PI, 2 * Math.PI, false, 0);
                } else {
                  holePath.lineTo(clampX(innerXMax), clampY(innerYMin));
                }

                // 2. Right Edge
                if (sa.activeArches?.right) {
                  holePath.absellipse(clampX(innerXMax), clampY((innerYMin + innerYMax) / 2), rxVertical, ryVertical, -Math.PI / 2, Math.PI / 2, false, 0);
                } else {
                  holePath.lineTo(clampX(innerXMax), clampY(innerYMax));
                }

                // 3. Top Edge
                if (sa.activeArches?.top) {
                  holePath.absellipse(clampX((innerXMin + innerXMax) / 2), clampY(innerYMax), rxHorizontal, ryHorizontal, 0, Math.PI, false, 0);
                } else {
                  holePath.lineTo(clampX(innerXMin), clampY(innerYMax));
                }

                // 4. Left Edge
                if (sa.activeArches?.left) {
                  holePath.absellipse(clampX(innerXMin), clampY((innerYMin + innerYMax) / 2), rxVertical, ryVertical, Math.PI / 2, 1.5 * Math.PI, false, 0);
                } else {
                  holePath.lineTo(clampX(innerXMin), clampY(innerYMin));
                }

                holePath.closePath();
                break;
              }
              case 'arch': {
                const archD3Height = sa.archHeight || activeWidth / 2;
                const yCenter = yTop - archD3Height;

                holePath.moveTo(clampX(xLeft), clampY(yBottom));
                holePath.lineTo(clampX(xRight), clampY(yBottom));
                holePath.lineTo(clampX(xRight), clampY(yCenter));
                holePath.absellipse(clampX((xLeft + xRight) / 2), clampY(yCenter), rW / 2, archD3Height, 0, Math.PI, false, 0);
                holePath.lineTo(clampX(xLeft), clampY(yBottom));
                holePath.closePath();
                break;
              }
              case 'rectangle':
              default: {
                // Holes MUST be drawn CLOCKWISE to prevent Earcut triangulation failures
                holePath.moveTo(clampX(xLeft), clampY(yBottom)); // Bottom-Left
                holePath.lineTo(clampX(xLeft), clampY(yTop));    // Top-Left
                holePath.lineTo(clampX(xRight), clampY(yTop));   // Top-Right
                holePath.lineTo(clampX(xRight), clampY(yBottom));// Bottom-Right
                holePath.closePath();
                break;
              }
            }
          }
          holes.push(holePath);
        }
      }
    }

    if (holes.length === 0) {
      return { intersectingSubAreas: intersecting, shape: null };
    }

    const s = new THREE.Shape();
    const w2_base = panel.d3Width / 2;
    const h2_base = panel.d3Height / 2;
    s.moveTo(-w2_base, -h2_base);
    s.lineTo(w2_base, -h2_base);
    s.lineTo(w2_base, h2_base);
    s.lineTo(-w2_base, h2_base);
    s.closePath();
    s.holes = holes;

    return { intersectingSubAreas: intersecting, shape: s };
  }, [subAreas, panel, isFloor]);

  const materialRef1 = React.useRef<THREE.MeshStandardMaterial | null>(null);
  const materialRef2 = React.useRef<THREE.MeshStandardMaterial | null>(null);

  React.useEffect(() => {
    if (materialRef1.current) {
      materialRef1.current.needsUpdate = true;
    }
    if (materialRef2.current) {
      materialRef2.current.needsUpdate = true;
    }
  }, [panel.bumpTexture, panel.texture]);

  const extrusionArgs = React.useMemo(() => {
    let extShape = shape;
    if (!extShape) {
      extShape = new THREE.Shape();
      const w2 = panel.d3Width / 2;
      const h2 = panel.d3Height / 2;
      extShape.moveTo(-w2, -h2);
      extShape.lineTo(w2, -h2);
      extShape.lineTo(w2, h2);
      extShape.lineTo(-w2, h2);
      extShape.closePath();
    }
    return [extShape, { depth: 0.004, bevelEnabled: false, steps: 1 }];
  }, [shape, panel.d3Width, panel.d3Height]);

  return (
    <>
      {/* Front face (interior of folded room) */}
      {shape ? (
        <mesh position={[0, 0, 0.002]} castShadow receiveShadow>
          <shapeGeometry
            args={[shape]}
            onUpdate={(geo) => {
              const posAttr = geo.getAttribute('position');
              if (posAttr) {
                const uvs = [];
                const wVal = panel.d3Width;
                const hVal = panel.d3Height;
                for (let i = 0; i < posAttr.count; i++) {
                  const x = posAttr.getX(i);
                  const y = posAttr.getY(i);
                  uvs.push((x + wVal / 2) / wVal, (y + hVal / 2) / hVal);
                }
                geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              }
              geo.computeVertexNormals();
            }}
          />
          <meshStandardMaterial
            ref={materialRef1}
            map={frontMap}
            bumpMap={frontBumpMap}
            bumpScale={frontBumpMap ? 0.8 : 0}
            roughness={frontRoughness}
            metalness={frontMetalness}
            side={THREE.FrontSide}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>
      ) : (
        <mesh position={[0, 0, 0.002]} castShadow receiveShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            ref={materialRef2}
            map={frontMap}
            bumpMap={frontBumpMap}
            bumpScale={frontBumpMap ? 0.8 : 0}
            roughness={frontRoughness}
            metalness={frontMetalness}
            side={THREE.FrontSide}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>
      )}

      {/* Back face (drywall watermark backing - faces exterior) */}
      {shape ? (
        <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <shapeGeometry
            args={[shape]}
            onUpdate={(geo) => {
              const posAttr = geo.getAttribute('position');
              if (posAttr) {
                const uvs = [];
                const wVal = panel.d3Width;
                const hVal = panel.d3Height;
                for (let i = 0; i < posAttr.count; i++) {
                  const x = posAttr.getX(i);
                  const y = posAttr.getY(i);
                  uvs.push((x + wVal / 2) / wVal, (y + hVal / 2) / hVal);
                }
                geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
              }
              geo.computeVertexNormals();
            }}
          />
          <meshStandardMaterial
            map={backMap}
            bumpMap={backBumpMap}
            bumpScale={backBumpMap ? 0.8 : 0}
            roughness={backRoughness}
            metalness={backMetalness}
            side={THREE.FrontSide}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>
      ) : (
        <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            map={backMap}
            bumpMap={backBumpMap}
            bumpScale={backBumpMap ? 0.8 : 0}
            roughness={backRoughness}
            metalness={backMetalness}
            side={THREE.FrontSide}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>
      )}

      {/* Solid Volume Edge Caps (Seals the 4mm hollow gap between front and back planes) */}
      <mesh position={[0, 0, -0.002]} castShadow receiveShadow>
        <extrudeGeometry args={extrusionArgs as any} />
        <meshBasicMaterial attach="material-0" visible={false} />
        <meshStandardMaterial attach="material-1" color={invertMaterials ? "#f1f5f9" : "#e2e8f0"} roughness={0.9} />
      </mesh>

      {/* Active volumetric features */}
      {intersectingSubAreas.map(({ sa, resolvedType, isOwner }, idx) => {
        if (!isOwner) return null;
        if (resolvedType === 'cutout' || resolvedType === 'flat') return null;

        // Calculate size and coordinates
        const saD3Width = (sa.width / panel.width) * panel.d3Width;
        const saD3Height = (sa.height / panel.height) * panel.d3Height;
        
        const saCenterX = sa.x + sa.width / 2;
        const saCenterY = sa.y + sa.height / 2;

        const saLocalX = ((saCenterX - panel.startX) / panel.width - 0.5) * panel.d3Width;
        const saLocalY = ((saCenterY - panel.startY) / panel.height - 0.5) * panel.d3Height;

        const renderFeature = () => {
          if (resolvedType === 'niche') {
            return (
              <NicheFeature
                sa={sa}
                panel={panel}
                bounds={bounds}
                to3D={to3D}
                localX={saLocalX}
                localY={saLocalY}
                d3Width={saD3Width}
                d3Height={saD3Height}
                globalTexture={globalTexture}
                globalBumpTexture={globalBumpTexture}
              />
            );
          }

          if (resolvedType === 'shelf') {
            return (
              <ShelfFeature
                sa={sa}
                panel={panel}
                bounds={bounds}
                to3D={to3D}
                localX={saLocalX}
                localY={saLocalY}
                d3Width={saD3Width}
                d3Height={saD3Height}
                globalTexture={globalTexture}
                globalBumpTexture={globalBumpTexture}
                isFloorMounted={isFloor}
              />
            );
          }

          if (resolvedType === 'slab') {
            return (
              <SlabFeature
                sa={sa}
                panel={panel}
                bounds={bounds}
                to3D={to3D}
                localX={saLocalX}
                localY={saLocalY}
                d3Width={saD3Width}
                d3Height={saD3Height}
                globalTexture={globalTexture}
                globalBumpTexture={globalBumpTexture}
              />
            );
          }

          return null;
        };

        return (
          <group key={idx}>
            {renderFeature()}
          </group>
        );
      })}
    </>
  );
};
