import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { TileShape, RectanglePattern, MeasurementUnit, SubArea, WallExtension, ColorVariation, ColorPattern, ComprehensiveReport, BorderConfig } from '../types';
import { Sliders, Grid, Layers, Compass, Palette, Image, BarChart2, Link2, RefreshCw, ExternalLink, Lock, Download } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../utils/supabaseClient';
import { WallSetupPanel } from './Sidebar/WallSetupPanel';
import { TileSpecsPanel } from './Sidebar/TileSpecsPanel';
import { ColorControlsPanel } from './Sidebar/ColorControlsPanel';
import { FeaturesPanel } from './Sidebar/FeaturesPanel';
import { QuantitiesPanel } from './QuantitiesPanel';
import { AccountPanel } from './Sidebar/AccountPanel';
import { SettingsPanel } from './Sidebar/SettingsPanel';
import { OverlayPanel } from './Sidebar/OverlayPanel';
import { ExportPanel } from './Sidebar/ExportPanel';
import { ActivePropEditor } from './Sidebar/ActivePropEditor';

export interface SidebarControlsProps {
  onResetAlignment: () => void;
  onNudge: (dir: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  statsReport?: import('../types').ComprehensiveReport;
  onResetWorkspace?: () => void;
  onLoadCustomPreset?: (data: any) => void;
  handleExportPDF?: (outputMode?: 'download' | 'base64') => Promise<string | void> | void;
}


export const SidebarControls: React.FC<SidebarControlsProps> = ({
  onResetAlignment,
  onNudge,
  statsReport,
  onResetWorkspace,
  onLoadCustomPreset,
  handleExportPDF
}) => {
  const {
    subfloorUrl,
    subfloorProjects,
    subfloorProducts,
    linkedSubfloorProjectId,
    isFetchingIntegration,
    fetchSubfloorProjects,
    fetchSubfloorProducts,
    linkProject,
    syncLinkToSubfloor,
    currentProjectId,
    isReadOnly,
    before_splat_url,
    after_splat_url,
    viewMode,
    projectName
  } = useAppStore();

  const subfloorApiKey = useAuthStore(state => state.subfloor_api_key);

  const [globalSubfloorApiKey, setGlobalSubfloorApiKey] = React.useState<string | null>(null);
  const [globalSubfloorUrl, setGlobalSubfloorUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('subfloor_api_key, subfloor_url')
          .eq('id', 1)
          .maybeSingle();
        if (data?.subfloor_api_key) {
          setGlobalSubfloorApiKey(data.subfloor_api_key);
        }
        if (data?.subfloor_url) {
          setGlobalSubfloorUrl(data.subfloor_url);
        }
      } catch (err) {
        console.warn('Error fetching global settings:', err);
      }
    };
    fetchGlobalSettings();
  }, []);

  const activeSubfloorUrl = globalSubfloorUrl || subfloorUrl;
  const showSubfloorBlock = !!globalSubfloorApiKey || !!subfloorApiKey;

  const [isDownloadingSplat, setIsDownloadingSplat] = React.useState(false);

  const handleDownloadSplat = async () => {
    const targetUrl = after_splat_url || before_splat_url;
    if (!targetUrl) return;

    try {
      setIsDownloadingSplat(true);
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${projectName.replace(/\s+/g, '_')}_Model.splat`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error downloading .splat file:', err);
    } finally {
      setIsDownloadingSplat(false);
    }
  };

  React.useEffect(() => {
    if ((globalSubfloorApiKey || subfloorApiKey) && subfloorProjects.length === 0) {
      fetchSubfloorProjects();
      fetchSubfloorProducts();
    }
  }, [globalSubfloorApiKey, subfloorApiKey, subfloorProjects.length, fetchSubfloorProjects, fetchSubfloorProducts]);

  const {
    wallWidth, setWallWidth,
    wallHeight, setWallHeight,
    wallVertices,
    unit, setUnit,
    shape, setShape,
    tileWidth, setTileWidth,
    tileHeight, setTileHeight,
    pattern, setPattern,
    groutWidth, setGroutWidth,
    tileColors, setTileColors,
    colorPattern, setColorPattern,
    tilesPerStripe, setTilesPerStripe,
    colorVariation, setColorVariation,
    groutColor, setGroutColor,
    offsetX, setOffsetX,
    offsetY, setOffsetY,
    subAreas, setSubAreas,
    activeSubAreaId, setActiveSubAreaId,
    angle, setAngle,
    wallExtensions, setWallExtensions,
    activeWallExtensionId, setActiveWallExtensionId,
    tileName, setTileName,
    isBlankCanvasMode, setIsBlankCanvasMode,
    soldAsMosaic, setSoldAsMosaic,
    mosaicWidth, setMosaicWidth,
    mosaicHeight, setMosaicHeight,
    overage,
    hasNotes, setHasNotes,
    notes, setNotes,
    showAccentDistances, setShowAccentDistances,
    wallBoundaryShape, setWallBoundaryShape,
    wallArchHeight, setWallArchHeight,
    wallActiveArches, setWallActiveArches,
    wallArchDepth, setWallArchDepth,
    wallAngle, setWallAngle,
    wallBorder, setWallBorder,
    activeSidebarTab: externalActiveTab, setActiveSidebarTab,
    tutorialStepIndex, setTutorialStepIndex,
    isAccountSettingsOpen,
    setIsAccountSettingsOpen,
    activeObjectId,
    sceneObjects
  } = useAppStore();

  const activeObject = activeObjectId && sceneObjects ? sceneObjects[activeObjectId] : undefined;
  const isActiveProp = activeObject && (activeObject.type === 'custom_box' || activeObject.type === 'clay_model');


  const [internalActiveTab, setInternalActiveTab] = React.useState<number>(1);
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab2 = (tabId: number) => {
    if (setActiveSidebarTab) {
      setActiveSidebarTab(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  const tabs = [
    { id: 1, short: 'Canvas', fullName: 'Wall Canvas & Setup', icon: Grid },
    { id: 6, short: 'Tile', fullName: 'Wall Tile Specifications & Design', icon: Layers },
    { id: 2, short: 'Accents', fullName: 'Accent Features & Niches', icon: Compass },
    { id: 4, short: 'Overlay', fullName: 'Room Photo Overlay', icon: Image },
    { id: 5, short: 'Quantities', fullName: 'Layout & Quantities Diagnosis', icon: BarChart2 },
    { id: 3, short: 'Settings', fullName: 'Alignment & Settings Calibration', icon: Sliders },
  ];

  if (isAccountSettingsOpen) {
    return <AccountPanel />;
  }

  if (isActiveProp) {
    return <ActivePropEditor />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4">
      {/* Dynamic Bento Sidebar Tab Selectors */}
      <div className="space-y-1.5 animate-fade-in">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {tabs.slice(0, 3).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`tab-selector-${tab.id}`}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab2(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-black'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                  {tab.short}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {tabs.slice(3).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`tab-selector-${tab.id}`}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab2(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-black'
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                  {tab.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flexible Height Tab Content Containers */}
      <div id="sidebar-scroll-content" className="relative flex-1 min-h-0 w-full overflow-y-auto pr-1.5 scrollbar-thin transition-all duration-300">
        {isReadOnly && (
          <div className="sticky top-0 z-50 flex items-start justify-center pt-4 pb-4 bg-gradient-to-b from-white via-white/90 to-transparent">
            <div className="bg-slate-100 text-slate-700 px-4 py-2 border border-slate-300 rounded shadow-sm text-xs font-bold flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              View Only Mode
            </div>
          </div>
        )}
        <div className={isReadOnly && activeTab !== 5 && activeTab !== 7 ? "pointer-events-none opacity-50" : ""}>
          {activeTab === 1 && (
          <div className="space-y-6 animate-fade-in">
            {showSubfloorBlock && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-650 shrink-0" />
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider font-sans">
                    Subfloor Integration
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={linkedSubfloorProjectId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      linkProject(val);
                      if (val && currentProjectId) {
                        syncLinkToSubfloor(val, currentProjectId);
                      }
                    }}
                    className="flex-1 min-w-0 text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Link Subfloor Project...</option>
                    {subfloorProjects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      fetchSubfloorProjects();
                      fetchSubfloorProducts();
                    }}
                    disabled={isFetchingIntegration}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Refresh Subfloor Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingIntegration ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {linkedSubfloorProjectId && (
                  <div className="flex justify-between items-center text-[10px] text-indigo-750 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Project synced and active</span>
                    </div>
                    {activeSubfloorUrl && (
                      <a
                        href={`${activeSubfloorUrl}/projects/${linkedSubfloorProjectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <span className="underline">Open in Subfloor</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'splatter' && (before_splat_url || after_splat_url) && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider font-sans">
                    3D Spatial Data
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSplat}
                  disabled={isDownloadingSplat}
                  className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 shadow-sm rounded-lg p-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingSplat ? 'Downloading...' : 'Download .splat File'}</span>
                </button>
              </div>
            )}

            <WallSetupPanel
              wallWidth={wallWidth}
              setWallWidth={setWallWidth}
              wallHeight={wallHeight}
              setWallHeight={setWallHeight}
              unit={unit}
              setUnit={setUnit}
              tileWidth={tileWidth}
              setTileWidth={setTileWidth}
              tileHeight={tileHeight}
              setTileHeight={setTileHeight}
              groutWidth={groutWidth}
              setGroutWidth={setGroutWidth}
              subAreas={subAreas}
              setSubAreas={setSubAreas}
              wallExtensions={wallExtensions}
              setWallExtensions={setWallExtensions}
              activeWallExtensionId={activeWallExtensionId}
              setActiveWallExtensionId={setActiveWallExtensionId}
              setActiveSubAreaId={setActiveSubAreaId}
              mode="setup"
              isBlankCanvasMode={isBlankCanvasMode}
              setIsBlankCanvasMode={setIsBlankCanvasMode}
              wallBoundaryShape={wallBoundaryShape}
              setWallBoundaryShape={setWallBoundaryShape}
              wallArchHeight={wallArchHeight}
              setWallArchHeight={setWallArchHeight}
              wallActiveArches={wallActiveArches}
              setWallActiveArches={setWallActiveArches}
              wallArchDepth={wallArchDepth}
              setWallArchDepth={setWallArchDepth}
              wallAngle={wallAngle}
              setWallAngle={setWallAngle}
              onResetWorkspace={onResetWorkspace}
              onLoadCustomPreset={onLoadCustomPreset}
            />

            {/* Commented out Wall Shape Extensions section per user request, preserving the block structure but hiding from Sidebar tab */}
            {/*
            <WallSetupPanel
              wallWidth={wallWidth}
              setWallWidth={setWallWidth}
              wallHeight={wallHeight}
              setWallHeight={setWallHeight}
              unit={unit}
              setUnit={setUnit}
              tileWidth={tileWidth}
              setTileWidth={setTileWidth}
              tileHeight={tileHeight}
              setTileHeight={setTileHeight}
              groutWidth={groutWidth}
              setGroutWidth={setGroutWidth}
              subAreas={subAreas}
              setSubAreas={setSubAreas}
              wallExtensions={wallExtensions}
              setWallExtensions={setWallExtensions}
              activeWallExtensionId={activeWallExtensionId}
              setActiveWallExtensionId={setActiveWallExtensionId}
              setActiveSubAreaId={setActiveSubAreaId}
              mode="extensions"
              isBlankCanvasMode={isBlankCanvasMode}
              setIsBlankCanvasMode={setIsBlankCanvasMode}
              wallBoundaryShape={wallBoundaryShape}
              setWallBoundaryShape={setWallBoundaryShape}
              wallArchHeight={wallArchHeight}
              setWallArchHeight={setWallArchHeight}
              wallActiveArches={wallActiveArches}
              setWallActiveArches={setWallActiveArches}
              wallArchDepth={wallArchDepth}
              setWallArchDepth={setWallArchDepth}
              wallAngle={wallAngle}
              setWallAngle={setWallAngle}
            />
            */}
          </div>
        )}

        {activeTab === 6 && (
          <div id="tile-specs-section" className="space-y-6 animate-fade-in">
            <TileSpecsPanel onNudge={onNudge} onResetAlignment={onResetAlignment} />

            <ColorControlsPanel />
          </div>
        )}

        {activeTab === 2 && (
          <FeaturesPanel
            subAreas={subAreas}
            setSubAreas={setSubAreas}
            activeSubAreaId={activeSubAreaId}
            setActiveSubAreaId={setActiveSubAreaId}
            wallWidth={wallWidth}
            wallHeight={wallHeight}
            wallExtensions={wallExtensions}
            unit={unit}
            showAccentDistances={showAccentDistances}
            setShowAccentDistances={setShowAccentDistances}
          />
        )}

        {activeTab === 4 && (
          <OverlayPanel />
        )}

        {activeTab === 5 && (
          <div className="animate-fade-in space-y-4">
            {statsReport ? (
              <QuantitiesPanel
                comprehensiveReport={statsReport}
                wallWidth={wallWidth}
                wallHeight={wallHeight}
                wallVertices={wallVertices}
                unit={unit}
                overage={overage}
              />
            ) : (
              <div className="p-6 bg-white rounded border border-slate-200 shadow-xs flex justify-center items-center">
                <p className="text-slate-500 text-sm font-semibold tracking-wide animate-pulse">
                  Calculating quantities...
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 3 && (
          <SettingsPanel />
        )}

        {/* Export Settings Panel UI */}
        {activeTab === 7 && (
          <ExportPanel handleExportPDF={handleExportPDF} setActiveTab2={setActiveTab2} />
        )}
        </div>
      </div>
    </div>
  );
};
