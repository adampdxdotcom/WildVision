import React, { useState, useRef, useEffect } from 'react';
import { TileShape, RectanglePattern } from './types';
import { TileCanvas } from './components/TileCanvas';
import { TileCanvas3D } from './components/TileCanvas3D';
import { SidebarControls } from './components/SidebarControls';
import { computeComprehensiveStatistics } from './utils/analytics';
import { calculateCenteredOffsets } from './utils/geometry';
import { Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import { handleExportPDF as handleExportPDFUtil } from './utils/pdfExport';
import { TutorialOverlay } from './components/Tutorial/TutorialOverlay';
import { tutorialSteps } from './components/Tutorial/tutorialSteps';

import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { HeaderControls } from './components/Layout/HeaderControls';
import { useTutorialSync } from './hooks/useTutorialSync';
import { useUndoRedo } from './hooks/useUndoRedo';
import { getSnapshot } from './store/slices/projectSlice';
import { logger } from './utils/logger';
import { useProjectIO } from './hooks/useProjectIO';
import { useCloudAutoSave } from './hooks/useCloudAutoSave';
import { useProjectLock } from './hooks/useProjectLock';
import { WildVisionSidebar } from './features/WildVisionRender/WildVisionSidebar';
import { WildVisionGallery } from './features/WildVisionRender/WildVisionGallery';
import PatternBuilderLayout from './features/PatternBuilder/PatternBuilderLayout';
import { supabase } from './utils/supabaseClient';

import { NewProjectModal } from './components/ProjectBrowser/NewProjectModal';
import { SaveModal } from './components/ProjectBrowser/SaveModal';
import { LoadModal } from './components/ProjectBrowser/LoadModal';
import { AuthModal } from './components/Auth/AuthModal';
import { AdminDashboardModal } from './components/Auth/AdminDashboardModal';
import { UpgradeModal } from './components/Auth/UpgradeModal';
import { UpdatePasswordModal } from './components/Auth/UpdatePasswordModal';

import { WildVisionLightbox } from './features/WildVisionRender/WildVisionLightbox';
import { PresentationView } from './features/PresentationMode/PresentationView';
import { NotFoundView } from './components/Layout/NotFoundView';
import { useMultiplayer } from './hooks/useMultiplayer';

export default function App() {
  useMultiplayer();
  const {
    projectName, setProjectName,
    wallWidth, setWallWidth,
    wallHeight, setWallHeight,
    wallVertices, setWallVertices,
    unit, setUnit,
    shape, setShape,
    tileWidth, setTileWidth,
    tileHeight, setTileHeight,
    pattern, setPattern,
    groutWidth, setGroutWidth,
    angle, setAngle,
    tileName, setTileName,
    hasNotes, setHasNotes,
    notes, setNotes,
    tileColors, setTileColors,
    colorPattern, setColorPattern,
    tilesPerStripe, setTilesPerStripe,
    compositeColors,
    colorVariation, setColorVariation,
    groutColor, setGroutColor,
    viewSettings,
    offsetX, setOffsetX,
    offsetY, setOffsetY,
    subAreas, setSubAreas,
    activeSubAreaId, setActiveSubAreaId,
    wallExtensions, setWallExtensions,
    activeWallExtensionId, setActiveWallExtensionId,
    isPainted, setIsPainted,
    isBlankCanvasMode, setIsBlankCanvasMode,
    isPdfExporting, setIsPdfExporting,
    activePresetId, setActivePresetId,
    zoom, setZoom,
    soldAsMosaic, setSoldAsMosaic,
    mainShapeSettings, setMainShapeSettings,
    mosaicWidth, setMosaicWidth,
    mosaicHeight, setMosaicHeight,
    overage, setOverage,
    angleDisplayMode,
    backgroundImage, setBackgroundImage,
    isBgUnlocked, setIsBgUnlocked,
    bgScale, setBgScale,
    bgOffsetX, setBgOffsetX,
    bgOffsetY, setBgOffsetY,
    tileOpacity, setTileOpacity,
    bgOpacity, setBgOpacity,
    exportPhotoBg, setExportPhotoBg,
    showAccentDistances, setShowAccentDistances,
    wallBoundaryShape, setWallBoundaryShape,
    wallArchHeight, setWallArchHeight,
    wallActiveArches, setWallActiveArches,
    wallArchDepth, setWallArchDepth,
    wallAngle, setWallAngle,
    wallBorder, setWallBorder,
    tutorialStepIndex, setTutorialStepIndex,
    activeSidebarTab, setActiveSidebarTab,
    isPicket, picketLength,
    isCanvasDirty, setIsCanvasDirty,
    activeTool, setActiveTool,
    canvasLabels,
    foldLines,
    viewMode, setViewMode,
    isImportLayoutModalOpen, setIsImportLayoutModalOpen,
    isWildVisionOpen,
    generatedRenders,
    activeView,
    purchasingSettings,
    isDrafting,
    activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
    isAdminConsoleOpen,
    presentationError,
    isSaveFileLoaded,
    currentProjectId,
    sceneObjects,
    updateSceneObject,
  } = useAppStore();

  const tileDotColor = compositeColors.secondary || '#334155';

  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const fetchCustomPatternsList = useAppStore((state) => state.fetchCustomPatternsList);
  const showToast = useAuthStore((state) => state.showToast);

  const setActiveAiModel = useAppStore((state) => state.setActiveAiModel);

  useEffect(() => {
    initializeAuth();
    fetchCustomPatternsList();
    
    // Fetch active AI model
    const fetchActiveAiModel = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_models')
          .select('*')
          .eq('is_active', true)
          .single();
          
        if (!error && data) {
          setActiveAiModel(data);
        }
      } catch (err) {
        console.error('Failed to fetch active AI model:', err);
      }
    };
    
    fetchActiveAiModel();
  }, [initializeAuth, fetchCustomPatternsList, setActiveAiModel]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=signup')) {
      showToast("Welcome to WildVision! Your email has been successfully verified.", "success");
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [showToast]);

  useEffect(() => {
    if (isSaveFileLoaded) {
      document.title = `WildVision - ${projectName}`;
    } else {
      document.title = 'WildVision - Tile Layout Simulator';
    }
  }, [isSaveFileLoaded, projectName]);

  const [isInitializingShare, setIsInitializingShare] = useState(false);
  const loadSharedProject = useAppStore((state) => state.loadSharedProject);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) {
      setIsInitializingShare(true);
      loadSharedProject(token)
        .then((success) => {
          if (!success) {
            showToast("Failed to load shared project design. It may have been deleted or the link is invalid.", "error");
          }
        })
        .finally(() => {
          setIsInitializingShare(false);
        });
    }
  }, [loadSharedProject, showToast]);

  // Auto-Sync Lifecycle for Cloud-linked imported layouts
  useEffect(() => {
    if (!currentProjectId) return;

    // Retrieve state snapshot of sceneObjects
    const currentSceneObjects = useAppStore.getState().sceneObjects;
    if (!currentSceneObjects) return;

    // Scan for cloud-linked imported layouts
    const cloudLinkedObjects = Object.values(currentSceneObjects).filter(
      (obj: any) => obj.type === 'imported_layout' && obj.sourceType === 'cloud' && obj.sourceId
    );

    if (cloudLinkedObjects.length === 0) return;

    console.log(`[Auto-Sync] Found ${cloudLinkedObjects.length} cloud-linked layouts. Synchronizing...`);

    // Asynchronously fetch each sourceId
    cloudLinkedObjects.forEach(async (obj: any) => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('state_payload')
          .eq('id', obj.sourceId)
          .single();

        if (error) {
          console.error(`[Auto-Sync] Failed to fetch project ${obj.sourceId}:`, error.message);
          return;
        }

        if (data && data.state_payload) {
          const payload = data.state_payload;
          const blueprint = {
            wallWidth: payload.wallWidth,
            wallHeight: payload.wallHeight,
            wallVertices: payload.wallVertices,
            subAreas: payload.subAreas,
            foldLines: payload.foldLines,
            unit: payload.unit,
            shape: payload.shape,
            tileWidth: payload.tileWidth,
            tileHeight: payload.tileHeight,
            pattern: payload.pattern,
            tileColors: payload.tileColors,
            groutColor: payload.groutColor,
            groutWidth: payload.groutWidth,
            tileFinish: payload.tileFinish,
          };

          useAppStore.getState().updateSceneObject(obj.id, {
            metadata: {
              ...obj.metadata,
              name: payload.projectName || obj.metadata?.name || 'Imported Layout',
              dimensions: [
                payload.wallWidth || 120,
                payload.wallHeight || 96,
                obj.metadata?.dimensions?.[2] || 4,
              ],
              blueprint,
            },
          });
          console.log(`[Auto-Sync] Successfully updated cloud-linked layout ${obj.id}`);
        }
      } catch (err) {
        console.error(`[Auto-Sync] Unexpected error during fetch for ${obj.id}:`, err);
      }
    });
  }, [currentProjectId]);

  const { saveStatus } = useCloudAutoSave();
  useProjectLock();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const tileSpecular = viewSettings.render.enableReflection;
  const disableTileColorOnPdf = viewSettings.pdf.disableTileColor;
  const printQuantities = viewSettings.pdf.showQuantities;
  const showPricesOnPdf = viewSettings.pdf.showPricesOnPdf;

  // Call background history watcher globally
  useUndoRedo();

  const handleResetWorkspace = () => {
    const pristine = useAppStore.getState().initialPristineState;
    if (pristine) {
      useAppStore.getState().restoreSnapshot(pristine);
      useAppStore.getState().setPastStateStack([]);
      useAppStore.getState().setFutureStateStack([]);
      useAppStore.getState().setLastSavedState(pristine);
      useAppStore.getState().triggerFitWorkspace();
      setIsCanvasDirty(false);
      logger.info('Workspace reset');
    }
  };

  // Synchronize sidebar tab with tutorial steps and load preset designs automatically
  useTutorialSync(handleResetWorkspace);

  // Monitor user state transitions for logout
  const user = useAuthStore((state) => state.user);
  const prevUserRef = useRef(user);

  const toastMessage = useAuthStore((state) => state.toastMessage);
  const clearToast = useAuthStore((state) => state.clearToast);

  // Subfloor Teleport Bridge Interceptor
  const initialProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    if (projectId) {
      initialProjectIdRef.current = projectId;
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user && initialProjectIdRef.current) {
      const projectId = initialProjectIdRef.current;
      initialProjectIdRef.current = null;

      const loadTeleportedProject = async () => {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

          if (error) {
            throw error;
          }

          if (data) {
            let payload = data.state_payload;
            if (typeof payload === 'string') {
              try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
            }

            useAppStore.getState().loadProjectState(payload, data.id, data.name, data.user_id);
            showToast("Cloud project synchronized!", "success");
          }
        } catch (err: any) {
          logger.error('Failed to load teleported project', { error: err?.message || String(err) });
          if (err?.code === 'PGRST116' || (err?.message && err.message.includes('JSON object'))) {
            showToast("Access Denied: You do not have permission to view this project, or it does not exist on this server.", "error");
          } else {
            showToast(`Failed to load project: ${err?.message || 'Unknown error'}`, "error");
          }
        }
      };

      loadTeleportedProject();
    }
  }, [user, showToast]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  const resetHistory = (snapshot: any) => {
    useAppStore.getState().setPastStateStack([]);
    useAppStore.getState().setFutureStateStack([]);
    useAppStore.getState().setLastSavedState(snapshot);
    setIsCanvasDirty(false);
  };

  // File IO Hook setup
  const {
    handleSaveProject,
    handleFileChange,
    handleLoadCustomPreset,
    handleNewProjectReset,
    fileInputRef,
  } = useProjectIO(resetHistory);

  useEffect(() => {
    // If user transitions from logged-in to logged-out
    if (prevUserRef.current && !user) {
      useAppStore.getState().resetToBlankWorkspace();
      resetHistory(getSnapshot(useAppStore.getState()));
    }
    prevUserRef.current = user;
  }, [user]);

  const handleNewProjectClick = () => {
    setIsNewModalOpen(true);
  };

  const handleLoadProjectClick = () => {
    setIsLoadModalOpen(true);
  };







  // 3. Reset/Center alignment action
  const handleResetAlignment = () => {
    const centered = calculateCenteredOffsets(
      wallWidth,
      wallHeight,
      shape,
      tileWidth,
      tileHeight,
      groutWidth,
      pattern
    );
    setOffsetX(centered.x);
    setOffsetY(centered.y);
  };

  // 4. Manual fine-tune nudging adjustments
  const handleNudge = (dir: 'up' | 'down' | 'left' | 'right', amount: number) => {
    const actualAmt = unit === 'cm' ? amount * 2.54 : amount;
    
    switch (dir) {
      case 'left':
        setOffsetX((prev) => Number((prev - actualAmt).toFixed(4)));
        break;
      case 'right':
        setOffsetX((prev) => Number((prev + actualAmt).toFixed(4)));
        break;
      case 'down':
        setOffsetY((prev) => Number((prev - actualAmt).toFixed(4)));
        break;
      case 'up':
        setOffsetY((prev) => Number((prev + actualAmt).toFixed(4)));
        break;
    }
  };

  const handlePaint = () => {
    setIsPainted(true);
    handleResetAlignment();
  };

  const handleExportPDF = () => {
    setActiveSidebarTab(7);
  };

  const handleGeneratePDF = (outputMode: 'download' | 'base64' = 'download'): Promise<string | void> => {
    // Deselect any active accents or extension selections before exporting so highlight visuals aren't shown
    setActiveSubAreaId(null);
    setActiveWallExtensionId(null);
    setIsPdfExporting(true);

    return new Promise<string | void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const { roomDimensions, layoutTransform } = useAppStore.getState();
          const isSideWall = layoutTransform.attachedPlane === 'left' || layoutTransform.attachedPlane === 'right';
          const activeWidth = isSideWall ? roomDimensions.depth : roomDimensions.width;
          
          const elevationMetadata = {
            wallWidth: activeWidth,
            wallHeight: roomDimensions.height,
          };

          const res = await handleExportPDFUtil({
            elevationMetadata,
            pdfLayoutMode: viewSettings.pdf.pdfLayoutMode,
            projectName,
            wallWidth,
            wallHeight,
            unit,
            wallExtensions,
            tileName,
            shape,
            tileWidth,
            tileHeight,
            pattern,
            groutWidth,
            subAreas: subAreas,
            zoom,
            setZoom,
            tileColors: tileColors.map(c => typeof c === 'string' ? c : c.hex),
            colorPattern,
            groutColor,
            tileSpecular,
            isPainted,
            offsetX,
            offsetY,
            angle,
            activeSubAreaId: null, // Guarantee that deselect state is reflected immediately in the PDF
            isBlankCanvasMode,
            hasNotes,
            notes,
            soldAsMosaic,
            mosaicWidth,
            mosaicHeight,
            overage,
            printQuantities,
            disableTileColorOnPdf,
            showPricesOnPdf,
            purchasingSettings,
            angleDisplayMode,
            exportPhotoBg,
            backgroundImage,
            bgScale,
            bgOffsetX,
            bgOffsetY,
            tileOpacity,
            bgOpacity,
            showAccentDistances,
            wallBoundaryShape,
            wallArchHeight,
            wallActiveArches,
            wallArchDepth,
            colorVariation,
            tileDotColor,
            wallAngle,
            wallBorder,
            isPicket,
            picketLength,
            wallVertices,
            canvasLabels,
            foldLines,
            activeCustomPattern,
            flatsketVerticalRows,
            flatsketHorizontalRows,
            outputMode,
          });
          setTimeout(() => {
            setIsPdfExporting(false);
            resolve(res);
          }, 450);
        } catch (err) {
          setIsPdfExporting(false);
          reject(err);
        }
      }, 60);
    });
  };



  // 5. Use debounced state to compute comprehensive diagnostics
  const [statsReport, setStatsReport] = useState<any>(null);

  useEffect(() => {
    if (isDrafting) return; // Skip analytics during drag/pan
    const timer = setTimeout(() => {
      const report = computeComprehensiveStatistics({
        wallWidth,
        wallHeight,
        shape,
        tileWidth,
        tileHeight,
        pattern,
        groutWidth,
        offsetX,
        offsetY,
        subAreas,
        angle,
        extensions: wallExtensions,
        isBlankCanvasMode,
        wallBoundaryShape,
        wallArchHeight,
        wallActiveArches,
        wallArchDepth,
        wallAngle,
        isPicket,
        picketLength,
        wallVertices,
        activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
      });
      setStatsReport(report);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    wallWidth,
    wallHeight,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    groutWidth,
    offsetX,
    offsetY,
    subAreas,
    angle,
    wallExtensions,
    isBlankCanvasMode,
    wallBoundaryShape,
    wallArchHeight,
    wallActiveArches,
    wallArchDepth,
    wallAngle,
    isPicket,
    picketLength,
    wallVertices,
    isDrafting,
    activeCustomPattern,
    flatsketVerticalRows,
    flatsketHorizontalRows,
  ]);

  if (isInitializingShare) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wide text-slate-300 animate-pulse uppercase font-mono">
            Loading Shared Design...
          </p>
        </div>
      </div>
    );
  }

  if (presentationError) {
    return <NotFoundView message="This presentation link is invalid or has expired." />;
  }

  if (viewMode === 'presentation') {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans relative">
        <PresentationView />
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl animate-fade-in max-w-sm w-full mx-4">
            {toastMessage.type === 'success' ? (
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                <CheckCircle size={18} />
              </div>
            ) : (
              <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                <AlertCircle size={18} />
              </div>
            )}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 leading-normal text-left">
              {toastMessage.text}
            </span>
            <button
              type="button"
              onClick={clearToast}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition focus:outline-none cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans relative">
      
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl animate-fade-in max-w-sm w-full mx-4">
          {toastMessage.type === 'success' ? (
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <CheckCircle size={18} />
            </div>
          ) : (
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
              <AlertCircle size={18} />
            </div>
          )}
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 leading-normal text-left">
            {toastMessage.text}
          </span>
          <button
            type="button"
            onClick={clearToast}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition focus:outline-none cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dynamic Dashboard Header banner - Sleek Interface style */}
      <HeaderControls
        handleSaveProject={() => setIsSaveModalOpen(true)}
        handleLoadProjectClick={handleLoadProjectClick}
        handleNewProjectClick={handleNewProjectClick}
        handleExportPDF={handleExportPDF}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        saveStatus={saveStatus}
      />

      {/* Main Content Layout Block */}
      <main className="flex-1 min-h-0 w-full flex overflow-hidden p-4 sm:p-6 lg:p-8 gap-8">
        {viewMode === 'pattern_studio' ? (
          <PatternBuilderLayout />
        ) : (
          <>
            {/* LEFT CONTAINER: Sidebar specifications controls */}
            {activeView !== 'gallery' && (
              <section id="sidebar-scroll-area" className="w-[360px] xl:w-[420px] h-full hidden md:flex flex-col flex-shrink-0 overflow-hidden pr-2">
                {isWildVisionOpen ? (
                  <WildVisionSidebar />
                ) : (
                  <SidebarControls
                    onResetAlignment={handleResetAlignment}
                    onNudge={handleNudge}
                    statsReport={statsReport}
                    onResetWorkspace={handleResetWorkspace}
                    onLoadCustomPreset={handleLoadCustomPreset}
                    handleExportPDF={handleGeneratePDF}
                  />
                )}
              </section>
            )}

            {/* RIGHT CONTAINER: Visual simulator canvas viewport (responsive flex column) */}
            <section className="flex-1 h-full flex flex-col min-h-0 overflow-hidden gap-4">
              
              <div className="md:hidden w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-center shadow-xs">
                <p className="text-[13px] text-slate-200 font-medium leading-tight">
                  This app is best on desktop or tablet. You can load and view project files, but they cannot be modified. If you really want try, switch your browser to 'Desktop site'.
                </p>
              </div>

              {/* Visual Canvas Viewport Section */}
              <div className="flex-1 min-h-0 flex flex-col pb-1">

                {isAdminConsoleOpen ? (
                  <AdminDashboardModal />
                ) : activeView === 'gallery' ? (
                  <WildVisionGallery />
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col relative">
                    {viewMode === '2d' ? (
                      <TileCanvas />
                    ) : (
                      <TileCanvas3D />
                    )}

                    {/* Floated 2D / 3D Segmented Switch */}
                    <div className="absolute bottom-4 right-4 z-40 bg-white/90 backdrop-blur-md p-1 rounded-lg flex items-center gap-1 border border-slate-300 shadow-md">
                      <button
                        onClick={() => {
                          useAppStore.getState().setViewMode('2d');
                        }}
                        className={`px-2.5 py-1 text-xs font-extrabold rounded-md transition-all duration-150 cursor-pointer ${
                          viewMode === '2d'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        2D
                      </button>
                      <button
                        onClick={() => {
                          useAppStore.getState().setViewMode('3d');
                        }}
                        className={`px-2.5 py-1 text-xs font-extrabold rounded-md transition-all duration-150 cursor-pointer ${
                          viewMode === '3d'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        3D
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dedicated Compact Desktop Footer */}
              <footer className="bg-white border border-slate-200 rounded-xl py-3 text-center text-[11px] text-slate-400 font-mono flex-shrink-0">
                <p>© 2026 WildVision — 2D Interactive Tile Layout Simulator. Layout and quantities are only estimates.</p>
              </footer>
            </section>
          </>
        )}
      </main>

      {/* Unified Project Overlay Modals */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        handleNewProjectReset={handleNewProjectReset}
        resetHistory={() => resetHistory(getSnapshot(useAppStore.getState()))}
      />

      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        handleSaveProject={handleSaveProject}
      />

      <LoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        onLoginClick={() => setIsAuthModalOpen(true)}
      />

      <LoadModal
        isOpen={isImportLayoutModalOpen}
        onClose={() => setIsImportLayoutModalOpen(false)}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        onLoginClick={() => setIsAuthModalOpen(true)}
        isImportMode={true}
        onImportPayload={(payload, sourceType, sourceId) => {
          if (!payload) return;
          const id = `imported-layout-${Date.now()}`;
          const roomDimensions = useAppStore.getState().roomDimensions;
          
          const blueprint = {
            wallWidth: payload.wallWidth,
            wallHeight: payload.wallHeight,
            wallVertices: payload.wallVertices,
            subAreas: payload.subAreas,
            foldLines: payload.foldLines,
            unit: payload.unit,
            shape: payload.shape,
            tileWidth: payload.tileWidth,
            tileHeight: payload.tileHeight,
            pattern: payload.pattern,
            tileColors: payload.tileColors,
            groutColor: payload.groutColor,
            groutWidth: payload.groutWidth,
          };

          useAppStore.getState().addSceneObject({
            id,
            type: 'imported_layout',
            position: [0, -roomDimensions.height / 2, 0],
            rotation: [0, 0, 0],
            attachedPlane: 'floor',
            sourceType,
            sourceId,
            metadata: {
              name: payload.projectName || 'Imported Layout',
              dimensions: [
                payload.wallWidth || 120,
                payload.wallHeight || 96,
                4,
              ],
              blueprint,
            },
          });
          useAppStore.getState().setActiveObjectId(id);
          setViewMode('3d');
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <UpgradeModal />

      <UpdatePasswordModal />

      <TutorialOverlay
        currentStepIndex={tutorialStepIndex}
        onClose={() => setTutorialStepIndex(-1)}
        onNext={() => {
          setTutorialStepIndex((prev) => {
            if (prev + 1 >= tutorialSteps.length) {
               return -1;
            }
            return prev + 1;
          });
        }}
        onPrev={() => {
          setTutorialStepIndex((prev) => Math.max(0, prev - 1));
        }}
        onGotoStep={(index) => setTutorialStepIndex(index)}
      />
      
    </div>
  );
}
