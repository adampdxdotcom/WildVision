/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BorderConfig } from '../../../types';
import { Viewport, mapToCanvas } from '../canvasUtils';

export function drawBorder(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; w: number; h: number },
  borderConfig: BorderConfig,
  isOutset: boolean,
  viewport: Viewport,
  angleRad: number = 0, // for subareas
  tileColor: string = '#1e293b',
  groutColor: string = '#ffffff',
  groutWidth: number = 0.125
) {
  if (!borderConfig.enabled) return;

  const thickness = Math.min(borderConfig.tileWidth, borderConfig.tileHeight);
  // Physical coordinates for outer bounds
  let outerX = bounds.x;
  let outerY = bounds.y;
  let outerW = bounds.w;
  let outerH = bounds.h;

  if (isOutset) {
    outerX -= thickness;
    outerY -= thickness;
    outerW += thickness * 2;
    outerH += thickness * 2;
  }

  const innerX = outerX + thickness;
  const innerY = outerY + thickness;
  const innerW = outerW - thickness * 2;
  const innerH = outerH - thickness * 2;

  // Helper to map logic to canvas
  const pt = (x: number, y: number) => {
    // If we have angleRad, we need to rotate around the center of the Bounds BEFORE mapping
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
    const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    return mapToCanvas(cx + rx, cy + ry, viewport);
  };

  const drawRegion = (pathPts: [number, number][], isHorizontal: boolean) => {
    ctx.save();
    ctx.beginPath();
    const p0 = pt(...pathPts[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pathPts.length; i++) {
        const p = pt(...pathPts[i]);
        ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = groutColor;
    ctx.fill();

    ctx.fillStyle = tileColor;

    const step = borderConfig.tileWidth + groutWidth;

    const countH = Math.ceil(outerW / step / 2) + 2;
    const countV = Math.ceil(outerH / step / 2) + 2;
    const countMax = Math.max(countH, countV);

    ctx.beginPath();
    for (let u = -countMax; u <= countMax; u++) {
       if (isHorizontal) {
           const cx = outerX + (outerW / 2) + u * step;
           const tx1 = cx - borderConfig.tileWidth / 2;
           const tx2 = cx + borderConfig.tileWidth / 2;
           const ty1 = outerY;
           const ty2 = outerY + outerH;
           
           const p1 = pt(tx1, ty1);
           const p2 = pt(tx2, ty1);
           const p3 = pt(tx2, ty2);
           const p4 = pt(tx1, ty2);

           ctx.moveTo(p1.x, p1.y);
           ctx.lineTo(p2.x, p2.y);
           ctx.lineTo(p3.x, p3.y);
           ctx.lineTo(p4.x, p4.y);
           ctx.closePath();
       } else {
           const cy = outerY + (outerH / 2) + u * step;
           const ty1 = cy - borderConfig.tileWidth / 2;
           const ty2 = cy + borderConfig.tileWidth / 2;
           const tx1 = outerX;
           const tx2 = outerX + outerW;
           
           const p1 = pt(tx1, ty1);
           const p2 = pt(tx2, ty1);
           const p3 = pt(tx2, ty2);
           const p4 = pt(tx1, ty2);

           ctx.moveTo(p1.x, p1.y);
           ctx.lineTo(p2.x, p2.y);
           ctx.lineTo(p3.x, p3.y);
           ctx.lineTo(p4.x, p4.y);
           ctx.closePath();
       }
    }
    ctx.fill();

    ctx.restore();
  };

  // Top Region
  if (borderConfig.cornerJoint === 'straight') {
      drawRegion([[outerX, outerY + outerH], [outerX + outerW, outerY + outerH], [outerX + outerW, innerY + innerH], [outerX, innerY + innerH]], true);
      // Bottom
      drawRegion([[outerX, innerY], [outerX + outerW, innerY], [outerX + outerW, outerY], [outerX, outerY]], true);
      // Left
      drawRegion([[outerX, innerY + innerH], [innerX, innerY + innerH], [innerX, innerY], [outerX, innerY]], false);
      // Right
      drawRegion([[innerX + innerW, innerY + innerH], [outerX + outerW, innerY + innerH], [outerX + outerW, innerY], [innerX + innerW, innerY]], false);
  } else {
      // Mitered (Spaced with grout gap)
      // Horizontal/Vertical shift to achieve perpendicular gap of groutWidth/2
      const m = (groutWidth / 2) * Math.SQRT2; 

      // Top
      drawRegion([
          [outerX + m, outerY + outerH], 
          [outerX + outerW - m, outerY + outerH], 
          [innerX + innerW - m, innerY + innerH], 
          [innerX + m, innerY + innerH]
      ], true);
      
      // Bottom
      drawRegion([
          [innerX + m, innerY], 
          [innerX + innerW - m, innerY], 
          [outerX + outerW - m, outerY], 
          [outerX + m, outerY]
      ], true);
      
      // Left
      drawRegion([
          [outerX, outerY + outerH - m], 
          [innerX, innerY + innerH - m], 
          [innerX, innerY + m], 
          [outerX, outerY + m]
      ], false);
      
      // Right
      drawRegion([
          [innerX + innerW, innerY + innerH - m], 
          [outerX + outerW, outerY + outerH - m], 
          [outerX + outerW, outerY + m], 
          [innerX + innerW, innerY + m]
      ], false);
  }
}
