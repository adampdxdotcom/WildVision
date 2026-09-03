/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasurementUnit, WallExtension, FoldLine, Stitch } from '../../types';
import { Viewport, mapToCanvas } from './canvasUtils';
import { useAppStore } from '../../store/useAppStore';

/**
 * Defines a multi-rectangle path combining the main wall and any extensions
 */
export function defineCombinedWallPath(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  wallWidth: number,
  wallHeight: number,
  extensions: WallExtension[] = [],
  wallBoundaryShape: 'rectangle' | 'arch' | 'oval' | 'custom_arches' = 'rectangle',
  wallArchHeight?: number,
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean },
  wallArchDepth?: number,
  insetThickness: number = 0,
  wallVertices?: {x: number, y: number}[]
) {
  const scale = viewport.scale;
  const renderH = viewport.renderH;
  const minX = viewport.minX || 0;
  const minY = viewport.minY || 0;

  const insetPx = insetThickness * scale;

  const xLeft = viewport.cornerX + (0 - minX) * scale + insetPx;
  const yBottom = viewport.cornerY + (renderH - (0 - minY) * scale) - insetPx;
  const yTop = viewport.cornerY + (renderH - (wallHeight - minY) * scale) + insetPx;
  const rW = Math.max(0, wallWidth * scale - 2 * insetPx);
  const rH = Math.max(0, wallHeight * scale - 2 * insetPx);
  const archPx = (wallArchHeight || wallWidth / 2) * scale;
  const xRight = xLeft + rW;

  ctx.beginPath();

  switch (wallBoundaryShape) {
    case 'oval':
      ctx.ellipse(xLeft + rW / 2, yTop + rH / 2, rW / 2, rH / 2, 0, 0, Math.PI * 2);
      break;
    case 'arch':
      ctx.moveTo(xLeft, yBottom);
      ctx.lineTo(xLeft + rW, yBottom);
      ctx.lineTo(xLeft + rW, yTop + archPx);
      ctx.ellipse(xLeft + rW / 2, yTop + archPx, rW / 2, archPx, 0, 0, Math.PI, true);
      ctx.closePath();
      break;
    case 'custom_arches': {
      const depthPx = Math.max(0, (wallArchDepth || 0) * viewport.scale);
      const innerXMin = xLeft + (wallActiveArches?.left ? depthPx : 0);
      const innerXMax = xRight - (wallActiveArches?.right ? depthPx : 0);
      const innerYMin = yTop + (wallActiveArches?.top ? depthPx : 0);
      const innerYMax = yBottom - (wallActiveArches?.bottom ? depthPx : 0);

      const rxHorizontal = Math.max(0, (innerXMax - innerXMin) / 2);
      const ryHorizontal = depthPx;
      const rxVertical = depthPx;
      const ryVertical = Math.max(0, (innerYMax - innerYMin) / 2);

      ctx.moveTo(innerXMin, innerYMin);
      
      // Top Edge
      if (wallActiveArches?.top) {
        ctx.ellipse((innerXMin + innerXMax) / 2, innerYMin, rxHorizontal, ryHorizontal, 0, Math.PI, Math.PI * 2, false);
      } else {
        ctx.lineTo(innerXMax, innerYMin);
      }
      
      // Right Edge
      if (wallActiveArches?.right) {
        ctx.ellipse(innerXMax, (innerYMin + innerYMax) / 2, rxVertical, ryVertical, 0, -Math.PI / 2, Math.PI / 2, false);
      } else {
        ctx.lineTo(innerXMax, innerYMax);
      }
      
      // Bottom Edge
      if (wallActiveArches?.bottom) {
        ctx.ellipse((innerXMin + innerXMax) / 2, innerYMax, rxHorizontal, ryHorizontal, 0, 0, Math.PI, false);
      } else {
        ctx.lineTo(innerXMin, innerYMax);
      }
      
      // Left Edge
      if (wallActiveArches?.left) {
        ctx.ellipse(innerXMin, (innerYMin + innerYMax) / 2, rxVertical, ryVertical, 0, Math.PI / 2, Math.PI * 1.5, false);
      } else {
        ctx.lineTo(innerXMin, innerYMin);
      }
      ctx.closePath();
      break;
    }
    case 'rectangle':
    default:
      if (wallVertices && wallVertices.length >= 3) {
        let cx = 0, cy = 0;
        wallVertices.forEach(v => { cx += v.x; cy += v.y; });
        cx /= wallVertices.length;
        cy /= wallVertices.length;
        
        const scaledPts = wallVertices.map(v => {
          let scaledX = v.x;
          let scaledY = v.y;
          if (insetThickness > 0 && wallWidth > 0 && wallHeight > 0) {
            const ratioX = (wallWidth - 2 * insetThickness) / wallWidth;
            const ratioY = (wallHeight - 2 * insetThickness) / wallHeight;
            scaledX = cx + (v.x - cx) * ratioX;
            scaledY = cy + (v.y - cy) * ratioY;
          }
          return {
            x: viewport.cornerX + (scaledX - minX) * scale,
            y: viewport.cornerY + (renderH - (scaledY - minY) * scale),
            isCurveNode: (v as any).isCurveNode
          };
        });

        let startIndex = scaledPts.findIndex(p => !p.isCurveNode);
        if (startIndex === -1) startIndex = 0;

        const pts = [];
        for (let i = 0; i < scaledPts.length; i++) {
            pts.push(scaledPts[(startIndex + i) % scaledPts.length]);
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length; i++) {
           const nextPt = pts[(i + 1) % pts.length];
           if (nextPt.isCurveNode) {
               const A = pts[i];
               const B = nextPt;
               const C = pts[(i + 2) % pts.length];
               
               const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
               if (Math.abs(d) > 1e-6) {
                   const cxArc = ((A.x*A.x + A.y*A.y) * (B.y - C.y) + (B.x*B.x + B.y*B.y) * (C.y - A.y) + (C.x*C.x + C.y*C.y) * (A.y - B.y)) / d;
                   const cyArc = ((A.x*A.x + A.y*A.y) * (C.x - B.x) + (B.x*B.x + B.y*B.y) * (A.x - C.x) + (C.x*C.x + C.y*C.y) * (B.x - A.x)) / d;
                   const rArc = Math.sqrt(Math.pow(cxArc - A.x, 2) + Math.pow(cyArc - A.y, 2));

                   let startAngle = Math.atan2(A.y - cyArc, A.x - cxArc);
                   let endAngle = Math.atan2(C.y - cyArc, C.x - cxArc);
                   let midAngle = Math.atan2(B.y - cyArc, B.x - cxArc);

                   let diff = endAngle - startAngle;
                   while (diff < 0) diff += 2 * Math.PI;
                   let midDiff = midAngle - startAngle;
                   while (midDiff < 0) midDiff += 2 * Math.PI;
                   
                   const ccw = midDiff > diff;
                   ctx.arc(cxArc, cyArc, rArc, startAngle, endAngle, ccw);
               } else {
                   ctx.lineTo(C.x, C.y);
               }
               i++; // skip B
           } else {
               ctx.lineTo(nextPt.x, nextPt.y);
           }
        }
        ctx.closePath();
      } else {
        ctx.rect(xLeft, yTop, rW, rH);
      }
      break;
  }

  extensions.forEach((ext) => {
    // If it's a cutout-like thing, we might want to inset differently? Actually extensions expand the wall.
    // Insetting extensions:
    const extLeft = viewport.cornerX + (ext.x - minX) * scale + insetPx;
    const extBottom = viewport.cornerY + (renderH - (ext.y - minY) * scale) - insetPx;
    const extTop = viewport.cornerY + (renderH - (ext.y + ext.height - minY) * scale) + insetPx;
    const extW = Math.max(0, ext.width * scale - 2 * insetPx);
    const extH = Math.max(0, ext.height * scale - 2 * insetPx);
    const extArchPx = (ext.archHeight || ext.width / 2) * scale;

    switch (ext.boundaryShape || 'rectangle') {
      case 'oval':
        ctx.ellipse(extLeft + extW / 2, extTop + extH / 2, extW / 2, extH / 2, 0, 0, Math.PI * 2);
        break;
      case 'arch': {
        const dir = ext.archDirection || 'top';
        const xLeft = extLeft;
        const xRight = extLeft + extW;
        const yTop = extTop;
        const yBottom = extBottom;
        const rW = extW;
        const rH = extH;
        const archPx = extArchPx;

        if (dir === 'top') {
          ctx.moveTo(xLeft, yBottom);
          ctx.lineTo(xRight, yBottom);
          ctx.lineTo(xRight, yTop + archPx);
          ctx.ellipse(xLeft + rW / 2, yTop + archPx, rW / 2, archPx, 0, 0, Math.PI, true);
          ctx.closePath();
        } else if (dir === 'bottom') {
          ctx.moveTo(xLeft, yTop);
          ctx.lineTo(xRight, yTop);
          ctx.lineTo(xRight, yBottom - archPx);
          ctx.ellipse(xLeft + rW / 2, yBottom - archPx, rW / 2, archPx, 0, 0, Math.PI, false);
          ctx.closePath();
        } else if (dir === 'right') {
          ctx.moveTo(xLeft, yTop);
          ctx.lineTo(xRight - archPx, yTop);
          ctx.ellipse(xRight - archPx, yTop + rH / 2, archPx, rH / 2, 0, -Math.PI / 2, Math.PI / 2, false);
          ctx.lineTo(xLeft, yBottom);
          ctx.closePath();
        } else if (dir === 'left') {
          ctx.moveTo(xRight, yTop);
          ctx.lineTo(xLeft + archPx, yTop);
          ctx.ellipse(xLeft + archPx, yTop + rH / 2, archPx, rH / 2, 0, -Math.PI / 2, Math.PI / 2, true);
          ctx.lineTo(xRight, yBottom);
          ctx.closePath();
        }
        break;
      }
      case 'rectangle':
      default:
        ctx.rect(extLeft, extTop, extW, extH);
        break;
    }
  });
}

/**
 * Draws the master classroom/workshop floor design grid
 */
export function drawCanvasBacking(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hasBgImage?: boolean,
  isPdf?: boolean,
  viewport?: Viewport,
  unit?: MeasurementUnit,
  panOffsetX: number = 0,
  panOffsetY: number = 0
) {
  // Clear background
  if (!hasBgImage) {
    if (isPdf) {
      ctx.fillStyle = '#ffffff'; // Pristine white for print
    } else {
      ctx.fillStyle = '#f1f5f9';
    }
    // We fill a larger area to cover translated contexts
    ctx.fillRect(-Math.abs(panOffsetX) - 1000, -Math.abs(panOffsetY) - 1000, width + Math.abs(panOffsetX)*2 + 2000, height + Math.abs(panOffsetY)*2 + 2000);
  }

  // If this is a PDF rendering, do not draw the background grid or frame
  if (isPdf) {
    return;
  }

  const expand = 2000;
  const drawMinX = -expand;
  const drawMinY = -expand;
  const drawMaxX = width + expand;
  const drawMaxY = height + expand;

  // Outer framing anchor
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Dynamic engineering grids
  ctx.strokeStyle = '#e2e8f0';

  if (viewport && unit && viewport.scale > 0.001) {
    // 12" for imperial vs 10cm for metric
    const gridSizePhysical = unit === 'cm' ? 10 : 12;
    const minX = viewport.minX || 0;
    const minY = viewport.minY || 0;

    // Convert canvas corner bounds to physical coordinate bounds (expanded)
    const xPhysMin = ((drawMinX - viewport.cornerX) / viewport.scale) + minX;
    const xPhysMax = ((drawMaxX - viewport.cornerX) / viewport.scale) + minX;
    const yPhysMin = (((viewport.cornerY + viewport.renderH) - drawMaxY) / viewport.scale) + minY;
    const yPhysMax = (((viewport.cornerY + viewport.renderH) - drawMinY) / viewport.scale) + minY;

    // Draw vertical grid lines aligned to physical coordinates
    const startX = Math.ceil(xPhysMin / gridSizePhysical) * gridSizePhysical;
    ctx.beginPath();
    for (let xp = startX; xp <= xPhysMax; xp += gridSizePhysical) {
      const canvasX = viewport.cornerX + (xp - minX) * viewport.scale;
      ctx.moveTo(canvasX, drawMinY);
      ctx.lineTo(canvasX, drawMaxY);
    }
    ctx.stroke();

    // Draw horizontal grid lines aligned to physical coordinates
    const startY = Math.ceil(yPhysMin / gridSizePhysical) * gridSizePhysical;
    ctx.beginPath();
    for (let yp = startY; yp <= yPhysMax; yp += gridSizePhysical) {
      const canvasY = (viewport.cornerY + viewport.renderH) - (yp - minY) * viewport.scale;
      ctx.moveTo(drawMinX, canvasY);
      ctx.lineTo(drawMaxX, canvasY);
    }
    ctx.stroke();

    // Draw subtle Grid Size Label at the bottom center inside the border
    ctx.save();
    ctx.fillStyle = '#8AA2C3'; // matches ctx.strokeStyle of the grid
    ctx.font = '500 12px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const gridText = unit === 'cm' ? 'Grid = 10cm x 10cm' : 'Grid = 12" x 12"';
    ctx.fillText(gridText, width / 2, height - 16);
    ctx.restore();

  } else {
    // Fallback static pixel-based editor grid
    ctx.beginPath();
    for (let g = 20; g < drawMaxX; g += 40) {
      ctx.moveTo(g, drawMinY);
      ctx.lineTo(g, drawMaxY);
    }
    for (let g = 20; g < drawMaxY; g += 40) {
      ctx.moveTo(drawMinX, g);
      ctx.lineTo(drawMaxX, g);
    }
    ctx.stroke();
  }
}

/**
 * Draws the empty wall or solid colored backing under tiles
 */
export function drawWallBackingFrame(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  groutColor: string,
  isPainted: boolean,
  wallWidth: number,
  wallHeight: number,
  extensions: WallExtension[] = [],
  wallBoundaryShape: 'rectangle' | 'arch' | 'oval' | 'custom_arches' = 'rectangle',
  wallArchHeight?: number,
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean },
  wallArchDepth?: number,
  wallVertices?: {x: number, y: number}[]
) {
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = groutColor;
  ctx.beginPath();
  defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, extensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
  ctx.fill();
  ctx.restore();

  if (!isPainted) {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.beginPath();
    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, extensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      "Click 'Paint Canvas' to layout tiles",
      viewport.cornerX + viewport.renderW / 2,
      viewport.cornerY + viewport.renderH / 2
    );

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    defineCombinedWallPath(ctx, viewport, wallWidth, wallHeight, extensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
    ctx.stroke();
  }
}

export const drawFoldLines = (
  ctx: CanvasRenderingContext2D,
  foldLines: FoldLine[],
  wallVertices: {x:number; y:number}[],
  wallToScreen: (x:number, y:number) => {px:number, py:number},
  hoveredFoldIndex?: number | null,
  activeTool?: string
) => {
  const isPublicViewer = useAppStore.getState?.().isPublicViewer;
  if (isPublicViewer) return;

  const visibility = useAppStore.getState?.().viewSettings?.canvas || {
    showNodes: true,
    showDimensions: true,
    showAngles: true,
    showLabels: true,
    showFoldLines: true,
  };
  if (!visibility.showFoldLines) return;

  if (!foldLines || foldLines.length === 0) return;

  const isFoldActive = activeTool === 'fold-line';

  for (let idx = 0; idx < foldLines.length; idx++) {
    const fold = foldLines[idx];
    const startNode = wallVertices[fold.startNodeIndex];
    const endNode = wallVertices[fold.endNodeIndex];

    if (startNode && endNode) {
      const p1 = wallToScreen(startNode.x, startNode.y);
      const p2 = wallToScreen(endNode.x, endNode.y);

      ctx.save();
      
      const isHovered = isFoldActive && hoveredFoldIndex === idx;
      if (isHovered) {
        ctx.strokeStyle = '#ef4444'; // Red highlight danger color
        ctx.lineWidth = 3.5;
        ctx.setLineDash([]); // solid line for prominence
      } else if (isFoldActive) {
        ctx.strokeStyle = '#6366f1'; // prominent indigo color when active fold-line tool is active to show they are interactive
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
      } else {
        ctx.strokeStyle = '#94a3b8'; // standard gray dashed fold lines when fold-line tool is inactive
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
      }

      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
      ctx.restore();
    }
  }
};

export const drawStitches = (
  ctx: CanvasRenderingContext2D,
  stitches: Stitch[],
  wallVertices: {x:number; y:number}[],
  wallToScreen: (x:number, y:number) => {px:number, py:number},
  draftStitchNodeIndex: number | null,
  mouseScreenPos: {px: number, py: number} | null
) => {
  ctx.save();

  // Draw defined stitches
  if (stitches && stitches.length > 0) {
    for (const stitch of stitches) {
      if (stitch.nodeAIndex >= wallVertices.length || stitch.nodeBIndex >= wallVertices.length) continue;
      const startNode = wallVertices[stitch.nodeAIndex];
      const endNode = wallVertices[stitch.nodeBIndex];

      if (startNode && endNode) {
        const p1 = wallToScreen(startNode.x, startNode.y);
        const p2 = wallToScreen(endNode.x, endNode.y);

        // Draw a dotted fuchsia line
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        // Draw a secondary small "Zipper teeth" pattern
        ctx.fillStyle = '#d946ef';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(p1.px, p1.py, 3, 0, Math.PI * 2);
        ctx.arc(p2.px, p2.py, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw a small zip ring in the middle
        const midX = (p1.px + p2.px) / 2;
        const midY = (p1.py + p2.py) / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#d946ef';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  // Draw drafting preview stitch
  if (draftStitchNodeIndex !== null && draftStitchNodeIndex !== undefined && mouseScreenPos) {
    if (draftStitchNodeIndex < wallVertices.length) {
      const draftNode = wallVertices[draftStitchNodeIndex];
      if (draftNode) {
        const p1 = wallToScreen(draftNode.x, draftNode.y);
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(mouseScreenPos.px, mouseScreenPos.py);
        ctx.stroke();

        // Draw draft destination circle
        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.arc(mouseScreenPos.px, mouseScreenPos.py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
};


