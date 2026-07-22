import React from 'react';
import { MeasurementUnit, WallExtension, SubArea } from '../../types';
import { MainWallEditor } from './MainWallEditor';
import { ExtensionManager } from './ExtensionManager';
import { RoomSetupEditor } from './RoomSetupEditor';
import { CustomBoxesPanel } from './RoomSetup/CustomBoxesPanel';
import { ClayModelsPanel } from './RoomSetup/ClayModelsPanel';
import { useAppStore } from '../../store/useAppStore';

interface WallSetupPanelProps {
  wallWidth: number;
  setWallWidth: (val: number) => void;
  wallHeight: number;
  setWallHeight: (val: number) => void;
  unit: MeasurementUnit;
  setUnit: (unit: MeasurementUnit) => void;
  tileWidth: number;
  setTileWidth: (val: number) => void;
  tileHeight: number;
  setTileHeight: (val: number) => void;
  groutWidth: number;
  setGroutWidth: (val: number) => void;
  subAreas: SubArea[];
  setSubAreas: React.Dispatch<React.SetStateAction<SubArea[]>>;
  wallExtensions: WallExtension[];
  setWallExtensions: React.Dispatch<React.SetStateAction<WallExtension[]>>;
  activeWallExtensionId: string | null;
  setActiveWallExtensionId: (id: string | null) => void;
  setActiveSubAreaId: (id: string | null) => void;
  mode?: 'setup' | 'extensions';
  isBlankCanvasMode?: boolean;
  setIsBlankCanvasMode?: (val: boolean) => void;
  wallBoundaryShape?: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  setWallBoundaryShape?: (val: 'rectangle' | 'arch' | 'oval' | 'custom_arches') => void;
  wallArchHeight?: number;
  setWallArchHeight?: (val: number) => void;
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  setWallActiveArches?: (val: { top: boolean; bottom: boolean; left: boolean; right: boolean }) => void;
  wallArchDepth?: number;
  setWallArchDepth?: (val: number) => void;
  wallAngle?: number;
  setWallAngle?: (val: number) => void;
  onResetWorkspace?: () => void;
  onLoadCustomPreset?: (data: any) => void;
}

export const WallSetupPanel: React.FC<WallSetupPanelProps> = (props) => {
  const {
    wallWidth,
    setWallWidth,
    wallHeight,
    setWallHeight,
    unit,
    setUnit,
    tileWidth,
    setTileWidth,
    tileHeight,
    setTileHeight,
    groutWidth,
    setGroutWidth,
    subAreas,
    setSubAreas,
    wallExtensions,
    setWallExtensions,
    activeWallExtensionId,
    setActiveWallExtensionId,
    setActiveSubAreaId,
    mode,
    isBlankCanvasMode = false,
    setIsBlankCanvasMode,
    wallBoundaryShape = 'rectangle',
    setWallBoundaryShape,
    wallArchHeight = 0,
    setWallArchHeight,
    wallActiveArches = { top: true, bottom: false, left: false, right: false },
    setWallActiveArches,
    wallArchDepth = 0,
    setWallArchDepth,
    wallAngle = 0,
    setWallAngle,
    onResetWorkspace,
    onLoadCustomPreset,
  } = props;

  const { viewMode } = useAppStore();

  if (mode === 'setup') {
    return (
      <div className="space-y-4">
        {viewMode === '3d' && <RoomSetupEditor />}
        {viewMode === '2d' && (
          <MainWallEditor
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
        )}
        {viewMode === '3d' && (
          <>
            <CustomBoxesPanel />
            <ClayModelsPanel />
          </>
        )}
      </div>
    );
  }

  if (mode === 'extensions') {
    return (
      <ExtensionManager
        wallExtensions={wallExtensions}
        setWallExtensions={setWallExtensions}
        activeWallExtensionId={activeWallExtensionId}
        setActiveWallExtensionId={setActiveWallExtensionId}
        setActiveSubAreaId={setActiveSubAreaId}
        unit={unit}
        wallWidth={wallWidth}
        wallHeight={wallHeight}
      />
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === '3d' && <RoomSetupEditor />}
      {viewMode === '2d' && (
        <MainWallEditor
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
      )}
      <ExtensionManager
        wallExtensions={wallExtensions}
        setWallExtensions={setWallExtensions}
        activeWallExtensionId={activeWallExtensionId}
        setActiveWallExtensionId={setActiveWallExtensionId}
        setActiveSubAreaId={setActiveSubAreaId}
        unit={unit}
        wallWidth={wallWidth}
        wallHeight={wallHeight}
      />
      {viewMode === '3d' && (
        <>
          <CustomBoxesPanel />
          <ClayModelsPanel />
        </>
      )}
    </div>
  );
};
