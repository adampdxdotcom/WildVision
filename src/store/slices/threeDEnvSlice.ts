import { StateCreator } from 'zustand';
import { 
  RoomDimensions, 
  RoomColors, 
  LayoutTransform, 
  SceneObject, 
  LibraryModel 
} from '../../types';

export interface ThreeDEnvSlice {
  savedCameraFov: number;
  setSavedCameraFov: (val: number | ((prev: number) => number)) => void;
  capturedCameraPosition: number[] | null;
  setCapturedCameraPosition: (val: number[] | null) => void;
  capturedCameraTarget: number[] | null;
  setCapturedCameraTarget: (val: number[] | null) => void;
  capturedCameraFov: number;
  setCapturedCameraFov: (val: number) => void;
  activeCameraPosition: number[] | null;
  setActiveCameraPosition: (pos: number[] | null) => void;
  activeCameraTarget: number[] | null;
  setActiveCameraTarget: (target: number[] | null) => void;
  activeCameraTrigger: number;
  setActiveCameraTrigger: (val: number | ((prev: number) => number)) => void;
  liveCameraPosition: number[] | null;
  liveCameraTarget: number[] | null;
  setLiveCamera: (pos: number[] | null, target: number[] | null) => void;
  isCameraHeightLocked: boolean;
  setIsCameraHeightLocked: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCameraDistanceLocked: boolean;
  setIsCameraDistanceLocked: (val: boolean | ((prev: boolean) => boolean)) => void;
  orthoLock: boolean;
  setOrthoLock: (val: boolean | ((prev: boolean) => boolean)) => void;
  roomDimensions: RoomDimensions;
  setRoomDimensions: (val: RoomDimensions | Partial<RoomDimensions> | ((prev: RoomDimensions) => RoomDimensions)) => void;
  roomColors: RoomColors;
  setRoomColors: (val: Partial<RoomColors> | ((prev: RoomColors) => RoomColors)) => void;
  layoutTransform: LayoutTransform;
  setLayoutTransform: (val: LayoutTransform | Partial<LayoutTransform> | ((prev: LayoutTransform) => LayoutTransform)) => void;
  sceneObjects: Record<string, SceneObject>;
  setSceneObjects: (objects: Record<string, SceneObject>) => void;
  activeObjectId: string | null;
  addSceneObject: (obj: SceneObject) => void;
  updateSceneObject: (id: string, updates: Partial<SceneObject> | ((prev: SceneObject) => Partial<SceneObject>)) => void;
  removeSceneObject: (id: string) => void;
  toggleObjectLock: (id: string) => void;
  setActiveObjectId: (id: string | null) => void;
  libraryModels: LibraryModel[];
  addLibraryModel: (model: LibraryModel) => void;
  setLibraryModels: (models: LibraryModel[]) => void;
  floorY: number;
  setFloorY: (val: number | ((prev: number) => number)) => void;
  backWallZ: number;
  setBackWallZ: (val: number | ((prev: number) => number)) => void;
  leftWallX: number;
  setLeftWallX: (val: number | ((prev: number) => number)) => void;
  rightWallX: number;
  setRightWallX: (val: number | ((prev: number) => number)) => void;
  ceilingY: number;
  setCeilingY: (val: number | ((prev: number) => number)) => void;
  lightingExposure: number;
  setLightingExposure: (val: number) => void;
}

export const createThreeDEnvSlice: StateCreator<any, [], [], ThreeDEnvSlice> = (set) => ({
  savedCameraFov: 70,
  setSavedCameraFov: (updater) => set((state: any) => ({ savedCameraFov: typeof updater === 'function' ? updater(state.savedCameraFov) : updater })),
  capturedCameraPosition: null,
  setCapturedCameraPosition: (val) => set({ capturedCameraPosition: val }),
  capturedCameraTarget: null,
  setCapturedCameraTarget: (val) => set({ capturedCameraTarget: val }),
  capturedCameraFov: 70,
  setCapturedCameraFov: (val) => set({ capturedCameraFov: val }),
  activeCameraPosition: null,
  setActiveCameraPosition: (pos) => set({ activeCameraPosition: pos }),
  activeCameraTarget: null,
  setActiveCameraTarget: (target) => set({ activeCameraTarget: target }),
  activeCameraTrigger: 0,
  setActiveCameraTrigger: (updater) => set((state: any) => ({ activeCameraTrigger: typeof updater === 'function' ? updater(state.activeCameraTrigger) : updater })),
  liveCameraPosition: null,
  liveCameraTarget: null,
  setLiveCamera: (pos, target) => set({ liveCameraPosition: pos, liveCameraTarget: target }),
  isCameraHeightLocked: false,
  setIsCameraHeightLocked: (updater) => set((state: any) => ({ isCameraHeightLocked: typeof updater === 'function' ? updater(state.isCameraHeightLocked) : updater })),
  isCameraDistanceLocked: false,
  setIsCameraDistanceLocked: (updater) => set((state: any) => ({ isCameraDistanceLocked: typeof updater === 'function' ? updater(state.isCameraDistanceLocked) : updater })),
  orthoLock: false,
  setOrthoLock: (updater) => set((state: any) => ({ orthoLock: typeof updater === 'function' ? updater(state.orthoLock) : updater })),
  roomDimensions: { width: 120, height: 96, depth: 120 },
  setRoomDimensions: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.roomDimensions) : updater;
    return {
      roomDimensions: {
        ...state.roomDimensions,
        ...nextVal,
      }
    };
  }),
  roomColors: { base: '#f8fafc', overrides: { floor: '#94a3b8' } },
  setRoomColors: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.roomColors) : updater;
    const mergedOverrides = {
      ...state.roomColors.overrides,
      ...(nextVal.overrides || {})
    } as any;
    
    // Clean up any keys set to undefined or null to support resetting to default/master
    Object.keys(mergedOverrides).forEach((key) => {
      if (mergedOverrides[key] === undefined || mergedOverrides[key] === null) {
        delete mergedOverrides[key];
      }
    });

    return {
      roomColors: {
        base: nextVal.base !== undefined ? nextVal.base : state.roomColors.base,
        overrides: mergedOverrides
      }
    };
  }),
  layoutTransform: { position: [60, 48, -60], attachedPlane: 'back', mountAnchor: 'front' },
  setLayoutTransform: (updater) => set((state: any) => {
    const nextVal = typeof updater === 'function' ? updater(state.layoutTransform) : updater;
    const mergedLayout = {
      ...state.layoutTransform,
      ...nextVal,
    };

    const mainLayoutObj = state.sceneObjects['main-tile-layout'] || {
      id: 'main-tile-layout',
      type: 'tile_layout',
      position: [60, 48, -60],
      rotation: [0, 0, 0],
      attachedPlane: 'back',
      metadata: { mountAnchor: 'front' }
    };

    const updatedMainLayout = {
      ...mainLayoutObj,
      position: mergedLayout.position,
      attachedPlane: mergedLayout.attachedPlane,
      metadata: {
        ...mainLayoutObj.metadata,
        mountAnchor: mergedLayout.mountAnchor
      }
    };

    return {
      layoutTransform: mergedLayout,
      sceneObjects: {
        ...state.sceneObjects,
        'main-tile-layout': updatedMainLayout
      }
    };
  }),
  sceneObjects: {
    'main-tile-layout': {
      id: 'main-tile-layout',
      type: 'tile_layout',
      position: [60, 48, -60],
      rotation: [0, 0, 0],
      attachedPlane: 'back',
      metadata: {
        mountAnchor: 'front'
      }
    }
  },
  libraryModels: [],
  addLibraryModel: (model) => set((state: any) => ({
    libraryModels: [...state.libraryModels, model]
  })),
  setLibraryModels: (models) => set(() => ({
    libraryModels: models
  })),
  activeObjectId: 'main-tile-layout',
  setSceneObjects: (objects) => set(() => ({ sceneObjects: objects })),
  addSceneObject: (obj) => set((state: any) => ({
    sceneObjects: {
      ...state.sceneObjects,
      [obj.id]: obj
    }
  })),
  updateSceneObject: (id, updates) => set((state: any) => {
    const target = state.sceneObjects[id];
    if (!target) return {};
    const nextUpdates = typeof updates === 'function' ? updates(target) : updates;
    const updatedObj = {
      ...target,
      ...nextUpdates,
      metadata: (nextUpdates.metadata || target.metadata) ? {
        ...target.metadata,
        ...nextUpdates.metadata
      } : undefined
    };

    const newSceneObjects = {
      ...state.sceneObjects,
      [id]: updatedObj
    };

    const extraUpdates: any = { sceneObjects: newSceneObjects };

    if (id === 'main-tile-layout') {
      const position = updatedObj.position;
      const attachedPlane = updatedObj.attachedPlane as any;
      const mountAnchor = updatedObj.metadata?.mountAnchor || 'back';
      extraUpdates.layoutTransform = {
        position,
        attachedPlane,
        mountAnchor
      };
    }

    return extraUpdates;
  }),
  removeSceneObject: (id) => set((state: any) => {
    const { [id]: _, ...rest } = state.sceneObjects;
    return {
      sceneObjects: rest,
      activeObjectId: state.activeObjectId === id ? null : state.activeObjectId
    };
  }),
  toggleObjectLock: (id) => set((state: any) => {
    const obj = state.sceneObjects[id];
    if (!obj) return {};
    return {
      sceneObjects: {
        ...state.sceneObjects,
        [id]: { ...obj, isLocked: !obj.isLocked }
      },
      activeObjectId: state.activeObjectId === id && !obj.isLocked ? null : state.activeObjectId
    };
  }),
  setActiveObjectId: (id) => set({ activeObjectId: id }),
  floorY: 0,
  setFloorY: (updater) => set((state: any) => ({ floorY: typeof updater === 'function' ? updater(state.floorY) : updater })),
  backWallZ: 0,
  setBackWallZ: (updater) => set((state: any) => ({ backWallZ: typeof updater === 'function' ? updater(state.backWallZ) : updater })),
  leftWallX: 0,
  setLeftWallX: (updater) => set((state: any) => ({ leftWallX: typeof updater === 'function' ? updater(state.leftWallX) : updater })),
  rightWallX: 0,
  setRightWallX: (updater) => set((state: any) => ({ rightWallX: typeof updater === 'function' ? updater(state.rightWallX) : updater })),
  ceilingY: 0,
  setCeilingY: (updater) => set((state: any) => ({ ceilingY: typeof updater === 'function' ? updater(state.ceilingY) : updater })),
  lightingExposure: 1.0,
  setLightingExposure: (val) => set({ lightingExposure: val }),
});
