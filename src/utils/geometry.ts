import { TileShape, RectanglePattern, WallExtension, SubArea, SceneObject } from '../types';


/**
 * Fast math rounding helper to round a number to a specified number of decimal places.
 * This avoids expensive string serialization and parsing.
 */
export function roundTo(val: number, decimals: number = 4): number {
  const p = Math.pow(10, decimals);
  return Math.round(val * p) / p;
}

/**
 * Returns a dense array of points representing the wall path, tessellating any arcs.
 * 
 * @param vertices - Array of X/Y points, optionally marked as curve nodes.
 * @param segments - Number of segments to use for arc tessellation.
 * @returns An array of tessellated points.
 */
export function getTessellatedPath(vertices: {x: number, y: number, isCurveNode?: boolean}[], segments: number = 30): {x: number, y: number}[] {
  if (!vertices || vertices.length < 3) return vertices || [];
  
  let startIndex = vertices.findIndex(p => !p.isCurveNode);
  if (startIndex === -1) startIndex = 0;
  
  const pts = [];
  for (let i = 0; i < vertices.length; i++) {
    pts.push(vertices[(startIndex + i) % vertices.length]);
  }

  const result: {x: number, y: number}[] = [];
  for (let i = 0; i < pts.length; i++) {
    const nextPt = pts[(i + 1) % pts.length];
    result.push({ x: pts[i].x, y: pts[i].y });
    
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
        
        const ccw = midDiff > diff;
        
        // Generate segments
        let totalAngle = ccw ? (2 * Math.PI - diff) : diff;
        if (totalAngle < 1e-6) totalAngle = 2 * Math.PI;
        if (!ccw) {
           // Clockwise
           for (let j = 1; j < segments; j++) {
              const a = startAngle + (totalAngle * j) / segments;
              result.push({ x: cxArc + rArc * Math.cos(a), y: cyArc + rArc * Math.sin(a) });
           }
        } else {
           // Counter Clockwise
           for (let j = 1; j < segments; j++) {
              const a = startAngle - (totalAngle * j) / segments;
              result.push({ x: cxArc + rArc * Math.cos(a), y: cyArc + rArc * Math.sin(a) });
           }
        }
      } else {
        result.push({ x: B.x, y: B.y });
      }
      i++; // skip B
    }
  }
  return result;
}

/**
 * Calculates the signed area of a polygon using the Shoelace formula.
 * @param vertices Array of X/Y points
 */
export function getSignedArea(vertices: {x: number, y: number}[]): number {
  if (!vertices || vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[i].y * vertices[j].x;
  }
  return area / 2.0;
}

/**
 * Calculates the absolute area of a polygon using the Shoelace formula.
 * @param vertices Array of X/Y points
 */
export function getPolygonArea(vertices: {x: number, y: number}[]): number {
  return Math.abs(getSignedArea(vertices));
}

export function getInternalAngle(A: {x: number, y: number}, B: {x: number, y: number}, C: {x: number, y: number}, isCCW: boolean): number {
  const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
  const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
  let interior = isCCW ? (angleBA - angleBC) : (angleBC - angleBA);
  while (interior < 0) interior += 2 * Math.PI;
  while (interior >= 2 * Math.PI) interior -= 2 * Math.PI;
  return interior * 180 / Math.PI;
}


// Polygon Interaction & Validation Helpers
export function getCircleThroughPoints(A: {x: number, y: number}, B: {x: number, y: number}, C: {x: number, y: number}): {cx: number, cy: number, r: number} | null {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-6) return null; // collinear

  const cx = ((A.x*A.x + A.y*A.y) * (B.y - C.y) + (B.x*B.x + B.y*B.y) * (C.y - A.y) + (C.x*C.x + C.y*C.y) * (A.y - B.y)) / d;
  const cy = ((A.x*A.x + A.y*A.y) * (C.x - B.x) + (B.x*B.x + B.y*B.y) * (A.x - C.x) + (C.x*C.x + C.y*C.y) * (B.x - A.x)) / d;
  
  const r = Math.sqrt(Math.pow(cx - A.x, 2) + Math.pow(cy - A.y, 2));
  return { cx, cy, r };
}

export function getArcMeasurements(A: {x: number, y: number}, B: {x: number, y: number}, C: {x: number, y: number}): { span: number, rise: number, arcLength: number, apex: {x: number, y: number} } | null {
  const circle = getCircleThroughPoints(A, B, C);
  if (!circle) return null; // Collinear
  
  const { cx, cy, r } = circle;
  const span = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
  
  let startAngle = Math.atan2(A.y - cy, A.x - cx);
  let endAngle = Math.atan2(C.y - cy, C.x - cx);
  let midAngle = Math.atan2(B.y - cy, B.x - cx);

  let diff = endAngle - startAngle;
  while (diff < 0) diff += 2 * Math.PI;
  let midDiff = midAngle - startAngle;
  while (midDiff < 0) midDiff += 2 * Math.PI;
  
  const ccw = midDiff > diff;
  let totalAngle = ccw ? (2 * Math.PI - diff) : diff;
  if (totalAngle < 1e-6) totalAngle = 2 * Math.PI;
  
  const arcLength = r * totalAngle;
  
  const midTotal = totalAngle / 2;
  const apexAngle = startAngle + (ccw ? -midTotal : midTotal);
  
  const apex = {
      x: cx + r * Math.cos(apexAngle),
      y: cy + r * Math.sin(apexAngle)
  };
  
  // Rise is Euclidean distance from chord midpoint to apex
  // Actually, rise could be perpendicular distance from passing chord line, but simple distance from chord midpoint works perfectly for symmetric or near-symmetric curves.
  const chordMid = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const rise = Math.sqrt(Math.pow(apex.x - chordMid.x, 2) + Math.pow(apex.y - chordMid.y, 2));

  return { span, rise, arcLength, apex };
}

export function doLineSegmentsIntersect(
  p1: {x: number, y: number}, 
  p2: {x: number, y: number}, 
  p3: {x: number, y: number}, 
  p4: {x: number, y: number}
): boolean {
  const ccw = (A: {x: number, y: number}, B: {x: number, y: number}, C: {x: number, y: number}) => 
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  
  // Basic bounding box check first for performance
  if (Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) || Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) ||
      Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) || Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y)) {
    return false;
  }

  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

export function isPolygonSelfIntersecting(vertices: {x: number, y: number}[]): boolean {
  const n = vertices.length;
  if (n < 4) return false;
  
  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    
    for (let j = i + 2; j < n; j++) {
      // Don't check adjacent segments (they share a vertex and technically "intersect" there)
      if (i === 0 && j === n - 1) continue; 
      
      const p3 = vertices[j];
      const p4 = vertices[(j + 1) % n];
      
      if (doLineSegmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

export function getClosestPointOnLineSegment(
  p: {x: number, y: number}, 
  v: {x: number, y: number}, 
  w: {x: number, y: number}
): { point: {x: number, y: number}, distSq: number } {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return { point: v, distSq: (p.x - v.x) ** 2 + (p.y - v.y) ** 2 };
  
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const point = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  const distSq = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
  return { point, distSq };
}

export function distanceToPolygonLine(
  p: {x: number, y: number}, 
  vertices: {x: number, y: number}[]
): { index: number, point: {x: number, y: number}, distSq: number } | null {
  if (!vertices || vertices.length < 2) return null;
  
  let best = null;
  let minDistSq = Infinity;
  
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    const w = vertices[(i + 1) % vertices.length];
    
    const { point, distSq } = getClosestPointOnLineSegment(p, v, w);
    
    if (distSq < minDistSq) {
      minDistSq = distSq;
      best = { index: i, point, distSq };
    }
  }
  
  return best;
}

/**
 * Procedurally generates the 2D boundary coordinate vertices of a single tile instance 
 * centered at (cx, cy) and rotated about its center by a specified angle.
 * 
 * @param {number} cx - The center X-coordinate of the tile.
 * @param {number} cy - The center Y-coordinate of the tile.
 * @param {number} w - The structural width of the tile.
 * @param {number} h - The structural height of the tile.
 * @param {number} angleRad - The rotation angle in radians.
 * @param {TileShape} shape - The chosen tile shape.
 * @param {boolean} [isMirrored=false] - Optional mirror flag for shapes like chevron.
 * @returns {{ x: number; y: number }[]} An array of vertex points representing the complete tile boundary perimeter.
 */
export function getTileVertices(
  cx: number,
  cy: number,
  w: number,
  h: number,
  angleRad: number,
  shape: TileShape,
  isMirrored: boolean = false,
  isDown: boolean = false,
  isPicket: boolean = false,
  picketLength: number = 8
): { x: number; y: number }[] {
  if (shape === 'triangle') {
    let localCorners;
    if (!isDown) {
      localCorners = [
        { x: 0, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 },
      ];
    } else {
      localCorners = [
        { x: 0, y: h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: -w / 2, y: -h / 2 },
      ];
    }
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  } else if (shape === 'chevron') {
    const slant = w / 2;
    let localCorners;
    if (!isMirrored) {
      localCorners = [
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 - slant },
        { x: w / 2, y: h / 2 - slant },
        { x: -w / 2, y: h / 2 },
      ];
    } else {
      localCorners = [
        { x: -w / 2, y: -h / 2 - slant },
        { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 - slant },
      ];
    }
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  } else if (shape === 'octagon') {
    const C = w * 0.15;
    const localCorners = [
      { x: -w / 2 + C, y: -h / 2 },
      { x: w / 2 - C, y: -h / 2 },
      { x: w / 2, y: -h / 2 + C },
      { x: w / 2, y: h / 2 - C },
      { x: w / 2 - C, y: h / 2 },
      { x: -w / 2 + C, y: h / 2 },
      { x: -w / 2, y: h / 2 - C },
      { x: -w / 2, y: -h / 2 + C },
    ];
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  } else if (shape === 'hexagon') {
    if (isPicket) {
      const localCorners = [
        { x: w / 2, y: picketLength / 4 },
        { x: 0, y: picketLength / 2 },
        { x: -w / 2, y: picketLength / 4 },
        { x: -w / 2, y: -picketLength / 4 },
        { x: 0, y: -picketLength / 2 },
        { x: w / 2, y: -picketLength / 4 },
      ];
      return localCorners.map((p) => {
        return {
          x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
          y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
        };
      });
    } else {
      const vertices = [];
      const outerR = w / Math.sqrt(3);
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + Math.PI / 6 + angleRad;
        vertices.push({
          x: cx + outerR * Math.cos(angle),
          y: cy + outerR * Math.sin(angle),
        });
      }
      return vertices;
    }
  } else if (shape === 'diamond') {
    const lh = w / 2;
    const hh = h / 2;
    const localCorners = [
      { x: 0, y: -hh },  // top
      { x: lh, y: 0 },   // right
      { x: 0, y: hh },   // bottom
      { x: -lh, y: 0 },  // left
    ];
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  } else if (shape === 'scallop') {
    const lh = w / 2;
    const hh = h / 2;
    const localCorners = [
      { x: -lh, y: -hh },
      { x: lh, y: -hh },
      { x: lh, y: hh },
      { x: -lh, y: hh },
    ];
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  } else if (shape === 'star') {
    const vertices = [];
    const innerRatio = 0.4142;
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8 + angleRad;
      const r_val = (i % 2 === 0) ? 1.0 : innerRatio;
      vertices.push({
        x: cx + (w / 2) * r_val * Math.cos(angle),
        y: cy + (h / 2) * r_val * Math.sin(angle),
      });
    }
    return vertices;
  } else if (shape === 'cross') {
    const tx = w / 3;
    const ty = h / 3;
    const localCorners = [
      { x: -tx / 2, y: -h / 2 },
      { x: tx / 2, y: -h / 2 },
      { x: tx / 2, y: -ty / 2 },
      { x: w / 2, y: -ty / 2 },
      { x: w / 2, y: ty / 2 },
      { x: tx / 2, y: ty / 2 },
      { x: tx / 2, y: h / 2 },
      { x: -tx / 2, y: h / 2 },
      { x: -tx / 2, y: ty / 2 },
      { x: -w / 2, y: ty / 2 },
      { x: -w / 2, y: -ty / 2 },
      { x: -tx / 2, y: -ty / 2 },
    ];
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  } else {
    // Square, rectangle, round
    const lh = w / 2;
    const hh = h / 2;
    const localCorners = [
      { x: -lh, y: -hh },
      { x: lh, y: -hh },
      { x: lh, y: hh },
      { x: -lh, y: hh },
    ];
    return localCorners.map((p) => {
      return {
        x: cx + p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad),
        y: cy + p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad),
      };
    });
  }
}

/**
 * Calculates correct centered offsets for different layout structures to perfectly balance
 * tiles with equal margins / borders on both edges of the wall.
 * 
 * @param {number} wallWidth - Width of the wall surface.
 * @param {number} wallHeight - Height of the wall surface.
 * @param {TileShape} shape - The chosen tile shape.
 * @param {number} tileWidth - Single tile width.
 * @param {number} tileHeight - Single tile height.
 * @param {number} groutWidth - The spacing joint between adjacent tiles.
 * @param {RectanglePattern} pattern - The layout pattern.
 * @returns {{ x: number; y: number }} An object containing computed standard X and Y offsets.
 */
export function calculateCenteredOffsets(
  wallWidth: number,
  wallHeight: number,
  shape: TileShape,
  tileWidth: number,
  tileHeight: number,
  groutWidth: number,
  pattern: RectanglePattern,
  isPicket: boolean = false,
  picketLength: number = 8
): { x: number; y: number } {
  const actualTileW = shape === 'hexagon' ? tileWidth : tileWidth;
  const actualTileH = shape === 'hexagon'
    ? (isPicket ? picketLength : tileWidth * (2 / Math.sqrt(3)))
    : tileHeight;

  let xOffset = 0;
  let yOffset = 0;

  if (shape === 'hexagon') {
    xOffset = wallWidth / 2;
    yOffset = wallHeight / 2;
  } else {
    xOffset = (wallWidth - actualTileW) / 2;
    yOffset = (wallHeight - actualTileH) / 2;
  }

  return { x: roundTo(xOffset, 4), y: roundTo(yOffset, 4) };
}

/**
 * Calculates the overall combined rectangular bounding box coordinates and dimensions 
 * encompassing the main wall rectangle together with all added wall shape extensions.
 * 
 * @param {number} wallWidth - Base main wall width.
 * @param {number} wallHeight - Base main wall height.
 * @param {WallExtension[]} [extensions=[]] - Array of custom wall shape extensions.
 * @returns {{ width: number; height: number; minX: number; maxX: number; minY: number; maxY: number }}
 *          An object representing coordinates (minX, maxX, minY, maxY) and total dimensions.
 */
export function getCombinedWallBounds(
  wallWidth: number,
  wallHeight: number,
  extensions: WallExtension[] = [],
  wallVertices?: {x: number, y: number}[]
): { width: number; height: number; minX: number; maxX: number; minY: number; maxY: number } {
  let minX = 0;
  let maxX = wallWidth;
  let minY = 0;
  let maxY = wallHeight;
  
  extensions.forEach((ext) => {
    minX = Math.min(minX, ext.x);
    maxX = Math.max(maxX, ext.x + ext.width);
    minY = Math.min(minY, ext.y);
    maxY = Math.max(maxY, ext.y + ext.height);
  });

  if (wallVertices && wallVertices.length >= 3) {
      const tessellated = getTessellatedPath(wallVertices);
      tessellated.forEach((v) => {
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y);
          maxY = Math.max(maxY, v.y);
      });
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: roundTo(maxX - minX, 4),
    height: roundTo(maxY - minY, 4),
  };
}

/**
 * Calculates the true mathematical coverage area of a board / extension / sub-area shape,
 * subtracting curved deficits if the shape is 'oval', 'arch', or 'custom_arches'.
 */
export function getTrueArea(item: {
  width: number;
  height: number;
  boundaryShape?: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  archHeight?: number;
  archDepth?: number;
  activeArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
}): number {
  const baseArea = item.width * item.height;
  if (!item.boundaryShape || item.boundaryShape === 'rectangle') {
    return baseArea;
  }
  if (item.boundaryShape === 'oval') {
    return Math.PI * (item.width / 2) * (item.height / 2);
  }
  if (item.boundaryShape === 'arch') {
    const aH = item.archHeight || item.width / 2;
    const deficit = (item.width * aH) * (1 - Math.PI / 4);
    return baseArea - deficit;
  }
  if (item.boundaryShape === 'custom_arches') {
    const d = item.archDepth || 0;
    const cornerRatio = 1 - Math.PI / 4; // approx 0.2146
    let deficit = 0;
    if (item.activeArches?.top) deficit += (item.width * d) * cornerRatio;
    if (item.activeArches?.bottom) deficit += (item.width * d) * cornerRatio;
    if (item.activeArches?.left) deficit += (item.height * d) * cornerRatio;
    if (item.activeArches?.right) deficit += (item.height * d) * cornerRatio;
    return baseArea - deficit;
  }
  return baseArea;
}

/**
 * Safely converts hex colors to HSL representation.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  if (hex.startsWith('hsl(')) {
    const parts = hex.substring(4, hex.length - 1).split(',');
    if (parts.length >= 3) {
      const h = parseInt(parts[0]) || 0;
      const s = parseInt(parts[1]) || 0;
      const l = parseInt(parts[2]) || 50;
      return { h, s, l };
    }
  }

  let cleanHex = hex.replace(/^#/, '');
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  if (cleanHex.length !== 6) {
    return { h: 0, s: 0, l: 90 };
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Calculates a deterministic pseudo-random number in [0, 1) based on coordinates (x, y).
 */
export function pseudoRandom2D(x: number, y: number): number {
  let nx = Math.floor(x * 1000);
  let ny = Math.floor(y * 1000);
  let hash = nx * 374761393 + ny * 668265263;
  hash = (hash ^ (hash >> 13)) * 1274126177;
  hash = hash ^ (hash >> 16);
  return (hash & 0x7fffffff) / 0x7fffffff;
}

/**
 * Returns a color adjusted for shade variation levels V1-V4 deterministically based on coordinates.
 */
export function getVariedColor(
  baseColor: string, 
  x: number, 
  y: number, 
  variation: 'V1' | 'V2' | 'V3' | 'V4' = 'V1'
): string {
  if (variation === 'V1' || !variation) {
    return baseColor; // identical to base
  }

  const { h, s, l } = hexToHsl(baseColor);
  const rand = pseudoRandom2D(x, y); // [0, 1)
  const factor = rand * 2 - 1; // [-1, 1]

  let lightShift = 0;
  let satShift = 0;

  if (variation === 'V2') {
    lightShift = factor * 3; // +/- 3% lightness
  } else if (variation === 'V3') {
    lightShift = factor * 8; // +/- 8% lightness
  } else if (variation === 'V4') {
    lightShift = factor * 15; // +/- 15% lightness
    satShift = factor * 5; // +/- 5% saturation shift
  }

  const finalL = Math.max(0, Math.min(100, l + lightShift));
  const finalS = Math.max(0, Math.min(100, s + satShift));

  return `hsl(${h}, ${finalS}%, ${finalL}%)`;
}

export const getSubAreaVertices = (sa: any) => {
  if (sa.vertices && sa.vertices.length >= 3) {
    return sa.vertices;
  }
  return [
    { x: sa.x, y: sa.y },
    { x: sa.x + sa.width, y: sa.y },
    { x: sa.x + sa.width, y: sa.y + sa.height },
    { x: sa.x, y: sa.y + sa.height },
  ];
};

export function isPointInPolygon(px: number, py: number, vertices: {x: number; y: number}[]) {
  if (!vertices || vertices.length < 3) return false;
  let inside = false;
  let j = vertices.length - 1;
  for (let i = 0; i < vertices.length; i++) {
    if ((vertices[i].y > py) !== (vertices[j].y > py) &&
        px < (vertices[j].x - vertices[i].x) * (py - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

export function sliceWallIntoRegions(
  wallVertices: { x: number; y: number; isCurveNode?: boolean }[],
  foldLines: any[]
): { x: number; y: number; isCurveNode?: boolean }[][] {
  const regions: { x: number; y: number; isCurveNode?: boolean }[][] = [
    wallVertices.map(v => ({ ...v }))
  ];

  if (!foldLines || foldLines.length === 0) {
    return regions;
  }

  for (const f of foldLines) {
    const pA = wallVertices[f.startNodeIndex];
    const pB = wallVertices[f.endNodeIndex];
    if (!pA || !pB) continue;

    let targetRegionIndex = -1;
    let idxA = -1;
    let idxB = -1;

    for (let r = 0; r < regions.length; r++) {
      const region = regions[r];
      const iA = region.findIndex(v => Math.abs(v.x - pA.x) < 1e-4 && Math.abs(v.y - pA.y) < 1e-4);
      const iB = region.findIndex(v => Math.abs(v.x - pB.x) < 1e-4 && Math.abs(v.y - pB.y) < 1e-4);
      if (iA !== -1 && iB !== -1) {
        targetRegionIndex = r;
        idxA = iA;
        idxB = iB;
        break;
      }
    }

    if (targetRegionIndex !== -1) {
      const region = regions[targetRegionIndex];
      const M = region.length;

      const isAdjacent = (idxA + 1) % M === idxB || (idxB + 1) % M === idxA;
      if (!isAdjacent) {
        const region1: { x: number; y: number; isCurveNode?: boolean }[] = [];
        let curr = idxA;
        while (curr !== idxB) {
          region1.push({ ...region[curr] });
          curr = (curr + 1) % M;
        }
        region1.push({ ...region[idxB] });

        const region2: { x: number; y: number; isCurveNode?: boolean }[] = [];
        curr = idxB;
        while (curr !== idxA) {
          region2.push({ ...region[curr] });
          curr = (curr + 1) % M;
        }
        region2.push({ ...region[idxA] });

        regions.splice(targetRegionIndex, 1, region1, region2);
      }
    }
  }

  return regions;
}

/**
 * Formats an angle with dynamic snapping: if it is very close to a whole number
 * (tolerance of 0.15 degrees), displays it rounded to that whole number with a ".0" suffix.
 * Otherwise, displays to 1 decimal place.
 */
export function formatVisualAngle(angle: number): string {
  const rounded = Math.round(angle);
  if (Math.abs(angle - rounded) <= 0.15) {
    return `${rounded}.0`;
  }
  return angle.toFixed(1);
}

export function checkSubAreaFoldIntersection(
  subArea: { x: number; y: number; width: number; height: number },
  foldLines: any[],
  wallVertices: { x: number; y: number }[]
): { intersects: boolean; wallHeight?: number; floorDepth?: number } {
  if (!foldLines || !wallVertices || foldLines.length === 0) {
    return { intersects: false };
  }
  for (const fold of foldLines) {
    const vStart = wallVertices[fold.startNodeIndex];
    const vEnd = wallVertices[fold.endNodeIndex];
    if (vStart && vEnd) {
      const isVertical = Math.abs(vStart.x - vEnd.x) < Math.abs(vStart.y - vEnd.y);
      if (!isVertical) {
        const foldY = (vStart.y + vEnd.y) / 2;
        const inYBounds = foldY > subArea.y && foldY < subArea.y + subArea.height;
        const minX = Math.min(vStart.x, vEnd.x);
        const maxX = Math.max(vStart.x, vEnd.x);
        const inXBounds = Math.max(subArea.x, minX) < Math.min(subArea.x + subArea.width, maxX);

        if (inYBounds && inXBounds) {
          const wallHeight = (subArea.y + subArea.height) - foldY;
          const floorDepth = foldY - subArea.y;
          return {
            intersects: true,
            wallHeight,
            floorDepth
          };
        }
      }
    }
  }
  return { intersects: false };
}




export function clipPolygon(subjectPolygon: {x: number, y: number}[], clipPolygon: {x: number, y: number}[]): {x: number, y: number}[] {
  let outputList = subjectPolygon;
  for (let i = 0; i < clipPolygon.length; i++) {
    const clipEdgeStart = clipPolygon[i];
    const clipEdgeEnd = clipPolygon[(i + 1) % clipPolygon.length];
    
    const inputList = outputList;
    outputList = [];
    
    if (inputList.length === 0) break;
    
    let S = inputList[inputList.length - 1];
    
    for (let j = 0; j < inputList.length; j++) {
      const E = inputList[j];
      const isEInside = (clipEdgeEnd.x - clipEdgeStart.x) * (E.y - clipEdgeStart.y) - (clipEdgeEnd.y - clipEdgeStart.y) * (E.x - clipEdgeStart.x) <= 0;
      const isSInside = (clipEdgeEnd.x - clipEdgeStart.x) * (S.y - clipEdgeStart.y) - (clipEdgeEnd.y - clipEdgeStart.y) * (S.x - clipEdgeStart.x) <= 0;
      
      if (isEInside) {
        if (!isSInside) {
          outputList.push(getIntersection(S, E, clipEdgeStart, clipEdgeEnd));
        }
        outputList.push(E);
      } else if (isSInside) {
        outputList.push(getIntersection(S, E, clipEdgeStart, clipEdgeEnd));
      }
      S = E;
    }
  }
  return outputList;
}

function getIntersection(p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, p4: {x: number, y: number}) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (d === 0) return p1; // parallel
  
  const nx = ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / d;
  const ny = ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / d;
  return {x: nx, y: ny};
}
