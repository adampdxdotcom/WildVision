import { StateCreator } from 'zustand';
import { broadcastStateSync } from '../../utils/syncBroadcaster';
import { supabase } from '../../utils/supabaseClient';
import { calculateCenteredOffsets, roundTo } from '../../utils/geometry';
import { translateSubArea, resizeSubArea as resizeSubAreaUtil } from '../../utils/shapeTransformations';
import { 
  TileShape, 
  RectanglePattern, 
  ColorPattern, 
  ColorVariation, 
  TileFinish, 
  SubArea, 
  WallExtension, 
  ViewSettingsState, 
  AngleDisplayMode, 
  BorderConfig,
  ColorCard
} from '../../types';

export interface MaterialSlice {
  shape: TileShape;
  setShape: (val: TileShape | ((prev: TileShape) => TileShape)) => void;
  tileWidth: number;
  setTileWidth: (val: number | ((prev: number) => number)) => void;
  tileHeight: number;
  setTileHeight: (val: number | ((prev: number) => number)) => void;
  pattern: RectanglePattern;
  setPattern: (val: RectanglePattern | ((prev: RectanglePattern) => RectanglePattern)) => void;
  basketWeaveMultiplier: number;
  setBasketWeaveMultiplier: (val: number | ((prev: number) => number)) => void;
  groutWidth: number;
  setGroutWidth: (val: number | ((prev: number) => number)) => void;
  angle: number;
  setAngle: (val: number | ((prev: number) => number)) => void;
  tileName: string;
  setTileName: (val: string | ((prev: string) => string)) => void;
  hasNotes: boolean;
  setHasNotes: (val: boolean | ((prev: boolean) => boolean)) => void;
  notes: string;
  setNotes: (val: string | ((prev: string) => string)) => void;
  tileColors: (string | ColorCard)[];
  setTileColors: (val: (string | ColorCard)[] | ((prev: (string | ColorCard)[]) => (string | ColorCard)[])) => void;
  colorPattern: ColorPattern;
  setColorPattern: (val: ColorPattern | ((prev: ColorPattern) => ColorPattern)) => void;
  tilesPerStripe: number;
  setTilesPerStripe: (val: number | ((prev: number) => number)) => void;
  compositeColors: Record<string, string>;
  setCompositeColor: (role: string, color: string) => void;
  setCompositeColors: (colors: Record<string, string>) => void;
  colorVariation: ColorVariation;
  setColorVariation: (val: ColorVariation | ((prev: ColorVariation) => ColorVariation)) => void;
  tileFinish: TileFinish;
  setTileFinish: (val: TileFinish | ((prev: TileFinish) => TileFinish)) => void;
  groutColor: string;
  setGroutColor: (val: string | ((prev: string) => string)) => void;
  uploadedSvgText: string | null;
  setUploadedSvgText: (val: string | null | ((prev: string | null) => string | null)) => void;
  patternAccentColor: string;
  setPatternAccentColor: (val: string | ((prev: string) => string)) => void;
  viewSettings: ViewSettingsState;
  setViewSettings: (val: ViewSettingsState | ((prev: ViewSettingsState) => ViewSettingsState)) => void;
  updateViewSetting: (group: 'canvas' | 'pdf' | 'render', key: string, value: any) => void;
  offsetX: number;
  setOffsetX: (val: number | ((prev: number) => number)) => void;
  offsetY: number;
  setOffsetY: (val: number | ((prev: number) => number)) => void;
  subAreas: SubArea[];
  setSubAreas: (val: SubArea[] | ((prev: SubArea[]) => SubArea[])) => void;
  updateSubArea: (id: string, updates: Partial<SubArea>) => void;
  moveSubArea: (id: string, dx: number, dy: number) => void;
  resizeSubArea: (id: string, handle: string, targetX: number, targetY: number, minSize?: number) => void;
  activeSubAreaId: string | null;
  setActiveSubAreaId: (val: string | null | ((prev: string | null) => string | null)) => void;
  wallExtensions: WallExtension[];
  setWallExtensions: (val: WallExtension[] | ((prev: WallExtension[]) => WallExtension[])) => void;
  activeWallExtensionId: string | null;
  setActiveWallExtensionId: (val: string | null | ((prev: string | null) => string | null)) => void;
  isPainted: boolean;
  setIsPainted: (val: boolean | ((prev: boolean) => boolean)) => void;
  isBlankCanvasMode: boolean;
  setIsBlankCanvasMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isPdfExporting: boolean;
  setIsPdfExporting: (val: boolean | ((prev: boolean) => boolean)) => void;
  activePresetId: string | null;
  setActivePresetId: (val: string | null | ((prev: string | null) => string | null)) => void;
  soldAsMosaic: boolean;
  setSoldAsMosaic: (val: boolean | ((prev: boolean) => boolean)) => void;
  mosaicWidth: number;
  setMosaicWidth: (val: number | ((prev: number) => number)) => void;
  mosaicHeight: number;
  setMosaicHeight: (val: number | ((prev: number) => number)) => void;
  overage: number;
  setOverage: (val: number | ((prev: number) => number)) => void;
  reuseCuts: boolean;
  setReuseCuts: (val: boolean | ((prev: boolean) => boolean)) => void;
  angleDisplayMode: AngleDisplayMode;
  setAngleDisplayMode: (val: AngleDisplayMode | ((prev: AngleDisplayMode) => AngleDisplayMode)) => void;
  showAccentDistances: boolean;
  setShowAccentDistances: (val: boolean | ((prev: boolean) => boolean)) => void;
  wallBoundaryShape: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  setWallBoundaryShape: (val: 'rectangle' | 'arch' | 'oval' | 'custom_arches' | ((prev: 'rectangle' | 'arch' | 'oval' | 'custom_arches') => 'rectangle' | 'arch' | 'oval' | 'custom_arches')) => void;
  wallArchHeight: number;
  setWallArchHeight: (val: number | ((prev: number) => number)) => void;
  wallActiveArches: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  setWallActiveArches: (val: { top: boolean; bottom: boolean; left: boolean; right: boolean } | ((prev: { top: boolean; bottom: boolean; left: boolean; right: boolean }) => { top: boolean; bottom: boolean; left: boolean; right: boolean })) => void;
  wallArchDepth: number;
  setWallArchDepth: (val: number | ((prev: number) => number)) => void;
  wallAngle: number;
  setWallAngle: (val: number | ((prev: number) => number)) => void;
  wallBorder: BorderConfig;
  setWallBorder: (val: BorderConfig | ((prev: BorderConfig) => BorderConfig)) => void;
  tutorialStepIndex: number;
  setTutorialStepIndex: (val: number | ((prev: number) => number)) => void;
  activeSidebarTab: number;
  setActiveSidebarTab: (val: number | ((prev: number) => number)) => void;
  mainShapeSettings: Partial<Record<TileShape, any>>;
  setMainShapeSettings: (val: Partial<Record<TileShape, any>> | ((prev: Partial<Record<TileShape, any>>) => Partial<Record<TileShape, any>>)) => void;
  isPicket: boolean;
  setIsPicket: (val: boolean | ((prev: boolean) => boolean)) => void;
  picketLength: number;
  setPicketLength: (val: number | ((prev: number) => number)) => void;
  isCanvasDirty: boolean;
  setIsCanvasDirty: (val: boolean | ((prev: boolean) => boolean)) => void;
  purchasingSettings: Record<string, {
    purchaseType: 'carton' | 'sheet' | 'piece';
    sqFtPerCarton: number | '';
    pricePerSqFt: number;
    pricePerSheet: number;
  }>;
  setPurchasingSettings: (val: Record<string, {
    purchaseType: 'carton' | 'sheet' | 'piece';
    sqFtPerCarton: number | '';
    pricePerSqFt: number;
    pricePerSheet: number;
  }> | ((prev: Record<string, {
    purchaseType: 'carton' | 'sheet' | 'piece';
    sqFtPerCarton: number | '';
    pricePerSqFt: number;
    pricePerSheet: number;
  }>) => Record<string, {
    purchaseType: 'carton' | 'sheet' | 'piece';
    sqFtPerCarton: number | '';
    pricePerSqFt: number;
    pricePerSheet: number;
  }>)) => void;
  updatePurchasingSetting: (areaId: string, settings: Partial<{
    purchaseType: 'carton' | 'sheet' | 'piece';
    sqFtPerCarton: number | '';
    pricePerSqFt: number;
    pricePerSheet: number;
  }>) => void;
  customPatternsList: any[];
  activeCustomPattern: any;
  setCustomPatternsList: (patterns: any[]) => void;
  setActiveCustomPattern: (pattern: any) => void;
  fetchCustomPatternsList: () => Promise<void>;
  flatsketVerticalRows: number;
  setFlatsketVerticalRows: (val: number | ((prev: number) => number)) => void;
  flatsketHorizontalRows: number;
  setFlatsketHorizontalRows: (val: number | ((prev: number) => number)) => void;
  
  // Paint Mode Overrides
  tileColorOverrides: Record<string, number>;
  activeBrushColorIndex: number;
  setTileColorOverride: (tileId: string, colorIndex: number | null) => void;
  clearAllTileColorOverrides: () => void;
  setActiveBrushColorIndex: (index: number) => void;
  removeTileColor: (index: number) => void;
  
  // Custom Surfaces (Slabs)
  customSurfaces: import('../../types').CustomSurface[];
  addLocalSurface: (surface: import('../../types').CustomSurface) => void;
  setCloudSurfaces: (surfaces: import('../../types').CustomSurface[]) => void;
  removeSurface: (id: string) => void;
  disableColorWithTexture: boolean;
  setDisableColorWithTexture: (val: boolean | ((prev: boolean) => boolean)) => void;
}

const AESTHETIC_KEYS = ['shape', 'tileWidth', 'tileHeight', 'pattern', 'tileColors', 'tileColor', 'colorPattern', 'tilesPerStripe', 'groutColor', 'groutWidth', 'shapeSettings', 'tileSpecular', 'tileFinish', 'materialTexture', 'colorVariation', 'tileDotColor', 'soldAsMosaic', 'mosaicWidth', 'mosaicHeight', 'isPicket', 'picketLength', 'flatsketVerticalRows', 'flatsketHorizontalRows', 'customPatternPayload', 'surfaceUrl', 'tileName', 'border'];

export const createMaterialSlice: StateCreator<any, [], [], MaterialSlice> = (set) => ({
  shape: 'rectangle',
  setShape: (updater) => set((state: any) => {
    const nextShape = typeof updater === 'function' ? updater(state.shape) : updater;
    const shouldLock = nextShape === 'rectangle' && state.pattern === 'basket_weave';
    let nextHeight = shouldLock ? state.tileWidth * state.basketWeaveMultiplier : state.tileHeight;
    if (nextShape === 'diamond') {
      if (state.pattern === '3d_cube') {
        nextHeight = state.tileWidth;
      } else if (state.pattern === 'star_lattice') {
        nextHeight = Number((state.tileWidth * Math.sqrt(3)).toFixed(4));
      }
    }
    const activeCustomPattern = nextShape === 'octagon_dot' ? state.activeCustomPattern : null;
    return { shape: nextShape, tileHeight: nextHeight, activeCustomPattern };
  }),
  tileWidth: 6,
  setTileWidth: (updater) => set((state: any) => {
    const nextWidth = typeof updater === 'function' ? updater(state.tileWidth) : updater;
    const shouldLock = state.shape === 'rectangle' && state.pattern === 'basket_weave';
    let nextHeight = shouldLock ? nextWidth * state.basketWeaveMultiplier : state.tileHeight;
    if (state.shape === 'diamond') {
      if (state.pattern === '3d_cube') {
        nextHeight = nextWidth;
      } else if (state.pattern === 'star_lattice') {
        nextHeight = Number((nextWidth * Math.sqrt(3)).toFixed(4));
      }
    }
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileWidth', nextWidth);
    return { tileWidth: nextWidth, tileHeight: nextHeight };
  }),
  tileHeight: 3,
  setTileHeight: (updater) => set((state: any) => {
    const nextHeight = typeof updater === 'function' ? updater(state.tileHeight) : updater;
    const shouldLock = state.shape === 'rectangle' && state.pattern === 'basket_weave';
    let finalHeight = shouldLock ? state.tileWidth * state.basketWeaveMultiplier : nextHeight;
    if (state.shape === 'diamond') {
      if (state.pattern === '3d_cube') {
        finalHeight = state.tileWidth;
      } else if (state.pattern === 'star_lattice') {
        finalHeight = Number((state.tileWidth * Math.sqrt(3)).toFixed(4));
      }
    }
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileHeight', finalHeight);
    return { tileHeight: finalHeight };
  }),
  pattern: 'running_50',
  setPattern: (updater) => set((state: any) => {
    const nextPattern = typeof updater === 'function' ? updater(state.pattern) : updater;
    const shouldLock = state.shape === 'rectangle' && nextPattern === 'basket_weave';
    let nextHeight = shouldLock ? state.tileWidth * state.basketWeaveMultiplier : state.tileHeight;
    if (state.shape === 'diamond') {
      if (nextPattern === '3d_cube') {
        nextHeight = state.tileWidth;
      } else if (nextPattern === 'star_lattice') {
        nextHeight = Number((state.tileWidth * Math.sqrt(3)).toFixed(4));
      }
    }
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setPattern', nextPattern);
    return { pattern: nextPattern, tileHeight: nextHeight };
  }),
  basketWeaveMultiplier: 2,
  setBasketWeaveMultiplier: (updater) => set((state: any) => {
    const nextMultiplier = typeof updater === 'function' ? updater(state.basketWeaveMultiplier) : updater;
    const shouldLock = state.shape === 'rectangle' && state.pattern === 'basket_weave';
    const nextHeight = shouldLock ? state.tileWidth * nextMultiplier : state.tileHeight;
    return { basketWeaveMultiplier: nextMultiplier, tileHeight: nextHeight };
  }),
  groutWidth: 0.125,
  setGroutWidth: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.groutWidth) : updater;
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setGroutWidth', nextVal);
    return { groutWidth: nextVal };
  }),
  angle: 0,
  setAngle: (updater) => set((state: any) => ({ angle: typeof updater === 'function' ? updater(state.angle) : updater })),
  tileName: 'White Gloss Ceramic Subway',
  setTileName: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.tileName) : updater;
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileName', nextVal);
    return { tileName: nextVal };
  }),
  hasNotes: false,
  setHasNotes: (updater) => set((state: any) => ({ hasNotes: typeof updater === 'function' ? updater(state.hasNotes) : updater })),
  notes: '',
  setNotes: (updater) => set((state: any) => ({ notes: typeof updater === 'function' ? updater(state.notes) : updater })),
  tileColors: ['#f1f5f9'],
  setTileColors: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.tileColors) : updater;
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileColors', nextVal);
    return { tileColors: nextVal };
  }),
  colorPattern: 'single',
  setColorPattern: (updater) => set((state: any) => ({ colorPattern: typeof updater === 'function' ? updater(state.colorPattern) : updater })),
  tilesPerStripe: 1,
  setTilesPerStripe: (updater) => set((state: any) => ({ tilesPerStripe: typeof updater === 'function' ? updater(state.tilesPerStripe) : updater })),
  compositeColors: {},
  setCompositeColor: (role, color) => set((state: any) => {
    const nextColors = {
      ...(state.compositeColors || {}),
      [role]: color,
    };
    return { compositeColors: nextColors };
  }),
  setCompositeColors: (colors) => set({ compositeColors: colors }),
  colorVariation: 'V1',
  setColorVariation: (updater) => set((state: any) => ({ colorVariation: typeof updater === 'function' ? (updater as any)(state.colorVariation) : updater })),
  tileFinish: 'satin',
  setTileFinish: (updater) => set((state: any) => ({ tileFinish: typeof updater === 'function' ? updater(state.tileFinish) : updater })),
  groutColor: '#64748b',
  setGroutColor: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.groutColor) : updater;
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setGroutColor', nextVal);
    return { groutColor: nextVal };
  }),
  uploadedSvgText: null,
  setUploadedSvgText: (updater) => set((state: any) => ({ uploadedSvgText: typeof updater === 'function' ? updater(state.uploadedSvgText) : updater })),
  patternAccentColor: '#000000',
  setPatternAccentColor: (updater) => set((state: any) => ({ patternAccentColor: typeof updater === 'function' ? updater(state.patternAccentColor) : updater })),
  viewSettings: {
    canvas: {
      showNodes: true,
      showDimensions: true,
      showAngles: true,
      showLabels: true,
      showFoldLines: true,
      showTextures: false,
    },
    pdf: {
      disableTileColor: false,
      showQuantities: true,
      showAngles: true,
      showPricesOnPdf: true,
      pdfLayoutMode: 'auto',
    },
    render: {
      enableReflection: false,
    },
  },
  setViewSettings: (updater) => set((state: any) => ({ viewSettings: typeof updater === 'function' ? updater(state.viewSettings) : updater })),
  updateViewSetting: (group, key, value) => set((state: any) => ({
    viewSettings: {
      ...state.viewSettings,
      [group]: {
        ...state.viewSettings[group],
        [key]: value,
      },
    },
  })),
  offsetX: calculateCenteredOffsets(96, 24, 'rectangle', 6, 3, 0.125, 'running_50').x,
  setOffsetX: (updater) => set((state: any) => ({ offsetX: typeof updater === 'function' ? updater(state.offsetX) : updater })),
  offsetY: calculateCenteredOffsets(96, 24, 'rectangle', 6, 3, 0.125, 'running_50').y,
  setOffsetY: (updater) => set((state: any) => ({ offsetY: typeof updater === 'function' ? updater(state.offsetY) : updater })),
  subAreas: [],
  setSubAreas: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.subAreas) : updater;
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setSubAreas', nextVal);
    return { subAreas: nextVal };
  }),

  updateSubArea: (id, updates) => set((state: any) => {
    // PASS 1: Apply the direct updates to the target SubArea
    let nextSubAreas = state.subAreas.map((item: SubArea) =>
      item.id === id ? { ...item, ...updates } : item
    );

    let nextPurchasingSettings = { ...state.purchasingSettings };

    // PASS 2: Top-Down Strict Synchronization
    // Sweep the entire array. If an area is a child, force it to exactly mirror its parent.
    nextSubAreas = nextSubAreas.map((item: SubArea) => {
      if (item.linkedMaterialId) {
        const parent = nextSubAreas.find((p: SubArea) => p.id === item.linkedMaterialId);
        if (parent) {
          const syncedChild = { ...item };
          AESTHETIC_KEYS.forEach(key => {
            if ((parent as any)[key] !== undefined) {
              // Deep clone to prevent reference collisions
              (syncedChild as any)[key] = JSON.parse(JSON.stringify((parent as any)[key]));
            }
          });
          if (state.purchasingSettings[parent.id]) {
            nextPurchasingSettings[item.id] = { ...state.purchasingSettings[parent.id] };
          }
          return syncedChild;
        }
      }
      return item;
    });

    const hasAestheticUpdates = Object.keys(updates).some(key => AESTHETIC_KEYS.includes(key));
    if (typeof window !== 'undefined' && hasAestheticUpdates) {
      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
    }

    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setSubAreas', nextSubAreas);
    return { subAreas: nextSubAreas, purchasingSettings: nextPurchasingSettings, isCanvasDirty: true };
  }),
  moveSubArea: (id, dx, dy) => set((state: any) => {
    const nextSubAreas = state.subAreas.map((item: SubArea) =>
      item.id === id ? translateSubArea(item, dx, dy) : item
    );
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setSubAreas', nextSubAreas);
    return { subAreas: nextSubAreas };
  }),
  resizeSubArea: (id, handle, targetX, targetY, minSize) => set((state: any) => {
    const nextSubAreas = state.subAreas.map((item: SubArea) =>
      item.id === id ? resizeSubAreaUtil(item, handle, targetX, targetY, minSize) : item
    );
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setSubAreas', nextSubAreas);
    return { subAreas: nextSubAreas };
  }),
  activeSubAreaId: null,
  setActiveSubAreaId: (updater) => set((state: any) => ({ activeSubAreaId: typeof updater === 'function' ? updater(state.activeSubAreaId) : updater })),
  wallExtensions: [],
  setWallExtensions: (updater) => set((state: any) => ({ wallExtensions: typeof updater === 'function' ? updater(state.wallExtensions) : updater })),
  activeWallExtensionId: null,
  setActiveWallExtensionId: (updater) => set((state: any) => ({ activeWallExtensionId: typeof updater === 'function' ? updater(state.activeWallExtensionId) : updater })),
  isPainted: true,
  setIsPainted: (updater) => set((state: any) => ({ isPainted: typeof updater === 'function' ? updater(state.isPainted) : updater })),
  isBlankCanvasMode: false,
  setIsBlankCanvasMode: (updater) => set((state: any) => ({ isBlankCanvasMode: typeof updater === 'function' ? updater(state.isBlankCanvasMode) : updater })),
  isPdfExporting: false,
  setIsPdfExporting: (updater) => set((state: any) => ({ isPdfExporting: typeof updater === 'function' ? updater(state.isPdfExporting) : updater })),
  activePresetId: 'subway-backsplash',
  setActivePresetId: (updater) => set((state: any) => ({ activePresetId: typeof updater === 'function' ? updater(state.activePresetId) : updater })),
  soldAsMosaic: false,
  setSoldAsMosaic: (updater) => set((state: any) => ({ soldAsMosaic: typeof updater === 'function' ? updater(state.soldAsMosaic) : updater })),
  mosaicWidth: 12,
  setMosaicWidth: (updater) => set((state: any) => ({ mosaicWidth: typeof updater === 'function' ? updater(state.mosaicWidth) : updater })),
  mosaicHeight: 12,
  setMosaicHeight: (updater) => set((state: any) => ({ mosaicHeight: typeof updater === 'function' ? updater(state.mosaicHeight) : updater })),
  overage: 10,
  setOverage: (updater) => set((state: any) => ({ overage: typeof updater === 'function' ? updater(state.overage) : updater })),
  reuseCuts: false,
  setReuseCuts: (updater) => set((state: any) => ({ reuseCuts: typeof updater === 'function' ? updater(state.reuseCuts) : updater })),
  angleDisplayMode: 'all',
  setAngleDisplayMode: (updater) => set((state: any) => ({ angleDisplayMode: typeof updater === 'function' ? updater(state.angleDisplayMode) : updater })),
  showAccentDistances: false,
  setShowAccentDistances: (updater) => set((state: any) => ({ showAccentDistances: typeof updater === 'function' ? updater(state.showAccentDistances) : updater })),
  wallBoundaryShape: 'rectangle',
  setWallBoundaryShape: (updater) => set((state: any) => ({ wallBoundaryShape: typeof updater === 'function' ? updater(state.wallBoundaryShape) : updater })),
  wallArchHeight: 24,
  setWallArchHeight: (updater) => set((state: any) => ({ wallArchHeight: typeof updater === 'function' ? updater(state.wallArchHeight) : updater })),
  wallActiveArches: { top: true, bottom: false, left: false, right: false },
  setWallActiveArches: (updater) => set((state: any) => ({ wallActiveArches: typeof updater === 'function' ? updater(state.wallActiveArches) : updater })),
  wallArchDepth: 24,
  setWallArchDepth: (updater) => set((state: any) => ({ wallArchDepth: typeof updater === 'function' ? updater(state.wallArchDepth) : updater })),
  wallAngle: 0,
  setWallAngle: (updater) => set((state: any) => ({ wallAngle: typeof updater === 'function' ? updater(state.wallAngle) : updater })),
  wallBorder: {
    enabled: false,
    tileName: 'Border Tile',
    tileWidth: 4,
    tileHeight: 2,
    cornerJoint: 'straight',
    color: '#1e293b'
  },
  setWallBorder: (updater) => set((state: any) => ({ wallBorder: typeof updater === 'function' ? updater(state.wallBorder) : updater })),
  tutorialStepIndex: -1,
  setTutorialStepIndex: (updater) => set((state: any) => ({ tutorialStepIndex: typeof updater === 'function' ? updater(state.tutorialStepIndex) : updater })),
  activeSidebarTab: 1,
  setActiveSidebarTab: (updater) => set((state: any) => ({ activeSidebarTab: typeof updater === 'function' ? updater(state.activeSidebarTab) : updater })),
  mainShapeSettings: {},
  setMainShapeSettings: (updater) => set((state: any) => ({ mainShapeSettings: typeof updater === 'function' ? updater(state.mainShapeSettings) : updater })),
  isPicket: false,
  setIsPicket: (updater) => set((state: any) => ({ isPicket: typeof updater === 'function' ? updater(state.isPicket) : updater })),
  picketLength: 8,
  setPicketLength: (updater) => set((state: any) => ({ picketLength: typeof updater === 'function' ? updater(state.picketLength) : updater })),
  isCanvasDirty: false,
  setIsCanvasDirty: (updater) => set((state: any) => ({ isCanvasDirty: typeof updater === 'function' ? updater(state.isCanvasDirty) : updater })),
  purchasingSettings: {},
  setPurchasingSettings: (updater) => set((state: any) => ({ purchasingSettings: typeof updater === 'function' ? updater(state.purchasingSettings) : updater })),
  updatePurchasingSetting: (areaId, settings) => set((state: any) => {
    const prev = state.purchasingSettings[areaId] || {
      purchaseType: 'carton',
      sqFtPerCarton: '',
      pricePerSqFt: 0,
      pricePerSheet: 0,
    };
    const updated = { ...prev, ...settings };
    const nextPurchasingSettings = {
      ...state.purchasingSettings,
      [areaId]: updated,
    };

    if (state.subAreas) {
      state.subAreas.forEach((sa: SubArea) => {
        if (sa.linkedMaterialId === areaId) {
          const childPrev = nextPurchasingSettings[sa.id] || {
            purchaseType: 'carton',
            sqFtPerCarton: '',
            pricePerSqFt: 0,
            pricePerSheet: 0,
          };
          nextPurchasingSettings[sa.id] = { ...childPrev, ...settings };
        }
      });
    }

    return { purchasingSettings: nextPurchasingSettings };
  }),
  customPatternsList: [],
  activeCustomPattern: null,
  setCustomPatternsList: (patterns) => set({ customPatternsList: patterns }),
  flatsketVerticalRows: 1,
  setFlatsketVerticalRows: (updater) => set((state: any) => ({ flatsketVerticalRows: typeof updater === 'function' ? updater(state.flatsketVerticalRows) : updater })),
  flatsketHorizontalRows: 3,
  setFlatsketHorizontalRows: (updater) => set((state: any) => ({ flatsketHorizontalRows: typeof updater === 'function' ? updater(state.flatsketHorizontalRows) : updater })),
  tileColorOverrides: {},
  activeBrushColorIndex: 1,
  setTileColorOverride: (tileId, colorIndex) => set((state: any) => {
    const nextOverrides = { ...state.tileColorOverrides };
    if (colorIndex === null) {
      delete nextOverrides[tileId];
    } else {
      nextOverrides[tileId] = colorIndex;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
    }
    if (!state.isReceivingRemoteUpdate) broadcastStateSync('setTileColorOverride', { tileId, colorIndex });
    return { tileColorOverrides: nextOverrides };
  }),
  clearAllTileColorOverrides: () => {
    set((state: any) => {
      if (!state.isReceivingRemoteUpdate) broadcastStateSync('clearAllTileColorOverrides', null);
      return { tileColorOverrides: {} };
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
    }
  },
  setActiveBrushColorIndex: (index) => set({ activeBrushColorIndex: index }),
  removeTileColor: (index) => set((state: any) => {
    if (state.tileColors.length <= 2) return {};

    const deletedIndex = index;
    const nextTileColors = state.tileColors.filter((_: any, i: number) => i !== deletedIndex);

    const nextOverrides = { ...state.tileColorOverrides };
    for (const key of Object.keys(nextOverrides)) {
      const overrideIndex = nextOverrides[key];
      if (overrideIndex === deletedIndex) {
        delete nextOverrides[key];
      } else if (overrideIndex > deletedIndex) {
        nextOverrides[key] = overrideIndex - 1;
      }
    }

    let nextActiveBrush = state.activeBrushColorIndex;
    if (nextActiveBrush === deletedIndex) {
      nextActiveBrush = nextTileColors.length > 1 ? 1 : 0;
    } else if (nextActiveBrush > deletedIndex) {
      nextActiveBrush = nextActiveBrush - 1;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
    }

    if (!state.isReceivingRemoteUpdate) broadcastStateSync('removeTileColor', index);
    return {
      tileColors: nextTileColors,
      tileColorOverrides: nextOverrides,
      activeBrushColorIndex: nextActiveBrush,
      isCanvasDirty: true,
    };
  }),
  setActiveCustomPattern: (pattern) => set((state: any) => {
    const nextColors = { ...(state.compositeColors || {}) };

    if (pattern && Array.isArray(pattern.tiles)) {
      const uniqueNames: string[] = [];
      const seen = new Set<string>();

      pattern.tiles.forEach((t: any) => {
        const nameStr = t.name || t.shape || t.role || '';
        if (!nameStr) return;
        const isPrimaryOrBackground = 
          t.role === 'primary' || 
          t.role === 'background' || 
          nameStr.toLowerCase() === 'primary' || 
          nameStr.toLowerCase() === 'background';

        if (!isPrimaryOrBackground && !seen.has(nameStr)) {
          seen.add(nameStr);
          uniqueNames.push(nameStr);
        }
      });

      uniqueNames.forEach((name, index) => {
        if (nextColors[name] === undefined) {
          if (index === 0) {
            nextColors[name] = '#ffffff';
          } else if (index === 1) {
            nextColors[name] = '#000000';
          } else {
            nextColors[name] = '#888888';
          }
        }
      });
    }

    return {
      activeCustomPattern: pattern,
      compositeColors: nextColors
    };
  }),
  fetchCustomPatternsList: async () => {
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ customPatternsList: data || [] });
    } catch (e) {
      console.warn('Failed silently to fetch custom patterns from Supabase on startup:', e);
    }
  },
  customSurfaces: [],
  addLocalSurface: (surface) => set((state: any) => ({
    customSurfaces: [...state.customSurfaces, surface]
  })),
  setCloudSurfaces: (surfaces) => set({ customSurfaces: surfaces }),
  removeSurface: (id) => set((state: any) => ({
    customSurfaces: state.customSurfaces.filter((s: any) => s.id !== id)
  })),
  disableColorWithTexture: true,
  setDisableColorWithTexture: (updater) => set((state: any) => ({
    disableColorWithTexture: typeof updater === 'function' ? updater(state.disableColorWithTexture) : updater
  })),
});
