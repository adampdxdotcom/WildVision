import { StateCreator } from 'zustand';
import { supabase } from '../../utils/supabaseClient';
import { useAuthStore } from '../useAuthStore';
import { logger } from '../../utils/logger';
import { broadcastStateSync } from '../../utils/syncBroadcaster';
import { fastDeepClone } from '../../utils/cloneState';

export interface ProjectSlice {
  projectName: string;
  setProjectName: (val: string | ((prev: string) => string)) => void;
  currentProjectId: string | null;
  currentProjectName: string;
  before_splat_url: string | null;
  after_splat_url: string | null;
  isAutoSaveEnabled: boolean;
  setIsAutoSaveEnabled: (enabled: boolean) => void;
  setProjectMetadata: (id: string | null, name: string) => void;
  loadProjectState: (payload: any, projectId: string, projectName: string, ownerId?: string, explicitPermission?: 'owner' | 'write' | 'read') => void;
  resetToBlankWorkspace: () => void;
  isSaveFileLoaded: boolean;
  setIsSaveFileLoaded: (val: boolean) => void;
  isProjectLoading: boolean;
  setIsProjectLoading: (val: boolean) => void;
  saveProjectAs: (newName: string) => Promise<boolean>;
  pastStateStack: any[];
  futureStateStack: any[];
  isRestoringHistory: boolean;
  setPastStateStack: (stack: any[]) => void;
  setFutureStateStack: (stack: any[]) => void;
  setIsRestoringHistory: (flag: boolean) => void;
  restoreSnapshot: (snapshot: any) => void;
  lastSavedState: any;
  setLastSavedState: (val: any) => void;
  initialPristineState: any;
  setInitialPristineState: (val: any) => void;
  fitWorkspaceTrigger: number;
  triggerFitWorkspace: () => void;
  cloudSyncError: boolean;
  setCloudSyncError: (val: boolean) => void;
  isShared: boolean;
  shareToken: string | null;
  featuredRenderId: string | null;
  presentationError: boolean;
  setPresentationError: (val: boolean) => void;
  isPublicViewer: boolean;
  setIsPublicViewer: (value: boolean) => void;
  generateShareLink: (activeRenderId?: string) => Promise<string | null>;
  loadSharedProject: (token: string, options?: { isCadView?: boolean }) => Promise<boolean>;
  handleUndo: () => void;
  handleRedo: () => void;
  isLockedByAnotherTab: boolean;
  setIsLockedByAnotherTab: (locked: boolean) => void;
  currentProjectPermission: 'owner' | 'write' | 'read' | null;
  setCurrentProjectPermission: (permission: 'owner' | 'write' | 'read' | null) => void;
  isReadOnly: boolean;
  setIsReadOnly: (readOnly: boolean) => void;
  pdfElevationUrl: string | null;
  setPdfElevationUrl: (url: string | null) => void;
  publicShowQuantities?: boolean;
  setPublicShowQuantities: (val: boolean) => void;
  publicShowPricing?: boolean;
  setPublicShowPricing: (val: boolean) => void;
  isClientQuantitiesOpen: boolean;
  setIsClientQuantitiesOpen: (open: boolean) => void;
  export3DSceneToGlbFn: (() => Promise<Blob | null>) | null;
  setExport3DSceneToGlbFn: (fn: (() => Promise<Blob | null>) | null) => void;
}

export const getSnapshot = (state: any) => {
  const tileDotColor = state.compositeColors?.secondary || '#334155';
  return {
    projectName: state.projectName,
    wallWidth: state.wallWidth,
    wallHeight: state.wallHeight,
    wallVertices: state.wallVertices ? fastDeepClone(state.wallVertices) : [],
    unit: state.unit,
    shape: state.shape,
    tileWidth: state.tileWidth,
    tileHeight: state.tileHeight,
    pattern: state.pattern,
    groutWidth: state.groutWidth,
    angle: state.angle,
    tileName: state.tileName,
    tileColors: state.tileColors ? [...state.tileColors] : [],
    colorPattern: state.colorPattern,
    tilesPerStripe: state.tilesPerStripe,
    tileDotColor,
    activeCustomPattern: state.activeCustomPattern ? fastDeepClone(state.activeCustomPattern) : null,
    compositeColors: state.compositeColors ? fastDeepClone(state.compositeColors) : {},
    colorVariation: state.colorVariation,
    groutColor: state.groutColor,
    subAreas: state.subAreas ? fastDeepClone(state.subAreas) : [],
    wallExtensions: state.wallExtensions ? fastDeepClone(state.wallExtensions) : [],
    isPainted: state.isPainted,
    soldAsMosaic: state.soldAsMosaic,
    mosaicWidth: state.mosaicWidth,
    mosaicHeight: state.mosaicHeight,
    overage: state.overage,
    reuseCuts: state.reuseCuts,
    hasNotes: state.hasNotes,
    notes: state.notes,
    backgroundImage: state.backgroundImage,
    bgScale: state.bgScale,
    bgOffsetX: state.bgOffsetX,
    bgOffsetY: state.bgOffsetY,
    tileOpacity: state.tileOpacity,
    bgOpacity: state.bgOpacity,
    wallBoundaryShape: state.wallBoundaryShape,
    wallArchHeight: state.wallArchHeight,
    wallActiveArches: state.wallActiveArches,
    wallArchDepth: state.wallArchDepth,
    wallAngle: state.wallAngle,
    wallBorder: state.wallBorder ? fastDeepClone(state.wallBorder) : null,
    mainShapeSettings: state.mainShapeSettings ? fastDeepClone(state.mainShapeSettings) : null,
    layoutFoldType: state.layoutFoldType || 'inward',
    foldLines: state.foldLines ? (fastDeepClone(state.foldLines) as any[]).map((f: any) => ({ ...f, foldAngle: f.foldAngle !== undefined && f.foldAngle !== null ? f.foldAngle : (state.layoutFoldType === 'outward' ? -90 : 90) })) : [],
    sceneObjects: state.sceneObjects ? fastDeepClone(state.sceneObjects) : [],
    roomDimensions: state.roomDimensions ? fastDeepClone(state.roomDimensions) : null,
    roomColors: state.roomColors ? fastDeepClone(state.roomColors) : null,
    uploadedSvgText: state.uploadedSvgText,
    patternAccentColor: state.patternAccentColor,
    publicShowQuantities: state.publicShowQuantities ?? false,
    publicShowPricing: state.publicShowPricing ?? false,
    tileColorOverrides: state.tileColorOverrides ? fastDeepClone(state.tileColorOverrides) : {},
    activeBrushColorIndex: state.activeBrushColorIndex !== undefined ? state.activeBrushColorIndex : 1,
    flatsketVerticalRows: state.flatsketVerticalRows !== undefined ? state.flatsketVerticalRows : 1,
    flatsketHorizontalRows: state.flatsketHorizontalRows !== undefined ? state.flatsketHorizontalRows : 3,
    basketWeaveMultiplier: state.basketWeaveMultiplier !== undefined ? state.basketWeaveMultiplier : 2,
    isPicket: state.isPicket ?? false,
    picketLength: state.picketLength ?? 8,
    tileFinish: state.tileFinish || 'glossy',
    purchasingSettings: state.purchasingSettings ? fastDeepClone(state.purchasingSettings) : {},
    linkedSubfloorProjectId: state.linkedSubfloorProjectId,
    before_splat_url: state.before_splat_url,
    after_splat_url: state.after_splat_url,
    integrationData: state.integrationData ? fastDeepClone(state.integrationData) : null,
  };
};

export const createProjectSlice: StateCreator<any, [], [], ProjectSlice> = (set, get) => ({
  projectName: 'Kitchen Accent Backsplash',
  setProjectName: (updater) => set((state: any) => ({ projectName: typeof updater === 'function' ? updater(state.projectName) : updater })),
  currentProjectId: null,
  currentProjectName: 'Untitled Project',
  before_splat_url: null,
  after_splat_url: null,
  isAutoSaveEnabled: true,
  setIsAutoSaveEnabled: (enabled) => set({ isAutoSaveEnabled: enabled }),
  isSaveFileLoaded: false,
  setIsSaveFileLoaded: (val) => set({ isSaveFileLoaded: val }),
  isProjectLoading: false,
  setIsProjectLoading: (val) => set({ isProjectLoading: val }),
  pastStateStack: [],
  futureStateStack: [],
  isRestoringHistory: false,
  setPastStateStack: (stack: any[]) => set({ pastStateStack: stack }),
  setFutureStateStack: (stack: any[]) => set({ futureStateStack: stack }),
  setIsRestoringHistory: (flag: boolean) => set({ isRestoringHistory: flag }),
  lastSavedState: null,
  setLastSavedState: (val: any) => set({ lastSavedState: val }),
  initialPristineState: null,
  setInitialPristineState: (val: any) => set({ initialPristineState: val }),
  fitWorkspaceTrigger: 0,
  triggerFitWorkspace: () => set((state: any) => ({ fitWorkspaceTrigger: state.fitWorkspaceTrigger + 1 })),
  cloudSyncError: false,
  setCloudSyncError: (val: boolean) => set({ cloudSyncError: val }),
  isShared: false,
  shareToken: null,
  featuredRenderId: null,
  presentationError: false,
  setPresentationError: (val: boolean) => set({ presentationError: val }),
  isLockedByAnotherTab: false,
  setIsLockedByAnotherTab: (locked: boolean) => set({ isLockedByAnotherTab: locked }),
  currentProjectPermission: 'owner',
  setCurrentProjectPermission: (permission) => set({ 
    currentProjectPermission: permission,
    isReadOnly: permission === 'read'
  }),
  isReadOnly: false,
  setIsReadOnly: (readOnly) => set({ isReadOnly: readOnly }),
  isPublicViewer: false,
  setIsPublicViewer: (val) => set({ isPublicViewer: val }),
  publicShowQuantities: false,
  setPublicShowQuantities: (val) => set({ publicShowQuantities: val }),
  publicShowPricing: false,
  setPublicShowPricing: (val) => set({ publicShowPricing: val }),
  isClientQuantitiesOpen: false,
  setIsClientQuantitiesOpen: (open) => set({ isClientQuantitiesOpen: open }),
  pdfElevationUrl: null,
  setPdfElevationUrl: (url) => set({ pdfElevationUrl: url }),
  export3DSceneToGlbFn: null,
  setExport3DSceneToGlbFn: (fn) => set({ export3DSceneToGlbFn: fn }),
  generateShareLink: async (activeRenderId?: string) => {
    const s = get();
    if (!s.currentProjectId) {
      return null;
    }
    try {
      const updateData: any = { is_shared: true };
      if (activeRenderId) {
        updateData.featured_render_id = activeRenderId;
      }
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', s.currentProjectId)
        .select('share_token')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        set({
          isShared: true,
          shareToken: data.share_token,
          ...(activeRenderId ? { featuredRenderId: activeRenderId } : {})
        });
        return `${window.location.origin}/?share=${data.share_token}`;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to generate share link:', err);
      logger.error('Failed to generate share link', { error: err?.message || String(err) });
      return null;
    }
  },
  loadSharedProject: async (token: string, options?: { isCadView?: boolean }) => {
    set({ presentationError: false });
    try {
      const { data, error: projectError } = await supabase
        .rpc('get_presentation_project', { p_token: token })
        .single();
      const project: any = data;

      if (projectError || !project) {
        throw projectError || new Error('Project not found');
      }

      const s = get();
      
      let payload = project.state_payload;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
      }
      
      s.loadProjectState(payload, project.id, project.name, project.user_id);

      if (payload?.linkedSubfloorProjectId !== undefined) {
        s.linkProject?.(payload.linkedSubfloorProjectId);
      }
      if (payload?.integrationData !== undefined) {
        s.setIntegrationData?.(payload.integrationData);
      }

      const isCad = options?.isCadView ?? false;

      set((state: any) => ({
        isShared: true,
        shareToken: token,
        featuredRenderId: project.featured_render_id,
        currentProjectId: project.id,
        currentProjectName: project.name,
        projectName: project.name,
        isSaveFileLoaded: true,
        isPublicViewer: isCad,
        fitWorkspaceTrigger: state.fitWorkspaceTrigger + 1
      }));

      if (project.featured_render_id) {
        const { data: render, error: renderError } = await supabase
          .from('ai_renders')
          .select('*')
          .eq('id', project.featured_render_id)
          .single();

        if (!renderError && render) {
          let camState = render.camera_state || {};
          if (typeof camState === 'string') {
            try {
              camState = JSON.parse(camState);
            } catch (e) {
              camState = {};
            }
          }
          const mappedRender = {
            id: render.id,
            imageUrl: render.image_url,
            sourceImage: render.snapshot_url,
            prompt: render.prompt_used,
            created_at: render.created_at,
            cameraPosition: camState.position || null,
            cameraTarget: camState.target || null,
            cameraFov: camState.fov || null,
            camera_state: camState,
            parent_id: render.parent_id || null,
            name: render.name,
            notes: render.notes
          };
          s.setGeneratedRenders([mappedRender]);
        }
      }

      if (isCad) {
        s.setViewMode('2d');
      } else {
        s.setViewMode('presentation');
      }
      return true;
    } catch (err: any) {
      console.error('Failed to load shared project:', err);
      logger.error('Failed to load shared project', { error: err?.message || String(err) });
      set({ presentationError: true });
      return false;
    }
  },
  handleUndo: () => {
    const s = get();
    const current = getSnapshot(s);
    const lastSaved = s.lastSavedState;
    const unsaved = lastSaved && JSON.stringify(lastSaved) !== JSON.stringify(current);
    let restoredState = null;

    if (unsaved) {
      s.restoreSnapshot(lastSaved);
      restoredState = lastSaved;
      if (s.pastStateStack.length === 0) {
        s.setIsCanvasDirty(false);
      }
    } else if (s.pastStateStack.length > 0) {
      const prev = s.pastStateStack[s.pastStateStack.length - 1];
      const newPast = s.pastStateStack.slice(0, -1);
      s.setPastStateStack(newPast);
      s.setFutureStateStack([current, ...s.futureStateStack]);
      s.restoreSnapshot(prev);
      restoredState = prev;
      s.setLastSavedState(fastDeepClone(prev));
      if (newPast.length === 0) {
        s.setIsCanvasDirty(false);
      }
    }

    if (restoredState && !s.isReceivingRemoteUpdate) {
      broadcastStateSync('GLOBAL_HISTORY_RESTORE', restoredState);
    }
  },
  handleRedo: () => {
    const s = get();
    if (s.futureStateStack.length > 0) {
      const next = s.futureStateStack[0];
      const current = getSnapshot(s);
      s.setFutureStateStack(s.futureStateStack.slice(1));
      s.setPastStateStack([...s.pastStateStack, current]);
      s.restoreSnapshot(next);
      s.setLastSavedState(fastDeepClone(next));
      s.setIsCanvasDirty(true);

      if (!s.isReceivingRemoteUpdate) {
        broadcastStateSync('GLOBAL_HISTORY_RESTORE', next);
      }
    }
  },
  restoreSnapshot: (snapshot: any) => set((state: any) => {
    const keys = [
      'projectName', 'wallWidth', 'wallHeight', 'wallVertices', 'unit', 'shape',
      'tileWidth', 'tileHeight', 'pattern', 'groutWidth', 'angle', 'tileName',
      'tileColors', 'colorPattern', 'tilesPerStripe', 'tileDotColor', 'compositeColors',
      'colorVariation', 'groutColor', 'viewSettings', 'offsetX', 'offsetY',
      'subAreas', 'activeSubAreaId', 'wallExtensions', 'activeWallExtensionId',
      'isPainted', 'isBlankCanvasMode', 'activePresetId', 'soldAsMosaic',
      'mosaicWidth', 'mosaicHeight', 'overage', 'reuseCuts', 'hasNotes', 'notes',
      'angleDisplayMode', 'backgroundImage', 'isBgUnlocked', 'bgScale',
      'bgOffsetX', 'bgOffsetY', 'tileOpacity', 'bgOpacity', 'exportPhotoBg',
      'showAccentDistances', 'wallBoundaryShape', 'wallArchHeight', 'wallActiveArches',
      'wallArchDepth', 'wallAngle', 'wallBorder', 'mainShapeSettings', 'layoutFoldType', 'foldLines',
      'roomDimensions', 'roomColors', 'layoutTransform', 'sceneObjects',
      'activeObjectId', 'floorY', 'backWallZ', 'leftWallX', 'rightWallX',
      'ceilingY', 'activeCustomPattern', 'uploadedSvgText', 'patternAccentColor',
      'tileColorOverrides', 'activeBrushColorIndex', 'flatsketVerticalRows', 'flatsketHorizontalRows',
      'basketWeaveMultiplier', 'isPicket', 'picketLength', 'tileFinish', 'purchasingSettings',
      'linkedSubfloorProjectId', 'integrationData'
    ];

    const updates: any = {
      isRestoringHistory: true
    };

    for (const key of keys) {
      if (snapshot[key] !== undefined) {
        if (typeof snapshot[key] === 'object' && snapshot[key] !== null) {
          updates[key] = fastDeepClone(snapshot[key]);
        } else {
          updates[key] = snapshot[key];
        }
      }
    }

    if (updates.tileColorOverrides === undefined) {
      updates.tileColorOverrides = {};
    }
    if (updates.activeBrushColorIndex === undefined) {
      updates.activeBrushColorIndex = 1;
    }

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
      }
    }, 0);

    return updates;
  }),
  saveProjectAs: async (newName: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('saveProjectAs failed: No authenticated user.');
      return false;
    }

    const s = get();
    const finalProjectName = newName.trim() || 'Untitled Project';

    const snapshot = {
      version: '1.0',
      projectName: finalProjectName,
      wallWidth: s.wallWidth,
      wallHeight: s.wallHeight,
      wallVertices: s.wallVertices,
      unit: s.unit,
      shape: s.shape,
      tileWidth: s.tileWidth,
      tileHeight: s.tileHeight,
      pattern: s.pattern,
      groutWidth: s.groutWidth,
      angle: s.angle,
      tileName: s.tileName,
      tileColors: s.tileColors,
      colorPattern: s.colorPattern,
      tilesPerStripe: s.tilesPerStripe,
      tileDotColor: s.tileDotColor,
      compositeColors: s.compositeColors,
      colorVariation: s.colorVariation,
      groutColor: s.groutColor,
      viewSettings: s.viewSettings,
      offsetX: s.offsetX,
      offsetY: s.offsetY,
      subAreas: s.subAreas,
      activeSubAreaId: s.activeSubAreaId,
      wallExtensions: s.wallExtensions,
      activeWallExtensionId: s.activeWallExtensionId,
      isPainted: s.isPainted,
      isBlankCanvasMode: s.isBlankCanvasMode,
      activePresetId: s.activePresetId,
      soldAsMosaic: s.soldAsMosaic,
      mosaicWidth: s.mosaicWidth,
      mosaicHeight: s.mosaicHeight,
      overage: s.overage,
      reuseCuts: s.reuseCuts,
      hasNotes: s.hasNotes,
      notes: s.notes,
      angleDisplayMode: s.angleDisplayMode,
      backgroundImage: s.backgroundImage,
      isBgUnlocked: s.isBgUnlocked,
      bgScale: s.bgScale,
      bgOffsetX: s.bgOffsetX,
      bgOffsetY: s.bgOffsetY,
      tileOpacity: s.tileOpacity,
      bgOpacity: s.bgOpacity,
      exportPhotoBg: s.exportPhotoBg,
      showAccentDistances: s.showAccentDistances,
      wallBoundaryShape: s.wallBoundaryShape,
      wallArchHeight: s.wallArchHeight,
      wallActiveArches: s.wallActiveArches,
      wallArchDepth: s.wallArchDepth,
      wallAngle: s.wallAngle,
      wallBorder: s.wallBorder,
      mainShapeSettings: s.mainShapeSettings,
      layoutFoldType: s.layoutFoldType || 'inward',
      foldLines: s.foldLines,
      roomDimensions: s.roomDimensions,
      roomColors: s.roomColors,
      layoutTransform: s.layoutTransform,
      sceneObjects: s.sceneObjects,
      activeObjectId: s.activeObjectId,
      floorY: s.floorY,
      backWallZ: s.backWallZ,
      leftWallX: s.leftWallX,
      rightWallX: s.rightWallX,
      ceilingY: s.ceilingY,
      activeCustomPattern: s.activeCustomPattern,
      tileColorOverrides: s.tileColorOverrides,
      activeBrushColorIndex: s.activeBrushColorIndex,
      flatsketVerticalRows: s.flatsketVerticalRows,
      flatsketHorizontalRows: s.flatsketHorizontalRows,
      basketWeaveMultiplier: s.basketWeaveMultiplier,
      isPicket: s.isPicket,
      picketLength: s.picketLength,
      tileFinish: s.tileFinish,
      purchasingSettings: s.purchasingSettings,
      linkedSubfloorProjectId: s.linkedSubfloorProjectId,
      integrationData: s.integrationData,
      publicShowQuantities: s.publicShowQuantities ?? false,
      publicShowPricing: s.publicShowPricing ?? false,
    };

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: finalProjectName,
          state_payload: snapshot,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        set({
          currentProjectId: data.id,
          currentProjectName: data.name,
          projectName: data.name,
          isSaveFileLoaded: true,
          isCanvasDirty: false,
        });

        logger.info('Project saved as new copy', { projectId: data.id, projectName: data.name });
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wildvision:exportGlb', { detail: { projectId: data.id } }));
        }

        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to save project as new copy:', err);
      logger.error('Failed to save project as new copy', { error: err?.message || String(err) });
      throw err;
    }
  },
  setProjectMetadata: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
  loadProjectState: (payload, projectId, projectName, ownerId, explicitPermission) => set((state: any) => {
    let data = payload;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch (e) {
        console.error('Failed to parse loadProjectState payload:', e);
        return {};
      }
    }
    
    if (!data) return {};

    const currentUser = useAuthStore.getState().user;
    let permission: 'owner' | 'write' | 'read' = explicitPermission || 'owner';
    if (!explicitPermission) {
      if (ownerId && currentUser && ownerId !== currentUser.id) {
        permission = 'read';
      } else if (ownerId && !currentUser) {
        permission = 'read';
      }
    }

    const updates: Partial<any> = {
      currentProjectId: projectId,
      currentProjectName: projectName,
      projectName: data.projectName || projectName,
      isSaveFileLoaded: true,
      currentProjectPermission: permission,
      isReadOnly: permission === 'read',
      isPublicViewer: false,
      liveCameraPosition: null,
      liveCameraTarget: null,
      pastStateStack: [],
      futureStateStack: [],
      isRestoringHistory: false,
      fitWorkspaceTrigger: state.fitWorkspaceTrigger + 1,
    };

    if (data.wallWidth !== undefined) updates.wallWidth = data.wallWidth;
    if (data.wallHeight !== undefined) updates.wallHeight = data.wallHeight;
    if (data.wallVertices !== undefined) updates.wallVertices = data.wallVertices;
    if (data.unit !== undefined) updates.unit = data.unit;
    if (data.shape !== undefined) updates.shape = data.shape;
    if (data.tileWidth !== undefined) updates.tileWidth = data.tileWidth;
    if (data.tileHeight !== undefined) updates.tileHeight = data.tileHeight;
    if (data.pattern !== undefined) updates.pattern = data.pattern;
    if (data.basketWeaveMultiplier !== undefined) updates.basketWeaveMultiplier = data.basketWeaveMultiplier;
    if (data.flatsketVerticalRows !== undefined) updates.flatsketVerticalRows = data.flatsketVerticalRows;
    if (data.flatsketHorizontalRows !== undefined) updates.flatsketHorizontalRows = data.flatsketHorizontalRows;
    if (data.isPicket !== undefined) updates.isPicket = data.isPicket;
    if (data.picketLength !== undefined) updates.picketLength = data.picketLength;
    if (data.groutWidth !== undefined) updates.groutWidth = data.groutWidth;
    if (data.angle !== undefined) updates.angle = data.angle;
    if (data.tileName !== undefined) updates.tileName = data.tileName;
    if (data.tileColors !== undefined) updates.tileColors = data.tileColors;
    if (data.colorPattern !== undefined) updates.colorPattern = data.colorPattern;
    if (data.tilesPerStripe !== undefined) updates.tilesPerStripe = data.tilesPerStripe;
    if (data.tileDotColor !== undefined) updates.tileDotColor = data.tileDotColor;
    if (data.compositeColors !== undefined) {
      updates.compositeColors = data.compositeColors;
    } else if (data.tileDotColor !== undefined) {
      updates.compositeColors = { secondary: data.tileDotColor };
    }
    if (data.colorVariation !== undefined) updates.colorVariation = data.colorVariation;
    if (data.tileFinish !== undefined) updates.tileFinish = data.tileFinish;
    if (data.groutColor !== undefined) updates.groutColor = data.groutColor;
    if (data.offsetX !== undefined) updates.offsetX = data.offsetX;
    if (data.offsetY !== undefined) updates.offsetY = data.offsetY;
    if (data.subAreas !== undefined) updates.subAreas = data.subAreas;
    if (data.purchasingSettings !== undefined) updates.purchasingSettings = data.purchasingSettings;
    if (data.activeSubAreaId !== undefined) updates.activeSubAreaId = data.activeSubAreaId;
    if (data.wallExtensions !== undefined) updates.wallExtensions = data.wallExtensions;
    if (data.activeWallExtensionId !== undefined) updates.activeWallExtensionId = data.activeWallExtensionId;
    if (data.isPainted !== undefined) updates.isPainted = data.isPainted;
    if (data.isBlankCanvasMode !== undefined) updates.isBlankCanvasMode = data.isBlankCanvasMode;
    if (data.activePresetId !== undefined) updates.activePresetId = data.activePresetId;
    if (data.soldAsMosaic !== undefined) updates.soldAsMosaic = data.soldAsMosaic;
    if (data.mosaicWidth !== undefined) updates.mosaicWidth = data.mosaicWidth;
    if (data.mosaicHeight !== undefined) updates.mosaicHeight = data.mosaicHeight;
    if (data.overage !== undefined) updates.overage = data.overage;
    if (data.reuseCuts !== undefined) updates.reuseCuts = data.reuseCuts;
    if (data.hasNotes !== undefined) updates.hasNotes = data.hasNotes;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.angleDisplayMode !== undefined) updates.angleDisplayMode = data.angleDisplayMode;
    if (data.backgroundImage !== undefined) updates.backgroundImage = data.backgroundImage;
    if (data.isBgUnlocked !== undefined) updates.isBgUnlocked = data.isBgUnlocked;
    if (data.bgScale !== undefined) updates.bgScale = data.bgScale;
    if (data.bgOffsetX !== undefined) updates.bgOffsetX = data.bgOffsetX;
    if (data.bgOffsetY !== undefined) updates.bgOffsetY = data.bgOffsetY;
    if (data.tileOpacity !== undefined) updates.tileOpacity = data.tileOpacity;
    if (data.bgOpacity !== undefined) updates.bgOpacity = data.bgOpacity;
    if (data.exportPhotoBg !== undefined) updates.exportPhotoBg = data.exportPhotoBg;
    if (data.showAccentDistances !== undefined) updates.showAccentDistances = data.showAccentDistances;
    if (data.wallArchHeight !== undefined) updates.wallArchHeight = data.wallArchHeight;
    if (data.wallBoundaryShape !== undefined) updates.wallBoundaryShape = data.wallBoundaryShape;
    if (data.wallActiveArches !== undefined) updates.wallActiveArches = data.wallActiveArches;
    if (data.wallArchDepth !== undefined) updates.wallArchDepth = data.wallArchDepth;
    if (data.wallAngle !== undefined) updates.wallAngle = data.wallAngle;
    if (data.wallBorder !== undefined) updates.wallBorder = data.wallBorder;
    if (data.mainShapeSettings !== undefined) updates.mainShapeSettings = data.mainShapeSettings;
    if (data.layoutFoldType !== undefined) updates.layoutFoldType = data.layoutFoldType;
    const defaultFoldAngle = (data.layoutFoldType || state.layoutFoldType) === 'outward' ? -90 : 90;
    if (data.foldLines !== undefined) updates.foldLines = Array.isArray(data.foldLines) ? data.foldLines.map((f: any) => ({ ...f, foldAngle: f.foldAngle !== undefined && f.foldAngle !== null ? f.foldAngle : defaultFoldAngle })) : [];
    if (data.roomDimensions !== undefined) updates.roomDimensions = data.roomDimensions;
    if (data.roomColors !== undefined) updates.roomColors = data.roomColors;
    if (data.layoutTransform !== undefined) updates.layoutTransform = data.layoutTransform;
    if (data.sceneObjects !== undefined) {
      updates.sceneObjects = data.sceneObjects;
    } else if (data.layoutTransform !== undefined) {
      updates.sceneObjects = {
        'main-tile-layout': {
          id: 'main-tile-layout',
          type: 'tile_layout',
          position: data.layoutTransform.position || [0, 0, 0],
          rotation: [0, 0, 0],
          attachedPlane: data.layoutTransform.attachedPlane || 'back',
          metadata: {
            mountAnchor: data.layoutTransform.mountAnchor || 'back'
          }
        }
      };
    }
    if (data.activeObjectId !== undefined) {
      updates.activeObjectId = data.activeObjectId;
    } else if (data.layoutTransform !== undefined) {
      updates.activeObjectId = 'main-tile-layout';
    }
    if (data.floorY !== undefined) updates.floorY = data.floorY;
    if (data.backWallZ !== undefined) updates.backWallZ = data.backWallZ;
    if (data.leftWallX !== undefined) updates.leftWallX = data.leftWallX;
    if (data.rightWallX !== undefined) updates.rightWallX = data.rightWallX;
    if (data.ceilingY !== undefined) updates.ceilingY = data.ceilingY;
    if (data.canvasLabels !== undefined) updates.canvasLabels = data.canvasLabels;
    if (data.stitches !== undefined) updates.stitches = data.stitches;
    if (data.anchoredRegionCenter !== undefined) updates.anchoredRegionCenter = data.anchoredRegionCenter;
    if (data.enableRealisticDepth !== undefined) updates.enableRealisticDepth = data.enableRealisticDepth;
    if (data.materialTexture !== undefined) updates.materialTexture = data.materialTexture;

    if (data.activeCustomPattern !== undefined) {
      updates.activeCustomPattern = data.activeCustomPattern;
    } else {
      updates.activeCustomPattern = null;
    }

    updates.tileColorOverrides = data.tileColorOverrides || {};
    updates.activeBrushColorIndex = data.activeBrushColorIndex !== undefined ? data.activeBrushColorIndex : 1;
    
    if (data.linkedSubfloorProjectId !== undefined) updates.linkedSubfloorProjectId = data.linkedSubfloorProjectId;
    if (data.integrationData !== undefined) updates.integrationData = data.integrationData;
    if (data.before_splat_url !== undefined) updates.before_splat_url = data.before_splat_url;
    if (data.after_splat_url !== undefined) updates.after_splat_url = data.after_splat_url;
    if (data.publicShowQuantities !== undefined) {
      updates.publicShowQuantities = data.publicShowQuantities;
    } else {
      updates.publicShowQuantities = false;
    }
    if (data.publicShowPricing !== undefined) {
      updates.publicShowPricing = data.publicShowPricing;
    } else {
      updates.publicShowPricing = false;
    }

    const mergedState = { ...state, ...updates };
    const snapshot = getSnapshot(mergedState);
    updates.lastSavedState = snapshot;
    updates.initialPristineState = snapshot;
    updates.pastStateStack = [];
    updates.futureStateStack = [];
    updates.isRestoringHistory = false;
    updates.isCanvasDirty = false;

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
      }
    }, 0);

    return updates;
  }),
  resetToBlankWorkspace: () => set((state: any) => {
    const nextState = {
      ...state,
      projectName: 'Kitchen Accent Backsplash',
      currentProjectId: null,
      currentProjectName: 'Untitled Project',
      before_splat_url: null,
      after_splat_url: null,
      isSaveFileLoaded: false,
      isPublicViewer: false,
      publicShowQuantities: false,
      publicShowPricing: false,
      pastStateStack: [],
      futureStateStack: [],
      isRestoringHistory: false,
      fitWorkspaceTrigger: state.fitWorkspaceTrigger + 1,
      currentProjectPermission: 'owner',
      isReadOnly: false,
      wallWidth: 96,
      wallHeight: 24,
      wallVertices: [
        { x: 0, y: 0 },
        { x: 96, y: 0 },
        { x: 96, y: 24 },
        { x: 0, y: 24 }
      ],
      selectedVertexIndices: [],
      unit: 'in',
      shape: 'rectangle',
      tileWidth: 6,
      tileHeight: 3,
      pattern: 'running_50',
      basketWeaveMultiplier: 2,
      flatsketVerticalRows: 1,
      flatsketHorizontalRows: 3,
      isPicket: false,
      picketLength: 8,
      groutWidth: 0.125,
      angle: 0,
      tileName: 'White Gloss Ceramic Subway',
      hasNotes: false,
      notes: '',
      tileColors: ['#f1f5f9'],
      colorPattern: 'single',
      tilesPerStripe: 1,
      tileDotColor: '#64748b',
      compositeColors: { secondary: '#64748b' },
      colorVariation: 'V1',
      tileFinish: 'glossy',
      groutColor: '#64748b',
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
        }
      },
      offsetX: 45,
      offsetY: 10.5,
      subAreas: [],
      purchasingSettings: {},
      activeSubAreaId: null,
      wallExtensions: [],
      activeWallExtensionId: null,
      layoutFoldType: 'inward',
      foldLines: [],
      isPainted: true,
      isBlankCanvasMode: false,
      tileColorOverrides: {},
      activeBrushColorIndex: 1,
      activePresetId: 'subway-backsplash',
      zoom: 1.0,
      panX: 0,
      panY: 0,
      zoom3D: 1.0,
      showSavePrompt: false,
      isAutoSaveEnabled: false,
      soldAsMosaic: false,
      mosaicWidth: 12,
      mosaicHeight: 12,
      overage: 10,
      reuseCuts: false,
      angleDisplayMode: 'non-standard',
      backgroundImage: null,
      isBgUnlocked: false,
      bgScale: 1,
      bgOffsetX: 0,
      bgOffsetY: 0,
      tileOpacity: 1,
      bgOpacity: 1,
      exportPhotoBg: true,
      showAccentDistances: false,
      wallBoundaryShape: 'rectangle',
      wallArchHeight: 0,
      wallActiveArches: { top: false, bottom: false, left: false, right: false },
      wallArchDepth: 0,
      wallAngle: 0,
      wallBorder: {
        enabled: false,
        tileName: 'Border Tile',
        tileWidth: 4,
        tileHeight: 2,
        cornerJoint: 'straight',
        color: '#1e293b'
      },
      activeSidebarTab: 1,
      isCanvasDirty: false,
      canvasLabels: [],
      editingLabelId: null,
      viewMode: '2d',
      stitches: [],
      draftStitchNodeIndex: null,
      anchoredRegionCenter: null,
      enableRealisticDepth: false,
      materialTexture: 'none',
      isWildVisionOpen: false,
      generatedRenders: [],
      linkedSubfloorProjectId: null,
      subfloorProducts: [],
      integrationData: null,
      activeView: 'canvas',
      liveCameraPosition: null,
      liveCameraTarget: null,
      isCameraHeightLocked: false,
      isCameraDistanceLocked: false,
      styleReferenceImage: null,
      roomDimensions: { width: 120, height: 96, depth: 120 },
      roomColors: { base: '#f8fafc', overrides: { floor: '#94a3b8' } },
      layoutTransform: { position: [60, 48, -60], attachedPlane: 'back', mountAnchor: 'back' },
      sceneObjects: {
        'main-tile-layout': {
          id: 'main-tile-layout',
          type: 'tile_layout',
          position: [60, 48, -60],
          rotation: [0, 0, 0],
          attachedPlane: 'back',
          metadata: {
            mountAnchor: 'back'
          }
        }
      },
      activeObjectId: null,
      floorY: 0,
      backWallZ: 0,
      leftWallX: 0,
      rightWallX: 0,
      ceilingY: 0,
      activeCustomPattern: null,
      pdfElevationUrl: null,

      // Reset Pattern Studio (Pattern Builder) State Fields
      patternName: 'Classic Star & Cross',
      blockWidth: 50,
      blockHeight: 50,
      builderTiles: [
        {
          id: 'star-1',
          name: '8-Point Star',
          w: 25,
          h: 25,
          dx: 25,
          dy: 25,
          role: 'primary',
          color: '#3b82f6',
          vertices: [
            { x: 0.5, y: 0 },
            { x: 0.203, y: 0.084 },
            { x: 0.354, y: 0.354 },
            { x: 0.084, y: 0.203 },
            { x: 0, y: 0.5 },
            { x: -0.084, y: 0.203 },
            { x: -0.354, y: 0.354 },
            { x: -0.203, y: 0.084 },
            { x: -0.5, y: 0 },
            { x: -0.203, y: -0.084 },
            { x: -0.354, y: -0.354 },
            { x: -0.084, y: -0.203 },
            { x: 0, y: -0.5 },
            { x: 0.084, y: -0.203 },
            { x: 0.354, y: -0.354 },
            { x: 0.203, y: -0.084 }
          ]
        },
        {
          id: 'cross-1',
          name: 'Interlocking Cross',
          w: 25,
          h: 25,
          dx: 0,
          dy: 0,
          role: 'secondary',
          color: '#10b981',
          vertices: [
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
            { x: -0.15, y: -0.15 }
          ]
        },
        {
          id: 'cross-2',
          name: 'Corner Cross Overlay',
          w: 25,
          h: 25,
          dx: 50,
          dy: 0,
          role: 'secondary',
          color: '#10b981',
          vertices: [
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
            { x: -0.15, y: -0.15 }
          ]
        },
        {
          id: 'cross-3',
          name: 'Base Cross Overlay',
          w: 25,
          h: 25,
          dx: 0,
          dy: 50,
          role: 'secondary',
          color: '#10b981',
          vertices: [
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
            { x: -0.15, y: -0.15 }
          ]
        },
        {
          id: 'cross-4',
          name: 'Top Cross Overlay',
          w: 25,
          h: 25,
          dx: 50,
          dy: 50,
          role: 'secondary',
          color: '#10b981',
          vertices: [
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
            { x: -0.15, y: -0.15 }
          ]
        }
      ],
      activeTileIndex: 0,
      selectedVertexIndex: null,
      snapToGrid: true,
      snapResolution: 0.05,
      gridSize: 20,
      isSavingPattern: false,
      patternSaveError: null,
      isClientQuantitiesOpen: false
    };
    const snapshot = getSnapshot(nextState);
    nextState.lastSavedState = snapshot;
    nextState.initialPristineState = snapshot;
    return nextState;
  }),
});
