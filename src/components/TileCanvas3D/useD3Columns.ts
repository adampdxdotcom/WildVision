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
  subAreas?: any[];
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
  subAreas,
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

    // First find the root column (the central column with largest wall area & fold connectivity)
    let rootColIdx = 0;
    let bestColScore = -Infinity;

    const getColumnPhysicalBounds = (colStartX: number, colEndX: number): { colMinY: number; colMaxY: number } => {
      let cMinY = Infinity;
      let cMaxY = -Infinity;

      if (wallVertices && wallVertices.length >= 3) {
        const tess = getTessellatedPath(wallVertices);
        // Sample interior points of the column to avoid edge-vertex contamination from adjacent taller or shorter walls
        const sampleXs = [
          colStartX + 0.1,
          (colStartX + colEndX) / 2,
          colEndX - 0.1
        ];

        sampleXs.forEach((sx) => {
          for (let i = 0; i < tess.length; i++) {
            const p1 = tess[i];
            const p2 = tess[(i + 1) % tess.length];
            const minX = Math.min(p1.x, p2.x);
            const maxX = Math.max(p1.x, p2.x);
            if (sx >= minX - 0.001 && sx <= maxX + 0.001 && Math.abs(p2.x - p1.x) > 0.001) {
              const t = (sx - p1.x) / (p2.x - p1.x);
              if (t >= -0.001 && t <= 1.001) {
                const y = p1.y + t * (p2.y - p1.y);
                cMinY = Math.min(cMinY, y);
                cMaxY = Math.max(cMaxY, y);
              }
            }
          }
        });

        // Also check any vertices strictly within the column interior
        tess.forEach((v) => {
          if (v.x > colStartX + 0.05 && v.x < colEndX - 0.05) {
            cMinY = Math.min(cMinY, v.y);
            cMaxY = Math.max(cMaxY, v.y);
          }
        });
      }

      wallExtensions.forEach((ext) => {
        const extMinX = ext.x;
        const extMaxX = ext.x + ext.width;
        if (Math.max(colStartX, extMinX) < Math.min(colEndX, extMaxX) - 0.05) {
          cMinY = Math.min(cMinY, ext.y);
          cMaxY = Math.max(cMaxY, ext.y + ext.height);
        }
      });

      if (cMinY === Infinity) cMinY = bounds.minY;
      if (cMaxY === -Infinity) cMaxY = bounds.maxY;

      // Also account for cutout subAreas that span this column
      if (subAreas && subAreas.length > 0) {
        const colWidth = colEndX - colStartX;
        subAreas.forEach((sa) => {
          const isCutout = sa.isCutout || sa.accentType === 'cutout';
          if (!isCutout) return;
          const overlapMinX = Math.max(colStartX, sa.x);
          const overlapMaxX = Math.min(colEndX, sa.x + sa.width);
          // If cutout covers most/all of this column horizontally:
          if (overlapMaxX - overlapMinX > colWidth * 0.7) {
            // If cutout touches top of column:
            if (sa.y + sa.height >= cMaxY - 0.5) {
              cMaxY = Math.min(cMaxY, sa.y);
            }
            // If cutout touches bottom of column:
            if (sa.y <= cMinY + 0.5) {
              cMinY = Math.max(cMinY, sa.y + sa.height);
            }
          }
        });
      }

      return { colMinY: cMinY, colMaxY: cMaxY };
    };

    columnsList.forEach((col, i) => {
      const { colMinY: cMinY, colMaxY: cMaxY } = getColumnPhysicalBounds(col.startX, col.endX);
      const physicalHeight = Math.max(0, cMaxY - cMinY);
      const colArea = col.width * physicalHeight;
      // Centrality preference: columns closer to horizontal midpoint of layout get a subtle bonus
      const midLayoutX = bounds.minX + bounds.width / 2;
      const colMidX = col.startX + col.width / 2;
      const distFromCenter = Math.abs(colMidX - midLayoutX);
      const score = colArea - distFromCenter * 2;

      if (score > bestColScore) {
        bestColScore = score;
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
      if (y > lastRootY + 0.01) {
        rootRowIntervals.push({ startY: lastRootY, endY: y, height: y - lastRootY });
        lastRootY = y;
      }
    }
    if (lastRootY < bounds.maxY - 0.01) {
      rootRowIntervals.push({ startY: lastRootY, endY: bounds.maxY, height: bounds.maxY - lastRootY });
    }

    // Determine the main row interval for the root column (the primary back wall)
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
      // Automatic detection: the primary back wall is the interval with the largest vertical height in the root column
      let maxHeight = -Infinity;
      for (const row of rootRowIntervals) {
        if (row.height > maxHeight) {
          maxHeight = row.height;
          rootMainRow = row;
        }
      }
    }

    const globalStartY = rootMainRow.startY;
    const globalEndY = rootMainRow.endY;
    const globalHeight = globalEndY - globalStartY;

    const colStructures = columnsList.map((col, colIdx) => {
      const isRoot = colIdx === rootColIdx;
      // Get physical bounds of this specific column to know where wall actually exists
      const { colMinY, colMaxY } = getColumnPhysicalBounds(col.startX, col.endX);

      // Find crossing horizontal folds inside this column's horizontal range
      const crossingFolds = horizontalFolds.filter((f) => {
        return Math.max(col.startX, f.x1) < Math.min(col.endX, f.x2) - 0.5;
      });

      let colMainStartY = colMinY;
      let colMainEndY = colMaxY;
      let colMainHeight = Math.max(0, colMaxY - colMinY);
      let hasMainOverlap = colMainHeight > 0.05;
      let rowIntervals: { startY: number; endY: number; height: number }[] = [];

      if (isRoot) {
        rowIntervals = rootRowIntervals;
        colMainStartY = rootMainRow.startY;
        colMainEndY = rootMainRow.endY;
        colMainHeight = rootMainRow.height;
        hasMainOverlap = true;
      } else if (crossingFolds.length === 0) {
        // No horizontal fold lines inside this side wall column -> single solid wall panel
        rowIntervals = [{ startY: colMinY, endY: colMaxY, height: colMainHeight }];
        colMainStartY = colMinY;
        colMainEndY = colMaxY;
        hasMainOverlap = colMainHeight > 0.05;
      } else {
        // Only slice at explicit horizontal fold lines that cross this column
        const splitYs = crossingFolds
          .map((f) => f.y)
          .filter((y) => y > colMinY + 0.01 && y < colMaxY - 0.01);
        const uniqueSplitYs = Array.from(new Set(splitYs)).sort((a, b) => a - b);

        let lastY = colMinY;
        for (const y of uniqueSplitYs) {
          if (y > lastY + 0.01) {
            rowIntervals.push({ startY: lastY, endY: y, height: y - lastY });
            lastY = y;
          }
        }
        if (lastY < colMaxY - 0.01) {
          rowIntervals.push({ startY: lastY, endY: colMaxY, height: colMaxY - lastY });
        }

        // Find the interval that best corresponds with the global main wall
        let bestOverlap = -1;
        let chosenRow = rowIntervals[0];
        for (const row of rowIntervals) {
          const overlap = Math.max(0, Math.min(row.endY, globalEndY) - Math.max(row.startY, globalStartY));
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            chosenRow = row;
          }
        }
        if (bestOverlap <= 0.01 && rowIntervals.length > 0) {
          let maxH = -1;
          for (const row of rowIntervals) {
            if (row.height > maxH) {
              maxH = row.height;
              chosenRow = row;
            }
          }
        }
        if (chosenRow) {
          colMainStartY = chosenRow.startY;
          colMainEndY = chosenRow.endY;
          colMainHeight = chosenRow.height;
          hasMainOverlap = colMainHeight > 0.05;
        }
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

      // Create mainRow covering this column's main base wall [colMainStartY, colMainEndY]
      const mainRow = createPanel(colMainStartY, colMainEndY, colMainHeight);
      if (!hasMainOverlap) {
        mainRow.isGhost = true;
      }

      // Filter panels to find active top and bottom flaps
      // Since Y increases UPWARD:
      // - Top flaps are above mainRow, i.e., startY >= colMainEndY and startY < colMaxY - 0.05
      // - Bottom flaps are below mainRow, i.e., endY <= colMainStartY and endY > colMinY + 0.05
      
      const topFlaps: Panel3D[] = [];
      const bottomFlaps: Panel3D[] = [];

      rowIntervals.forEach((row) => {
        // Top flap check: must be above mainRow and within this column's physical wall bounds
        if (row.startY >= colMainEndY - 0.01 && row.endY <= colMaxY + 0.05 && row.startY < colMaxY - 0.05) {
          const angle = getHorizontalFoldAngle(row.startY, col.startX, col.endX);
          topFlaps.push(createPanel(row.startY, row.endY, row.height, angle));
        }
        // Bottom flap check: must be below mainRow and within this column's physical wall bounds
        if (row.endY <= colMainStartY + 0.01 && row.startY >= colMinY - 0.05 && row.endY > colMinY + 0.05) {
          const angle = getHorizontalFoldAngle(row.endY, col.startX, col.endX);
          bottomFlaps.push(createPanel(row.startY, row.endY, row.height, angle));
        }
      });

      // Sort flaps with the ones closest to the mainRow first
      // Since topFlaps go UPWARD, they are sorted ascending by startY (closest to colMainEndY first)
      topFlaps.sort((a, b) => a.startY - b.startY);

      // Since bottomFlaps go DOWNWARD, they are sorted descending by startY (closest to colMainStartY first)
      bottomFlaps.sort((a, b) => b.startY - a.startY);

      // Determine freestanding framing & cap properties:
      // A panel is freestanding if its top is below the global wall height (e.g. pony wall) or it's an outer return.
      const isColFreestandingTop = colMaxY < bounds.maxY - 0.5;
      const isLeftmostCol = col.startX <= bounds.minX + 0.1;
      const isRightmostCol = col.endX >= bounds.maxX - 0.1;

      if (!mainRow.isGhost) {
        if (isColFreestandingTop && topFlaps.length === 0) {
          mainRow.hasFramingExtrusion = true;
          mainRow.hasTopCap = true;
        }
        if (isLeftmostCol) {
          mainRow.hasLeftEndCap = true;
        }
        if (isRightmostCol) {
          mainRow.hasRightEndCap = true;
        }
      }

      // If top flaps exist and the topmost flap ends below bounds.maxY, it gets a top cap
      if (topFlaps.length > 0) {
        const topMostFlap = topFlaps[topFlaps.length - 1];
        if (topMostFlap.startY + topMostFlap.height < bounds.maxY - 0.5) {
          topMostFlap.hasFramingExtrusion = true;
          topMostFlap.hasTopCap = true;
        }
      }

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
        isRoot: isRoot,
      };
    });

    const activeCols = colStructures.filter(
      (col) => !(col.mainRow.isGhost && col.topFlaps.length === 0 && col.bottomFlaps.length === 0)
    );

    return activeCols.length > 0 ? activeCols : colStructures;
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
