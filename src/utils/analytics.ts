import { TileShape, RectanglePattern, AreaReport, SubArea, ComprehensiveReport, WallExtension, BorderConfig } from '../types';
import { generateTiles } from './generator';
import { getTrueArea, getPolygonArea, getTessellatedPath, isPointInPolygon, clipPolygon } from './geometry';
import { useAppStore } from '../store/useAppStore';


interface ComputeStatsParams {
  wallWidth: number;
  wallHeight: number;
  shape: TileShape;
  tileWidth: number;
  tileHeight: number;
  pattern: RectanglePattern;
  groutWidth: number;
  offsetX: number;
  offsetY: number;
  subAreas?: SubArea[];
  angle?: number;
  extensions?: WallExtension[];
  isBlankCanvasMode?: boolean;
  wallBoundaryShape?: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  wallArchHeight?: number;
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  wallArchDepth?: number;
  wallAngle?: number;
  border?: BorderConfig;
  isCutout?: boolean;
  activeCustomPattern?: any;
  flatsketVerticalRows?: number;
  flatsketHorizontalRows?: number;
  isPicket?: boolean;
  picketLength?: number;
  wallVertices?: {x: number, y: number}[];
  reuseCuts?: boolean;
}

/**
 * Sweeps the procedurally generated tiled layout within the bounds of the wall and extensions,
 * then evaluates custom collision overlap algorithms to count full vs. cut tiles.
 * Supports running offsets, herringbone layouts, circles/hexagons, and diagonal angles of rotation.
 * 
 * @param {ComputeStatsParams} params - The layout parameters.
 * @param {number} params.wallWidth - The width of the main wall.
 * @param {number} params.wallHeight - The height of the main wall.
 * @param {TileShape} params.shape - Tile shape identifier.
 * @param {number} params.tileWidth - Base width of a single tile.
 * @param {number} params.tileHeight - Base height of a single tile.
 * @param {RectanglePattern} params.pattern - Tile arrangement pattern.
 * @param {number} params.groutWidth - Width of the grout joint.
 * @param {number} params.offsetX - X displacement translation offset.
 * @param {number} params.offsetY - Y displacement translation offset.
 * @param {SubArea[]} [params.subAreas] - Draggable custom accent/niche areas.
 * @param {number} [params.angle=0] - Tiling layout rotation angle in degrees.
 * @param {WallExtension[]} [params.extensions] - Dynamic wall boundary extension segments.
 * @param {boolean} [params.isBlankCanvasMode] - If true, treats the background as empty.
 * @returns {AreaReport} Object containing calculated metrics and tile counters.
 */
export function calculateBorderInfo(
  width: number,
  height: number,
  borderConfig?: BorderConfig,
  isCutout: boolean = false
) {
  if (!borderConfig || !borderConfig.enabled) {
    return { area: 0, tilesNeeded: 0 };
  }
  
  const thickness = Math.min(borderConfig.tileWidth, borderConfig.tileHeight);
  const totalArea = width * height;
  
  let borderArea = 0;
  if (isCutout) {
    // Outset
    const outerW = width + 2 * thickness;
    const outerH = height + 2 * thickness;
    borderArea = (outerW * outerH) - totalArea;
  } else {
    // Inset
    const innerW = Math.max(0, width - 2 * thickness);
    const innerH = Math.max(0, height - 2 * thickness);
    borderArea = totalArea - (innerW * innerH);
  }
  
  const singleBorderTileArea = borderConfig.tileWidth * borderConfig.tileHeight;
  const tilesNeeded = Math.ceil(borderArea / singleBorderTileArea);
  
  return { area: borderArea, tilesNeeded };
}

export function computeTileStatistics(params: ComputeStatsParams): AreaReport {
  const {
    wallWidth,
    wallHeight,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    offsetX,
    offsetY,
    subAreas: rawSubAreas,
    angle = 0,
    extensions,
    isBlankCanvasMode,
    border: wallBorder,
    isCutout,
    isPicket = false,
    picketLength = 8,
    wallVertices,
    activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
  } = params;

  const subAreas = rawSubAreas?.filter((sa) => sa.visible !== false);
  const layoutId = (params as any).layoutId || 'main';

  const state = useAppStore.getState();
  const reuseCuts = params.reuseCuts ?? state.reuseCuts;
  const isSubArea = layoutId !== 'main';
  const sa = isSubArea ? state.subAreas.find(s => s.id === layoutId) : null;
  const tileColors = isSubArea ? (sa?.tileColors || state.tileColors || []) : (state.tileColors || []);
  const colorPattern = isSubArea ? (sa?.colorPattern || state.colorPattern) : state.colorPattern;
  const tileColorOverrides = state.tileColorOverrides || {};

  const groups: { [color: string]: { count: number; area: number; strictCutCount?: number; fractionalCutCount?: number; fullCount?: number } } = {};
  let totalVisibleTilesCount = 0;

  // Initialize report
  const report: AreaReport = {
    totalTilesUsed: 0,
    fullTilesCount: 0,
    cutTilesCount: 0,
    primaryPieceCount: 0,
    secondaryPieceCount: 0,
  };

  if (wallBorder && wallBorder.enabled) {
    const borderInfo = calculateBorderInfo(wallWidth, wallHeight, wallBorder, isCutout);
    report.borderArea = borderInfo.area;
    report.borderTilesNeeded = borderInfo.tilesNeeded;
    report.borderTileName = wallBorder.tileName;
  }

  if (isBlankCanvasMode) {
    return report;
  }

  const tiles = generateTiles({
    wallWidth,
    wallHeight,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    offsetX,
    offsetY,
    angle,
    extensions,
    isPicket,
    picketLength,
    wallVertices,
    activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
    layoutId: 'main',
  });

  const isInsideWall = (px: number, py: number) => {
    let insidePolygon = false;
    if (wallVertices && wallVertices.length >= 3) {
      let j = wallVertices.length - 1;
      for (let i = 0; i < wallVertices.length; i++) {
        if ((wallVertices[i].y > py) !== (wallVertices[j].y > py) &&
            px < (wallVertices[j].x - wallVertices[i].x) * (py - wallVertices[i].y) / (wallVertices[j].y - wallVertices[i].y) + wallVertices[i].x) {
          insidePolygon = !insidePolygon;
        }
        j = i;
      }
      return insidePolygon;
    }

    if (px >= 0 && px <= wallWidth && py >= 0 && py <= wallHeight) {
      return true;
    }
    if (extensions) {
      for (const ext of extensions) {
        if (px >= ext.x && px <= ext.x + ext.width && py >= ext.y && py <= ext.y + ext.height) {
          return true;
        }
      }
    }
    return false;
  };

  let wallMinX = 0;
  let wallMaxX = wallWidth;
  let wallMinY = 0;
  let wallMaxY = wallHeight;

  if (wallVertices && wallVertices.length >= 3) {
    wallMinX = Math.min(...wallVertices.map(v => v.x));
    wallMaxX = Math.max(...wallVertices.map(v => v.x));
    wallMinY = Math.min(...wallVertices.map(v => v.y));
    wallMaxY = Math.max(...wallVertices.map(v => v.y));
  }

  // Pre-calculate tessellated paths for all sub-areas that have custom polygon shapes
  const subAreaTessellatedMap = new Map<string, { x: number; y: number }[]>();
  if (subAreas && subAreas.length > 0) {
    for (const sa of subAreas) {
      if (sa.vertices && sa.vertices.length >= 3) {
        subAreaTessellatedMap.set(sa.id, getTessellatedPath(sa.vertices));
      }
    }
  }

  // Iterate over final candidate tiles
  for (const tile of tiles) {
    const xs = tile.vertices.map((v) => v.x);
    const ys = tile.vertices.map((v) => v.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    let overlapsActiveShape = (xMin < wallMaxX && xMax > wallMinX && yMin < wallMaxY && yMax > wallMinY);
    if (!overlapsActiveShape && extensions && extensions.length > 0) {
      for (const ext of extensions) {
        if (xMin < ext.x + ext.width && xMax > ext.x && yMin < ext.y + ext.height && yMax > ext.y) {
          overlapsActiveShape = true;
          break;
        }
      }
    }

    if (overlapsActiveShape) {
      let completelyInsideSubArea = false;
      let cutBySubArea = false;
      let minSubAreaCutRatioX = 1.0;
      let minSubAreaCutRatioY = 1.0;

      if (subAreas && subAreas.length > 0) {
        for (const sa of subAreas) {
           const tessellatedVertices = subAreaTessellatedMap.get(sa.id);
           if (tessellatedVertices) {
             const allVerticesInSubArea = tile.vertices.every(
               (v) => isPointInPolygon(v.x, v.y, tessellatedVertices)
             );

             if (allVerticesInSubArea) {
               completelyInsideSubArea = true;
               break;
             }

             const anyVertexInSubArea = tile.vertices.some(
               (v) => isPointInPolygon(v.x, v.y, tessellatedVertices)
             );

             if (anyVertexInSubArea) {
               cutBySubArea = true;
             }
           } else {
             const saXMin = sa.x;
             const saXMax = sa.x + sa.width;
             const saYMin = sa.y;
             const saYMax = sa.y + sa.height;

             const allVerticesInSubArea = tile.vertices.every(
               (v) => v.x >= saXMin && v.x <= saXMax && v.y >= saYMin && v.y <= saYMax
             );

             if (allVerticesInSubArea) {
               completelyInsideSubArea = true;
               break;
             }

             const saOverX = xMin < saXMax && xMax > saXMin;
             const saOverY = yMin < saYMax && yMax > saYMin;

             if (saOverX && saOverY) {
               cutBySubArea = true;
               if (xMin < saXMin && xMax > saXMin) {
                 minSubAreaCutRatioX = Math.min(minSubAreaCutRatioX, (saXMin - xMin) / (xMax - xMin || 0.1));
               }
               if (xMin < saXMax && xMax > saXMax) {
                 minSubAreaCutRatioX = Math.min(minSubAreaCutRatioX, (xMax - saXMax) / (xMax - xMin || 0.1));
               }
               if (yMin < saYMin && yMax > saYMin) {
                 minSubAreaCutRatioY = Math.min(minSubAreaCutRatioY, (saYMin - yMin) / (yMax - yMin || 0.1));
               }
               if (yMin < saYMax && yMax > saYMax) {
                 minSubAreaCutRatioY = Math.min(minSubAreaCutRatioY, (yMax - saYMax) / (yMax - yMin || 0.1));
               }
             }
           }
        }
      }

      if (completelyInsideSubArea) {
        continue;
      }

      const isPointOutside = tile.vertices.some((v) => !isInsideWall(v.x, v.y));
      const isCut = isPointOutside || cutBySubArea;

      let strictCutCountAdd = 0;
      let fractionalCutCountAdd = 0;
      let isFull = !isCut;

      if (isCut) {
        strictCutCountAdd = 1;
        
        if (reuseCuts) {
           let clippedArea = 0;
           if (isSubArea && sa) {
               const saPoly = subAreaTessellatedMap.get(sa.id) || [
                  {x: 0, y: 0},
                  {x: sa.width, y: 0},
                  {x: sa.width, y: sa.height},
                  {x: 0, y: sa.height}
               ];
               const clipped = clipPolygon(tile.vertices, saPoly);
               clippedArea = getPolygonArea(clipped);
           } else {
               let mainPoly = wallVertices && wallVertices.length >= 3 ? wallVertices : [
                  {x: 0, y: 0},
                  {x: wallWidth, y: 0},
                  {x: wallWidth, y: wallHeight},
                  {x: 0, y: wallHeight}
               ];
               const mainClipped = clipPolygon(tile.vertices, mainPoly);
               clippedArea += getPolygonArea(mainClipped);

               if (extensions) {
                  for (const ext of extensions) {
                     const extPoly = [
                        {x: ext.x, y: ext.y},
                        {x: ext.x + ext.width, y: ext.y},
                        {x: ext.x + ext.width, y: ext.y + ext.height},
                        {x: ext.x, y: ext.y + ext.height}
                     ];
                     const extClipped = clipPolygon(tile.vertices, extPoly);
                     clippedArea += getPolygonArea(extClipped);
                  }
               }

               if (subAreas && subAreas.length > 0) {
                  for (const subSa of subAreas) {
                     const tessellatedVertices = subAreaTessellatedMap.get(subSa.id);
                     const subSaPoly = tessellatedVertices || [
                        {x: subSa.x, y: subSa.y},
                        {x: subSa.x + subSa.width, y: subSa.y},
                        {x: subSa.x + subSa.width, y: subSa.y + subSa.height},
                        {x: subSa.x, y: subSa.y + subSa.height}
                     ];
                     const subClipped = clipPolygon(tile.vertices, subSaPoly);
                     clippedArea -= getPolygonArea(subClipped);
                  }
               }
           }

           if (clippedArea < 0) clippedArea = 0;
           let fullArea = getPolygonArea(tile.vertices);
           if (fullArea === 0) {
              const tW = tile.actualWidth || tileWidth;
              const tH = tile.actualHeight || tileHeight;
              fullArea = tW * tH;
           }
           let fraction = fullArea > 0 ? clippedArea / fullArea : 0;
           if (fraction > 1) fraction = 1;
           if (fraction < 0) fraction = 0;
           fractionalCutCountAdd = fraction;
        } else {
           fractionalCutCountAdd = 1;
        }
      }

      report.totalTilesUsed++;
      if (tile.role === 'secondary') {
        report.secondaryPieceCount = (report.secondaryPieceCount || 0) + 1;
      } else {
        report.primaryPieceCount = (report.primaryPieceCount || 0) + 1;
      }

      if (isCut) {
        report.cutTilesCount++;
        report.strictCutCount = (report.strictCutCount || 0) + strictCutCountAdd;
        report.fractionalCutCount = (report.fractionalCutCount || 0) + fractionalCutCountAdd;
      } else {
        report.fullTilesCount++;
      }

      // Group by resolved color for Custom Paint pattern
      const fallbackColor = tileColors?.[0] ? (typeof tileColors[0] === 'string' ? tileColors[0] : tileColors[0].hex) : '#ffffff';
      
      const customPaintOverrideIndex = tileColorOverrides[tile.id];
      let resolvedColor = fallbackColor;
      if (customPaintOverrideIndex !== undefined) {
        const overrideCardOrStr = tileColors[customPaintOverrideIndex];
        resolvedColor = overrideCardOrStr ? (typeof overrideCardOrStr === 'string' ? overrideCardOrStr : overrideCardOrStr.hex) : '#ffffff';
      }
      
      if (!groups[resolvedColor]) {
        groups[resolvedColor] = { count: 0, area: 0, strictCutCount: 0, fractionalCutCount: 0, fullCount: 0 };
      }
      groups[resolvedColor].count++;
      
      if (isCut) {
        groups[resolvedColor].strictCutCount += strictCutCountAdd;
        groups[resolvedColor].fractionalCutCount += fractionalCutCountAdd;
      } else {
        groups[resolvedColor].fullCount++;
      }
      
      const tW = tile.actualWidth || tileWidth;
      const tH = tile.actualHeight || tileHeight;
      groups[resolvedColor].area += (tW * tH);
      totalVisibleTilesCount++;

      if (tile.actualWidth !== undefined && tile.actualHeight !== undefined) {
        if (!report.versaillesBreakdown) {
          report.versaillesBreakdown = [];
        }
        const tolerance = 0.01;
        const existing = report.versaillesBreakdown.find(gb => 
          Math.abs(gb.actualWidth - tile.actualWidth!) < tolerance &&
          Math.abs(gb.actualHeight - tile.actualHeight!) < tolerance
        );
        if (existing) {
          existing.count++;
        } else {
          report.versaillesBreakdown.push({
            actualWidth: tile.actualWidth,
            actualHeight: tile.actualHeight,
            count: 1
          });
        }
      }
    }
  }

  if (colorPattern === 'paint' && totalVisibleTilesCount > 0) {
    const totalAreaSum = Object.values(groups).reduce((sum, g) => sum + g.area, 0);
    report.colorGroups = Object.entries(groups).map(([color, g]) => {
      const gExt = g as any;
      const fractionRaw = gExt.fractionalCutCount || 0;
      const penalty = fractionRaw * 0.15; 
      const fractionalCutsRounded = Math.ceil(fractionRaw + penalty);
      const newCount = (gExt.fullCount || 0) + (params.reuseCuts ? fractionalCutsRounded : (gExt.strictCutCount || 0));
      
      return {
        color,
        count: newCount,
        netArea: g.area,
        percentage: totalAreaSum > 0 ? (g.area / totalAreaSum) * 100 : 0,
        strictCutCount: gExt.strictCutCount,
        fractionalCutCount: fractionalCutsRounded,
        fullCount: gExt.fullCount,
      };
    });
  }
  
  if (params.reuseCuts) {
     const fractionRaw = report.fractionalCutCount || 0;
     const penalty = fractionRaw * 0.15;
     const fractionalCutsRounded = Math.ceil(fractionRaw + penalty);
     report.totalTilesUsed = (report.fullTilesCount || 0) + fractionalCutsRounded;
     report.fractionalCutCount = fractionalCutsRounded;
  }

  const baseArea = (wallVertices && wallVertices.length >= 3) ? getPolygonArea(wallVertices) : (wallWidth * wallHeight);
  const totalCutoutArea = subAreas ? subAreas.filter(sa => sa.isCutout || sa.accentType === 'cutout').reduce((sum, sa) => sum + (sa.width * sa.height), 0) : 0;
  report.netArea = Math.max(0, baseArea - totalCutoutArea);

  return report;
}

/**
 * Compiles a comprehensive analytical report by running both the main wall collision sweep
 * and separate independent layouts/sweeps for all draggable sub-areas (niches/accents).
 * 
 * @param {Object} params - Unified list of main design properties.
 * @param {number} params.wallWidth - Main wall horizontal dimension.
 * @param {number} params.wallHeight - Main wall vertical dimension.
 * @param {TileShape} params.shape - Base tile geometric shape.
 * @param {number} params.tileWidth - Base tile width.
 * @param {number} params.tileHeight - Base tile height.
 * @param {RectanglePattern} params.pattern - Alignment bond layout standard.
 * @param {number} params.groutWidth - Joint grout spacing.
 * @param {number} params.offsetX - Centering/displacement X parameter.
 * @param {number} params.offsetY - Centering/displacement Y parameter.
 * @param {SubArea[]} params.subAreas - Array of draggable sub-area accent config objects.
 * @param {number} [params.angle] - Grid global slant layout angle in degrees.
 * @param {WallExtension[]} [params.extensions] - Dynamic architectural boundary shapes.
 * @param {boolean} [params.isBlankCanvasMode] - If true, handles backdrop as simple stencil plane.
 * @returns {ComprehensiveReport} Compiled report structure containing main and sub-area independent stats.
 */
export function computeComprehensiveStatistics(params: ComputeStatsParams): ComprehensiveReport {
  const combinedSubAreas = params.subAreas || [];
  
  const activeSubAreas = combinedSubAreas.filter((sa) => sa.visible !== false);

  // Main Wall Report (takes sub-areas to cut tiles)
  const mainReport = computeTileStatistics({
    wallWidth: params.wallWidth,
    wallHeight: params.wallHeight,
    shape: params.shape,
    tileWidth: params.tileWidth,
    tileHeight: params.tileHeight,
    pattern: params.pattern,
    groutWidth: params.groutWidth,
    offsetX: params.offsetX,
    offsetY: params.offsetY,
    subAreas: activeSubAreas,
    angle: params.angle,
    extensions: params.extensions,
    isBlankCanvasMode: params.isBlankCanvasMode,
    isPicket: params.isPicket,
    picketLength: params.picketLength,
    wallVertices: params.wallVertices,
    activeCustomPattern: params.activeCustomPattern,
    flatsketVerticalRows: params.flatsketVerticalRows,
    flatsketHorizontalRows: params.flatsketHorizontalRows,
    reuseCuts: params.reuseCuts,
  });

  // Calculate scaling factor for the main wall, comparing true area vs standard bounding boxes
  let mainBaseBoxArea = params.wallWidth * params.wallHeight;
  let mainTrueArea = mainBaseBoxArea;
  
  if (params.wallVertices && params.wallVertices.length >= 3) {
    mainTrueArea = getPolygonArea(params.wallVertices);
    mainBaseBoxArea = mainTrueArea; // Force ratio to be 1.0 because precision calculation handles overlap
  } else if (params.wallBoundaryShape && params.wallBoundaryShape !== 'rectangle') {
    mainTrueArea = getTrueArea({
       width: params.wallWidth,
       height: params.wallHeight,
       boundaryShape: params.wallBoundaryShape as 'arch' | 'oval' | 'custom_arches',
       archHeight: params.wallArchHeight,
       activeArches: params.wallActiveArches,
       archDepth: params.wallArchDepth
    });
  }

  if (params.extensions) {
    for (const ext of params.extensions) {
      if (ext.boundaryShape && ext.boundaryShape !== 'rectangle') {
         mainBaseBoxArea += (ext.width * ext.height);
         mainTrueArea += getTrueArea(ext);
      } else {
         mainBaseBoxArea += (ext.width * ext.height);
         mainTrueArea += (ext.width * ext.height);
      }
    }
  }
  const mainAreaRatio = mainBaseBoxArea > 0 ? mainTrueArea / mainBaseBoxArea : 1.0;
  
  if (mainAreaRatio < 1.0) {
    mainReport.totalTilesUsed = Math.round(mainReport.totalTilesUsed * mainAreaRatio);
    mainReport.fullTilesCount = Math.round(mainReport.fullTilesCount * mainAreaRatio);
    mainReport.cutTilesCount = Math.max(0, mainReport.totalTilesUsed - mainReport.fullTilesCount);
    if (mainReport.primaryPieceCount !== undefined) mainReport.primaryPieceCount = Math.round(mainReport.primaryPieceCount * mainAreaRatio);
    if (mainReport.secondaryPieceCount !== undefined) mainReport.secondaryPieceCount = Math.round(mainReport.secondaryPieceCount * mainAreaRatio);
    if (mainReport.versaillesBreakdown) {
      mainReport.versaillesBreakdown = mainReport.versaillesBreakdown.map(b => ({
         ...b,
         count: Math.round(b.count * mainAreaRatio)
      }));
    }
    if (mainReport.colorGroups) {
      mainReport.colorGroups = mainReport.colorGroups.map(g => ({
        ...g,
        count: Math.round(g.count * mainAreaRatio),
        netArea: g.netArea * mainAreaRatio,
      }));
    }
  }

  // Individual Sub-Area reports
  const subAreaReports = combinedSubAreas.map((sa, i) => {
    // 1. Calculate visible area by subtracting intersecting areas of subAreas drawn on top (j > i)
    const originalArea = getTrueArea(sa as any);
    let visibleArea = originalArea;

    if (sa.visible === false) {
      visibleArea = 0;
    } else {
      for (let j = i + 1; j < combinedSubAreas.length; j++) {
        const other = combinedSubAreas[j];
        if (other.visible === false) continue;
        
        const x1 = Math.max(sa.x, other.x);
        const x2 = Math.min(sa.x + sa.width, other.x + other.width);
        const y1 = Math.max(sa.y, other.y);
        const y2 = Math.min(sa.y + sa.height, other.y + other.height);

        if (x1 < x2 && y1 < y2) {
          const overlapArea = (x2 - x1) * (y2 - y1);
          visibleArea -= overlapArea;
        }
      }
    }
    
    if (visibleArea < 0) {
      visibleArea = 0;
    }

    const baseBoxArea = sa.width * sa.height;
    const areaRatio = baseBoxArea > 0 ? visibleArea / baseBoxArea : 1.0;

    let report: AreaReport;
    
    if ((sa as any).accentType === 'slab') {
      report = {
        totalTilesUsed: 0,
        fullTilesCount: 0,
        cutTilesCount: 0
      };
    } else {
      report = computeTileStatistics({
        wallWidth: sa.width,
        wallHeight: sa.height,
        shape: sa.shape,
        tileWidth: sa.tileWidth,
        tileHeight: sa.tileHeight,
        pattern: sa.pattern,
        groutWidth: sa.groutWidth,
        offsetX: sa.offsetX,
        offsetY: sa.offsetY,
        angle: sa.angle || 0,
        border: sa.border,
        isCutout: sa.isCutout,
        activeCustomPattern: sa.customPatternPayload,
        flatsketVerticalRows: sa.flatsketVerticalRows,
        flatsketHorizontalRows: sa.flatsketHorizontalRows,
        layoutId: sa.id,
      } as any);

      // Reduce tile counts proportionally
      report.totalTilesUsed = Math.round(report.totalTilesUsed * areaRatio);
      report.fullTilesCount = Math.round(report.fullTilesCount * areaRatio);
      report.cutTilesCount = Math.max(0, report.totalTilesUsed - report.fullTilesCount);
      if (report.primaryPieceCount !== undefined) report.primaryPieceCount = Math.round(report.primaryPieceCount * areaRatio);
      if (report.secondaryPieceCount !== undefined) report.secondaryPieceCount = Math.round(report.secondaryPieceCount * areaRatio);

      if (report.versaillesBreakdown) {
        report.versaillesBreakdown = report.versaillesBreakdown.map(b => ({
          ...b,
          count: Math.round(b.count * areaRatio)
        }));
      }
    }

    if (sa.visible === false) {
      report.totalTilesUsed = 0;
      report.fullTilesCount = 0;
      report.cutTilesCount = 0;
      if (report.primaryPieceCount !== undefined) report.primaryPieceCount = 0;
      if (report.secondaryPieceCount !== undefined) report.secondaryPieceCount = 0;
      if (report.versaillesBreakdown) {
        report.versaillesBreakdown.forEach(b => b.count = 0);
      }
    }

    if (sa.hasSill) {
      const perimeter = sa.width * 2 + sa.height * 2;
      const sillDepth = sa.sillDepth ?? 4;
      const sillArea = perimeter * sillDepth;

      const sW = sa.sillTileWidth || 2;
      const sH = sa.sillTileHeight || 6;
      const singleSillTileArea = sW * sH;
      const sillTilesNeeded = singleSillTileArea > 0 ? (sillArea / singleSillTileArea) : 0;

      report.hasSill = true;
      report.sillArea = sillArea;
      report.sillTilesNeeded = Number(sillTilesNeeded.toFixed(2));
      report.sillDepth = sillDepth;
      report.sillTileName = sa.sillTileName || 'Bullnose Sill Tile';
      report.sillTileWidth = sW;
      report.sillTileHeight = sH;
      report.sillTileColor = sa.sillTileColor || '#475569';
    }

    return {
      subAreaId: sa.id,
      name: sa.name,
      report,
    };
  });

  return {
    mainReport,
    subAreaReports,
  };
}
