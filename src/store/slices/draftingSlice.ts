import { StateCreator } from 'zustand';
import { broadcastStateSync } from '../../utils/syncBroadcaster';
import { getInternalAngle, getSignedArea } from '../../utils/geometry';
import { 
  MeasurementUnit, 
  ActiveTool, 
  FoldLine, 
  CanvasLabel, 
  Stitch 
} from '../../types';

export interface DraftingSlice {
  wallWidth: number;
  setWallWidth: (val: number | ((prev: number) => number)) => void;
  wallHeight: number;
  setWallHeight: (val: number | ((prev: number) => number)) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  foldLines: FoldLine[];
  layoutFoldType: 'inward' | 'outward';
  setLayoutFoldType: (type: 'inward' | 'outward') => void;
  setFoldLines: (val: FoldLine[] | ((prev: FoldLine[]) => FoldLine[])) => void;
  setFoldAngle: (id: string, angle: number) => void;
  removeFold: (index: number) => void;
  draftFoldNodeIndex: number | null;
  setDraftFoldNodeIndex: (val: number | null | ((prev: number | null) => number | null)) => void;
  archDragBehavior: 'symmetric' | 'proportional';
  setArchDragBehavior: (behavior: 'symmetric' | 'proportional') => void;
  wallVertices: {x: number, y: number, isCurveNode?: boolean, isAngleLocked?: boolean, lockedAngleValue?: number | null, isLengthLocked?: boolean, lockedLengthValue?: number | null}[];
  setWallVertices: (val: {x: number, y: number, isCurveNode?: boolean, isAngleLocked?: boolean, lockedAngleValue?: number | null, isLengthLocked?: boolean, lockedLengthValue?: number | null}[] | ((prev: {x: number, y: number, isCurveNode?: boolean, isAngleLocked?: boolean, lockedAngleValue?: number | null, isLengthLocked?: boolean, lockedLengthValue?: number | null}[]) => {x: number, y: number, isCurveNode?: boolean, isAngleLocked?: boolean, lockedAngleValue?: number | null, isLengthLocked?: boolean, lockedLengthValue?: number | null}[])) => void;
  selectedVertexIndices: number[];
  setSelectedVertexIndices: (val: number[] | ((prev: number[]) => number[])) => void;
  unit: MeasurementUnit;
  setUnit: (val: MeasurementUnit | ((prev: MeasurementUnit) => MeasurementUnit)) => void;
  zoom: number;
  setZoom: (val: number | ((prev: number) => number)) => void;
  panX: number;
  setPanX: (val: number | ((prev: number) => number)) => void;
  panY: number;
  setPanY: (val: number | ((prev: number) => number)) => void;
  backgroundImage: string | null;
  setBackgroundImage: (val: string | null | ((prev: string | null) => string | null)) => void;
  isBgUnlocked: boolean;
  setIsBgUnlocked: (val: boolean | ((prev: boolean) => boolean)) => void;
  bgScale: number;
  setBgScale: (val: number | ((prev: number) => number)) => void;
  bgOffsetX: number;
  setBgOffsetX: (val: number | ((prev: number) => number)) => void;
  bgOffsetY: number;
  setBgOffsetY: (val: number | ((prev: number) => number)) => void;
  tileOpacity: number;
  setTileOpacity: (val: number | ((prev: number) => number)) => void;
  bgOpacity: number;
  setBgOpacity: (val: number | ((prev: number) => number)) => void;
  exportPhotoBg: boolean;
  setExportPhotoBg: (val: boolean | ((prev: boolean) => boolean)) => void;
  canvasLabels: CanvasLabel[];
  setCanvasLabels: (val: CanvasLabel[] | ((prev: CanvasLabel[]) => CanvasLabel[])) => void;
  editingLabelId: string | null;
  setEditingLabelId: (val: string | null | ((prev: string | null) => string | null)) => void;
  stitches: Stitch[];
  setStitches: (val: Stitch[] | ((prev: Stitch[]) => Stitch[])) => void;
}

export const createDraftingSlice: StateCreator<any, [], [], DraftingSlice> = (set) => ({
  wallWidth: 96,
  setWallWidth: (updater) => set((state: any) => {
    const newWidth = typeof updater === 'function' ? updater(state.wallWidth) : updater;
    const scaleX = newWidth / (state.wallWidth || 1);
    const newVertices = state.wallVertices 
      ? state.wallVertices.map((v: any) => ({ 
          ...v, 
          x: Math.round(v.x * scaleX * 10000) / 10000, 
          y: Math.round(v.y * 10000) / 10000 
        })) 
      : [
          { x: 0, y: 0 }, 
          { x: Math.round(newWidth * 10000) / 10000, y: 0 }, 
          { x: Math.round(newWidth * 10000) / 10000, y: Math.round(state.wallHeight * 10000) / 10000 }, 
          { x: 0, y: Math.round(state.wallHeight * 10000) / 10000 }
        ];
    return { wallWidth: newWidth, wallVertices: newVertices };
  }),
  wallHeight: 24,
  setWallHeight: (updater) => set((state: any) => {
    const newHeight = typeof updater === 'function' ? updater(state.wallHeight) : updater;
    const scaleY = newHeight / (state.wallHeight || 1);
    const newVertices = state.wallVertices 
      ? state.wallVertices.map((v: any) => ({ 
          ...v, 
          x: Math.round(v.x * 10000) / 10000, 
          y: Math.round(v.y * scaleY * 10000) / 10000 
        })) 
      : [
          { x: 0, y: 0 }, 
          { x: Math.round(state.wallWidth * 10000) / 10000, y: 0 }, 
          { x: Math.round(state.wallWidth * 10000) / 10000, y: Math.round(newHeight * 10000) / 10000 }, 
          { x: 0, y: Math.round(newHeight * 10000) / 10000 }
        ];
    return { wallHeight: newHeight, wallVertices: newVertices };
  }),
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
  foldLines: [],
  layoutFoldType: 'inward',
  setLayoutFoldType: (type) => set((state: any) => {
    const targetAngle = type === 'outward' ? -90 : 90;
    const nextFoldLines = (state.foldLines || []).map((f: FoldLine) => ({
      ...f,
      foldAngle: targetAngle,
    }));
    return {
      layoutFoldType: type,
      foldLines: nextFoldLines,
      isCanvasDirty: true,
    };
  }),
  setFoldLines: (updater) => set((state: any) => {
    const rawLines = typeof updater === 'function' ? updater(state.foldLines) : updater;
    const defaultAngle = state.layoutFoldType === 'outward' ? -90 : 90;
    const nextFoldLines = Array.isArray(rawLines)
      ? rawLines.map((f: FoldLine) => ({
          ...f,
          foldAngle: f.foldAngle !== undefined && f.foldAngle !== null ? f.foldAngle : defaultAngle
        }))
      : [];
    return { foldLines: nextFoldLines };
  }),
  setFoldAngle: (id, angle) => set((state: any) => ({
    foldLines: (state.foldLines || []).map((f: FoldLine) => 
      f.id === id ? { ...f, foldAngle: angle } : f
    ),
    isCanvasDirty: true
  })),
  removeFold: (index) => set((state: any) => {
    const targetFold = state.foldLines[index];
    if (!targetFold) return {};
    const newFoldLines = state.foldLines.filter((_, idx) => idx !== index);
    const newVertices = state.wallVertices.map((v: any, i: number) => {
      const isStillFoldNode = newFoldLines.some(f => f.startNodeIndex === i || f.endNodeIndex === i);
      if (!isStillFoldNode) {
        const { isFoldNode, isFold, ...rest } = v as any;
        return rest;
      }
      return v;
    });
    return {
      foldLines: newFoldLines,
      wallVertices: newVertices,
      isCanvasDirty: true
    };
  }),
  draftFoldNodeIndex: null,
  setDraftFoldNodeIndex: (updater) => set((state: any) => ({ draftFoldNodeIndex: typeof updater === 'function' ? updater(state.draftFoldNodeIndex) : updater })),
  archDragBehavior: 'symmetric',
  setArchDragBehavior: (behavior) => set({ archDragBehavior: behavior }),
  wallVertices: [
    { x: 0, y: 0, isAngleLocked: true, lockedAngleValue: 90 },
    { x: 96, y: 0, isAngleLocked: true, lockedAngleValue: 90 },
    { x: 96, y: 24, isAngleLocked: true, lockedAngleValue: 90 },
    { x: 0, y: 24, isAngleLocked: true, lockedAngleValue: 90 }
  ],
  setWallVertices: (updater) => set((state: any) => {
    let nextVertices = typeof updater === 'function' ? updater(state.wallVertices) : updater;
    if (!nextVertices || nextVertices.length === 0) {
      if (!state.isReceivingRemoteUpdate) {
        broadcastStateSync('setWallVertices', nextVertices);
      }
      return { wallVertices: nextVertices };
    }

    const hasAnyMissingLock = nextVertices.some((v: any) => (v as any).isAngleLocked === undefined);
    if (hasAnyMissingLock && nextVertices.length >= 3) {
      const isCCW = getSignedArea(nextVertices) > 0;
      nextVertices = nextVertices.map((v: any, i: number) => {
        if ((v as any).isAngleLocked !== undefined) return v;
        if ((v as any).isCurveNode) return v;

        const n = nextVertices.length;
        const A_node = nextVertices[(i - 1 + n) % n];
        const B_node = v;
        const C_node = nextVertices[(i + 1) % n];

        const angle = getInternalAngle(A_node, B_node, C_node, isCCW);
        let lockedAngleValue = angle;

        if (Math.abs(angle - 90) <= 5) {
          lockedAngleValue = 90;
        } else if (Math.abs(angle - 270) <= 5) {
          lockedAngleValue = 270;
        }

        return {
          ...v,
          isAngleLocked: true,
          lockedAngleValue,
        };
      });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const v of nextVertices) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }

    const calculatedWidth = Math.round((maxX - minX) * 1000) / 1000;
    const calculatedHeight = Math.round((maxY - minY) * 1000) / 1000;

    if (!state.isReceivingRemoteUpdate) {
      broadcastStateSync('setWallVertices', nextVertices);
    }
    return {
      wallVertices: nextVertices,
      wallWidth: calculatedWidth,
      wallHeight: calculatedHeight,
    };
  }),
  selectedVertexIndices: [],
  setSelectedVertexIndices: (updater) => set((state: any) => ({ selectedVertexIndices: typeof updater === 'function' ? updater(state.selectedVertexIndices) : updater })),
  unit: 'in',
  setUnit: (updater) => set((state: any) => ({ unit: typeof updater === 'function' ? updater(state.unit) : updater })),
  zoom: 1.0,
  setZoom: (updater) => set((state: any) => ({ zoom: typeof updater === 'function' ? updater(state.zoom) : updater })),
  panX: 0,
  setPanX: (updater) => set((state: any) => ({ panX: typeof updater === 'function' ? updater(state.panX) : updater })),
  panY: 0,
  setPanY: (updater) => set((state: any) => ({ panY: typeof updater === 'function' ? updater(state.panY) : updater })),
  backgroundImage: null,
  setBackgroundImage: (updater) => set((state: any) => ({ backgroundImage: typeof updater === 'function' ? updater(state.backgroundImage) : updater })),
  isBgUnlocked: false,
  setIsBgUnlocked: (updater) => set((state: any) => ({ isBgUnlocked: typeof updater === 'function' ? updater(state.isBgUnlocked) : updater })),
  bgScale: 1,
  setBgScale: (updater) => set((state: any) => ({ bgScale: typeof updater === 'function' ? updater(state.bgScale) : updater })),
  bgOffsetX: 0,
  setBgOffsetX: (updater) => set((state: any) => ({ bgOffsetX: typeof updater === 'function' ? updater(state.bgOffsetX) : updater })),
  bgOffsetY: 0,
  setBgOffsetY: (updater) => set((state: any) => ({ bgOffsetY: typeof updater === 'function' ? updater(state.bgOffsetY) : updater })),
  tileOpacity: 1,
  setTileOpacity: (updater) => set((state: any) => ({ tileOpacity: typeof updater === 'function' ? updater(state.tileOpacity) : updater })),
  bgOpacity: 1,
  setBgOpacity: (updater) => set((state: any) => ({ bgOpacity: typeof updater === 'function' ? updater(state.bgOpacity) : updater })),
  exportPhotoBg: true,
  setExportPhotoBg: (updater) => set((state: any) => ({ exportPhotoBg: typeof updater === 'function' ? updater(state.exportPhotoBg) : updater })),
  canvasLabels: [],
  setCanvasLabels: (updater) => set((state: any) => ({ canvasLabels: typeof updater === 'function' ? updater(state.canvasLabels) : updater })),
  editingLabelId: null,
  setEditingLabelId: (updater) => set((state: any) => ({ editingLabelId: typeof updater === 'function' ? updater(state.editingLabelId) : updater })),
  stitches: [],
  setStitches: (updater) => set((state: any) => ({ stitches: typeof updater === 'function' ? updater(state.stitches) : updater })),
});
