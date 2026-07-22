import * as React from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { getCombinedWallBounds } from '../../utils/geometry';

export interface UseDragControllerProps {
  from3D: (val: number) => number;
  d3Columns: any[];
  horizontalFolds: any[];
  roomDimensions: { width: number; height: number; depth: number };
}

export function useDragController({
  from3D,
  d3Columns,
  horizontalFolds,
  roomDimensions,
}: UseDragControllerProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isSelected, setIsSelected] = React.useState(false);
  const dragOffsetRef = React.useRef<{ x: number; y: number; z: number } | null>(null);
  const cachedElevationRef = React.useRef<number>(0);
  const dragButtonRef = React.useRef<number>(0);
  const initialClientYRef = React.useRef<number>(0);
  const initialYInchRef = React.useRef<number>(0);
  const initialXInchRef = React.useRef<number>(0);
  const initialZInchRef = React.useRef<number>(0);

  const handlePointerDown = React.useCallback((e: any, id: string = 'main-tile-layout') => {
    const viewMode = useAppStore.getState().viewMode;
    if (viewMode === 'presentation') return;

    const isWildVisionOpen = useAppStore.getState().isWildVisionOpen;
    if (isWildVisionOpen) return;

    e.stopPropagation();
    setIsSelected(true);
    setIsDragging(true);
    
    // Set active object id
    useAppStore.getState().setActiveObjectId(id);

    const button = e.button !== undefined ? e.button : (e.nativeEvent?.button ?? 0);
    dragButtonRef.current = button;

    const targetObj = useAppStore.getState().sceneObjects[id];
    let currentPos = targetObj ? targetObj.position : [0, 0, 0];
    
    const isTileLayoutInit = id === 'main-tile-layout' || targetObj?.type === 'imported_layout';
    
    if ((targetObj && targetObj.metadata?.isWallLocked) || isTileLayoutInit) {
      const state = useAppStore.getState();
      
      let worldX = currentPos[0];
      let worldY = currentPos[1];
      
      if (isTileLayoutInit) {
        worldX = currentPos[0] - (state.wallWidth / 2);
        worldY = currentPos[1] - (state.wallHeight / 2);
      }
      
      dragOffsetRef.current = {
        x: worldX - from3D(e.point.x),
        y: worldY - from3D(e.point.y),
        z: currentPos[2] - from3D(e.point.z),
      };
    } else {
      dragOffsetRef.current = {
        x: currentPos[0] - from3D(e.point.x),
        y: currentPos[1] - from3D(e.point.y),
        z: currentPos[2] - from3D(e.point.z),
      };
    }

    if (e.nativeEvent) {
      initialClientYRef.current = e.nativeEvent.clientY;
    } else {
      initialClientYRef.current = 0;
    }
    initialYInchRef.current = currentPos[1];
    initialXInchRef.current = currentPos[0];
    initialZInchRef.current = currentPos[2];

    if (targetObj && (targetObj.type === 'custom_box' || targetObj.type === 'clay_model' || targetObj.type === 'imported_layout')) {
      const roomFloorY = -roomDimensions.height / 2;
      cachedElevationRef.current = currentPos[1] - roomFloorY;
    } else {
      cachedElevationRef.current = 0;
    }
  }, [from3D, roomDimensions]);

  const handlePlanePointerMove = React.useCallback((planeKey: string, e: any) => {
    const viewMode = useAppStore.getState().viewMode;
    if (viewMode === 'presentation') return;

    const isWildVisionOpen = useAppStore.getState().isWildVisionOpen;
    if (isWildVisionOpen) return;

    if (!isDragging) return;
    e.stopPropagation();
    
    const activeId = useAppStore.getState().activeObjectId;
    if (!activeId) return;

    const activeObj = useAppStore.getState().sceneObjects[activeId];
    if (!activeObj) return;

    const isShift = e.shiftKey || (e.nativeEvent && e.nativeEvent.shiftKey);
    const isRMB = dragButtonRef.current === 2;

    if (activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout') {
      if (isShift) {
        const clientY = e.nativeEvent?.clientY || 0;
        const deltaYPixels = clientY - initialClientYRef.current;
        const deltaYInch = -deltaYPixels * 0.35;
        const yInch = initialYInchRef.current + deltaYInch;

        const dims = activeObj.metadata?.dimensions || [24, 24, 24];
        const height = dims[1];
        const halfRoomH = roomDimensions.height / 2;
        const halfBoxH = height / 2;

        let finalYInch = Math.max(0, Math.min(halfRoomH - halfBoxH, yInch));
        
        const roomFloorY = -halfRoomH;
        cachedElevationRef.current = finalYInch - roomFloorY;

        useAppStore.getState().updateSceneObject(activeId, {
          position: [initialXInchRef.current, finalYInch, initialZInchRef.current],
          attachedPlane: 'floor',
        });
        return;
      }
    }

    // Convert 3D coordinates back to inches
    let xInch = from3D(e.point.x) + (dragOffsetRef.current?.x || 0);
    let yInch = from3D(e.point.y) + (dragOffsetRef.current?.y || 0);

    if (!isShift && (activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout')) {
      const isTileLayout = activeId === 'main-tile-layout' || activeObj.type === 'imported_layout';
      if (isTileLayout) {
        yInch = activeObj.position[1] - (roomDimensions.height / 2);
      } else {
        yInch = activeObj.position[1];
      }
    }
    let zInch = from3D(e.point.z) + (dragOffsetRef.current?.z || 0);

    const isFreeform = e.ctrlKey || e.metaKey || (e.nativeEvent && (e.nativeEvent.ctrlKey || e.nativeEvent.metaKey));

    const isMainLayout = activeId === 'main-tile-layout';
    const isImportedLayout = activeObj.type === 'imported_layout';
    const isTileLayout = isMainLayout || isImportedLayout;

    if (!isTileLayout && (activeObj.type === 'custom_box' || activeObj.type === 'clay_model')) {
      if (activeObj.metadata?.isWallLocked) {
        const worldDragX = from3D(e.point.x) + (dragOffsetRef.current?.x || 0);
        const worldDragY = from3D(e.point.y) + (dragOffsetRef.current?.y || 0);
        const worldDragZ = from3D(e.point.z) + (dragOffsetRef.current?.z || 0);

        const halfRoomW = roomDimensions.width / 2;
        const halfRoomH = roomDimensions.height / 2;
        const halfRoomD = roomDimensions.depth / 2;

        const halfBoxW = (activeObj.metadata?.dimensions?.[0] || 0) / 2;
        const halfBoxH = (activeObj.metadata?.dimensions?.[1] || 0) / 2;
        const halfBoxD = (activeObj.metadata?.dimensions?.[2] || 0) / 2;

        let finalX = Math.max(-halfRoomW + halfBoxW, Math.min(halfRoomW - halfBoxW, worldDragX));
        let finalY = Math.max(-halfRoomH + halfBoxH, Math.min(halfRoomH - halfBoxH, worldDragY));
        let finalZ = Math.max(-halfRoomD + halfBoxD, Math.min(halfRoomD - halfBoxD, worldDragZ));

        if (activeObj.attachedPlane === 'back') {
          finalZ = -halfRoomD + halfBoxD;
        } else if (activeObj.attachedPlane === 'left') {
          finalX = -halfRoomW + halfBoxW;
        } else if (activeObj.attachedPlane === 'right') {
          finalX = halfRoomW - halfBoxW;
        }

        useAppStore.getState().updateSceneObject(activeId, {
          position: [finalX, finalY, finalZ],
          attachedPlane: activeObj.attachedPlane,
        });
        return;
      }

      // Keep height locked to roomFloorY + cachedElevation
      const roomFloorY = -roomDimensions.height / 2;
      yInch = roomFloorY + cachedElevationRef.current;
      
      const halfRoomH_y = roomDimensions.height / 2;
      const boxH_y = activeObj.metadata?.dimensions?.[1] || 24;
      const halfBoxH_y = boxH_y / 2;
      yInch = Math.max(roomFloorY, Math.min(halfRoomH_y - boxH_y, yInch));

      if (activeObj.type === 'custom_box') {
        const rawX = from3D(e.point.x) + (dragOffsetRef.current?.x || 0);
        const rawZ = from3D(e.point.z) + (dragOffsetRef.current?.z || 0);

        const sceneObjects = useAppStore.getState().sceneObjects;
        const recessedLayouts = Object.values(sceneObjects).filter(
          (obj) => obj.type === 'imported_layout' && (obj.metadata?.recessDepth || 0) > 0
        );

        let closestLayout: any = null;
        let minDistance = Infinity;

        recessedLayouts.forEach((layout) => {
          const dx = rawX - layout.position[0];
          const dz = rawZ - layout.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < minDistance) {
            minDistance = dist;
            closestLayout = layout;
          }
        });

        const threshold = 8;
        const isSnapped = activeObj.metadata?.preSnapDimensions !== undefined;

        if (closestLayout && minDistance <= threshold) {
          const recessDepth = closestLayout.metadata?.recessDepth || 0;
          const layoutDims = closestLayout.metadata?.dimensions || [60, 60, 4];
          const layoutWidth = layoutDims[0];

          let targetX = closestLayout.position[0];
          let targetZ = closestLayout.position[2];

          if (closestLayout.attachedPlane === 'back') {
            targetZ = closestLayout.position[2] - recessDepth / 2;
          } else if (closestLayout.attachedPlane === 'left') {
            targetX = closestLayout.position[0] - recessDepth / 2;
          } else if (closestLayout.attachedPlane === 'right') {
            targetX = closestLayout.position[0] + recessDepth / 2;
          }

          xInch = targetX;
          zInch = targetZ;

          if (!isSnapped) {
            const originalDimensions = activeObj.metadata?.dimensions || [24, 24, 24];
            const originalRotation = activeObj.rotation || [0, 0, 0];
            const snappedDimensions = [...originalDimensions];

            if (closestLayout.attachedPlane === 'back') {
              snappedDimensions[0] = layoutWidth;
              snappedDimensions[2] = recessDepth;
            } else {
              snappedDimensions[0] = recessDepth;
              snappedDimensions[2] = layoutWidth;
            }

            useAppStore.getState().updateSceneObject(activeId, {
              position: [xInch, yInch, zInch],
              rotation: [0, 0, 0],
              attachedPlane: 'floor',
              metadata: {
                ...activeObj.metadata,
                preSnapDimensions: originalDimensions,
                preSnapRotation: originalRotation,
                dimensions: snappedDimensions,
              },
            });
          } else {
            useAppStore.getState().updateSceneObject(activeId, {
              position: [xInch, yInch, zInch],
              rotation: [0, 0, 0],
              attachedPlane: 'floor',
            });
          }
          return;
        } else if (isSnapped) {
          const preSnapDimensions = activeObj.metadata?.preSnapDimensions || [24, 24, 24];
          const preSnapRotation = activeObj.metadata?.preSnapRotation || [0, 0, 0];
          const nextMetadata = { ...activeObj.metadata };
          delete nextMetadata.preSnapDimensions;
          delete nextMetadata.preSnapRotation;
          nextMetadata.dimensions = preSnapDimensions;

          const width = preSnapDimensions[0];
          const depth = preSnapDimensions[2];
          const theta = preSnapRotation[1] || 0;
          const cosT = Math.abs(Math.cos(theta));
          const sinT = Math.abs(Math.sin(theta));
          const effectiveWidth = width * cosT + depth * sinT;
          const effectiveDepth = width * sinT + depth * cosT;
          const halfWidth = effectiveWidth / 2;
          const halfDepth = effectiveDepth / 2;

          const minX = -roomDimensions.width / 2 + halfWidth;
          const maxX = roomDimensions.width / 2 - halfWidth;
          xInch = Math.max(minX, Math.min(maxX, rawX));

          const minZ = -roomDimensions.depth / 2 + halfDepth;
          const maxZ = roomDimensions.depth / 2 - halfDepth;
          zInch = Math.max(minZ, Math.min(maxZ, rawZ));

          useAppStore.getState().updateSceneObject(activeId, {
            position: [xInch, yInch, zInch],
            rotation: preSnapRotation,
            attachedPlane: 'floor',
            metadata: nextMetadata,
          });
          return;
        }
      }

      // Object dimensions
      const dims = activeObj.metadata?.dimensions || [24, 24, 24];
      const width = dims[0];
      const depth = dims[2];

      const theta = activeObj.rotation?.[1] || 0;
      const cosT = Math.abs(Math.cos(theta));
      const sinT = Math.abs(Math.sin(theta));
      const effectiveWidth = width * cosT + depth * sinT;
      const effectiveDepth = width * sinT + depth * cosT;

      const halfWidth = effectiveWidth / 2;
      const halfDepth = effectiveDepth / 2;

      if (!isFreeform) {
        const centerThreshold = 3;
        if (Math.abs(xInch - 0) <= centerThreshold) {
          xInch = 0;
        }
        if (Math.abs(zInch - 0) <= centerThreshold) {
          zInch = 0;
        }
      }

      // Constrain inside room width: [-roomDimensions.width / 2 + halfWidth, roomDimensions.width / 2 - halfWidth]
      const minX = -roomDimensions.width / 2 + halfWidth;
      const maxX = roomDimensions.width / 2 - halfWidth;
      xInch = Math.max(minX, Math.min(maxX, xInch));

      // Constrain inside room depth: [-roomDimensions.depth / 2 + halfDepth, roomDimensions.depth / 2 - halfDepth]
      const minZ = -roomDimensions.depth / 2 + halfDepth;
      const maxZ = roomDimensions.depth / 2 - halfDepth;
      zInch = Math.max(minZ, Math.min(maxZ, zInch));

      useAppStore.getState().updateSceneObject(activeId, {
        position: [xInch, yInch, zInch],
        attachedPlane: 'floor',
      });
      return;
    }

    // 1. Strict Planar Locking (Prevents Z-Fighting with offset Room Shells)
    if (planeKey === 'back') {
      zInch = -roomDimensions.depth / 2;
    } else if (planeKey === 'left') {
      xInch = -roomDimensions.width / 2;
    } else if (planeKey === 'right') {
      xInch = roomDimensions.width / 2;
    } else if (planeKey === 'floor') {
      if (!(activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout')) {
        yInch = -roomDimensions.height / 2;
      }
    } else if (planeKey === 'ceiling') {
      if (!(activeObj.type === 'custom_box' || activeObj.type === 'clay_model' || activeObj.type === 'imported_layout')) {
        yInch = roomDimensions.height / 2;
      }
    }

    if (!isFreeform) {
      const centerThreshold = 3;
      if (planeKey === 'back') {
        if (Math.abs(xInch - 0) <= centerThreshold) xInch = 0;
        if (Math.abs(yInch - 0) <= centerThreshold) yInch = 0;
      } else if (planeKey === 'left' || planeKey === 'right') {
        if (Math.abs(zInch - 0) <= centerThreshold) zInch = 0;
        if (Math.abs(yInch - 0) <= centerThreshold) yInch = 0;
      } else if (planeKey === 'floor' || planeKey === 'ceiling') {
        if (Math.abs(xInch - 0) <= centerThreshold) xInch = 0;
        if (Math.abs(zInch - 0) <= centerThreshold) zInch = 0;
      }
    }

    // Retrieve Structural Data for Tile Layouts
    let bp: any = null;
    if (isMainLayout) {
      const state = useAppStore.getState();
      bp = {
        wallWidth: state.wallWidth,
        wallHeight: state.wallHeight,
        wallExtensions: state.wallExtensions,
        wallVertices: state.wallVertices,
        foldLines: state.foldLines,
      };
    } else if (isImportedLayout) {
      bp = activeObj.metadata?.blueprint;
    }

    if (isTileLayout && bp) {
      const wallWidth = bp.wallWidth || 120;
      const wallHeight = bp.wallHeight || 96;
      const wallExtensions = bp.wallExtensions || [];
      const wallVertices = bp.wallVertices || [];
      const foldLines = bp.foldLines || [];

      const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);

      // Classify vertical folds to find columns
      const verticalFoldXs: number[] = [];
      if (foldLines && wallVertices) {
        for (const fold of foldLines) {
          const vStart = wallVertices[fold.startNodeIndex];
          const vEnd = wallVertices[fold.endNodeIndex];
          if (vStart && vEnd) {
            const isVertical = Math.abs(vStart.x - vEnd.x) < Math.abs(vStart.y - vEnd.y);
            if (isVertical) {
              const x = (vStart.x + vEnd.x) / 2;
              if (x > bounds.minX - 1 && x < bounds.maxX + 1) {
                verticalFoldXs.push(x);
              }
            }
          }
        }
      }
      const uniqueVerticalXs = Array.from(new Set(verticalFoldXs)).sort((a, b) => a - b);

      // Identify Column horizontal segments [startX, endX]
      const columnsList: { startX: number; endX: number; width: number }[] = [];
      let lastX = bounds.minX;
      for (const x of uniqueVerticalXs) {
        if (x > lastX) {
          columnsList.push({ startX: lastX, endX: x, width: x - lastX });
          lastX = x;
        }
      }
      if (lastX < bounds.maxX) {
        columnsList.push({ startX: lastX, endX: bounds.maxX, width: bounds.maxX - lastX });
      }

      // Find root column
      let rootIdx = 0;
      let maxColWidth = 0;
      columnsList.forEach((col, i) => {
        if (col.width > maxColWidth) {
          maxColWidth = col.width;
          rootIdx = i;
        }
      });

      // Calculate local offsets for each joint/edge
      const joint_X: number[] = [];
      const joint_Z: number[] = [];
      const rootColWidth = columnsList[rootIdx]?.width || bounds.width;
      joint_X[rootIdx] = -rootColWidth / 2;
      joint_Z[rootIdx] = 0;
      joint_X[rootIdx + 1] = rootColWidth / 2;
      joint_Z[rootIdx + 1] = 0;

      // Trace rightwards from rootIdx + 1
      let currentAngleRight = 0;
      for (let i = rootIdx + 1; i < columnsList.length; i++) {
        currentAngleRight -= Math.PI / 2;
        const prevX = joint_X[i];
        const prevZ = joint_Z[i];
        const w = columnsList[i].width;
        joint_X[i + 1] = prevX + w * Math.cos(currentAngleRight);
        joint_Z[i + 1] = prevZ + w * Math.sin(currentAngleRight);
      }

      // Trace leftwards from rootIdx - 1
      let currentAngleLeft = 0;
      for (let i = rootIdx - 1; i >= 0; i--) {
        currentAngleLeft += Math.PI / 2;
        const nextX = joint_X[i + 1];
        const nextZ = joint_Z[i + 1];
        const w = columnsList[i].width;
        joint_X[i] = nextX - w * Math.cos(currentAngleLeft);
        joint_Z[i] = nextZ - w * Math.sin(currentAngleLeft);
      }

      // Gather vertical creases and outer edges
      const localXZPoints: { x: number; z: number; isCrease: boolean }[] = [];
      for (let k = 0; k <= columnsList.length; k++) {
        if (joint_X[k] !== undefined && joint_Z[k] !== undefined) {
          localXZPoints.push({
            x: joint_X[k],
            z: joint_Z[k],
            isCrease: k > 0 && k < columnsList.length,
          });
        }
      }

      // Rotate points based on attached wall plane orientation
      let angleY = 0;
      if (planeKey === 'left') angleY = Math.PI / 2;
      else if (planeKey === 'right') angleY = -Math.PI / 2;

      const rotateY = (x: number, z: number, angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
          x: x * cos - z * sin,
          z: x * sin + z * cos
        };
      };

      // Apply Precision Corner Snapping if not holding Freeform key
      if (!isFreeform) {
        const snapThreshold = 1.2; // threshold in inches
        
        let bestXDiff = snapThreshold;
        let snapCorrectionX = 0;

        let bestZDiff = snapThreshold;
        let snapCorrectionZ = 0;

        const leftWallX = -roomDimensions.width / 2;
        const rightWallX = roomDimensions.width / 2;
        const backWallZ = -roomDimensions.depth / 2;
        const frontWallZ = roomDimensions.depth / 2;

        localXZPoints.forEach((pt) => {
          const rot = rotateY(pt.x, pt.z, angleY);
          const globalX = xInch + rot.x;
          const globalZ = zInch + rot.z;

          // Check Left Wall X snap
          const diffLeftX = Math.abs(globalX - leftWallX);
          if (diffLeftX < bestXDiff) {
            bestXDiff = diffLeftX;
            snapCorrectionX = leftWallX - globalX;
          }

          // Check Right Wall X snap
          const diffRightX = Math.abs(globalX - rightWallX);
          if (diffRightX < bestXDiff) {
            bestXDiff = diffRightX;
            snapCorrectionX = rightWallX - globalX;
          }

          // Check Back Wall Z snap
          const diffBackZ = Math.abs(globalZ - backWallZ);
          if (diffBackZ < bestZDiff) {
            bestZDiff = diffBackZ;
            snapCorrectionZ = backWallZ - globalZ;
          }

          // Check Front Wall Z snap
          const diffFrontZ = Math.abs(globalZ - frontWallZ);
          if (diffFrontZ < bestZDiff) {
            bestZDiff = diffFrontZ;
            snapCorrectionZ = frontWallZ - globalZ;
          }
        });

        if (bestXDiff < snapThreshold) {
          xInch += snapCorrectionX;
        }
        if (bestZDiff < snapThreshold) {
          zInch += snapCorrectionZ;
        }
        // Dynamic Bounding Box Lookup
        let box3: THREE.Box3 | null = null;
        let rootScene: THREE.Object3D | null = e.scene || null;
        if (!rootScene && e.object) {
          let curr: THREE.Object3D | null = e.object;
          while (curr) {
            if (curr.type === 'Scene') {
              rootScene = curr;
              break;
            }
            if (!curr.parent) {
              rootScene = curr;
              break;
            }
            curr = curr.parent;
          }
        }

        const worldCurrentPos = [...activeObj.position];
        if (isTileLayout) {
          worldCurrentPos[0] -= roomDimensions.width / 2;
          worldCurrentPos[1] -= roomDimensions.height / 2;
        }

        if (rootScene) {
          const activeGroup = rootScene.getObjectByName(activeId);
          if (activeGroup) {
            box3 = new THREE.Box3().setFromObject(activeGroup);
          }
        }

        // Apply Y Snap (Floor & Ceiling)
        if (planeKey === 'back' || planeKey === 'left' || planeKey === 'right') {
          const floorYVal = -roomDimensions.height / 2;
          const ceilingYVal = roomDimensions.height / 2;
          
          const actualYMinOffset = (box3 && !box3.isEmpty()) ? (from3D(box3.min.y) - worldCurrentPos[1]) : (-bounds.height / 2);
          const actualYMaxOffset = (box3 && !box3.isEmpty()) ? (from3D(box3.max.y) - worldCurrentPos[1]) : (bounds.height / 2);
          
          const globalYBottom = yInch + actualYMinOffset;
          const globalYTop = yInch + actualYMaxOffset;

          let bestYDiff = snapThreshold;
          let snapCorrectionY = 0;

          const diffFloorY = Math.abs(globalYBottom - floorYVal);
          if (diffFloorY < bestYDiff) {
            bestYDiff = diffFloorY;
            snapCorrectionY = floorYVal - globalYBottom;
          }

          const diffCeilingY = Math.abs(globalYTop - ceilingYVal);
          if (diffCeilingY < bestYDiff) {
            bestYDiff = diffCeilingY;
            snapCorrectionY = ceilingYVal - globalYTop;
          }

          if (bestYDiff < snapThreshold) {
            yInch += snapCorrectionY;
          }
        }
      }

      // Constrain layout creases and edges strictly within the Room boundaries using dynamic 3D World-Space Bounding Box
      let box3: THREE.Box3 | null = null;
      let rootScene: THREE.Object3D | null = e.scene || null;
      if (!rootScene && e.object) {
        let curr: THREE.Object3D | null = e.object;
        while (curr) {
          if (curr.type === 'Scene') {
            rootScene = curr;
            break;
          }
          if (!curr.parent) {
            rootScene = curr;
            break;
          }
          curr = curr.parent;
        }
      }

      const worldCurrentPos = [...activeObj.position];
      if (isTileLayout) {
        worldCurrentPos[0] -= roomDimensions.width / 2;
        worldCurrentPos[1] -= roomDimensions.height / 2;
      }

      if (rootScene) {
        const activeGroup = rootScene.getObjectByName(activeId);
        if (activeGroup) {
          box3 = new THREE.Box3().setFromObject(activeGroup);
        }
      }

      if (box3 && !box3.isEmpty()) {
        const minXInch = from3D(box3.min.x);
        const maxXInch = from3D(box3.max.x);
        const minYInch = from3D(box3.min.y);
        const maxYInch = from3D(box3.max.y);
        const minZInch = from3D(box3.min.z);
        const maxZInch = from3D(box3.max.z);

        // Compute relative offsets of the bounding box relative to the object's current position
        const offsetXMin = minXInch - worldCurrentPos[0];
        const offsetXMax = maxXInch - worldCurrentPos[0];
        const offsetYMin = minYInch - worldCurrentPos[1];
        const offsetYMax = maxYInch - worldCurrentPos[1];
        const offsetZMin = minZInch - worldCurrentPos[2];
        const offsetZMax = maxZInch - worldCurrentPos[2];

        const leftWallX = -roomDimensions.width / 2;
        const rightWallX = roomDimensions.width / 2;
        const backWallZ = -roomDimensions.depth / 2;
        const frontWallZ = roomDimensions.depth / 2;
        const floorYVal = -roomDimensions.height / 2;
        const ceilingYVal = roomDimensions.height / 2;

        // X containment
        if (planeKey === 'back' || planeKey === 'floor' || planeKey === 'ceiling') {
          const sizeX = offsetXMax - offsetXMin;
          if (sizeX <= roomDimensions.width) {
            if (xInch + offsetXMin < leftWallX) {
              xInch = leftWallX - offsetXMin;
            } else if (xInch + offsetXMax > rightWallX) {
              xInch = rightWallX - offsetXMax;
            }
          } else {
            // Allows movement inward toward the center if it ever exceeds room boundaries rather than freezing
            xInch = Math.max(leftWallX, Math.min(rightWallX, xInch));
          }
        }

        // Z containment
        if (planeKey === 'left' || planeKey === 'right' || planeKey === 'floor' || planeKey === 'ceiling') {
          const sizeZ = offsetZMax - offsetZMin;
          if (sizeZ <= roomDimensions.depth) {
            if (zInch + offsetZMin < backWallZ) {
              zInch = backWallZ - offsetZMin;
            } else if (zInch + offsetZMax > frontWallZ) {
              zInch = frontWallZ - offsetZMax;
            }
          } else {
            // Allows movement inward toward the center rather than freezing
            zInch = Math.max(backWallZ, Math.min(frontWallZ, zInch));
          }
        }

        // Y containment
        const sizeY = offsetYMax - offsetYMin;
        if (sizeY <= roomDimensions.height) {
          if (yInch + offsetYMin < floorYVal) {
            yInch = floorYVal - offsetYMin;
          } else if (yInch + offsetYMax > ceilingYVal) {
            yInch = ceilingYVal - offsetYMax;
          }
        } else {
          yInch = Math.max(floorYVal, Math.min(ceilingYVal, yInch));
        }
      } else {
        // Fallback to static calculations if Box3 is not available
        let minGlobalX = Infinity;
        let maxGlobalX = -Infinity;
        let minGlobalZ = Infinity;
        let maxGlobalZ = -Infinity;

        localXZPoints.forEach((pt) => {
          const rot = rotateY(pt.x, pt.z, angleY);
          const globalX = xInch + rot.x;
          const globalZ = zInch + rot.z;
          minGlobalX = Math.min(minGlobalX, globalX);
          maxGlobalX = Math.max(maxGlobalX, globalX);
          minGlobalZ = Math.min(minGlobalZ, globalZ);
          maxGlobalZ = Math.max(maxGlobalZ, globalZ);
        });

        const leftWallX = -roomDimensions.width / 2;
        const rightWallX = roomDimensions.width / 2;
        const backWallZ = -roomDimensions.depth / 2;
        const frontWallZ = roomDimensions.depth / 2;

        if (planeKey === 'back' || planeKey === 'floor' || planeKey === 'ceiling') {
          if (minGlobalX < leftWallX) {
            xInch += (leftWallX - minGlobalX);
          }
          if (maxGlobalX > rightWallX) {
            xInch += (rightWallX - maxGlobalX);
          }
        }
        if (planeKey === 'left' || planeKey === 'right' || planeKey === 'floor' || planeKey === 'ceiling') {
          if (minGlobalZ < backWallZ) {
            zInch += (backWallZ - minGlobalZ);
          }
          if (maxGlobalZ > frontWallZ) {
            zInch += (frontWallZ - maxGlobalZ);
          }
        }

        const minY = -roomDimensions.height / 2 + bounds.height / 2;
        const maxY = roomDimensions.height / 2 - bounds.height / 2;
        yInch = Math.max(minY, Math.min(maxY, yInch));
      }
    }

    let storeX = xInch;
    let storeY = yInch;
    
    if (isTileLayout) {
      storeX = xInch - (-(roomDimensions.width / 2));
      storeY = yInch - (-(roomDimensions.height / 2));
      storeY = Math.max(0, storeY);
    }

    useAppStore.getState().updateSceneObject(activeId, {
      position: [storeX, storeY, zInch],
      attachedPlane: planeKey as any,
    });
  }, [isDragging, from3D, d3Columns, horizontalFolds, roomDimensions]);

  React.useEffect(() => {
    if (!isDragging) return;

    const handleGlobalUp = () => {
      setIsDragging(false);
      dragOffsetRef.current = null;
      dragButtonRef.current = 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const activeId = useAppStore.getState().activeObjectId;
        if (!activeId) return;

        const activeObj = useAppStore.getState().sceneObjects[activeId];
        if (!activeObj) return;

        if (activeId === 'main-tile-layout' || activeObj.type === 'imported_layout') {
          const currentAnchor = activeObj.metadata?.mountAnchor || 'back';
          const nextAnchor = currentAnchor === 'back' ? 'front' : 'back';
          
          useAppStore.getState().updateSceneObject(activeId, (prev) => ({
            metadata: {
              ...prev.metadata,
              mountAnchor: nextAnchor,
            }
          }));
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging]);

  return {
    isDragging,
    isSelected,
    setIsSelected,
    handlePointerDown,
    handlePlanePointerMove,
  };
}
