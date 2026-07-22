export interface Vertex {
  x: number; // Normalized coordinate: -0.5 to 0.5
  y: number; // Normalized coordinate: -0.5 to 0.5
}

export interface Tile {
  id: string;
  name: string;
  w: number;
  h: number;
  dx: number;
  dy: number;
  role: 'primary' | 'secondary';
  color: string;
  vertices: Vertex[];
}

export interface PatternSchema {
  patternName: string;
  blockWidth: number;
  blockHeight: number;
  tiles: Tile[];
}

export interface PatternBuilderState {
  patternName: string;
  blockWidth: number;
  blockHeight: number;
  tiles: Tile[];
  activeTileIndex: number;
  selectedVertexIndex: number | null;
  snapToGrid: boolean;
  snapResolution: number; // e.g. 0.05 or 0.025
  gridSize: number; // Visual helper: number of grid subdivisions, e.g. 10 or 20
  
  // Actions
  setPatternName: (name: string) => void;
  setBlockDimensions: (width: number, height: number) => void;
  setActiveTileIndex: (index: number) => void;
  setSelectedVertexIndex: (index: number | null) => void;
  setSnapToGrid: (snap: boolean) => void;
  setSnapResolution: (res: number) => void;
  
  loadFromSchema: (schema: PatternSchema) => void;
  addTile: () => void;
  removeTile: (index: number) => void;
  updateTileProperty: <K extends keyof Tile>(index: number, key: K, value: Tile[K]) => void;
  addVertexToActive: (vertex: Vertex) => void;
  deleteVertexFromActive: (vertexIndex: number) => void;
  updateVertexInActive: (vertexIndex: number, x: number, y: number) => void;
  resetToDefault: (patternType?: 'star-cross' | 'hex-triangle' | 'pinwheel') => void;
}
