/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileShape, ColorPattern, ColorCard } from '../../../types';

/**
 * Determines which color a specific tile should use based on colorPattern and coords.
 */
export function getPatternColor(
  tileColors: (string | ColorCard)[],
  colorPattern: ColorPattern,
  tile: { center: { x: number; y: number }; shape?: TileShape; vertices?: { x: number; y: number }[]; cubeFace?: 'top' | 'left' | 'right' },
  tileWidth: number,
  tileHeight: number,
  groutWidth: number = 0.125,
  tilesPerStripe: number = 1
): string | ColorCard {
  if (!tileColors || tileColors.length === 0) return '#ffffff';

  let colorIndex = 0;
  const numColors = tileColors.length;

  switch (colorPattern) {
    case 'single':
      colorIndex = 0;
      break;
    case '3d_cube_3_colors': {
      if (tile.cubeFace === 'top') {
        colorIndex = 0;
      } else if (tile.cubeFace === 'left') {
        colorIndex = 1 % numColors;
      } else if (tile.cubeFace === 'right') {
        colorIndex = 2 % numColors;
      } else {
        colorIndex = 0;
      }
      break;
    }
    case 'random': {
      // Deterministic pseudo-randomness for tile grid
      // Using a stronger hash function to prevent repeating/banding patterns
      let nx = Math.floor(tile.center.x * 1000);
      let ny = Math.floor(tile.center.y * 1000);
      let hash = nx * 374761393 + ny * 668265263;
      hash = (hash ^ (hash >> 13)) * 1274126177;
      const randValue = (hash & 0x7fffffff) / 0x7fffffff;
      colorIndex = Math.floor(randValue * numColors);
      break;
    }
    case 'checkerboard':
      const chkCol = Math.round(tile.center.x / (tileWidth + groutWidth));
      const chkRow = Math.round(tile.center.y / (tileHeight + groutWidth));
      // Continuous modulo for negatives
      const safeCol = ((chkCol % 2) + 2) % 2;
      const safeRow = ((chkRow % 2) + 2) % 2;
      colorIndex = (safeCol + safeRow) % 2;
      break;
    case 'horizontal_stripes': {
      let yStep = tileHeight + groutWidth;
      if (tile.shape === 'hexagon') {
        const ys = tile.vertices && tile.vertices.length > 0 ? tile.vertices.map((v) => v.y) : [];
        const hexHeight = ys.length > 0 ? (Math.max(...ys) - Math.min(...ys)) : (tileHeight || (tileWidth * (2 / Math.sqrt(3))));
        yStep = 0.75 * (hexHeight + groutWidth);
      }
      const row = Math.round(tile.center.y / yStep);
      const stripeRow = Math.floor(row / Math.max(1, tilesPerStripe));
      // Continuous modulo loop for negatives
      colorIndex = ((stripeRow % numColors) + numColors) % numColors;
      break;
    }
    case 'vertical_stripes':
      const col = Math.round(tile.center.x / (tileWidth + groutWidth));
      const stripeCol = Math.floor(col / Math.max(1, tilesPerStripe));
      // Continuous modulo loop for negatives
      colorIndex = ((stripeCol % numColors) + numColors) % numColors;
      break;
  }

  return tileColors[colorIndex] || tileColors[0];
}
