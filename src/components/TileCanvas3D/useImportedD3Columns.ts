import React from 'react';
import * as THREE from 'three';
import { getCombinedWallBounds, getTessellatedPath } from '../../utils/geometry';
import { Panel3D, ColumnSegment } from './types';

export function useImportedD3Columns(
  blueprint: any,
  texture: THREE.Texture | null,
  backingTexture: THREE.Texture | null,
  bumpTexture: THREE.Texture | null,
  to3D: (val: number) => number
) {
  const result = React.useMemo(() => {
    if (!blueprint || !texture || !backingTexture) {
      return { columns: [] as ColumnSegment[], rootIdx: 0, totalBottomFlapsHeight: 0, bounds: null };
    }

    const wallWidth = blueprint.wallWidth || 120;
    const wallHeight = blueprint.wallHeight || 96;
    const wallExtensions = blueprint.wallExtensions || [];
    const wallVertices = blueprint.wallVertices || [];
    const foldLines = blueprint.foldLines || [];

    const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);

    // 1. Classify vertical and horizontal folds
    const verticalFoldXs: number[] = [];
    const horizs: { y: number; x1: number; x2: number }[] = [];

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
          } else {
            const y = (vStart.y + vEnd.y) / 2;
            if (y > bounds.minY - 1 && y < bounds.maxY + 1) {
              horizs.push({
                y,
                x1: Math.min(vStart.x, vEnd.x),
                x2: Math.max(vStart.x, vEnd.x),
              });
            }
          }
        }
      }
    }

    const uniqueVerticalXs = Array.from(new Set(verticalFoldXs)).sort((a, b) => a - b);
    const horizontalFolds = horizs;

    // 2. Identify Column horizontal segments [startX, endX]
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

    if (columnsList.length === 0) {
      return { columns: [] as ColumnSegment[], rootIdx: 0, totalBottomFlapsHeight: 0, bounds };
    }

    // 3. Find the root column (the widest segment)
    let rootColIdx = 0;
    let maxColWidth = 0;
    columnsList.forEach((col, i) => {
      if (col.width > maxColWidth) {
        maxColWidth = col.width;
        rootColIdx = i;
      }
    });

    const rootColInfo = columnsList[rootColIdx];

    // Find crossing horizontal folds inside root column's range
    const rootCrossingFolds = horizontalFolds.filter((f) => {
      return Math.max(rootColInfo.startX, f.x1) < Math.min(rootColInfo.endX, f.x2) - 0.5;
    });
    const rootSplitYs = rootCrossingFolds.map((f) => f.y);
    const uniqueRootSplitYs = Array.from(new Set(rootSplitYs)).sort((a, b) => a - b);

    const rootRowIntervals: { startY: number; endY: number; height: number }[] = [];
    let lastRootY = bounds.minY;
    for (const y of uniqueRootSplitYs) {
      if (y > lastRootY) {
        rootRowIntervals.push({ startY: lastRootY, endY: y, height: y - lastRootY });
        lastRootY = y;
      }
    }
    if (lastRootY < bounds.maxY) {
      rootRowIntervals.push({ startY: lastRootY, endY: bounds.maxY, height: bounds.maxY - lastRootY });
    }

    // Main row interval for the root column (find closest to vertical midpoint)
    const midY = bounds.minY + (bounds.height / 2);
    let bestDist = Infinity;
    let rootMainRow = rootRowIntervals[0];
    for (const row of rootRowIntervals) {
      const covers = row.startY <= midY && row.endY >= midY;
      const pMid = row.startY + row.height / 2;
      const dist = covers ? 0 : Math.abs(pMid - midY);
      if (dist < bestDist) {
        bestDist = dist;
        rootMainRow = row;
      }
    }

    const globalStartY = rootMainRow.startY;
    const globalEndY = rootMainRow.endY;
    const globalHeight = globalEndY - globalStartY;

    const colStructures = columnsList.map((col) => {
      let colMinY = Infinity;
      let colMaxY = -Infinity;
      
      if (wallVertices && wallVertices.length >= 3) {
         const tess = getTessellatedPath(wallVertices);
         tess.forEach((v) => {
           if (v.x >= col.startX - 0.1 && v.x <= col.endX + 0.1) {
             colMinY = Math.min(colMinY, v.y);
             colMaxY = Math.max(colMaxY, v.y);
           }
         });
      }

      if (colMinY === Infinity) colMinY = bounds.minY;
      if (colMaxY === -Infinity) colMaxY = bounds.maxY;

      const crossingFolds = horizontalFolds.filter((f) => {
        return Math.max(col.startX, f.x1) < Math.min(col.endX, f.x2) - 0.5;
      });

      const splitYs = crossingFolds.map((f) => f.y);
      splitYs.push(globalStartY);
      splitYs.push(globalEndY);

      const uniqueSplitYs = Array.from(new Set(splitYs))
        .filter(y => y > bounds.minY && y < bounds.maxY)
        .sort((a, b) => a - b);

      const rowIntervals: { startY: number; endY: number; height: number }[] = [];
      let lastY = bounds.minY;
      for (const y of uniqueSplitYs) {
        if (y > lastY) {
          rowIntervals.push({ startY: lastY, endY: y, height: y - lastY });
          lastY = y;
        }
      }
      if (lastY < bounds.maxY) {
        rowIntervals.push({ startY: lastY, endY: bounds.maxY, height: bounds.maxY - lastY });
      }

      const getVerticalFoldAngle = (x: number): number => {
        if (foldLines && wallVertices) {
          for (const fold of foldLines) {
            const vStart = wallVertices[fold.startNodeIndex];
            const vEnd = wallVertices[fold.endNodeIndex];
            if (vStart && vEnd) {
              const isVert = Math.abs(vStart.x - vEnd.x) < Math.abs(vStart.y - vEnd.y);
              if (isVert) {
                const fx = (vStart.x + vEnd.x) / 2;
                if (Math.abs(fx - x) < 1.0) {
                  return fold.foldAngle !== undefined && fold.foldAngle !== null ? fold.foldAngle : 90;
                }
              }
            }
          }
        }
        return 90;
      };

      const getHorizontalFoldAngle = (y: number, startX: number, endX: number): number => {
        if (foldLines && wallVertices) {
          for (const fold of foldLines) {
            const vStart = wallVertices[fold.startNodeIndex];
            const vEnd = wallVertices[fold.endNodeIndex];
            if (vStart && vEnd) {
              const isVert = Math.abs(vStart.x - vEnd.x) < Math.abs(vStart.y - vEnd.y);
              if (!isVert) {
                const fy = (vStart.y + vEnd.y) / 2;
                const xMin = Math.min(vStart.x, vEnd.x);
                const xMax = Math.max(vStart.x, vEnd.x);
                if (Math.abs(fy - y) < 1.0 && Math.max(startX, xMin) < Math.min(endX, xMax) - 0.5) {
                  return fold.foldAngle !== undefined && fold.foldAngle !== null ? fold.foldAngle : 90;
                }
              }
            }
          }
        }
        return 90;
      };

      const createPanel = (startY: number, endY: number, height: number, flapFoldAngle?: number): Panel3D => {
        const tex = texture.clone();
        tex.repeat.set(col.width / bounds.width, height / bounds.height);
        tex.offset.set(
          (col.startX - bounds.minX) / bounds.width,
          (startY - bounds.minY) / bounds.height
        );
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;

        const backTex = backingTexture.clone();
        backTex.repeat.set(col.width / bounds.width, height / bounds.height);
        backTex.offset.set(
          (col.startX - bounds.minX) / bounds.width,
          (startY - bounds.minY) / bounds.height
        );
        backTex.wrapS = THREE.ClampToEdgeWrapping;
        backTex.wrapT = THREE.ClampToEdgeWrapping;
        backTex.needsUpdate = true;

        let bumpedTex: THREE.Texture | undefined = undefined;
        if (bumpTexture) {
          bumpedTex = bumpTexture.clone();
          bumpedTex.repeat.set(col.width / bounds.width, height / bounds.height);
          bumpedTex.offset.set(
            (col.startX - bounds.minX) / bounds.width,
            (startY - bounds.minY) / bounds.height
          );
          bumpedTex.wrapS = THREE.ClampToEdgeWrapping;
          bumpedTex.wrapT = THREE.ClampToEdgeWrapping;
          bumpedTex.needsUpdate = true;
        }

        const pWidth = to3D(col.width);
        const pHeight = to3D(height);
        
        const centerY = (startY + endY) / 2 - (bounds.minY + bounds.height / 2);

        return {
          startX: col.startX,
          startY: startY,
          width: col.width,
          height: height,
          d3Width: pWidth,
          d3Height: pHeight,
          d3CenterY: to3D(centerY),
          texture: tex,
          backingTexture: backTex,
          bumpTexture: bumpedTex,
          foldAngle: flapFoldAngle ?? 90,
        };
      };

      const hasMainOverlap = Math.max(globalStartY, colMinY) < Math.min(globalEndY, colMaxY) - 0.05;
      const mainRow = createPanel(globalStartY, globalEndY, globalHeight);
      if (!hasMainOverlap) {
        mainRow.isGhost = true;
      }
      
      const topFlaps: Panel3D[] = [];
      const bottomFlaps: Panel3D[] = [];

      rowIntervals.forEach((row) => {
        if (row.startY >= globalEndY - 0.01 && row.startY < colMaxY - 0.05) {
          const angle = getHorizontalFoldAngle(row.startY, col.startX, col.endX);
          topFlaps.push(createPanel(row.startY, row.endY, row.height, angle));
        }
        if (row.endY <= globalStartY + 0.01 && row.endY > colMinY + 0.05) {
          const angle = getHorizontalFoldAngle(row.endY, col.startX, col.endX);
          bottomFlaps.push(createPanel(row.startY, row.endY, row.height, angle));
        }
      });

      topFlaps.sort((a, b) => a.startY - b.startY);
      bottomFlaps.sort((a, b) => b.startY - a.startY);

      const leftFoldAngle = getVerticalFoldAngle(col.startX);
      const rightFoldAngle = getVerticalFoldAngle(col.endX);

      return {
        width: col.width,
        d3Width: to3D(col.width),
        mainRow,
        topFlaps,
        bottomFlaps,
        foldAngle: leftFoldAngle,
        rightFoldAngle: rightFoldAngle,
        startX: col.startX,
        endX: col.endX,
      };
    });

    // Compute total bottom flaps height for the root column
    const rootCol = colStructures[rootColIdx];
    let totalBottomFlapsHeight = 0;
    rootCol.bottomFlaps.forEach((f) => {
      totalBottomFlapsHeight += f.d3Height;
    });

    return {
      columns: colStructures,
      rootIdx: rootColIdx,
      totalBottomFlapsHeight,
      bounds,
    };
  }, [blueprint, texture, backingTexture, bumpTexture, to3D]);

  // Clean up texture resources on recreate
  React.useEffect(() => {
    return () => {
      if (result.columns) {
        result.columns.forEach((col) => {
          col.mainRow.texture.dispose();
          col.mainRow.backingTexture.dispose();
          col.mainRow.bumpTexture?.dispose();
          col.topFlaps.forEach((f) => {
            f.texture.dispose();
            f.backingTexture.dispose();
            f.bumpTexture?.dispose();
          });
          col.bottomFlaps.forEach((f) => {
            f.texture.dispose();
            f.backingTexture.dispose();
            f.bumpTexture?.dispose();
          });
        });
      }
    };
  }, [result]);

  return result;
}
