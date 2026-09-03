import React, { RefObject, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthModal } from '../Auth/AuthModal';
import { UserDropdown } from '../Auth/UserDropdown';
import { ShareModal } from '../ProjectBrowser/ShareModal';
import { Undo, Redo, FilePlus, Save, FolderOpen, FileDown, Sparkles, LayoutGrid, Lock, Cloud, ChevronDown, Ruler, Layout, ShieldAlert, Share2, Box } from 'lucide-react';

interface HeaderControlsProps {
  handleSaveProject: () => void;
  handleLoadProjectClick: () => void;
  handleNewProjectClick: () => void;
  handleExportPDF: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  handleSaveProject,
  handleLoadProjectClick,
  handleNewProjectClick,
  handleExportPDF,
  fileInputRef,
  handleFileChange,
  saveStatus = 'idle',
}) => {
  const {
    projectName,
    setProjectName,
    isWildVisionOpen,
    setIsWildVisionOpen,
    viewMode,
    setViewMode,
    activeView,
    setActiveView,
    isAutoSaveEnabled,
    currentProjectId,
    setIsUpgradeModalOpen,
    resetPatternBuilder,
    isSaveFileLoaded,
    isAdminConsoleOpen,
    setIsAdminConsoleOpen,
    setIsAccountSettingsOpen,
    handleUndo,
    handleRedo,
    pastStateStack,
    futureStateStack,
    isLockedByAnotherTab,
    onlineUsers,
    before_splat_url,
    after_splat_url,
    isPublicViewer,
  } = useAppStore();

  const isUndoDisabled = pastStateStack.length === 0;
  const futureLength = futureStateStack.length;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { user, openAuthModal, role } = useAuthStore();
  const isCloudActive = !!user && isAutoSaveEnabled && !!currentProjectId;
  const isPaidUser = !!user && role !== 'free';

  const otherCollaborators = Object.values(onlineUsers || {}).filter(c => c.id !== user?.id);

  // Workspace navigation state definitions
  const isLayoutActive = viewMode !== 'pattern_studio' && !isWildVisionOpen && activeView === 'canvas' && !isAdminConsoleOpen;
  const isWildVisionActive = isWildVisionOpen && viewMode !== 'pattern_studio' && activeView === 'canvas' && !isAdminConsoleOpen;
  const isGalleryActive = activeView === 'gallery';
  const isPatternStudioActive = viewMode === 'pattern_studio';
  const isSplatterActive = viewMode === 'splatter';
  const hasSplatData = !!before_splat_url || !!after_splat_url;

  return (
    <header className="bg-white border-b border-slate-200 flex-shrink-0 z-40 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* Left Zone: File Dropdown & Undo/Redo */}
        <div className="flex items-center gap-2 justify-start flex-1 min-w-0 flex-nowrap">
          {!isPublicViewer && (
            <>
              {/* File Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-3.5 border border-slate-200 rounded shadow-xs hover:shadow-sm cursor-pointer transition select-none h-[32px]"
                  onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                >
                  <span>File</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {isFileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsFileMenuOpen(false)} 
                    />
                    <div className="absolute left-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100 font-sans">
                      {/* New */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          handleNewProjectClick();
                        }}
                      >
                        <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>New</span>
                      </button>

                      {/* Save */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          handleSaveProject();
                        }}
                      >
                        {isCloudActive ? (
                          <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                        ) : (
                          <Save className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>Save</span>
                      </button>

                      {/* Load */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          handleLoadProjectClick();
                        }}
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>Load</span>
                      </button>

                      {/* Share */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          if (user) {
                            setIsShareModalOpen(true);
                          } else {
                            openAuthModal("Log in to share your project with collaborators.");
                          }
                        }}
                      >
                        {user ? (
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>Share</span>
                      </button>

                      {/* Export */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          if (user) {
                            handleExportPDF();
                          } else {
                            openAuthModal("Log in to download professional PDF blueprints and specifications.");
                          }
                        }}
                      >
                        {user ? (
                          <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>Export</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Hidden file selector input used by Load */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />

              {/* Divider */}
              <div className="w-[1px] h-5 bg-slate-200 mx-1 shrink-0" />

              {/* Undo Button */}
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-50/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs py-1.5 px-2.5 border border-slate-200 rounded shadow-xs cursor-pointer transition select-none h-[32px] shrink-0"
                title="Undo previous action"
                onClick={handleUndo}
                disabled={isUndoDisabled}
              >
                <Undo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>

              {/* Redo Button */}
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-50/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs py-1.5 px-2.5 border border-slate-200 rounded shadow-xs cursor-pointer transition select-none h-[32px] shrink-0"
                title="Redo previous action"
                onClick={handleRedo}
                disabled={futureLength === 0}
              >
                <Redo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Redo</span>
              </button>
            </>
          )}
        </div>

        {/* Center Zone: Flattened Navigation Row or Project Name */}
        <div className="flex items-center justify-center flex-shrink-0 max-w-full overflow-hidden">
          {isPublicViewer ? null : (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs max-w-full overflow-x-auto scrollbar-none flex-nowrap">
              {/* Layout Button */}
              <button
                type="button"
                onClick={() => {
                  setIsWildVisionOpen(false);
                  setIsAdminConsoleOpen(false);
                  setIsAccountSettingsOpen(false);
                  setActiveView('canvas');
                  if (viewMode === 'pattern_studio') {
                    setViewMode('2d');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 select-none cursor-pointer whitespace-nowrap ${
                  isLayoutActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/40'
                }`}
              >
                <Layout className={`w-3.5 h-3.5 ${isLayoutActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>Layout</span>
              </button>

              {/* Wild Vision Button */}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    setIsAdminConsoleOpen(false);
                    setActiveView('canvas');
                    setIsWildVisionOpen(true);
                    setViewMode('3d');
                  } else {
                    openAuthModal("Log in to unlock Photorealistic AI Rendering.");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 select-none cursor-pointer whitespace-nowrap ${
                  isWildVisionActive
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/40'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isWildVisionActive ? 'text-white' : 'text-amber-500'}`} />
                <span>Wild Vision</span>
                {!user && <Lock className={`w-3 h-3 ${isWildVisionActive ? 'text-white/80' : 'text-slate-400'}`} />}
              </button>

              {/* Gallery Button */}
              <button
                type="button"
                disabled={!isSaveFileLoaded}
                title={isSaveFileLoaded ? "View Saved Camera Renders" : "Please load or save a project to access the Gallery"}
                onClick={() => {
                  if (isSaveFileLoaded) {
                    setActiveView(activeView === 'gallery' ? 'canvas' : 'gallery');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 select-none whitespace-nowrap ${
                  !isSaveFileLoaded
                    ? 'text-slate-400 bg-transparent cursor-not-allowed opacity-50'
                    : isGalleryActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/40 cursor-pointer'
                }`}
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${!isSaveFileLoaded ? 'text-slate-300' : isGalleryActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>Gallery</span>
                {!isSaveFileLoaded && <Lock className="w-3 h-3 text-slate-455" />}
              </button>

              {hasSplatData && (
                <button
                  type="button"
                  onClick={() => {
                    setIsWildVisionOpen(false);
                    setActiveView('canvas');
                    setViewMode('splatter');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 select-none whitespace-nowrap ${
                    isSplatterActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/40 cursor-pointer'
                  }`}
                >
                  <Box className={`w-3.5 h-3.5 ${isSplatterActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>Splatter</span>
                </button>
              )}

              {/* Pattern Studio Button */}
              <button
                type="button"
                disabled={!isPaidUser}
                title={isPaidUser ? "Open Custom Pattern Studio" : "Please log in with a paid account to access Pattern Studio"}
                onClick={() => {
                  const store = useAppStore.getState();
                  let schema = store.activeCustomPattern;
                  if (schema) {
                    if (typeof schema === 'string') {
                      try {
                        schema = JSON.parse(schema);
                      } catch (e) {
                        console.error("Failed to parse custom pattern JSON", e);
                      }
                    }
                    if (typeof schema === 'object') {
                      const activeStr = JSON.stringify(store.activeCustomPattern);
                      const dbId = store.customPatternsList?.find(p => JSON.stringify(p.pattern_data) === activeStr)?.id;
                      store.loadFromSchema(schema, dbId);
                    }
                  }
                  setViewMode('pattern_studio');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 select-none whitespace-nowrap ${
                  !isPaidUser
                    ? 'text-slate-400 bg-transparent cursor-not-allowed opacity-50'
                    : isPatternStudioActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/40 cursor-pointer'
                }`}
              >
                <Ruler className={`w-3.5 h-3.5 ${!isPaidUser ? 'text-slate-300' : isPatternStudioActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>Pattern Studio</span>
                {!isPaidUser && <Lock className="w-3 h-3 text-slate-455" />}
              </button>
            </div>
          )}
        </div>

        {/* Right Zone: User controls & Branding Logo */}
        <div className="flex items-center gap-3 justify-end flex-1 min-w-0 flex-nowrap">
          {/* Active Collaborators */}
          {otherCollaborators.length > 0 && (
            <div className="flex -space-x-2 mr-2">
              {otherCollaborators.map((collaborator) => {
                const displayName = collaborator.name || collaborator.email || 'User';
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <div
                    key={collaborator.id}
                    className="relative group w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden cursor-pointer"
                    style={{ backgroundColor: collaborator.cursorColor }}
                    title={displayName}
                  >
                    {collaborator.avatar_url ? (
                      <img src={collaborator.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">{initial}</span>
                    )}
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {displayName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Controls */}
          <UserDropdown onLoginClick={() => setIsAuthModalOpen(true)} />

          {/* Vertical Divider */}
          <div className="w-[1px] h-5 bg-slate-200 shrink-0" />

            {/* WildVision Logo */}
          <div className="flex items-baseline shrink-0 select-none">
            <div className="relative inline-block select-none">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight text-nowrap font-curwen leading-none">WildVision</h1>
              <span className="absolute -top-1 -right-4 -rotate-12 border-[1.5px] border-red-600 text-red-600 font-mono text-[0.55rem] font-black tracking-widest px-1 rounded-sm opacity-80 mix-blend-multiply pointer-events-none uppercase">ALPHA</span>
            </div>
            <span className="ml-2 text-xs font-bold text-slate-400">v5.5</span>
          </div>
        </div>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      </div>
      {isLockedByAnotherTab && !isPublicViewer && (
        <div id="cross-tab-lock-header-warning" className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-amber-800 animate-in slide-in-from-top duration-200">
          <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1"></span>
          <span>⚠️ Project open in another tab. Autosave disabled to prevent data loss.</span>
        </div>
      )}
    </header>
  );
};
