/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Viewport {
  cornerX: number;
  cornerY: number;
  renderW: number;
  renderH: number;
  scale: number;
  minX?: number;
  minY?: number;
}

/**
 * Coordinate mapping: translates wall space coords to pixels on the canvas viewport
 */
export function mapToCanvas(ux: number, uy: number, viewport: Viewport) {
  const minX = viewport.minX || 0;
  const minY = viewport.minY || 0;
  return {
    x: viewport.cornerX + (ux - minX) * viewport.scale,
    y: (viewport.cornerY + viewport.renderH) - (uy - minY) * viewport.scale,
  };
}

/**
 * Coordinate mapping: translates canvas pixels back to wall space coords
 */
export function mapFromCanvas(cx: number, cy: number, viewport: Viewport) {
  const minX = viewport.minX || 0;
  const minY = viewport.minY || 0;
  return {
    x: ((cx - viewport.cornerX) / viewport.scale) + minX,
    y: ((viewport.cornerY + viewport.renderH - cy) / viewport.scale) + minY,
  };
}
