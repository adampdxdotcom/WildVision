const fs = require('fs');

// ====== SidebarControls.tsx ======
let c = fs.readFileSync('src/components/SidebarControls.tsx', 'utf-8');

const sidebarInterfaceNew = `export interface SidebarControlsProps {
  onResetAlignment: () => void;
  onNudge: (dir: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  statsReport?: import('../types').ComprehensiveReport;
}
`;

c = c.replace(/interface SidebarControlsProps \{[\s\S]*?\n\}/, sidebarInterfaceNew);

if (!c.includes("import { useAppStore } from '../store/useAppStore';")) {
  c = c.replace(
    "import React, { useState } from 'react';", 
    "import React, { useState } from 'react';\nimport { useAppStore } from '../store/useAppStore';"
  );
}

const p1Start = c.indexOf('export const SidebarControls: React.FC<SidebarControlsProps> = ({');
const p1End = c.indexOf('}) => {', p1Start);

const sidebarComponentStart = `export const SidebarControls: React.FC<SidebarControlsProps> = ({
  onResetAlignment,
  onNudge,
  statsReport
}) => {
`;

const storeDestructure = `  const {
    wallWidth, setWallWidth,
    wallHeight, setWallHeight,
    unit, setUnit,
    shape, setShape,
    tileWidth, setTileWidth,
    tileHeight, setTileHeight,
    pattern, setPattern,
    groutWidth, setGroutWidth,
    tileColors, setTileColors,
    colorPattern, setColorPattern,
    tilesPerStripe, setTilesPerStripe,
    tileDotColor, setTileDotColor,
    colorVariation, setColorVariation,
    groutColor, setGroutColor,
    sliverTolerance, setSliverTolerance,
    tileSpecular, setTileSpecular,
    showSliverHatching, setShowSliverHatching,
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
    overage, setOverage,
    hasNotes, setHasNotes,
    notes, setNotes,
    printQuantities, setPrintQuantities,
    disableTileColorOnPdf, setDisableTileColorOnPdf,
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
    activeSidebarTab: externalActiveTab, setActiveSidebarTab,
    tutorialStepIndex, setTutorialStepIndex
  } = useAppStore();

`;

let sidebarContent = c.substring(0, p1Start) + sidebarComponentStart + storeDestructure + c.substring(p1End + 7);
fs.writeFileSync('src/components/SidebarControls.tsx', sidebarContent);

console.log('SidebarControls updated.');

// ====== TileCanvas/index.tsx ======
let tc = fs.readFileSync('src/components/TileCanvas/index.tsx', 'utf-8');

const tcInterfaceNew = `export interface TileCanvasProps {}`;

tc = tc.replace(/interface TileCanvasProps \{[\s\S]*?\n\}/, tcInterfaceNew);

if (!tc.includes("import { useAppStore } from '../../store/useAppStore';")) {
  tc = tc.replace(
    "import React, { useRef, useEffect, useMemo, useState } from 'react';", 
    "import React, { useRef, useEffect, useMemo, useState } from 'react';\nimport { useAppStore } from '../../store/useAppStore';"
  );
}

const tcStart = tc.indexOf('export default function TileCanvas({');
const tcEnd = tc.indexOf('}: TileCanvasProps) {', tcStart);

const tcComponentStart = `export default function TileCanvas({}: TileCanvasProps) {\n`;

const tcDestructure = `  const {
    wallWidth, wallHeight, unit, shape, tileWidth, tileHeight, pattern, groutWidth,
    tileColors, colorPattern, tilesPerStripe, colorVariation, tileDotColor, groutColor,
    offsetX, offsetY, setOffsetX, setOffsetY,
    sliverTolerance, isPainted, tileSpecular, showSliverHatching,
    subAreas, setSubAreas, activeSubAreaId, setActiveSubAreaId,
    angle, zoom, setZoom,
    wallExtensions, setWallExtensions, activeWallExtensionId, setActiveWallExtensionId,
    isBlankCanvasMode, isPdfExporting,
    wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallAngle, wallBorder,
    backgroundImage, isBgUnlocked, bgScale, setBgScale, bgOffsetX, setBgOffsetX,
    bgOffsetY, setBgOffsetY, tileOpacity, bgOpacity
  } = useAppStore();
`;

let tcContent = tc.substring(0, tcStart) + tcComponentStart + tcDestructure + tc.substring(tcEnd + 21);
fs.writeFileSync('src/components/TileCanvas/index.tsx', tcContent);

console.log('TileCanvas updated.');
