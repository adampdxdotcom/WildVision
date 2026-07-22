import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Environment, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import { ZoomControls3D } from './components/ZoomControls3D';
import { useTileTexture } from './useTileTexture';
import { useBackingTexture } from './useBackingTexture';
import { useAppStore } from '../../store/useAppStore';
import { logger } from '../../utils/logger';
import { getCombinedWallBounds } from '../../utils/geometry';
import { Panel3D } from './types';
import { useD3Columns } from './useD3Columns';
import { useDragController } from './useDragController';
import { CustomBoxObject } from './CustomBoxObject';
import { ClayModelObject } from './ClayModelObject';
import { ImportedLayoutObject } from './ImportedLayoutObject';
import { CanvasHeader } from '../TileCanvas/CanvasHeader';

// Modularly imported extracted components
import { CameraController } from './CameraController';
import { WebGLSnapshotHandler } from './WebGLSnapshotHandler';
import { ElevationSnapshotHandler } from './ElevationSnapshotHandler';
import { ViewfinderOverlay } from './ViewfinderOverlay';
import { KeyboardCameraController } from './KeyboardCameraController';
import { EnvironmentShell } from './EnvironmentShell';
import { MainTileLayoutGroup } from './MainTileLayoutGroup';
import { ViewportUIControls } from './ViewportUIControls';
import { EnvironmentControls3D } from './EnvironmentControls3D';


const CameraManager = ({ orthoLock, controlsRef, savedCameraFov }) => {
  const { size } = useThree();
  const prevOrthoLock = React.useRef(orthoLock);

  const perspRef = React.useRef(null);
  const orthoRef = React.useRef(null);

  const aspect = size.height > 0 ? size.width / size.height : 1;
  const frustumSize = 6;

  React.useEffect(() => {
    if (orthoLock && !prevOrthoLock.current) {
      if (controlsRef.current && perspRef.current && orthoRef.current) {
        const controls = controlsRef.current;
        const orthoCam = orthoRef.current;

        // 1. Find the nearest wall based on the current camera rotation
        const currentAzimuth = controls.getAzimuthalAngle();
        const snapAngle = Math.round(currentAzimuth / (Math.PI / 2)) * (Math.PI / 2);

        // Force absolute integers to eliminate floating point yaw drift
        const sinSnap = Math.round(Math.sin(snapAngle));
        const cosSnap = Math.round(Math.cos(snapAngle));

        // 2. Brute-force the target to the exact mathematical center of the room (0,0,0)
        controls.target.set(0, 0, 0);

        // 3. Brute-force the Ortho camera position. 
        // Note: Distance doesn't affect Ortho scale, just needs to be outside the 5-unit room bounds.
        const safeDistance = 10; 
        orthoCam.position.set(
          safeDistance * sinSnap,
          0,  // Force 0 pitch
          safeDistance * cosSnap
        );

        // 4. Reset Ortho zoom and update projection
        orthoCam.zoom = 1;
        orthoCam.updateProjectionMatrix();

        // 5. Apply strict mathematical straightjackets to OrbitControls
        controls.minAzimuthAngle = snapAngle;
        controls.maxAzimuthAngle = snapAngle;
        controls.minPolarAngle = Math.PI / 2;
        controls.maxPolarAngle = Math.PI / 2;

        controls.update();

        useAppStore.getState().setLiveCamera(
          [orthoRef.current.position.x, orthoRef.current.position.y, orthoRef.current.position.z],
          [0, 0, 0]
        );
      }
    } else if (!orthoLock && prevOrthoLock.current) {
      if (controlsRef.current && perspRef.current && orthoRef.current) {
        const controls = controlsRef.current;
        perspRef.current.position.copy(orthoRef.current.position);
        perspRef.current.updateProjectionMatrix();
        
        const isHeightLocked = useAppStore.getState().isCameraHeightLocked;
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
        controls.minPolarAngle = isHeightLocked ? Math.PI / 2 : 0;
        controls.maxPolarAngle = isHeightLocked ? Math.PI / 2 : Math.PI;
        
        controls.update();

        useAppStore.getState().setLiveCamera(
          [perspRef.current.position.x, perspRef.current.position.y, perspRef.current.position.z],
          [controls.target.x, controls.target.y, controls.target.z]
        );
      }
    }
    prevOrthoLock.current = orthoLock;
  }, [orthoLock, controlsRef, savedCameraFov, size.height]);

  const livePos = useAppStore.getState().liveCameraPosition;
  const initialPos = React.useMemo<[number, number, number]>(() => livePos && livePos.length === 3 ? [livePos[0], livePos[1], livePos[2]] : [0, 0, 7.0], []);

  return (
    <>
      <PerspectiveCamera ref={perspRef} makeDefault={!orthoLock} fov={savedCameraFov} position={initialPos} near={0.1} far={1000} />
      <OrthographicCamera 
        ref={orthoRef}
        makeDefault={orthoLock} 
        left={(frustumSize * aspect) / -2}
        right={(frustumSize * aspect) / 2}
        top={frustumSize / 2}
        bottom={frustumSize / -2}
        position={initialPos}
        near={-1000}
        far={1000}
      />
    </>
  );
};

export const TileCanvas3D: React.FC = () => {
  const { 
    viewMode,
    wallWidth, 
    wallHeight, 
    wallExtensions, 
    wallVertices, 
    foldLines, 
    anchoredRegionCenter,
    enableRealisticDepth,
    setEnableRealisticDepth,
    backgroundImage,
    bgOpacity,
    floorY,
    setFloorY,
    backWallZ,
    setBackWallZ,
    leftWallX,
    setLeftWallX,
    rightWallX,
    setRightWallX,
    ceilingY,
    setCeilingY,
    savedCameraFov,
    setSavedCameraFov,
    isCameraHeightLocked,
    setIsCameraHeightLocked,
    isCameraDistanceLocked,
    setIsCameraDistanceLocked,
    orthoLock,
    setOrthoLock,
    roomDimensions,
    roomColors,
    sceneObjects,
    activeSubAreaId,
    subAreas,
    offsetX,
    offsetY,
    unit,
    lightingExposure,
  } = useAppStore();

  const mainTileLayout = sceneObjects['main-tile-layout'] || {
    id: 'main-tile-layout',
    type: 'tile_layout',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    attachedPlane: 'back',
    metadata: { mountAnchor: 'back' }
  };

  const layoutTransform = {
    position: mainTileLayout.position,
    attachedPlane: mainTileLayout.attachedPlane as any,
    mountAnchor: mainTileLayout.metadata?.mountAnchor || 'back'
  };

  const planesConfig = {
    ceiling: { show: true, color: '#cbd5e1', position: 0, offset: 0 },
    back: { show: true, color: '#cbd5e1', position: 0, offset: 0 },
    floor: { show: true, color: '#94a3b8', position: 0, offset: 0 },
    left: { show: true, color: '#cbd5e1', position: 0, offset: 0 },
    right: { show: true, color: '#cbd5e1', position: 0, offset: 0 },
    pedestal: { show: false, color: '#475569', offset: 0 },
    upper: { show: false, color: '#475569', offset: 0 },
    facade: { show: false, color: '#cbd5e1', offset: 0 },
  };
  const setPlanesConfig = () => {};
  const updatePlane = () => {};
  const { color: texture, bump: bumpTexture } = useTileTexture();
  const backingTexture = useBackingTexture();
  const [isLightMode, setIsLightMode] = React.useState(false);

  const anyPlaneVisible = Object.values(planesConfig).some((p) => p?.show);

  const modelRef = React.useRef<THREE.Group>(null);
  const controlsRef = React.useRef<any>(null);

  // Compute exact dimensions of wall to size the 3D plane
  const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);
  
  // Set target width & height relative to a max unit size of 5 in 3D orbit coordinates
  const scaleFactor = 5;
  const maxRoomBound = Math.max(roomDimensions.width, roomDimensions.height, roomDimensions.depth, 1);

  const to3D = React.useCallback((val: number) => (val / maxRoomBound) * scaleFactor, [maxRoomBound, scaleFactor]);
  const from3D = React.useCallback((val3D: number) => (val3D * maxRoomBound) / scaleFactor, [maxRoomBound, scaleFactor]);

  const baseCabHeight = to3D(36);
  const upperCabHeight = to3D(36);

  const { d3Columns, horizontalFolds } = useD3Columns({
    bounds,
    foldLines,
    wallVertices,
    wallExtensions,
    anchoredRegionCenter,
    texture,
    backingTexture,
    bumpTexture,
    to3D,
  });

  const {
    isDragging,
    isSelected,
    setIsSelected,
    handlePointerDown,
    handlePlanePointerMove,
  } = useDragController({
    from3D,
    d3Columns,
    horizontalFolds,
    roomDimensions,
  });

  const lowestY = React.useMemo(() => {
    let minVal = -2.2; // default grid position

    if (d3Columns && d3Columns.length > 0) {
      // Find root column
      let rootIdx = 0;
      let maxWidth = 0;
      d3Columns.forEach((col, i) => {
        if (col.width > maxWidth) {
          maxWidth = col.width;
          rootIdx = i;
        }
      });
      const rootCol = d3Columns[rootIdx];
      if (rootCol) {
        const totalBottomFlapsHeight = rootCol.bottomFlaps
          ? rootCol.bottomFlaps.reduce((sum, flap) => sum + flap.d3Height, 0)
          : 0;

        d3Columns.forEach((col) => {
          // Bottom of col's mainRow
          const mainBottomY = totalBottomFlapsHeight + col.mainRow.d3CenterY - col.mainRow.d3Height / 2;
          minVal = Math.min(minVal, mainBottomY);

          // If this col has bottom flaps, the bottom-most bottom flap bottom edge would end up at Y = 0
          if (col.bottomFlaps && col.bottomFlaps.length > 0) {
            minVal = Math.min(minVal, 0);
          }
        });
      }
    }

    return minVal;
  }, [d3Columns]);

  const handleResetCamera = React.useCallback(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;
    if (!camera) return;

    // Temporarily release polar angle locks so reset doesn't fight locked states
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    // Center strictly on [0, 0, 0] (the center of our new room)
    controls.target.set(0, 0, 0);

    camera.position.set(0, 0, 7.0);
    camera.updateProjectionMatrix();
    controls.update();

    // Re-lock polar angles to the head-on reset position (Math.PI / 2) if height is locked
    if (isCameraHeightLocked) {
      controls.minPolarAngle = Math.PI / 2;
      controls.maxPolarAngle = Math.PI / 2;
    }

    useAppStore.getState().setLiveCamera(
      [camera.position.x, camera.position.y, camera.position.z],
      [controls.target.x, controls.target.y, controls.target.z]
    );
  }, [roomDimensions, to3D, isCameraHeightLocked]);

  const totalFolds = foldLines ? foldLines.length : 0;

  const roomShapes = React.useMemo(() => {
    const rWidth = to3D(roomDimensions.width);
    const rHeight = to3D(roomDimensions.height);
    const rDepth = to3D(roomDimensions.depth);

    const anchor = layoutTransform.mountAnchor || 'back';
    const isRecessed = anchor === 'back';
    const attachedPlane = layoutTransform.attachedPlane;

    // Isolate the mainRow of the tile layout so we don't cut holes for floor/ceiling flaps
    let holeW = 0, holeH = 0, localHingeY3D = 0;
    if (d3Columns && d3Columns.length > 0) {
      let rootIdx = 0;
      let maxWidth = 0;
      d3Columns.forEach((col, i) => { if (col.width > maxWidth) { maxWidth = col.width; rootIdx = i; } });
      const rootCol = d3Columns[rootIdx];
      if (rootCol && rootCol.mainRow && !rootCol.mainRow.isGhost) {
        holeW = rootCol.d3Width;
        holeH = rootCol.mainRow.d3Height;
        const totalBottomFlapsHeight = rootCol.bottomFlaps ? rootCol.bottomFlaps.reduce((sum, flap) => sum + flap.d3Height, 0) : 0;
        // The exact Y position of the bottom of the mainRow relative to the layout group's center
        localHingeY3D = totalBottomFlapsHeight + rootCol.mainRow.d3CenterY - (rootCol.mainRow.d3Height / 2);
      }
    }

    const createWallShape = (planeKey: string, widthVal: number, heightVal: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-widthVal / 2, -heightVal / 2);
      shape.lineTo(widthVal / 2, -heightVal / 2);
      shape.lineTo(widthVal / 2, heightVal / 2);
      shape.lineTo(-widthVal / 2, heightVal / 2);
      shape.closePath();

      // Microscopic edge clamp to prevent Earcut failures on wall boundaries
      const halfWallW = widthVal / 2;
      const halfWallH = heightVal / 2;
      const clampX = (val: number) => Math.max(-halfWallW + 0.002, Math.min(halfWallW - 0.002, val));
      const clampY = (val: number) => Math.max(-halfWallH + 0.002, Math.min(halfWallH - 0.002, val));

      // 1. Scan for any recessed imported layouts attached to this plane and punch holes for them
      Object.values(sceneObjects).forEach((obj) => {
        if (obj.type === 'imported_layout' && obj.attachedPlane === planeKey) {
          const recessDepth = obj.metadata?.recessDepth || 0;
          if (recessDepth > 0) {
            const dims = obj.metadata?.dimensions || [60, 60, 4];
            const width = dims[0];
            const height = dims[1];
            const w3D = to3D(width);
            const h3D = to3D(height);

            const px = to3D(obj.position[0]);
            const py = to3D(obj.position[1]);
            const pz = to3D(obj.position[2]);

            let hX = 0, hY = 0;
            if (planeKey === 'back') { hX = px; hY = py; }
            else if (planeKey === 'left') { hX = -pz; hY = py; }
            else if (planeKey === 'right') { hX = pz; hY = py; }
            else if (planeKey === 'floor') { hX = px; hY = -pz; }
            else if (planeKey === 'ceiling') { hX = px; hY = pz; }

            const xLeft = clampX(hX - w3D / 2);
            const xRight = clampX(hX + w3D / 2);
            const yBottom = clampY(hY - h3D / 2);
            const yTop = clampY(hY + h3D / 2);

            const hole = new THREE.Path();
            // Draw CLOCKWISE winding-order so earcut works perfectly
            hole.moveTo(xLeft, yBottom);
            hole.lineTo(xLeft, yTop);
            hole.lineTo(xRight, yTop);
            hole.lineTo(xRight, yBottom);
            hole.closePath();

            shape.holes.push(hole);
          }
        }
      });

      if (isRecessed && attachedPlane === planeKey && holeW > 0 && holeH > 0) {
        const px = to3D(layoutTransform.position[0]);
        const py = to3D(layoutTransform.position[1]);
        const pz = to3D(layoutTransform.position[2]);

        let hX = 0, hY = 0;
        // Map global XYZ to local Wall 2D Space
        if (planeKey === 'back') { hX = px; hY = py; }
        else if (planeKey === 'left') { hX = -pz; hY = py; }
        else if (planeKey === 'right') { hX = pz; hY = py; }
        else if (planeKey === 'floor') { hX = px; hY = -pz; }
        else if (planeKey === 'ceiling') { hX = px; hY = pz; }

        const startX = hX - (holeW / 2);
        const startY = hY + localHingeY3D;

        const xLeft = clampX(startX);
        const xRight = clampX(startX + holeW);
        const yBottom = clampY(startY);
        const yTop = clampY(startY + holeH);

        const hole = new THREE.Path();
        // Draw CLOCKWISE so Three.js triangulation recognizes it as a hole
        hole.moveTo(xLeft, yBottom); // Bottom-Left
        hole.lineTo(xLeft, yTop); // Top-Left
        hole.lineTo(xRight, yTop); // Top-Right
        hole.lineTo(xRight, yBottom); // Bottom-Right
        hole.closePath();

        shape.holes.push(hole);
      } else if (!isRecessed && attachedPlane === planeKey && subAreas && subAreas.length > 0) {
        let rootCol: any = null;
        if (d3Columns && d3Columns.length > 0) {
          let rootIdx = 0;
          let maxWidth = 0;
          d3Columns.forEach((col, i) => { if (col.width > maxWidth) { maxWidth = col.width; rootIdx = i; } });
          rootCol = d3Columns[rootIdx];
        }

        if (rootCol && rootCol.mainRow && !rootCol.mainRow.isGhost) {
          const px = to3D(layoutTransform.position[0]);
          const py = to3D(layoutTransform.position[1]);
          const pz = to3D(layoutTransform.position[2]);

          let hX = 0, hY = 0;
          // Map global XYZ to local Wall 2D Space
          if (planeKey === 'back') { hX = px; hY = py; }
          else if (planeKey === 'left') { hX = -pz; hY = py; }
          else if (planeKey === 'right') { hX = pz; hY = py; }
          else if (planeKey === 'floor') { hX = px; hY = -pz; }
          else if (planeKey === 'ceiling') { hX = px; hY = pz; }

          const panel = rootCol.mainRow;
          const totalBottomFlapsHeight = rootCol.bottomFlaps ? rootCol.bottomFlaps.reduce((sum: number, flap: any) => sum + flap.d3Height, 0) : 0;

          subAreas.forEach((sa) => {
            const rawType = (sa.accentType as string) || (sa.isCutout ? 'cutout' : (sa.hasSill ? 'niche' : 'flat'));
            const resolvedType = (rawType === 'bench' ? 'shelf' : rawType) as 'flat' | 'niche' | 'shelf' | 'cutout';

            if (resolvedType === 'niche' || resolvedType === 'cutout') {
              const borderThickness = sa.border?.enabled ? Math.min(sa.border.tileWidth, sa.border.tileHeight) : 0;
              const isCutoutVal = resolvedType === 'cutout';
              const inset = isCutoutVal ? -borderThickness : borderThickness;

              const activeX = sa.x + inset;
              const activeWidth = Math.max(0.01, sa.width - 2 * inset);
              const activeY = sa.y + inset;
              const activeHeight = Math.max(0.01, sa.height - 2 * inset);

              const toD3X_sa = (x: number) => ((x - panel.startX) / panel.width - 0.5) * panel.d3Width;
              const toD3Y_sa = (y: number) => ((y - panel.startY) / panel.height - 0.5) * panel.d3Height;

              const saLeft_3D = toD3X_sa(activeX);
              const saRight_3D = toD3X_sa(activeX + activeWidth);
              const saBottom_3D = toD3Y_sa(activeY);
              const saTop_3D = toD3Y_sa(activeY + activeHeight);

              const saLocalX = (saLeft_3D + saRight_3D) / 2;
              const saLocalY = (saBottom_3D + saTop_3D) / 2;

              const saD3Width = saRight_3D - saLeft_3D;
              const saD3Height = saTop_3D - saBottom_3D;

              const saCenterX_wall = hX + saLocalX;
              const saCenterY_wall = hY + totalBottomFlapsHeight + panel.d3CenterY + saLocalY;

              const startX = saCenterX_wall - (saD3Width / 2);
              const startY = saCenterY_wall - (saD3Height / 2);

              const xLeft = clampX(startX);
              const xRight = clampX(startX + saD3Width);
              const yBottom = clampY(startY);
              const yTop = clampY(startY + saD3Height);

              const hole = new THREE.Path();
              // Draw CLOCKWISE winding-order to ensure earcut works perfectly
              hole.moveTo(xLeft, yBottom); // Bottom-Left
              hole.lineTo(xLeft, yTop); // Top-Left
              hole.lineTo(xRight, yTop); // Top-Right
              hole.lineTo(xRight, yBottom); // Bottom-Right
              hole.closePath();

              shape.holes.push(hole);
            }
          });
        }
      }
      return shape;
    };

    const floorShape = createWallShape('floor', rWidth, rDepth);
    const backShape = createWallShape('back', rWidth, rHeight);
    const leftShape = createWallShape('left', rDepth, rHeight);
    const rightShape = createWallShape('right', rDepth, rHeight);
    const ceilingShape = createWallShape('ceiling', rWidth, rDepth);

    return { floorShape, backShape, leftShape, rightShape, ceilingShape };
  }, [roomDimensions, d3Columns, layoutTransform, to3D, subAreas, sceneObjects]);

  const isPresentation = viewMode === 'presentation';

  const initialCameraTarget = React.useMemo<[number, number, number]>(() => {
    const target = useAppStore.getState().liveCameraTarget;
    return target && target.length === 3 ? [target[0], target[1], target[2]] : [0, 0, 0];
  }, []);

  return (
    <div className={isPresentation ? "w-full h-full relative overflow-hidden bg-slate-950" : `w-full h-full rounded-xl overflow-hidden relative shadow-inner flex flex-col justify-between transition-colors duration-200 border ${
      isLightMode ? 'bg-[#f8fafc] border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
    }`}>
      {!isPresentation && (
        <CanvasHeader
          activeSubAreaId={activeSubAreaId}
          subAreas={subAreas}
          offsetX={offsetX}
          offsetY={offsetY}
          unit={unit}
        />
      )}
      <div className={isPresentation ? "w-full h-full relative overflow-hidden" : "flex-1 w-full relative bg-slate-950 overflow-hidden"}>
         <div 
           onContextMenu={(e) => e.preventDefault()}
           className="w-full h-full relative"
         >
           {/* Viewfinder safe area visual overlay */}
           {!isPresentation && <ViewfinderOverlay />}

           {/* 3D Simulation Overlay UI */}
           {!isPresentation && (
             <div className="absolute top-4 left-4 z-10 pointer-events-none font-sans">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${
                isLightMode 
                  ? 'bg-indigo-50/80 text-indigo-600 border-indigo-200' 
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              }`}>
                3D Fold Space
              </span>
            </div>
           )}
        {/* Background photo underlay */}
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Room Background Underlay"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200"
            referrerPolicy="no-referrer"
            style={{
              opacity: bgOpacity,
              zIndex: 0,
            }}
          />
        )}

        <Canvas
          gl={{ alpha: true, toneMapping: THREE.NoToneMapping }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
          onPointerMissed={() => {
            setIsSelected(false);
            useAppStore.getState().setActiveObjectId(null);
          }}
          onCreated={({ gl }) => {
            const handleContextLost = (event: Event) => {
              event.preventDefault();
              logger.error('WebGL context lost on 3D canvas', {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
               });
            };
            gl.domElement.addEventListener('webglcontextlost', handleContextLost);
          }}
        >
          <CameraController controlsRef={controlsRef} />
          <CameraManager orthoLock={orthoLock} controlsRef={controlsRef} savedCameraFov={savedCameraFov} />
          <KeyboardCameraController controlsRef={controlsRef} />
          {/* Background color */}
          {!backgroundImage && (
            <color attach="background" args={[isLightMode ? '#f1f5f9' : '#0b0f19']} />
          )}
          
          {/* Pure white ambient light scaled by exposure multiplier for uniform, shadow-free, and color-accurate rendering */}
          <ambientLight color="#ffffff" intensity={3.0 * lightingExposure} />

          {/* Conditional loader while textures finish drawing */}
          {!texture || !backingTexture || d3Columns.length === 0 ? (
            <Html center>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl backdrop-blur-md border transition-colors duration-200 ${
                isLightMode 
                  ? 'bg-white/95 text-slate-800 border-slate-200' 
                  : 'bg-slate-800/90 text-white border-slate-700'
              }`}>
                <svg className="animate-spin h-4.5 w-4.5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-bold tracking-tight">Computing 3D Room Grid...</span>
              </div>
            </Html>
          ) : (
            <>
              <MainTileLayoutGroup
                layoutTransform={layoutTransform}
                d3Columns={d3Columns}
                texture={texture}
                bumpTexture={bumpTexture || null}
                handlePointerDown={handlePointerDown}
                isDragging={isDragging}
                to3D={to3D}
                from3D={from3D}
                roomDimensions={roomDimensions}
              />

              {/* Render Custom Box Objects */}
              {Object.values(sceneObjects)
                .filter((obj) => obj.type === 'custom_box')
                .map((obj) => (
                  <CustomBoxObject
                    key={obj.id}
                    data={obj}
                    to3D={to3D}
                    from3D={from3D}
                    handlePointerDown={handlePointerDown}
                    isDragging={isDragging}
                    roomDimensions={roomDimensions}
                  />
                ))}

              {/* Render Imported Layout Objects */}
              {Object.values(sceneObjects)
                .filter((obj) => obj.type === 'imported_layout')
                .map((obj) => (
                  <ImportedLayoutObject
                    key={obj.id}
                    data={obj}
                    to3D={to3D}
                    from3D={from3D}
                    handlePointerDown={handlePointerDown}
                    isDragging={isDragging}
                    roomDimensions={roomDimensions}
                  />
                ))}

              {/* Render Clay Model Objects */}
              {Object.values(sceneObjects)
                .filter((obj) => obj.type === 'clay_model')
                .map((obj) => (
                  <ClayModelObject
                    key={obj.id}
                    data={obj}
                    to3D={to3D}
                    from3D={from3D}
                    handlePointerDown={handlePointerDown}
                    isDragging={isDragging}
                    roomDimensions={roomDimensions}
                  />
                ))}
            </>
          )}

          {/* Static Environment Room Shell Geometries */}
          <EnvironmentShell
            roomShapes={roomShapes}
            roomColors={roomColors}
            rWidth={to3D(roomDimensions.width)}
            rDepth={to3D(roomDimensions.depth)}
            rHeight={to3D(roomDimensions.height)}
            layoutTransform={layoutTransform}
            handlePlanePointerMove={handlePlanePointerMove}
            setIsSelected={setIsSelected}
          />



          {/* Orbit Controls to rotate, zoom, and pan */}
          <OrbitControls
            enableRotate={!orthoLock}
            enablePan={!orthoLock} 
            ref={controlsRef}
            target={initialCameraTarget}
            makeDefault 
            enableDamping 
            dampingFactor={0.05} 
            minDistance={1} 
            maxDistance={15} 
            enableZoom={!isCameraDistanceLocked}
            enabled={!isDragging}
            onChange={(e) => {
              if (e && e.target) {
                const controls = e.target;
                const camera = controls.object;
                const target = controls.target;
                if (camera && target) {
                  useAppStore.getState().setLiveCamera(
                    [camera.position.x, camera.position.y, camera.position.z],
                    [target.x, target.y, target.z]
                  );
                }
              }
            }}
          />

          {/* Snapshot render pipeline hook */}
          <WebGLSnapshotHandler controlsRef={controlsRef} />
          <ElevationSnapshotHandler />
        </Canvas>

        {/* Top-Right Horizontal Utility Bar */}
        <div className="absolute top-3 right-3 z-20 flex items-start gap-2 pointer-events-none">
          <ZoomControls3D />
          <ViewportUIControls
            handleResetCamera={handleResetCamera}
            isCameraHeightLocked={isCameraHeightLocked}
            setIsCameraHeightLocked={setIsCameraHeightLocked}
            isCameraDistanceLocked={isCameraDistanceLocked}
            setIsCameraDistanceLocked={setIsCameraDistanceLocked}
            savedCameraFov={savedCameraFov}
            setSavedCameraFov={setSavedCameraFov}
            orthoLock={orthoLock}
            setOrthoLock={setOrthoLock}
          />
        </div>

        {/* Bottom-Left Environment & Rendering Controls */}
        <EnvironmentControls3D
          isLightMode={isLightMode}
          setIsLightMode={setIsLightMode}
          enableRealisticDepth={enableRealisticDepth}
          setEnableRealisticDepth={setEnableRealisticDepth}
        />
      </div>
    </div>
  </div>
  );
};
