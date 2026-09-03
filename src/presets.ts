/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutPreset } from './types';

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'subway-backsplash',
    name: 'Subway Backsplash',
    description: 'Classic 3" x 6" subway tiles in running bond (offset 50%) for a timeless kitchen look.',
    wallWidth: 96,
    wallHeight: 24,
    shape: 'rectangle',
    tileWidth: 6,
    tileHeight: 3,
    pattern: 'running_50',
    groutWidth: 0.125, // 1/8 inch
    tileColors: ['#f8fafc'], // Clean glossy white
    colorPattern: 'single',
    groutColor: '#94a3b8', // Slate grey high contrast
    tileName: 'White Gloss Ceramic Subway',
  },
  {
    id: 'bathroom-shower-wall',
    name: 'Modern Large Format Shower',
    description: 'Crisp, contemporary 12" x 24" stacked tiles for a clean, spacious shower partition.',
    wallWidth: 60,
    wallHeight: 96,
    shape: 'rectangle',
    tileWidth: 24,
    tileHeight: 12,
    pattern: 'stack',
    groutWidth: 0.0625, // 1/16 inch
    tileColors: ['#1e293b'], // Deep charcoal
    colorPattern: 'single',
    groutColor: '#475569', // Medium grey
    tileName: 'Charcoal Large Format Slate',
  },
  {
    id: 'emerald-hexagon',
    name: 'Emerald Hex Accent Wall',
    description: 'Sleek 5" hexagonal tiles in emerald green with gold-accented grout. High appeal!',
    wallWidth: 72,
    wallHeight: 72,
    shape: 'hexagon',
    tileWidth: 5, // size / width
    tileHeight: 5,
    pattern: 'stack', // hexagon pattern is inherently tessellated
    groutWidth: 0.1875, // 3/16 inch
    tileColors: ['#0f766e'], // Teal/emerald
    colorPattern: 'single',
    groutColor: '#fbbf24', // Subtle gold/yellow grout
    tileName: 'Emerald High Gloss Hexagon',
  },
  {
    id: 'bistro-square-grid',
    name: 'Bistro Checkered Square',
    description: 'Charming 4" x 4" traditional square grid tiles, perfect for bistro backsplashes.',
    wallWidth: 80,
    wallHeight: 40,
    shape: 'rectangle',
    tileWidth: 4,
    tileHeight: 4,
    pattern: 'stack',
    groutWidth: 0.125, // 1/8 inch
    tileColors: ['#ffffff'], // bright white
    colorPattern: 'single',
    groutColor: '#334155', // dark slate
    tileName: 'Traditional White Bistro Square',
  },
  {
    id: 'terracotta-fireplace',
    name: 'Terracotta Fireplace Surround',
    description: 'Warm 8" x 8" terracotta rustic square tiles suitable for a cozy hearth surround.',
    wallWidth: 50,
    wallHeight: 60,
    shape: 'rectangle',
    tileWidth: 8,
    tileHeight: 8,
    pattern: 'stack',
    groutWidth: 0.25, // 1/4 inch
    tileColors: ['#c2410c'], // terracotta orange/red
    colorPattern: 'single',
    groutColor: '#d1d5db', // light grey dust
    tileName: 'Rustic Terracotta Square',
  },
  {
    id: 'classic-fireplace-surround',
    name: 'Classic Fireplace Surround',
    description: 'Outward-folding 3D fireplace surround (-90° returns) with a centered recessed firebox niche and hearth bench.',
    wallWidth: 84,
    wallHeight: 72,
    shape: 'rectangle',
    tileWidth: 6,
    tileHeight: 6,
    pattern: 'stack',
    groutWidth: 0.125,
    tileColors: ['#1e293b'],
    colorPattern: 'single',
    groutColor: '#64748b',
    tileName: 'Slate Black Fireplace Tile',
    layoutFoldType: 'outward',
    foldLines: [
      { id: 'fold_left_return', startNodeIndex: 1, endNodeIndex: 6, foldAngle: -90 },
      { id: 'fold_right_return', startNodeIndex: 2, endNodeIndex: 5, foldAngle: -90 },
    ],
    wallVertices: [
      { x: -12, y: 0 },
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 72, y: 0 },
      { x: 72, y: 72 },
      { x: 60, y: 72 },
      { x: 0, y: 72 },
      { x: -12, y: 72 },
    ],
    subAreas: [
      {
        id: 'sa_firebox_niche',
        name: 'Firebox Recess',
        x: 12,
        y: 12,
        width: 36,
        height: 36,
        depth: 14,
        shape: 'rectangle',
        accentType: 'niche',
        hasSill: true,
        sillDepth: 14,
        sillTileName: 'Firebox Lining',
        sillTileColor: '#0f172a',
        tileColor: '#020617',
        tileColors: ['#0f172a'],
        colorPattern: 'single',
        groutColor: '#334155',
        groutWidth: 0.125,
        tileWidth: 6,
        tileHeight: 6,
        pattern: 'stack',
      },
    ],
  },
];
