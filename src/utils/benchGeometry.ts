import { SubArea, WallExtension, FoldLine, BenchExposedSides, BenchAreaDimensions, BenchWallConnections } from '../types';

export interface BenchWallConnectionsOptions {
  subArea: SubArea;
  wallWidth: number;
  wallHeight: number;
  wallExtensions?: WallExtension[];
  foldLines?: FoldLine[];
  wallVertices?: { x: number; y: number; isCurveNode?: boolean }[];
  tolerance?: number;
}

/**
 * Evaluates a bench / shelf sub-area against room geometry, fold lines, and wall extensions
 * to determine which adjacent walls it touches and which sides are exposed.
 */
export function detectBenchWallConnections(options: BenchWallConnectionsOptions): BenchWallConnections {
  const {
    subArea,
    wallWidth,
    wallHeight,
    wallExtensions = [],
    foldLines = [],
    wallVertices = [],
    tolerance = 0.5 // Default half-unit snap tolerance
  } = options;

  const benchX = subArea.x ?? 0;
  const benchY = subArea.y ?? 0;
  const benchW = subArea.width ?? 0;
  const benchH = subArea.height ?? 0;
  const benchDepth = subArea.depth || 18; // Default 18-inch depth if unset

  const benchRight = benchX + benchW;
  const benchBottom = benchY + benchH;

  // 1. Back wall: Wall-anchored sub-areas are always connected to the parent wall behind them
  const touchesBackWall = true;

  // 2. Identify vertical fold lines (which create left/center/right wall returns)
  const verticalFoldXs: number[] = [];
  const horizontalFoldYs: number[] = [];

  if (foldLines && wallVertices && wallVertices.length > 0) {
    for (const fold of foldLines) {
      const vStart = wallVertices[fold.startNodeIndex];
      const vEnd = wallVertices[fold.endNodeIndex];
      if (vStart && vEnd) {
        const isVertical = Math.abs(vStart.x - vEnd.x) < Math.abs(vStart.y - vEnd.y);
        if (isVertical) {
          verticalFoldXs.push((vStart.x + vEnd.x) / 2);
        } else {
          horizontalFoldYs.push((vStart.y + vEnd.y) / 2);
        }
      }
    }
  }

  // 3. Detect Left Wall Connection:
  // - Either flush with the left canvas boundary (x <= tolerance) AND a left wall extension or left panel exists
  // - OR flush with an internal vertical fold line that folds into an adjacent left wall
  let touchesLeftWall = false;

  // Check canvas left boundary
  const hasLeftExtension = wallExtensions.some(ext => (ext.x + ext.width) <= tolerance || ext.x < 0);
  const hasLeftPanel = verticalFoldXs.some(fx => fx > benchX + tolerance);

  if (benchX <= tolerance) {
    if (hasLeftExtension || hasLeftPanel || verticalFoldXs.length > 0) {
      touchesLeftWall = true;
    }
  }

  // Check internal vertical fold lines
  if (!touchesLeftWall) {
    for (const fx of verticalFoldXs) {
      if (Math.abs(benchX - fx) <= tolerance) {
        touchesLeftWall = true;
        break;
      }
    }
  }

  // 4. Detect Right Wall Connection:
  // - Either flush with the right canvas boundary (x + w >= wallWidth - tolerance) AND a right wall extension exists
  // - OR flush with an internal vertical fold line that folds into an adjacent right wall
  let touchesRightWall = false;

  const hasRightExtension = wallExtensions.some(ext => ext.x >= wallWidth - tolerance);
  const hasRightPanel = verticalFoldXs.some(fx => fx < benchRight - tolerance);

  if (benchRight >= wallWidth - tolerance) {
    if (hasRightExtension || hasRightPanel || verticalFoldXs.length > 0) {
      touchesRightWall = true;
    }
  }

  // Check internal vertical fold lines
  if (!touchesRightWall) {
    for (const fx of verticalFoldXs) {
      if (Math.abs(benchRight - fx) <= tolerance) {
        touchesRightWall = true;
        break;
      }
    }
  }

  // 5. Detect Floor Connection:
  // - Sits on a bottom fold line or touches the bottom floor fold (y + h >= wallHeight - tolerance or y is near horizontal fold)
  let touchesFloor = false;

  if (benchBottom >= wallHeight - tolerance || benchY <= tolerance) {
    touchesFloor = true;
  }

  if (!touchesFloor) {
    for (const fy of horizontalFoldYs) {
      if (Math.abs(benchY - fy) <= tolerance || Math.abs(benchBottom - fy) <= tolerance) {
        touchesFloor = true;
        break;
      }
    }
  }

  // 6. Calculate Wall Count & Configuration
  let connectedWallCount: 1 | 2 | 3 = 1;
  let configuration: 'alcove' | 'corner_left' | 'corner_right' | 'freestanding' = 'freestanding';
  let configurationLabel = 'Freestanding (2 Exposed Ends)';

  if (touchesLeftWall && touchesRightWall) {
    connectedWallCount = 3;
    configuration = 'alcove';
    configurationLabel = 'Alcove (3 Walls Connected - 0 Exposed Ends)';
  } else if (touchesLeftWall) {
    connectedWallCount = 2;
    configuration = 'corner_left';
    configurationLabel = 'Corner Bench (Left Wall Connected - 1 Exposed End)';
  } else if (touchesRightWall) {
    connectedWallCount = 2;
    configuration = 'corner_right';
    configurationLabel = 'Corner Bench (Right Wall Connected - 1 Exposed End)';
  }

  // 7. Calculate Exposed Sides
  const exposedSides: BenchExposedSides = {
    left: !touchesLeftWall,
    right: !touchesRightWall,
    front: true, // Front skirt is always exposed
    top: true,   // Top seat is always exposed
    bottom: !touchesFloor // Exposed underside if floating
  };

  const exposedEndCount = (exposedSides.left ? 1 : 0) + (exposedSides.right ? 1 : 0);

  // 8. Surface Area & Linear Edge Calculations (in active canvas units, e.g. sq. inches)
  const topArea = benchW * benchDepth;
  const frontArea = benchW * benchH;
  const leftEndArea = exposedSides.left ? benchDepth * benchH : 0;
  const rightEndArea = exposedSides.right ? benchDepth * benchH : 0;
  const bottomArea = exposedSides.bottom ? benchW * benchDepth : 0;

  const totalSurfaceArea = topArea + frontArea + leftEndArea + rightEndArea + bottomArea;

  // Linear edge trim footage for top perimeter & exposed vertical edges (in feet if unit is inches)
  // Front edge (W) + exposed side top edges (Depth * exposedCount) + exposed vertical corner edges (Height * exposedCount)
  const totalEdgeInches = benchW + (benchDepth * exposedEndCount) + (benchH * exposedEndCount);
  const exposedLinearEdgeFeet = totalEdgeInches / 12;

  const dimensions: BenchAreaDimensions = {
    topArea,
    frontArea,
    leftEndArea,
    rightEndArea,
    bottomArea,
    totalSurfaceArea,
    exposedLinearEdgeFeet
  };

  return {
    touchesBackWall,
    touchesLeftWall,
    touchesRightWall,
    touchesFloor,
    connectedWallCount,
    configuration,
    configurationLabel,
    exposedSides,
    exposedEndCount,
    dimensions
  };
}
