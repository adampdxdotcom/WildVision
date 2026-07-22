/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasurementUnit, WallExtension, SubArea, AngleDisplayMode } from '../../types';
import { Viewport, mapToCanvas } from './canvasUtils';
import { Point, SegmentWithNormal, getMergedSegments } from '../../utils/segmentMath';
import { getArcMeasurements, getInternalAngle, getSignedArea, formatVisualAngle } from '../../utils/geometry';
import { useAppStore } from '../../store/useAppStore';

export function isDarkColor(hex: string): boolean {
  try {
    const c = hex.replace('#', '');
    if (c.length < 6) return false;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 140;
  } catch (e) {
    return false;
  }
}

/**
 * Automatically calculates and draws individual straight segments with architectural dimensions
 */
export function drawDetailedWallEdgeMeasurements(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  wallWidth: number,
  wallHeight: number,
  extensions: WallExtension[] = [],
  unit: MeasurementUnit,
  hasBgImage?: boolean,
  wallVertices?: {x: number, y: number}[],
  isPdf?: boolean
) {
  ctx.globalAlpha = 1.0;
  
  const mergedSegments = getMergedSegments(wallWidth, wallHeight, extensions, wallVertices);

  // Draw dimension lines and labels for every segment
  const offsetPixels = 16;

  mergedSegments.forEach(seg => {
    const len = Math.sqrt((seg.p2.x - seg.p1.x) ** 2 + (seg.p2.y - seg.p1.y) ** 2);
    if (len < 0.1) return;

    const cp1 = mapToCanvas(seg.p1.x, seg.p1.y, viewport);
    const cp2 = mapToCanvas(seg.p2.x, seg.p2.y, viewport);

    const nx = seg.dx;
    const ny = -seg.dy;

    const cOffset1 = { x: cp1.x + nx * offsetPixels, y: cp1.y + ny * offsetPixels };
    const cOffset2 = { x: cp2.x + nx * offsetPixels, y: cp2.y + ny * offsetPixels };

    if (seg.isCurve && seg.curveNode) {
       // --- CURVE ARCHITECTURAL DIMENSIONS ---
       
       const measurements = getArcMeasurements(seg.p1, seg.curveNode, seg.p2);
       if (!measurements) return;
       const { span, rise, arcLength, apex } = measurements;
       
       const cApex = mapToCanvas(apex.x, apex.y, viewport);
       const cMid = { x: (cp1.x + cp2.x) / 2, y: (cp1.y + cp2.y) / 2 };

       ctx.save();
       
       // White Underlay (Halo) for visibility over complex tiles
       ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
       ctx.lineWidth = 3;
       
       ctx.beginPath();
       ctx.moveTo(cp1.x, cp1.y);
       ctx.lineTo(cp2.x, cp2.y);
       ctx.stroke();

       ctx.beginPath();
       ctx.moveTo(cMid.x, cMid.y);
       ctx.lineTo(cApex.x, cApex.y);
       ctx.stroke();

       // Dashed architectural dimension
       ctx.strokeStyle = isPdf ? '#000000' : '#0f172a'; // slate-900 for extremely high contrast
       ctx.lineWidth = 1.5;
       ctx.setLineDash([5, 5]);

       // 1. Draw Span dashed line across the chord
       ctx.beginPath();
       ctx.moveTo(cp1.x, cp1.y);
       ctx.lineTo(cp2.x, cp2.y);
       ctx.stroke();

       // 2. Draw Rise dashed line exactly from chord midpoint to apex
       ctx.beginPath();
       ctx.moveTo(cMid.x, cMid.y);
       ctx.lineTo(cApex.x, cApex.y);
       ctx.stroke();
       
       ctx.restore();

       // Helper to draw text badge
       const drawBadgeText = (textStr: string, x: number, y: number, textAngle: number) => {
           ctx.save();
           ctx.translate(x, y);
           ctx.rotate(textAngle);
           ctx.font = '500 9px ui-monospace, SFMono-Regular, monospace';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           
           const textMetrics = ctx.measureText(textStr);
           const padW = textMetrics.width + 6;
           const padH = 12;
           
           ctx.fillStyle = isPdf ? '#ffffff' : (hasBgImage ? 'rgba(255,255,255,0.95)' : 'rgba(241, 245, 249, 0.9)'); // Slate-50 with opacity
           ctx.beginPath();
           ctx.roundRect(-padW/2, -padH/2, padW, padH, 3);
           ctx.fill();
           
           ctx.fillStyle = isPdf ? '#000000' : '#0f172a'; // High contrast text (slate-900)
           ctx.fillText(textStr, 0, 0);
           ctx.restore();
       };

       // Span Label
       let spanAngle = Math.atan2(cp2.y - cp1.y, cp2.x - cp1.x);
       if (spanAngle < -Math.PI / 2 - 0.01) spanAngle += Math.PI;
       else if (spanAngle > Math.PI / 2 + 0.01) spanAngle -= Math.PI;
       drawBadgeText(`Span: ${Number(span).toFixed(1)}${unit}`, cMid.x, cMid.y, spanAngle);

       // Rise Label
       let riseAngle = Math.atan2(cApex.y - cMid.y, cApex.x - cMid.x);
       if (riseAngle < -Math.PI / 2 - 0.01) riseAngle += Math.PI;
       else if (riseAngle > Math.PI / 2 + 0.01) riseAngle -= Math.PI;
       if (Math.abs(Math.abs(riseAngle) - Math.PI / 2) < 0.02) riseAngle = -Math.PI / 2;
       drawBadgeText(`Rise: ${Number(rise).toFixed(1)}${unit}`, (cMid.x + cApex.x)/2, (cMid.y + cApex.y)/2, riseAngle);

       // Arc Length Label (at apex)
       drawBadgeText(`Arc: ${Number(arcLength).toFixed(1)}${unit}`, cApex.x + nx * 10, cApex.y + ny * 10, spanAngle);

       return;
    }

    // 1. Draw extension lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cp1.x + nx * 2, cp1.y + ny * 2);
    ctx.lineTo(cp1.x + nx * (offsetPixels + 3), cp1.y + ny * (offsetPixels + 3));
    ctx.moveTo(cp2.x + nx * 2, cp2.y + ny * 2);
    ctx.lineTo(cp2.x + nx * (offsetPixels + 3), cp2.y + ny * (offsetPixels + 3));
    ctx.stroke();

    // 2. Draw dimension line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cOffset1.x, cOffset1.y);
    ctx.lineTo(cOffset2.x, cOffset2.y);
    ctx.stroke();

    // 3. Draw slashes (ticks)
    const drawSlash = (p: { x: number; y: number }) => {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x - 3, p.y + 3);
      ctx.lineTo(p.x + 3, p.y - 3);
      ctx.stroke();
    };
    drawSlash(cOffset1);
    drawSlash(cOffset2);

    // 4. Draw label text with clear background block rotated parallel to the segment
    const midX = (cOffset1.x + cOffset2.x) / 2;
    const midY = (cOffset1.y + cOffset2.y) / 2;

    const text = `${Number(len).toFixed(3)} ${unit}`;

    // Calculate segment angle
    let angle = Math.atan2(cOffset2.y - cOffset1.y, cOffset2.x - cOffset1.x);
    // Keep angle in [-Math.PI / 2, Math.PI / 2] so text is never upside down
    if (angle < -Math.PI / 2 - 0.01) {
      angle += Math.PI;
    } else if (angle > Math.PI / 2 + 0.01) {
      angle -= Math.PI;
    }
    // If it is vertical (i.e., angle is -Math.PI / 2 or Math.PI / 2), force to -Math.PI / 2 for uniform bottom-to-top reading
    if (Math.abs(Math.abs(angle) - Math.PI / 2) < 0.02) {
      angle = -Math.PI / 2;
    }

    const isLLocked = (seg.p1 as any)?.isLengthLocked;
    const hasLock = isLLocked && !isPdf;
    const lockW = 8;
    const gap = 3;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    ctx.font = '500 9px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = isPdf ? '#000000' : '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(text);
    const padW = textMetrics.width + 6 + (hasLock ? (lockW + gap) : 0);
    const padH = 12;

    // Draw background block matching backing color
    ctx.fillStyle = isPdf ? '#ffffff' : (hasBgImage ? 'rgba(255,255,255,0.95)' : 'rgba(241, 245, 249, 0.9)');
    ctx.beginPath();
    ctx.roundRect(-padW / 2, -padH / 2, padW, padH, 3);
    ctx.fill();

    // Draw the text string
    ctx.fillStyle = isPdf ? '#000000' : '#0f172a';
    
    if (hasLock) {
      const totalContentW = textMetrics.width + gap + lockW;
      const xText = -(lockW + gap) / 2;
      const xLock = (textMetrics.width + gap) / 2;
      
      ctx.fillText(text, xText, 0);
      
      // Draw subtle lock icon next to dimensions
      ctx.save();
      ctx.translate(xLock, 0);
      ctx.strokeStyle = '#4f46e5';
      ctx.fillStyle = '#4f46e5';
      ctx.lineWidth = 1;
      
      // Draw shackle
      ctx.beginPath();
      ctx.arc(0, -1, 1.8, Math.PI, 0);
      ctx.stroke();
      
      // Draw lock body
      ctx.beginPath();
      ctx.roundRect(-2.5, -1, 5, 4, 1);
      ctx.fill();
      
      ctx.restore();
    } else {
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
  });
}

/**
 * Draws the wall measurements and dimension ticks
 */
export function drawWallMeasurements(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  combinedWidth: number,
  combinedHeight: number,
  unit: MeasurementUnit,
  wallWidth: number,
  wallHeight: number,
  extensions: WallExtension[] = [],
  hasBgImage?: boolean,
  subAreas: SubArea[] = [],
  showAccentDistances: boolean = false,
  wallVertices?: {x: number, y: number}[],
  isPdf?: boolean,
  angleDisplayMode: AngleDisplayMode = 'all'
) {
  const visibility = useAppStore.getState?.().viewSettings?.canvas || {
    showNodes: true,
    showDimensions: true,
    showAngles: true,
    showLabels: true,
    showFoldLines: true,
  };

  // Calculate True Bounds of the current wallVertices dynamically
  const minX = wallVertices && wallVertices.length >= 3 ? Math.min(...wallVertices.map(v => v.x)) : 0;
  const maxX = wallVertices && wallVertices.length >= 3 ? Math.max(...wallVertices.map(v => v.x)) : wallWidth;
  const minY = wallVertices && wallVertices.length >= 3 ? Math.min(...wallVertices.map(v => v.y)) : 0;
  const maxY = wallVertices && wallVertices.length >= 3 ? Math.max(...wallVertices.map(v => v.y)) : wallHeight;

  const trueBoxWidth = maxX - minX;
  const trueBoxHeight = maxY - minY;

  // Get all merged segments to check if we can skip drawing the overarching bounds
  const segments = getMergedSegments(wallWidth, wallHeight, extensions, wallVertices);

  // Skip overarching width meter if we have a segment exactly equal to trueBoxWidth (within 0.001 epsilon)
  const isWidthMatchingSegment = segments.some(seg => {
    if (seg.dy !== 0) { // horizontal Segment
      const len = Math.abs(seg.p2.x - seg.p1.x);
      return Math.abs(len - trueBoxWidth) < 0.001;
    }
    return false;
  });

  // Skip overarching height meter if we have a segment exactly equal to trueBoxHeight (within 0.001 epsilon)
  const isHeightMatchingSegment = segments.some(seg => {
    if (seg.dx !== 0) { // vertical Segment
      const len = Math.abs(seg.p2.y - seg.p1.y);
      return Math.abs(len - trueBoxHeight) < 0.001;
    }
    return false;
  });

  ctx.fillStyle = isPdf ? '#000000' : '#475569';
  ctx.font = '500 11px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (visibility.showDimensions) {
    // Map absolute bounds to canvas pixels
    const pMinXMaxY = mapToCanvas(minX, maxY, viewport);
    const pMaxXMaxY = mapToCanvas(maxX, maxY, viewport);
    const pMaxXMinY = mapToCanvas(maxX, minY, viewport);

    const leftX = pMinXMaxY.x;
    const rightX = pMaxXMaxY.x;
    const topY = pMinXMaxY.y;
    const bottomY = pMaxXMinY.y;

    if (!isWidthMatchingSegment) {
      // Width meter (Top overarching)
      const text = `${Number(trueBoxWidth).toFixed(3)} ${unit}`;
      const tx = (leftX + rightX) / 2;
      const ty = topY - 33;

      ctx.save();
      ctx.font = '500 11px ui-monospace, SFMono-Regular, monospace';
      const textMetrics = ctx.measureText(text);
      const padW = textMetrics.width + 10;
      const padH = 16;
      ctx.fillStyle = isPdf ? '#ffffff' : 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.roundRect(tx - padW / 2, ty - padH / 2, padW, padH, 4);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isPdf ? '#000000' : '#0f172a'; // Darker text for visibility
      ctx.fillText(text, tx, ty);
      ctx.restore();

      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(leftX, topY - 18);
      ctx.lineTo(leftX, topY - 30);
      ctx.moveTo(leftX, topY - 24);
      ctx.lineTo(rightX, topY - 24);
      ctx.moveTo(rightX, topY - 18);
      ctx.lineTo(rightX, topY - 30);
      ctx.stroke();
    }

    if (!isHeightMatchingSegment) {
      // Height meter (Right overarching)
      const text = `${Number(trueBoxHeight).toFixed(3)} ${unit}`;
      ctx.save();
      ctx.translate(rightX + 34, (topY + bottomY) / 2);
      ctx.rotate(Math.PI / 2);

      ctx.font = '500 11px ui-monospace, SFMono-Regular, monospace';
      const textMetrics = ctx.measureText(text);
      const padW = textMetrics.width + 10;
      const padH = 16;
      ctx.fillStyle = isPdf ? '#ffffff' : 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.roundRect(-padW / 2, -padH / 2, padW, padH, 4);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isPdf ? '#000000' : '#0f172a';
      ctx.fillText(text, 0, 0);
      ctx.restore();

      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(rightX + 20, topY);
      ctx.lineTo(rightX + 32, topY);
      ctx.moveTo(rightX + 26, topY);
      ctx.lineTo(rightX + 26, bottomY);
      ctx.moveTo(rightX + 20, bottomY);
      ctx.lineTo(rightX + 32, bottomY);
      ctx.stroke();
    }

    // Draw detailed individual edge measurements hugging the outside perimeter of the wall plus extensions
    drawDetailedWallEdgeMeasurements(ctx, viewport, wallWidth, wallHeight, extensions, unit, hasBgImage, wallVertices, isPdf);
  }

  // Draw corner (interior) angles if wallVertices is provided and showAngles is active
  if (visibility.showAngles && wallVertices && wallVertices.length >= 3) {
    const n = wallVertices.length;
    const isCCW = getSignedArea(wallVertices) >= 0;
    
    for (let i = 0; i < n; i++) {
      const prev = wallVertices[(i - 1 + n) % n];
      const curr = wallVertices[i];
      const next = wallVertices[(i + 1) % n];
      
      // Skip curve nodes so we don't draw weird angles at arch control points
      if ((curr as any).isCurveNode || (prev as any).isCurveNode || (next as any).isCurveNode) continue;
      
      const currentAngle = getInternalAngle(prev, curr, next, isCCW);
      if (isNaN(currentAngle)) continue;
      if (Math.abs(currentAngle - 180) <= 0.5) continue;

      if (angleDisplayMode === 'none') continue;
      if (angleDisplayMode === 'non-standard') {
        const remainder = Math.abs(currentAngle % 90);
        const isStandard = remainder < 0.2 || remainder > 89.8;
        if (isStandard) continue;
      }

      // Calculate screen/canvas positions
      const cpPrev = mapToCanvas(prev.x, prev.y, viewport);
      const cpCurr = mapToCanvas(curr.x, curr.y, viewport);
      const cpNext = mapToCanvas(next.x, next.y, viewport);
      
      // Calculate angle of incoming and outgoing lines on canvas
      const angleBA = Math.atan2(cpPrev.y - cpCurr.y, cpPrev.x - cpCurr.x);
      const angleBC = Math.atan2(cpNext.y - cpCurr.y, cpNext.x - cpCurr.x);
      
      // Bisector for label placement
      let bisectAngle = (angleBA + angleBC) / 2;
      let diff = Math.abs(angleBA - angleBC);
      if (diff > Math.PI) {
        bisectAngle += Math.PI;
      }
      if (currentAngle > 180) {
        bisectAngle += Math.PI;
      }
      
      ctx.save();
      
      // Make sure angles draw clean over background
      ctx.strokeStyle = isPdf ? '#000000' : 'rgba(79, 70, 229, 0.4)'; // Subtle translucent indigo matching theme
      ctx.lineWidth = 1.2;
      
      // Draw smooth corner arc
      const arcRadius = 14;
      ctx.beginPath();
      // Canvas arc uses startAngle, endAngle. We can use angleBC and angleBA.
      // Since canvas arc draws clockwise, to draw the interior part of the angle:
      let startArc = angleBC;
      let endArc = angleBA;
      let sweep = endArc - startArc;
      while (sweep < 0) sweep += 2 * Math.PI;
      if (sweep > Math.PI) {
        startArc = angleBA;
        endArc = angleBC;
      }
      ctx.arc(cpCurr.x, cpCurr.y, arcRadius, startArc, endArc, false);
      ctx.stroke();
      
      // Label text
      const angleText = `${formatVisualAngle(currentAngle)}°`;
      
      // Calculate placement offset along the bisector
      const badgeDistance = 24;
      const labelX = cpCurr.x + Math.cos(bisectAngle) * badgeDistance;
      const labelY = cpCurr.y + Math.sin(bisectAngle) * badgeDistance;
      
      ctx.font = '600 8.5px ui-monospace, SFMono-Regular, monospace';
      const badgeMetrics = ctx.measureText(angleText);
      const bPadW = badgeMetrics.width + 5;
      const bPadH = 12;
      
      // Draw background block (halo/underlay) for readability
      ctx.fillStyle = isPdf ? '#ffffff' : (hasBgImage ? 'rgba(255,255,255,0.92)' : 'rgba(241, 245, 249, 0.9)');
      ctx.beginPath();
      ctx.roundRect(labelX - bPadW / 2, labelY - bPadH / 2, bPadW, bPadH, 3);
      ctx.fill();
      
      // Text color matches the arc (elegant theme-consistent indigo)
      ctx.fillStyle = isPdf ? '#000000' : '#4f46e5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(angleText, labelX, labelY);
      
      ctx.restore();
    }
  }
}

/**
 * Draws the bounding dimensions and (optional) edge distances for accent sub-areas (niches).
 */
export function drawSubAreaDimensions(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  rawSubAreas: SubArea[] = [],
  showAccentDistances: boolean,
  unit: MeasurementUnit,
  hasBgImage?: boolean,
  isPdf?: boolean,
  angleDisplayMode: AngleDisplayMode = 'all'
) {
  const visibility = useAppStore.getState?.().viewSettings?.canvas || {
    showNodes: true,
    showDimensions: true,
    showAngles: true,
    showLabels: true,
    showFoldLines: true,
  };
  if (!visibility.showDimensions) return;

  const subAreas = (rawSubAreas || []).filter((sa) => sa.visible !== false);
  if (subAreas.length === 0) return;

  const colorSlate = '#334155'; // Darker slate-700 for distinct accent dimensions
  const colorSlash = '#64748b'; // slate-500

  const drawSlash = (p: { x: number; y: number }) => {
    ctx.strokeStyle = colorSlash;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x - 3, p.y + 3);
    ctx.lineTo(p.x + 3, p.y - 3);
    ctx.stroke();
  };

  // Tracking arrays outside the loop to stack dimension lines that share identical coordinate bounds
  subAreas.forEach((sa, index) => {
    if (sa.visible === false) return;

    // Look up top-left and bottom-right corners on standard canvas
    const saCanvasMin = mapToCanvas(sa.x, sa.y + sa.height, viewport); // top-left
    const saCanvasMax = mapToCanvas(sa.x + sa.width, sa.y, viewport); // bottom-right

    const xLeft = saCanvasMin.x;
    const xRight = saCanvasMax.x;
    const yTop = saCanvasMin.y;
    const yBottom = saCanvasMax.y;

    // Ratios to convert canvas-pixels back to physical units
    const scaleX = sa.width / (xRight - xLeft || 1);
    const scaleY = sa.height / (yBottom - yTop || 1);

    // =========================================================================
    // 1. BOUNDING DIMENSIONS WITH FIXED EDGE PADDING
    // =========================================================================

    const widthY = yTop + 14;
    const heightX = xRight - 14;

    // Width Extension lines (vertical extensions from niche top edge to width dimension line)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(xLeft, yTop + 2);
    ctx.lineTo(xLeft, widthY - 2);
    ctx.moveTo(xRight, yTop + 2);
    ctx.lineTo(xRight, widthY - 2);
    ctx.stroke();

    // Height Extension lines (horizontal extensions from niche right edge to height dimension line)
    ctx.beginPath();
    ctx.moveTo(xRight - 2, yTop);
    ctx.lineTo(heightX + 2, yTop);
    ctx.moveTo(xRight - 2, yBottom);
    ctx.lineTo(heightX + 2, yBottom);
    ctx.stroke();


    // =========================================================================
    // 2. SEGMENT INTERVAL SPLITTING (when accents overlap)
    // =========================================================================

    // -- I. WIDTH (X-Axis Segmenting) --
    const xCuts = [xLeft, xRight];
    subAreas.forEach((other) => {
      if (other.id === sa.id) return;
      
      // Determine if they intersect in 2D
      const intersects = sa.x < other.x + other.width &&
                         sa.x + sa.width > other.x &&
                         sa.y < other.y + other.height &&
                         sa.y + sa.height > other.y;
      
      if (intersects) {
        const otherCanvasLeftX = mapToCanvas(other.x, other.y, viewport).x;
        const otherCanvasRightX = mapToCanvas(other.x + other.width, other.y, viewport).x;

        if (otherCanvasLeftX > xLeft && otherCanvasLeftX < xRight) {
          xCuts.push(otherCanvasLeftX);
        }
        if (otherCanvasRightX > xLeft && otherCanvasRightX < xRight) {
          xCuts.push(otherCanvasRightX);
        }
      }
    });

    xCuts.sort((a, b) => a - b);
    const uniqueXCuts: number[] = [];
    xCuts.forEach((val) => {
      if (uniqueXCuts.length === 0 || val - uniqueXCuts[uniqueXCuts.length - 1] > 1.5) {
        uniqueXCuts.push(val);
      }
    });

    // Draw segmented horizontal widths
    for (let k = 0; k < uniqueXCuts.length - 1; k++) {
      const x1 = uniqueXCuts[k];
      const x2 = uniqueXCuts[k + 1];
      if (Math.abs(x2 - x1) < 4) continue;

      // Determine physical segment interval of this chunk
      const px1 = sa.x + (x1 - xLeft) * scaleX;
      const px2 = sa.x + (x2 - xLeft) * scaleX;

      // Check if this physical segment is covered by any subarea drawn on top (higher index)
      let isSegmentCovered = false;
      for (let j = index + 1; j < subAreas.length; j++) {
        const other = subAreas[j];
        const coversHorizontally = px1 >= other.x - 0.05 && px2 <= other.x + other.width + 0.05;
        const coversVertically = other.y <= sa.y + 0.05 && other.y + other.height >= sa.y + sa.height - 0.05;
        if (coversHorizontally && coversVertically) {
          isSegmentCovered = true;
          break;
        }
      }
      if (isSegmentCovered) continue;

      ctx.strokeStyle = colorSlate;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, widthY);
      ctx.lineTo(x2, widthY);
      ctx.stroke();

      drawSlash({ x: x1, y: widthY });
      drawSlash({ x: x2, y: widthY });

      const pxLen = Math.abs(x2 - x1) * scaleX;
      const wText = `${Number(pxLen).toFixed(3)} ${unit}`;
      const midWX = (x1 + x2) / 2;

      ctx.save();
      ctx.font = '600 9px ui-monospace, SFMono-Regular, monospace';
      const wMetrics = ctx.measureText(wText);
      const wPadW = wMetrics.width + 6;
      const wPadH = 12;

      const useBg = sa.useLabelColor !== false;
      const bgColor = sa.labelColor || '#ffffff';
      const textColor = useBg 
        ? (isDarkColor(bgColor) ? '#ffffff' : colorSlate) 
        : colorSlate;

      if (useBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(midWX - wPadW / 2, widthY - wPadH / 2, wPadW, wPadH);
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wText, midWX, widthY);
      ctx.restore();
    }

    if (visibility.showLabels) {
      // Draw Name Label right below the horizontal width dimension line
      const nameY = widthY + 18;
      ctx.save();
      ctx.font = 'bold 9px ui-monospace, monospace';

      const rawType = (sa.accentType as string) || (sa.isCutout ? 'cutout' : (sa.hasSill ? 'niche' : 'flat'));
      const resolvedType = (rawType === 'bench' ? 'shelf' : rawType) as 'flat' | 'niche' | 'shelf' | 'cutout';
      const unitSymbol = unit === 'in' ? '"' : ' cm';

      const wFormatted = Number(sa.width).toFixed(1) + unitSymbol;
      const hFormatted = Number(sa.height).toFixed(1) + unitSymbol;

      let dimensionStr = `${wFormatted} W × ${hFormatted} H`;
      if (resolvedType === 'shelf' || resolvedType === 'niche') {
        let dVal = sa.depth;
        if (dVal === undefined || dVal === null) {
          if (resolvedType === 'shelf') dVal = 6.0;
          else if (resolvedType === 'niche') dVal = 3.5;
        }
        const dFormatted = Number(dVal).toFixed(1) + unitSymbol;
        dimensionStr += ` × ${dFormatted} D`;
      }

      const nameText = `${sa.name.toUpperCase()} [${dimensionStr}]`;
      const metrics = ctx.measureText(nameText);
      const padW = metrics.width + 8;
      const padH = 14;
      const midX = (xLeft + xRight) / 2;

      const useBg = sa.useLabelColor !== false;
      const bgColor = sa.labelColor || '#ffffff';
      const textColor = useBg 
        ? (isDarkColor(bgColor) ? '#ffffff' : '#475569') 
        : '#475569';

      if (useBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(midX - padW / 2, nameY - padH / 2, padW, padH);
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nameText, midX, nameY);
      ctx.restore();
    }


    // -- II. HEIGHT (Y-Axis Segmenting) --
    const yCuts = [yTop, yBottom];
    subAreas.forEach((other) => {
      if (other.id === sa.id) return;
      
      const intersects = sa.x < other.x + other.width &&
                         sa.x + sa.width > other.x &&
                         sa.y < other.y + other.height &&
                         sa.y + sa.height > other.y;
      
      if (intersects) {
        const otherCanvasTopY = mapToCanvas(other.x, other.y + other.height, viewport).y;
        const otherCanvasBottomY = mapToCanvas(other.x, other.y, viewport).y;

        if (otherCanvasTopY > yTop && otherCanvasTopY < yBottom) {
          yCuts.push(otherCanvasTopY);
        }
        if (otherCanvasBottomY > yTop && otherCanvasBottomY < yBottom) {
          yCuts.push(otherCanvasBottomY);
        }
      }
    });

    yCuts.sort((a, b) => a - b);
    const uniqueYCuts: number[] = [];
    yCuts.forEach((val) => {
      if (uniqueYCuts.length === 0 || val - uniqueYCuts[uniqueYCuts.length - 1] > 1.5) {
        uniqueYCuts.push(val);
      }
    });

    // Draw segmented vertical heights
    for (let k = 0; k < uniqueYCuts.length - 1; k++) {
      const y1 = uniqueYCuts[k];
      const y2 = uniqueYCuts[k + 1];
      if (Math.abs(y2 - y1) < 4) continue;

      // Determine physical segment interval of this chunk
      const py1 = sa.y + (yBottom - y1) * scaleY;
      const py2 = sa.y + (yBottom - y2) * scaleY;
      const pMinY = Math.min(py1, py2);
      const pMaxY = Math.max(py1, py2);

      // Check if this physical segment is covered by any subarea drawn on top (higher index)
      let isSegmentCovered = false;
      for (let j = index + 1; j < subAreas.length; j++) {
        const other = subAreas[j];
        const coversVertically = pMinY >= other.y - 0.05 && pMaxY <= other.y + other.height + 0.05;
        const coversHorizontally = other.x <= sa.x + 0.05 && other.x + other.width >= sa.x + sa.width - 0.05;
        if (coversVertically && coversHorizontally) {
          isSegmentCovered = true;
          break;
        }
      }
      if (isSegmentCovered) continue;

      ctx.strokeStyle = colorSlate;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(heightX, y1);
      ctx.lineTo(heightX, y2);
      ctx.stroke();

      drawSlash({ x: heightX, y: y1 });
      drawSlash({ x: heightX, y: y2 });

      const pxLen = Math.abs(y2 - y1) * scaleY;
      const hText = `${Number(pxLen).toFixed(3)} ${unit}`;
      const midHY = (y1 + y2) / 2;

      ctx.save();
      ctx.translate(heightX, midHY);
      ctx.rotate(-Math.PI / 2);
      ctx.font = '600 9px ui-monospace, SFMono-Regular, monospace';
      const hMetrics = ctx.measureText(hText);
      const hPadW = hMetrics.width + 6;
      const hPadH = 12;

      const useBg = sa.useLabelColor !== false;
      const bgColor = sa.labelColor || '#ffffff';
      const textColor = useBg 
        ? (isDarkColor(bgColor) ? '#ffffff' : colorSlate) 
        : colorSlate;

      if (useBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(-hPadW / 2, -hPadH / 2, hPadW, hPadH);
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hText, 0, 0);
      ctx.restore();
    }


    // =========================================================================
    // 3. LOCATION MARKERS (DISTANCES FROM WALL EDGES)
    // Only drawn if requested, and only if the distance is greater than 0
    // =========================================================================
    if (showAccentDistances) {
      
      // X-Distance (Distance from Left Wall): draw horizontal line from X = 0 to X = subArea.x
      if (sa.x > 0.01) {
        const wallLeftX = mapToCanvas(0, sa.y, viewport).x;
        const locY_X_coord = yBottom + 15;

        // Extension lines for marker coordinates alignment
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(xLeft, yBottom + 2);
        ctx.lineTo(xLeft, yBottom + 18);
        ctx.moveTo(wallLeftX, yBottom + 2);
        ctx.lineTo(wallLeftX, yBottom + 18);
        ctx.stroke();

        ctx.strokeStyle = '#c2410c'; // distinct rusty orange
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(wallLeftX, locY_X_coord);
        ctx.lineTo(xLeft, locY_X_coord);
        ctx.stroke();
        ctx.setLineDash([]);

        drawSlash({ x: wallLeftX, y: locY_X_coord });
        drawSlash({ x: xLeft, y: locY_X_coord });

        const xDistText = `${Number(sa.x).toFixed(3)} ${unit}`;
        const midX_X = (wallLeftX + xLeft) / 2;

        ctx.save();
        ctx.font = '700 9px ui-monospace, SFMono-Regular, monospace';
        const xDistMetrics = ctx.measureText(xDistText);
        const xDistPadW = xDistMetrics.width + 6;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX_X - xDistPadW / 2, locY_X_coord - 6, xDistPadW, 12);

        ctx.fillStyle = '#c2410c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(xDistText, midX_X, locY_X_coord);
        ctx.restore();
      }

      // Y-Distance (Distance from Bottom Wall): draw vertical line from Y = 0 up to subArea.y
      if (sa.y > 0.01) {
        const wallBottomY = mapToCanvas(sa.x, 0, viewport).y;
        const locX_Y_coord = xLeft - 15;

        // Extension lines for marker coordinates alignment
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(xLeft - 2, yBottom);
        ctx.lineTo(xLeft - 18, yBottom);
        ctx.moveTo(xLeft - 2, wallBottomY);
        ctx.lineTo(xLeft - 18, wallBottomY);
        ctx.stroke();

        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(locX_Y_coord, wallBottomY);
        ctx.lineTo(locX_Y_coord, yBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        drawSlash({ x: locX_Y_coord, y: wallBottomY });
        drawSlash({ x: locX_Y_coord, y: yBottom });

        const yDistText = `${Number(sa.y).toFixed(3)} ${unit}`;
        const midY_Y = (wallBottomY + yBottom) / 2;

        ctx.save();
        ctx.translate(locX_Y_coord, midY_Y);
        ctx.rotate(-Math.PI / 2);
        ctx.font = '700 9px ui-monospace, SFMono-Regular, monospace';
        const yDistMetrics = ctx.measureText(yDistText);
        const yDistPadW = yDistMetrics.width + 6;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-yDistPadW / 2, -6, yDistPadW, 12);

        ctx.fillStyle = '#c2410c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(yDistText, 0, 0);
        ctx.restore();
      }
    }

    // =========================================================================
    // 4. CORNER (INTERIOR) ANGLES FOR SUBAREA VERTICES
    // =========================================================================
    const saVertices = sa.vertices && sa.vertices.length >= 3 ? sa.vertices : [
      { x: sa.x, y: sa.y },
      { x: sa.x + sa.width, y: sa.y },
      { x: sa.x + sa.width, y: sa.y + sa.height },
      { x: sa.x, y: sa.y + sa.height },
    ];

    if (saVertices.length >= 3) {
      const n = saVertices.length;
      const isCCW = getSignedArea(saVertices) >= 0;

      for (let i = 0; i < n; i++) {
        const prev = saVertices[(i - 1 + n) % n];
        const curr = saVertices[i];
        const next = saVertices[(i + 1) % n];

        // Skip curve nodes so we don't draw weird angles at arch control points
        if ((curr as any).isCurveNode || (prev as any).isCurveNode || (next as any).isCurveNode) continue;

        const currentAngle = getInternalAngle(prev, curr, next, isCCW);
        if (isNaN(currentAngle)) continue;
        if (Math.abs(currentAngle - 180) <= 0.5) continue;

        if (angleDisplayMode === 'none') continue;
        if (angleDisplayMode === 'non-standard') {
          const remainder = Math.abs(currentAngle % 90);
          const isStandard = remainder < 0.2 || remainder > 89.8;
          if (isStandard) continue;
        }

        // Calculate screen/canvas positions
        const cpPrev = mapToCanvas(prev.x, prev.y, viewport);
        const cpCurr = mapToCanvas(curr.x, curr.y, viewport);
        const cpNext = mapToCanvas(next.x, next.y, viewport);

        // Calculate angle of incoming and outgoing lines on canvas
        const angleBA = Math.atan2(cpPrev.y - cpCurr.y, cpPrev.x - cpCurr.x);
        const angleBC = Math.atan2(cpNext.y - cpCurr.y, cpNext.x - cpCurr.x);

        // Bisector for label placement
        let bisectAngle = (angleBA + angleBC) / 2;
        let diff = Math.abs(angleBA - angleBC);
        if (diff > Math.PI) {
          bisectAngle += Math.PI;
        }
        if (currentAngle > 180) {
          bisectAngle += Math.PI;
        }

        ctx.save();

        ctx.strokeStyle = isPdf ? '#000000' : 'rgba(79, 70, 229, 0.4)'; // Subtle translucent indigo matching theme
        ctx.lineWidth = 1.2;

        const arcRadius = 14;
        ctx.beginPath();
        let startArc = angleBC;
        let endArc = angleBA;
        let sweep = endArc - startArc;
        while (sweep < 0) sweep += 2 * Math.PI;
        if (sweep > Math.PI) {
          startArc = angleBA;
          endArc = angleBC;
        }
        ctx.arc(cpCurr.x, cpCurr.y, arcRadius, startArc, endArc, false);
        ctx.stroke();

        const angleText = `${formatVisualAngle(currentAngle)}°`;
        const badgeDistance = 24;
        const labelX = cpCurr.x + Math.cos(bisectAngle) * badgeDistance;
        const labelY = cpCurr.y + Math.sin(bisectAngle) * badgeDistance;

        ctx.font = '600 8.5px ui-monospace, SFMono-Regular, monospace';
        const badgeMetrics = ctx.measureText(angleText);
        const bPadW = badgeMetrics.width + 5;
        const bPadH = 12;

        ctx.fillStyle = isPdf ? '#ffffff' : (hasBgImage ? 'rgba(255,255,255,0.92)' : 'rgba(241, 245, 249, 0.9)');
        ctx.beginPath();
        ctx.roundRect(labelX - bPadW / 2, labelY - bPadH / 2, bPadW, bPadH, 3);
        ctx.fill();

        ctx.fillStyle = isPdf ? '#000000' : '#4f46e5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(angleText, labelX, labelY);
        ctx.restore();
      }
    }
  });
}
