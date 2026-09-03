import React from 'react';
import * as THREE from 'three';
import { Panel3D, ColumnSegment } from './types';
import { getTessellatedPath } from '../../utils/geometry';
import { FoldLine, WallExtension } from '../../types';

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

interface UseD3ColumnsArgs {
  bounds: Bounds;
  foldLines: FoldLine[] | null;
  wallVertices: { x: number; y: number }[] | null;
  wallExtensions: WallExtension[];
  anchoredRegionCenter: { x: number; y: number } | null;
  texture: THREE.Texture | null;
  backingTexture: THREE.Texture | null;
  bumpTexture?: THREE.Texture | null;
  to3D: (val: number) => number;
}

export function useD3Columns({
  bounds,
  foldLines,
  wallVertices,
  wallExtensions,
  anchoredRegionCenter,
  texture,
  backingTexture,
  bumpTexture,
  to3D,
}: UseD3ColumnsArgs) {
  // 1. Classify vertical and horizontal folds
  const { uniqueVerticalXs, horizontalFolds } = React.useMemo(() => {
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

    return {
      uniqueVerticalXs: Array.from(new Set(verticalFoldXs)).sort((a, b) => a - b),
      horizontalFolds: horizs,
    };
  }, [foldLines, wallVertices, bounds]);

  // 2. Identify Column horizontal segments [startX, endX]
  const columnsList = React.useMemo(() => {
    const cols: { startX: number; endX: number; width: number }[] = [];
    let lastX = bounds.minX;
    for (const x of uniqueVerticalXs) {
      if (x > lastX) {
        cols.push({ startX: lastX, endX: x, width: x - lastX });
        lastX = x;
      }
    }
    if (lastX < bounds.maxX) {
      cols.push({ startX: lastX, endX: bounds.maxX, width: bounds.maxX - lastX });
    }
    return cols;
  }, [uniqueVerticalXs, bounds]);

  // 3. Build detailed panels tree, cloning texture with precise UV mappings
  const d3Columns = React.useMemo((): ColumnSegment[] => {
    if (!texture || !backingTexture || columnsList.length === 0) return [];

    // First find the root column (the widest segment)
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

    // Determine the main row interval for the root column
    let rootMainRow = rootRowIntervals[0];

    if (anchoredRegionCenter !== null) {
      // Find the sliced panel that contains or is closest to this saved center coordinate.
      let closestDist = Infinity;
      for (const row of rootRowIntervals) {
        const rowCenterY = row.startY + row.height / 2;
        const contains = anchoredRegionCenter.y >= row.startY && anchoredRegionCenter.y <= row.endY;
        const dist = contains ? 0 : Math.abs(rowCenterY - anchoredRegionCenter.y);
        if (dist < closestDist) {
          closestDist = dist;
          rootMainRow = row;
        }
      }
    } else {
      // Legacy behavior: find row closest to the vertical midpoint
      const midY = bounds.minY + (bounds.height / 2);
      let bestDist = Infinity;
      for (const row of rootRowIntervals) {
        const covers = row.startY <= midY && row.endY >= midY;
        const pMid = row.startY + row.height / 2;
        const dist = covers ? 0 : Math.abs(pMid - midY);
        if (dist < bestDist) {
          bestDist = dist;
          rootMainRow = row;
        }
      }
    }

    const globalStartY = rootMainRow.startY;
    const globalEndY = rootMainRow.endY;
    const globalHeight = globalEndY - globalStartY;

    const colStructures = columnsList.map((col) => {
      // Get physical bounds of this specific column to know where wall actually exists
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
      
      wallExtensions.forEach((ext) => {
        const extMinX = ext.x;
        const extMaxX = ext.x + ext.width;
        if (Math.max(col.startX, extMinX) < Math.min(col.endX, extMaxX) - 0.05) {
          colMinY = Math.min(colMinY, ext.y);
          colMaxY = Math.max(colMaxY, ext.y + ext.height);
        }
      });

      if (colMinY === Infinity) colMinY = bounds.minY;
      if (colMaxY === -Infinity) colMaxY = bounds.maxY;

      // Find crossing horizontal folds inside this column's horizontal range
      const crossingFolds = horizontalFolds.filter((f) => {
        return Math.max(col.startX, f.x1) < Math.min(col.endX, f.x2) - 0.5;
      });

      const splitYs = crossingFolds.map((f) => f.y);
      // Force the global corridors as split points
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

      // Helpers to retrieve dynamic foldAngle for vertical/horizontal folds
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

      // Convert each interval to Panel3D if it has physical overlap with the column wall limits
      const createPanel = (startY: number, endY: number, height: number, flapFoldAngle?: number): Panel3D => {
        const tex = texture.clone();
        tex.colorSpace = texture.colorSpace;
        tex.repeat.set(col.width / bounds.width, height / bounds.height);
        tex.offset.set(
          (col.startX - bounds.minX) / bounds.width,
          (startY - bounds.minY) / bounds.height
        );
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;

        const backTex = backingTexture.clone();
        backTex.colorSpace = backingTexture.colorSpace;
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
          bumpedTex.colorSpace = bumpTexture.colorSpace;
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
        
        // Correct 3D Center Y position mapping (higher Y gets positive offset in 3D)
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

      // Create mainRow covering [globalStartY, globalEndY]
      const hasMainOverlap = Math.max(globalStartY, colMinY) < Math.min(globalEndY, colMaxY) - 0.05;
      const mainRow = createPanel(globalStartY, globalEndY, globalHeight);
      if (!hasMainOverlap) {
        mainRow.isGhost = true;
      }

      // Filter panels to find active top and bottom flaps
      // Since Y increases UPWARD:
      // - Top flaps are above mainRow, i.e., startY >= globalEndY and startY < colMaxY - 0.05
      // - Bottom flaps are below mainRow, i.e., endY <= globalStartY and endY > colMinY + 0.05
      
      const topFlaps: Panel3D[] = [];
      const bottomFlaps: Panel3D[] = [];

      rowIntervals.forEach((row) => {
        // Top flap check
        if (row.startY >= globalEndY - 0.01 && row.startY < colMaxY - 0.05) {
          const angle = getHorizontalFoldAngle(row.startY, col.startX, col.endX);
          topFlaps.push(createPanel(row.startY, row.endY, row.height, angle));
        }
        // Bottom flap check
        if (row.endY <= globalStartY + 0.01 && row.endY > colMinY + 0.05) {
          const angle = getHorizontalFoldAngle(row.endY, col.startX, col.endX);
          bottomFlaps.push(createPanel(row.startY, row.endY, row.height, angle));
        }
      });

      // Sort flaps with the ones closest to the mainRow first
      // Since topFlaps go UPWARD, they are sorted ascending by startY (closest to globalEndY first)
      topFlaps.sort((a, b) => a.startY - b.startY);

      // Since bottomFlaps go DOWNWARD, they are sorted descending by startY (closest to globalStartY first)
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

    return colStructures;
  }, [texture, backingTexture, bumpTexture, columnsList, horizontalFolds, bounds, to3D, wallVertices, wallExtensions]);

  // Clean up texture resources on recreate
  React.useEffect(() => {
    return () => {
      d3Columns.forEach((col) => {
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
    };
  }, [d3Columns]);

  return { d3Columns, horizontalFolds };
}
