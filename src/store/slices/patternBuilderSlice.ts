import { StateCreator } from 'zustand';
import { supabase } from '../../utils/supabaseClient';
import { AppState } from '../useAppStore';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

export interface Vertex {
  x: number; // Normalized coordinate: -0.5 to 0.5
  y: number; // Normalized coordinate: -0.5 to 0.5
}

export interface BuilderTile {
  id: string;
  name: string;
  w: number;
  h: number;
  dx: number;
  dy: number;
  role: 'primary' | 'secondary';
  color: string;
  vertices: Vertex[];
  polarArray?: {
    instances: number;
    angleStep: number;
    pivotX: number;
    pivotY: number;
  };
}

export interface PatternBuilderSlice {
  patternName: string;
  blockWidth: number;
  blockHeight: number;
  builderTiles: BuilderTile[];
  activeTileIndex: number;
  selectedVertexIndex: number | null;
  snapToGrid: boolean;
  snapResolution: number; // e.g., 0.05 or 0.025
  gridSize: number; // Visual helpers: visual coordinate subdivisions
  isSavingPattern: boolean;
  patternSaveError: string | null;
  currentPatternId: string | null;
  workspaceView: 'design' | 'preview' | 'split';

  setPatternName: (name: string) => void;
  setBlockDimensions: (width: number, height: number) => void;
  setWorkspaceView: (view: 'design' | 'preview' | 'split') => void;
  setActiveTileIndex: (index: number) => void;
  setSelectedVertexIndex: (index: number | null) => void;
  setSnapToGrid: (snap: boolean) => void;
  setSnapResolution: (res: number) => void;
  loadFromSchema: (schema: any, dbId?: string) => void;
  addBuilderTile: () => void;
  removeBuilderTile: (index: number) => void;
  updateBuilderTileProperty: <K extends keyof BuilderTile>(index: number, key: K, value: BuilderTile[K]) => void;
  addVertexToActive: (vertex: Vertex) => void;
  deleteVertexFromActive: (vertexIndex: number) => void;
  updateVertexInActive: (vertexIndex: number, x: number, y: number) => void;
  resetPatternBuilder: (templateType?: 'star-cross' | 'hex-triangle' | 'pinwheel' | 'blank') => void;
  savePatternToCloud: () => Promise<boolean>;
  deletePatternFromCloud: (id: string) => Promise<boolean>;
}

// Default structural templates generator
const generateTemplate = (type: 'star-cross' | 'hex-triangle' | 'pinwheel' | 'blank') => {
  switch (type) {
    case 'blank':
      return {
        patternName: 'New Pattern',
        blockWidth: 50,
        blockHeight: 50,
        tiles: []
      };
    case 'star-cross': {
      const starVertices: Vertex[] = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        const r = i % 2 === 0 ? 0.5 : 0.22;
        starVertices.push({
          x: Math.round(Math.cos(angle) * r * 1000) / 1000,
          y: Math.round(Math.sin(angle) * r * 1000) / 1000,
        });
      }

      const crossVertices: Vertex[] = [
        { x: -0.15, y: -0.5 },
        { x: 0.15, y: -0.5 },
        { x: 0.15, y: -0.15 },
        { x: 0.5, y: -0.15 },
        { x: 0.5, y: 0.15 },
        { x: 0.15, y: 0.15 },
        { x: 0.15, y: 0.5 },
        { x: -0.15, y: 0.5 },
        { x: -0.15, y: 0.15 },
        { x: -0.5, y: 0.15 },
        { x: -0.5, y: -0.15 },
        { x: -0.15, y: -0.15 },
      ];

      return {
        patternName: 'Classic Star & Cross',
        blockWidth: 50,
        blockHeight: 50,
        tiles: [
          {
            id: 'star-1',
            name: '8-Point Star',
            w: 25,
            h: 25,
            dx: 25,
            dy: 25,
            role: 'primary' as const,
            color: '#3b82f6',
            vertices: starVertices,
          },
          {
            id: 'cross-1',
            name: 'Interlocking Cross',
            w: 25,
            h: 25,
            dx: 0,
            dy: 0,
            role: 'secondary' as const,
            color: '#10b981',
            vertices: crossVertices,
          },
          {
            id: 'cross-2',
            name: 'Corner Cross Overlay',
            w: 25,
            h: 25,
            dx: 50,
            dy: 0,
            role: 'secondary' as const,
            color: '#10b981',
            vertices: crossVertices,
          },
          {
            id: 'cross-3',
            name: 'Base Cross Overlay',
            w: 25,
            h: 25,
            dx: 0,
            dy: 50,
            role: 'secondary' as const,
            color: '#10b981',
            vertices: crossVertices,
          },
          {
            id: 'cross-4',
            name: 'Top Cross Overlay',
            w: 25,
            h: 25,
            dx: 50,
            dy: 50,
            role: 'secondary' as const,
            color: '#10b981',
            vertices: crossVertices,
          },
        ],
      };
    }
    case 'hex-triangle': {
      const hexVertices: Vertex[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        hexVertices.push({
          x: Math.round(Math.cos(angle) * 0.5 * 1000) / 1000,
          y: Math.round(Math.sin(angle) * 0.5 * 1000) / 1000,
        });
      }

      const triVertices: Vertex[] = [
        { x: 0, y: 0.5 },
        { x: 0.433, y: -0.25 },
        { x: -0.433, y: -0.25 },
      ];

      return {
        patternName: 'Hexagonal honeycomb with Triangles',
        blockWidth: 50,
        blockHeight: 43.3,
        tiles: [
          {
            id: 'hex-1',
            name: 'Central Hexagon',
            w: 28.85,
            h: 28.85,
            dx: 25,
            dy: 21.65,
            role: 'primary' as const,
            color: '#8b5cf6',
            vertices: hexVertices,
          },
          {
            id: 'tri-1',
            name: 'Top-Left Triangle',
            w: 28.85,
            h: 28.85,
            dx: 8.35,
            dy: 7.2,
            role: 'secondary' as const,
            color: '#f59e0b',
            vertices: triVertices,
          },
          {
            id: 'tri-2',
            name: 'Top-Right Triangle',
            w: 28.85,
            h: 28.85,
            dx: 41.65,
            dy: 7.2,
            role: 'secondary' as const,
            color: '#f59e0b',
            vertices: triVertices,
          },
        ],
      };
    }
    case 'pinwheel': {
      const sqVertices: Vertex[] = [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0.5, y: 0.5 },
        { x: -0.5, y: 0.5 },
      ];

      const paraVertices: Vertex[] = [
        { x: -0.4, y: -0.2 },
        { x: 0.4, y: -0.5 },
        { x: 0.4, y: 0.2 },
        { x: -0.4, y: 0.5 },
      ];

      return {
        patternName: 'Pinwheel Square Alignment',
        blockWidth: 50,
        blockHeight: 50,
        tiles: [
          {
            id: 'sq-center',
            name: 'Center Square',
            w: 20,
            h: 20,
            dx: 25,
            dy: 25,
            role: 'primary' as const,
            color: '#ec4899',
            vertices: sqVertices,
          },
          {
            id: 'pin-left',
            name: 'Left Parallelogram',
            w: 15,
            h: 25,
            dx: 7.5,
            dy: 25,
            role: 'secondary' as const,
            color: '#14b8a6',
            vertices: paraVertices,
          },
          {
            id: 'pin-right',
            name: 'Right Parallelogram',
            w: 15,
            h: 25,
            dx: 42.5,
            dy: 25,
            role: 'secondary' as const,
            color: '#14b8a6',
            vertices: paraVertices,
          },
        ],
      };
    }
  }
};

const initialTemplate = generateTemplate('blank');

export const createPatternBuilderSlice: StateCreator<
  AppState,
  [],
  [],
  PatternBuilderSlice
> = (set, get) => ({
  patternName: initialTemplate.patternName,
  blockWidth: initialTemplate.blockWidth,
  blockHeight: initialTemplate.blockHeight,
  builderTiles: initialTemplate.tiles,
  activeTileIndex: 0,
  selectedVertexIndex: null,
  snapToGrid: true,
  snapResolution: 0.05,
  gridSize: 20,
  isSavingPattern: false,
  patternSaveError: null,
  currentPatternId: null,
  workspaceView: 'split',

  setPatternName: (name) => set({ patternName: name }),
  setBlockDimensions: (width, height) => set({ blockWidth: width, blockHeight: height }),
  setWorkspaceView: (view) => set({ workspaceView: view }),
  setActiveTileIndex: (index) => set({ activeTileIndex: index, selectedVertexIndex: null }),
  setSelectedVertexIndex: (index) => set({ selectedVertexIndex: index }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setSnapResolution: (res) => set({ snapResolution: res }),

  loadFromSchema: (schema, dbId?: string) => set({
    currentPatternId: dbId || null,
    patternName: schema.patternName || 'Imported Pattern',
    blockWidth: (typeof schema.blockWidth === 'number' ? schema.blockWidth : 1) * 50,
    blockHeight: (typeof schema.blockHeight === 'number' ? schema.blockHeight : 1) * 50,
    builderTiles: Array.isArray(schema.tiles) ? schema.tiles.map((t: any) => ({
      id: t.id || generateId(),
      name: t.name || 'Tile',
      w: (typeof t.w === 'number' ? t.w : 0.5) * 50,
      h: (typeof t.h === 'number' ? t.h : 0.5) * 50,
      dx: (typeof t.dx === 'number' ? t.dx : 0) * 50,
      dy: (typeof t.dy === 'number' ? t.dy : 0) * 50,
      role: t.role === 'secondary' ? 'secondary' : 'primary',
      color: t.color || '#cccccc',
      vertices: Array.isArray(t.vertices) ? t.vertices.map((v: any) => ({
        x: typeof v.x === 'number' ? v.x : 0,
        y: typeof v.y === 'number' ? v.y : 0
      })) : [],
      polarArray: t.polarArray ? { instances: t.polarArray.instances || 1, angleStep: t.polarArray.angleStep || 90, pivotX: t.polarArray.pivotX || 0, pivotY: t.polarArray.pivotY || 0 } : undefined
    })) : [],
    activeTileIndex: 0,
    selectedVertexIndex: null
  }),

  addBuilderTile: () => set((state) => {
    const newTile: BuilderTile = {
      id: generateId(),
      name: `New Tile ${state.builderTiles.length + 1}`,
      w: 20,
      h: 20,
      dx: state.blockWidth / 2,
      dy: state.blockHeight / 2,
      role: 'secondary',
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444'][state.builderTiles.length % 7],
      vertices: [
        { x: -0.25, y: -0.25 },
        { x: 0.25, y: -0.25 },
        { x: 0.25, y: 0.25 },
        { x: -0.25, y: 0.25 },
      ],
      polarArray: {
        instances: 1,
        angleStep: 90,
        pivotX: 0,
        pivotY: 0,
      }
    };
    return {
      builderTiles: [...state.builderTiles, newTile],
      activeTileIndex: state.builderTiles.length,
      selectedVertexIndex: null
    };
  }),

  removeBuilderTile: (index) => set((state) => {
    if (state.builderTiles.length <= 1) return {};
    const updated = state.builderTiles.filter((_, i) => i !== index);
    const newActiveIndex = Math.min(state.activeTileIndex, updated.length - 1);
    return {
      builderTiles: updated,
      activeTileIndex: newActiveIndex,
      selectedVertexIndex: null
    };
  }),

  updateBuilderTileProperty: (index, key, value) => set((state) => {
    const updated = [...state.builderTiles];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        [key]: value
      };
    }
    return { builderTiles: updated };
  }),

  addVertexToActive: (vertex) => set((state) => {
    if (state.activeTileIndex < 0 || state.activeTileIndex >= state.builderTiles.length) return {};
    const updated = [...state.builderTiles];
    const activeTile = updated[state.activeTileIndex];
    
    const newVertices = [...activeTile.vertices, vertex];
    updated[state.activeTileIndex] = {
      ...activeTile,
      vertices: newVertices
    };
    
    return {
      builderTiles: updated,
      selectedVertexIndex: newVertices.length - 1
    };
  }),

  deleteVertexFromActive: (vertexIndex) => set((state) => {
    if (state.activeTileIndex < 0 || state.activeTileIndex >= state.builderTiles.length) return {};
    const updated = [...state.builderTiles];
    const activeTile = updated[state.activeTileIndex];
    if (activeTile.vertices.length <= 3) return {};

    const newVertices = activeTile.vertices.filter((_, i) => i !== vertexIndex);
    updated[state.activeTileIndex] = {
      ...activeTile,
      vertices: newVertices
    };

    return {
      builderTiles: updated,
      selectedVertexIndex: null
    };
  }),

  updateVertexInActive: (vertexIndex, x, y) => set((state) => {
    if (state.activeTileIndex < 0 || state.activeTileIndex >= state.builderTiles.length) return {};
    const updated = [...state.builderTiles];
    const activeTile = updated[state.activeTileIndex];
    
    let targetX = Math.max(-0.5, Math.min(0.5, x));
    let targetY = Math.max(-0.5, Math.min(0.5, y));

    if (state.snapToGrid) {
      const res = state.snapResolution;
      targetX = Math.round(targetX / res) * res;
      targetY = Math.round(targetY / res) * res;
      
      targetX = Math.max(-0.5, Math.min(0.5, targetX));
      targetY = Math.max(-0.5, Math.min(0.5, targetY));
    }

    targetX = parseFloat(targetX.toFixed(4));
    targetY = parseFloat(targetY.toFixed(4));

    const newVertices = [...activeTile.vertices];
    newVertices[vertexIndex] = { x: targetX, y: targetY };

    updated[state.activeTileIndex] = {
      ...activeTile,
      vertices: newVertices
    };

    return { builderTiles: updated };
  }),

  resetPatternBuilder: (templateType = 'blank') => set(() => {
    const template = generateTemplate(templateType);
    return {
      currentPatternId: null,
      patternName: template.patternName,
      blockWidth: template.blockWidth,
      blockHeight: template.blockHeight,
      builderTiles: template.tiles,
      activeTileIndex: 0,
      selectedVertexIndex: null,
      patternSaveError: null
    };
  }),

  savePatternToCloud: async () => {
    const { patternName, blockWidth, blockHeight, builderTiles, currentPatternId } = get();
    if (!patternName.trim()) {
      set({ patternSaveError: 'Pattern name cannot be empty.' });
      return false;
    }

    const normalizedName = patternName.trim().toLowerCase();
    const builtInNames = [
      'classic star & cross', 'honeycomb hex', 'square pinwheel', 'octagon & dot',
      'octagon_dot', 'star-cross', 'hex-triangle', 'pinwheel', 'star', 'cross'
    ];
    if (builtInNames.includes(normalizedName)) {
      set({ patternSaveError: 'Cannot modify or overwrite built-in patterns. Please change the pattern name to save it as a new custom pattern.' });
      return false;
    }

    if (builderTiles.length === 0) {
      set({ patternSaveError: 'Must have at least one tile in the pattern.' });
      return false;
    }

    set({ isSavingPattern: true, patternSaveError: null });

    try {
      const patternData = {
        patternName,
        blockWidth: blockWidth / 50,
        blockHeight: blockHeight / 50,
        tiles: builderTiles.map(t => ({
          id: t.id,
          name: t.name,
          w: t.w / 50,
          h: t.h / 50,
          dx: t.dx / 50,
          dy: t.dy / 50,
          shape: 'custom_polygon' as const,
          role: t.role,
          color: t.color,
          vertices: t.vertices,
          polarArray: t.polarArray ? { ...t.polarArray } : undefined
        }))
      };

      let responseData;
      let error;

      if (currentPatternId) {
        // Upsert/Update existing pattern
        const response = await supabase
          .from('custom_patterns')
          .update({
            name: patternName,
            pattern_data: patternData
          })
          .eq('id', currentPatternId)
          .select()
          .single();
        responseData = response.data;
        error = response.error;
      } else {
        // Insert new pattern
        const response = await supabase
          .from('custom_patterns')
          .insert({
            name: patternName,
            pattern_data: patternData
          })
          .select()
          .single();
        responseData = response.data;
        error = response.error;
      }

      if (error) {
        throw error;
      }

      if (responseData && responseData.id) {
        set({ currentPatternId: responseData.id });
      }

      // Background refetch custom patterns inside materialSlice
      await get().fetchCustomPatternsList();

      set({ isSavingPattern: false });
      return true;
    } catch (err: any) {
      console.error('Error saving custom pattern:', err);
      set({
        patternSaveError: err.message || 'Failed to save custom pattern to database.',
        isSavingPattern: false
      });
      return false;
    }
  },

  deletePatternFromCloud: async (id: string) => {
    try {
      const { error } = await supabase.from('custom_patterns').delete().eq('id', id);
      if (error) throw error;
      
      if (get().currentPatternId === id) {
        set({ currentPatternId: null });
      }
      await get().fetchCustomPatternsList();
      return true;
    } catch (err) {
      console.error('Error deleting pattern:', err);
      return false;
    }
  }
});