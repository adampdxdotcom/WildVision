/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Viewport } from '../canvasUtils';

/**
 * Draws Cardinal edge indicators ("LEFT EDGE", "RIGHT EDGE", etc.)
 */
export function drawCompassIndicators(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport
) {
  ctx.fillStyle = '#64748b';
  ctx.font = '10px font-mono';
  ctx.textAlign = 'center';

  ctx.fillText("LEFT EDGE", viewport.cornerX - 30, viewport.cornerY + viewport.renderH / 2);
  ctx.fillText("RIGHT EDGE", viewport.cornerX + viewport.renderW + 36, viewport.cornerY + viewport.renderH / 2);
  ctx.fillText("TOP EDGE", viewport.cornerX + viewport.renderW / 2, viewport.cornerY - 26);
  ctx.fillText("BOTTOM EDGE", viewport.cornerX + viewport.renderW / 2, viewport.cornerY + viewport.renderH + 18);
}
