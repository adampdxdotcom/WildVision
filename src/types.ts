/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TileShape = 'rectangle' | 'hexagon' | 'round' | 'diamond' | 'chevron' | 'octagon_dot' | 'octagon' | 'triangle' | 'scallop' | 'pebble' | 'star' | 'cross' | 'custom_polygon';

export type RectanglePattern = 'stack' | 'running_50' | 'third_33' | 'herringbone' | 'basket_weave' | 'versailles' | '3d_cube' | 'star_lattice' | 'plank' | 'custom_json' | 'flatsket';

export interface CustomPatternTile {
  w: number;
  h: number;
  dx: number;
  dy: number;
  shape: TileShape;
  role: 'primary' | 'secondary';
  vertices?: { x: number; y: number }[];
}

export interface CustomPatternSchema {
  patternName: string;
  blockWidth: number;
  blockHeight: number;
  tiles: CustomPatternTile[];
}

export type MeasurementUnit = 'in' | 'cm';

export interface ColorCard {
  id: string;
  hex: string;
  pattern: {
    svgText: string | null;
    accentColor: string;
  } | null;
}

export type AngleDisplayMode = 'all' | 'non-standard' | 'none';

export type ColorVariation = 'V1' | 'V2' | 'V3' | 'V4';

export type TileFinish = 'matte' | 'satin' | 'glossy';

export type ColorPattern = 'single' | 'random' | 'random_pieces' | 'checkerboard' | 'horizontal_stripes' | 'vertical_stripes' | '3d_cube_3_colors' | 'paint';

export interface WallDimensions {
  width: number;
  height: number;
}

export interface TileDimensions {
  width: number;
  height: number;
  shape: TileShape;
  pattern: RectanglePattern;
}

export interface GroutJoint {
  width: number; // in inches or cm depending on unit
  color: string;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  wallWidth: number;
  wallHeight: number;
  wallVertices?: {x: number, y: number}[];
  shape: TileShape;
  tileWidth: number;
  tileHeight: number;
  pattern: RectanglePattern;
  groutWidth: number;
  tileColors: (string | ColorCard)[];
  colorPattern: ColorPattern;
  tilesPerStripe?: number;
  tileDotColor?: string;
  groutColor: string;
  tileName?: string;
  colorVariation?: ColorVariation;
}

export interface CustomColors {
  tileColor: string;
  tileBorderColor: string;
  groutColor: string;
  wallBorderColor: string;
  background: string;
}

export interface CutLocation {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BorderConfig {
  enabled: boolean;
  tileName: string;
  tileWidth: number;
  tileHeight: number;
  cornerJoint: 'mitered' | 'straight';
  color?: string;
}

export interface AreaReport {
  totalTilesUsed: number;
  fullTilesCount: number;
  cutTilesCount: number;
  primaryPieceCount?: number;
  secondaryPieceCount?: number;
  versaillesBreakdown?: { actualWidth: number; actualHeight: number; count: number }[];
  colorGroups?: { color: string; count: number; netArea: number; percentage: number }[];
  netArea?: number;
  // Sill / Frame stats
  hasSill?: boolean;
  sillArea?: number;
  sillTilesNeeded?: number;
  sillDepth?: number;
  sillTileName?: string;
  sillTileWidth?: number;
  sillTileHeight?: number;
  sillTileColor?: string;
  // Border stats
  borderArea?: number;
  borderTilesNeeded?: number;
  borderTileName?: string;
}

export interface SubArea {
  id: string;
  name: string;
  x: number;      // Position within wall in units
  y: number;      // Position within wall in units
  width: number;  // Dimension in units
  height: number; // Dimension in units
  shape: TileShape;
  tileWidth: number;
  tileHeight: number;
  pattern: RectanglePattern;
  tileColors: (string | ColorCard)[];
  tileColor?: string;
  colorPattern: ColorPattern;
  tilesPerStripe?: number;
  groutColor: string;
  groutWidth: number;
  shapeSettings?: Partial<Record<TileShape, any>>;
  offsetX: number; // local shift X
  offsetY: number; // local shift Y
  tileSpecular: boolean;
  tileFinish?: TileFinish;
  materialTexture?: string;
  angle?: number;
  tileName?: string;
  colorVariation?: ColorVariation;
  tileDotColor?: string;
  isStencil?: boolean;
  soldAsMosaic?: boolean;
  mosaicWidth?: number;
  mosaicHeight?: number;
  isCutout?: boolean;
  isPicket?: boolean;
  picketLength?: number;
  flatsketVerticalRows?: number;
  flatsketHorizontalRows?: number;
  customPatternPayload?: any;
  surfaceUrl?: string;

  // Sill / inner frame properties
  hasSill?: boolean;
  sillTileName?: string;
  sillTileShape?: 'Square' | 'Rectangle';
  sillTileWidth?: number;
  sillTileHeight?: number;
  sillTileColor?: string;
  sillDepth?: number;

  // Notes
  hasNotes?: boolean;
  notes?: string;
  locked?: boolean;
  visible?: boolean;
  useLabelColor?: boolean;
  labelColor?: string;
  boundaryShape?: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  archHeight?: number;
  activeArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  archDepth?: number;
  
  // Border
  border?: BorderConfig;
  
  // Custom polygon vertices
  vertices?: { x: number; y: number; isCurveNode?: boolean }[];

  // Render organically without clipping
  organicEdges?: boolean;
  accentType?: 'flat' | 'niche' | 'shelf' | 'cutout' | 'slab';
  depth?: number;
  linkedToId?: string;
  isLinked?: boolean;
}

export interface SubAreaReport {
  subAreaId: string;
  name: string;
  report: AreaReport;
}

export interface ComprehensiveReport {
  mainReport: AreaReport;
  subAreaReports: SubAreaReport[];
}

export interface WallExtension {
  id: string;
  name: string;
  x: number;      // Position relative to bottom-left of main wall in units
  y: number;      // Position relative to bottom-left of main wall in units
  width: number;  // Dimensions in units
  height: number; // Dimensions in units
  locked?: boolean;
  boundaryShape?: 'rectangle' | 'arch' | 'oval';
  archHeight?: number;
  archDirection?: 'top' | 'bottom' | 'left' | 'right';
}

export type ActiveTool = 'select' | 'pen' | 'pen-arch' | 'eraser' | 'marquee' | 'fold-line' | 'text' | 'stitch' | 'fill' | 'pin' | 'extrude' | 'paint';

export type ViewMode = '2d' | '3d' | 'pattern_studio' | 'presentation';

export interface CanvasLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface FoldLine {
  id: string;
  startNodeIndex: number;
  endNodeIndex: number;
}

export interface Stitch {
  id: string;
  nodeAIndex: number;
  nodeBIndex: number;
}

export interface PlaneState {
  show: boolean;
  color: string;
  position?: number;
  offset: number;
}

export interface PlanesConfig {
  ceiling: PlaneState;
  back: PlaneState;
  floor: PlaneState;
  left: PlaneState;
  right: PlaneState;
  pedestal: PlaneState;
  upper: PlaneState;
  facade: PlaneState;
}

export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface RoomColors {
  base: string;
  overrides: {
    floor: string;
    ceiling?: string;
    back?: string;
    left?: string;
    right?: string;
  };
}

export interface LayoutTransform {
  position: number[];
  attachedPlane: 'back' | 'left' | 'right' | 'floor' | 'ceiling';
  mountAnchor: 'back' | 'center' | 'front';
}

export interface BoxFaceConfig {
  color: string;
  image_url: string | null;
}

export interface BoxFaces {
  top?: BoxFaceConfig;
  bottom?: BoxFaceConfig;
  front?: BoxFaceConfig;
  back?: BoxFaceConfig;
  left?: BoxFaceConfig;
  right?: BoxFaceConfig;
}

export interface CustomSurface {
  id: string;
  name: string;
  url_or_base64: string;
  is_local_only: boolean;
}

export type SceneObjectType = 'tile_layout' | 'custom_box' | 'clay_model' | 'imported_layout';

export interface SceneObject {
  id: string;
  type: SceneObjectType;
  position: number[]; // [x, y, z]
  rotation: number[]; // [x, y, z]
  attachedPlane: string;
  color?: string;
  sourceType?: 'cloud' | 'local';
  sourceId?: string | null;
  isLocked?: boolean;
  cullTiles?: boolean;
  metadata?: {
    name?: string;
    showIn2D?: boolean;
    isWallLocked?: boolean;
    mountAnchor?: 'back' | 'center' | 'front';
    dimensions?: number[];
    color?: string;
    faces?: BoxFaces;
    modelUrl?: string;
    [key: string]: any;
  };
}

export interface LibraryModel {
  id: string;
  name: string;
  modelUrl: string;
  svgUrl?: string;
  dimensions: [number, number, number]; // width, height, depth in inches
  color: string;
  isCustom?: boolean;
}

export interface ViewSettingsState {
  canvas: {
    showNodes: boolean;
    showDimensions: boolean;
    showAngles: boolean;
    showLabels: boolean;
    showFoldLines: boolean;
    showTextures: boolean;
  };
  pdf: {
    disableTileColor: boolean;
    showQuantities: boolean;
    showAngles: boolean;
    showPricesOnPdf: boolean;
    pdfLayoutMode: 'auto' | '1page' | '2page' | '3page';
  };
  render: {
    enableReflection: boolean;
  };
}

export interface SavedProjectData {
  version: string;
  projectName: string;
  tileColorOverrides?: Record<string, number>;
  activeBrushColorIndex?: number;
  [key: string]: any;
}

export interface AppSettings {
  id: number;
  active_model?: string | null;
  base_prompt?: string | null;
  maintenance_mode?: boolean | null;
  subfloor_url?: string | null;
  subfloor_api_key?: string | null;
  created_at?: string;
  updated_at?: string;
}





