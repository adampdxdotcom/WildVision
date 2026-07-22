import React, { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TileShape, RectanglePattern } from '../types';
import { calculateCenteredOffsets } from '../utils/geometry';

export const useProjectIO = (resetHistory: (snapshot: any) => void) => {
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
    tileColors, setTileColors,
    colorPattern, setColorPattern,
    tilesPerStripe, setTilesPerStripe,
    compositeColors, setCompositeColor, setCompositeColors,
    colorVariation, setColorVariation,
    groutColor, setGroutColor,
    viewSettings, setViewSettings,
    offsetX, setOffsetX,
    offsetY, setOffsetY,
    subAreas, setSubAreas,
    activeSubAreaId, setActiveSubAreaId,
    wallExtensions, setWallExtensions,
    activeWallExtensionId, setActiveWallExtensionId,
    isPainted, setIsPainted,
    isBlankCanvasMode, setIsBlankCanvasMode,
    activePresetId, setActivePresetId,
    soldAsMosaic, setSoldAsMosaic,
    mosaicWidth, setMosaicWidth,
    mosaicHeight, setMosaicHeight,
    overage, setOverage,
    hasNotes, setHasNotes,
    notes, setNotes,
    angleDisplayMode, setAngleDisplayMode,
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
    mainShapeSettings, setMainShapeSettings,
    zoom, setZoom,
    foldLines, setFoldLines,
    roomDimensions, setRoomDimensions,
    roomColors, setRoomColors,
    layoutTransform, setLayoutTransform,
    sceneObjects, activeObjectId,
    floorY, setFloorY,
    backWallZ, setBackWallZ,
    leftWallX, setLeftWallX,
    rightWallX, setRightWallX,
    ceilingY, setCeilingY,
    generatedRenders, setGeneratedRenders,
    purchasingSettings, setPurchasingSettings,
    activeCustomPattern, setActiveCustomPattern,
    uploadedSvgText, setUploadedSvgText,
    patternAccentColor, setPatternAccentColor,
    tileColorOverrides, activeBrushColorIndex,
    linkedSubfloorProjectId, integrationData,
  } = useAppStore();

  const tileDotColor = compositeColors?.secondary || '#334155';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProject = () => {
    const projectData = {
      version: '1.0',
      projectName,
      wallWidth,
      wallHeight,
      wallVertices,
      unit,
      shape,
      tileWidth,
      tileHeight,
      pattern,
      groutWidth,
      angle,
      tileName,
      tileColors,
      colorPattern,
      tilesPerStripe,
      tileDotColor,
      compositeColors,
      activeCustomPattern,
      colorVariation,
      groutColor,
      uploadedSvgText,
      patternAccentColor,
      viewSettings,
      offsetX,
      offsetY,
      subAreas,
      purchasingSettings,
      activeSubAreaId,
      wallExtensions,
      activeWallExtensionId,
      isPainted,
      isBlankCanvasMode,
      activePresetId,
      zoom,
      soldAsMosaic,
      mosaicWidth,
      mosaicHeight,
      overage,
      hasNotes,
      notes,
      angleDisplayMode,
      backgroundImage,
      isBgUnlocked,
      bgScale,
      bgOffsetX,
      bgOffsetY,
      tileOpacity,
      bgOpacity,
      exportPhotoBg,
      showAccentDistances,
      wallBoundaryShape,
      wallArchHeight,
      wallActiveArches,
      wallArchDepth,
      wallAngle,
      wallBorder,
      mainShapeSettings,
      foldLines,
      roomDimensions,
      roomColors,
      layoutTransform,
      sceneObjects,
      activeObjectId,
      floorY,
      backWallZ,
      leftWallX,
      rightWallX,
      ceilingY,
      generatedRenders: (generatedRenders || []).map((render: any) => ({
        id: render.id,
        prompt: render.prompt,
        cameraPosition: render.cameraPosition,
        cameraTarget: render.cameraTarget,
        cameraFov: render.cameraFov,
      })),
      tileColorOverrides,
      activeBrushColorIndex,
      linkedSubfloorProjectId,
      integrationData,
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'project';
    link.href = url;
    link.download = `${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    useAppStore.getState().setIsCanvasDirty(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('The file is too large. Selected files must be smaller than 5 megabytes.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string || '').trim();
        if (!text) {
          throw new Error('Project file is empty.');
        }
        const data = JSON.parse(text);
        useAppStore.setState({ isSaveFileLoaded: true });

        const clampSafe = (val: any, backup: number) => {
          const num = Number(val);
          return isNaN(num) ? backup : Math.min(2000, Math.max(0.1, num));
        };

        if (data.projectName !== undefined) setProjectName(data.projectName);
        if (data.wallWidth !== undefined) setWallWidth(clampSafe(data.wallWidth, 120));
        if (data.wallHeight !== undefined) setWallHeight(clampSafe(data.wallHeight, 96));
        if (data.wallVertices !== undefined) setWallVertices(data.wallVertices);
        if (data.unit !== undefined) setUnit(data.unit === 'cm' ? 'cm' : 'in');

        const VALID_SHAPES: TileShape[] = ['rectangle', 'hexagon', 'round', 'diamond', 'chevron', 'octagon_dot', 'octagon', 'triangle', 'scallop', 'pebble'];
        let resolvedShape: TileShape = 'rectangle';
        if (data.shape !== undefined) {
          resolvedShape = VALID_SHAPES.includes(data.shape) ? data.shape : 'rectangle';
        }
        setShape(resolvedShape);
        if (data.activeCustomPattern !== undefined) {
          setActiveCustomPattern(data.activeCustomPattern);
        } else {
          setActiveCustomPattern(null);
        }

        if (data.tileWidth !== undefined) setTileWidth(clampSafe(data.tileWidth, 12));
        if (data.tileHeight !== undefined) setTileHeight(clampSafe(data.tileHeight, 12));

        const VALID_PATTERNS: RectanglePattern[] = ['stack', 'running_50', 'third_33', 'herringbone', 'basket_weave', 'versailles', 'plank'];
        let resolvedPattern: RectanglePattern = 'running_50';
        if (data.pattern !== undefined) {
          resolvedPattern = VALID_PATTERNS.includes(data.pattern) ? data.pattern : 'running_50';
        }
        setPattern(resolvedPattern);

        if (data.groutWidth !== undefined) {
          const val = Number(data.groutWidth);
          setGroutWidth(isNaN(val) ? 0.125 : Math.min(10, Math.max(0, val)));
        }
        if (data.angle !== undefined) setAngle(Number(data.angle) || 0);
        if (data.tileName !== undefined) setTileName(data.tileName);
        if (data.tileColors !== undefined) {
          setTileColors(data.tileColors);
        } else if (data.tileColor !== undefined) {
          setTileColors([data.tileColor]);
        }
        if (data.colorPattern !== undefined) setColorPattern(data.colorPattern);
        if (data.tilesPerStripe !== undefined) setTilesPerStripe(Number(data.tilesPerStripe) || 1);
        if (data.compositeColors !== undefined) {
          setCompositeColors(data.compositeColors);
        } else if (data.tileDotColor !== undefined) {
          setCompositeColors({ secondary: data.tileDotColor });
        }
        if (data.colorVariation !== undefined) setColorVariation(data.colorVariation);
        if (data.groutColor !== undefined) setGroutColor(data.groutColor);
        if (data.uploadedSvgText !== undefined) setUploadedSvgText(data.uploadedSvgText);
        if (data.patternAccentColor !== undefined) setPatternAccentColor(data.patternAccentColor || '#000000');
        const resolvedViewSettings = data.viewSettings ? {
          ...data.viewSettings,
          canvas: {
            showNodes: true,
            showDimensions: true,
            showAngles: true,
            showLabels: true,
            showFoldLines: true,
            showTextures: false,
            ...data.viewSettings.canvas,
          }
        } : {
          canvas: {
            showNodes: true,
            showDimensions: true,
            showAngles: true,
            showLabels: true,
            showFoldLines: true,
            showTextures: false,
          },
          pdf: {
            disableTileColor: data.disableTileColorOnPdf !== undefined ? Boolean(data.disableTileColorOnPdf) : false,
            showQuantities: data.printQuantities !== undefined ? Boolean(data.printQuantities) : true,
            showAngles: true,
            showPricesOnPdf: data.viewSettings?.pdf?.showPricesOnPdf !== undefined ? Boolean(data.viewSettings.pdf.showPricesOnPdf) : true,
            pdfLayoutMode: data.viewSettings?.pdf?.pdfLayoutMode || 'auto',
          },
          render: {
            enableReflection: data.tileSpecular !== undefined ? Boolean(data.tileSpecular) : false,
          }
        };
        setViewSettings(resolvedViewSettings);
        if (data.offsetX !== undefined) setOffsetX(!isNaN(Number(data.offsetX)) ? Number(data.offsetX) : 0);
        if (data.offsetY !== undefined) setOffsetY(!isNaN(Number(data.offsetY)) ? Number(data.offsetY) : 0);
        if (data.subAreas !== undefined) setSubAreas(data.subAreas);
        if (data.purchasingSettings !== undefined) setPurchasingSettings(data.purchasingSettings);
        if (data.activeSubAreaId !== undefined) setActiveSubAreaId(data.activeSubAreaId);
        if (data.wallExtensions !== undefined) setWallExtensions(data.wallExtensions);
        if (data.activeWallExtensionId !== undefined) setActiveWallExtensionId(data.activeWallExtensionId);
        if (data.isPainted !== undefined) setIsPainted(Boolean(data.isPainted));
        if (data.isBlankCanvasMode !== undefined) setIsBlankCanvasMode(Boolean(data.isBlankCanvasMode));
        if (data.activePresetId !== undefined) setActivePresetId(data.activePresetId);
        // Always reset zoom to 1.0 (auto-fit) when loading project files to prevent clipping
        setZoom(1.0);
        if (data.mainShapeSettings !== undefined) setMainShapeSettings(data.mainShapeSettings);
        if (data.foldLines !== undefined) setFoldLines(data.foldLines);
        if (data.roomDimensions !== undefined) setRoomDimensions(data.roomDimensions);
        if (data.roomColors !== undefined) setRoomColors(data.roomColors);
        if (data.layoutTransform !== undefined) setLayoutTransform(data.layoutTransform);
        if (data.sceneObjects !== undefined) {
          useAppStore.setState({ sceneObjects: data.sceneObjects });
        } else if (data.layoutTransform !== undefined) {
          useAppStore.setState({
            sceneObjects: {
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
            }
          });
        }
        if (data.activeObjectId !== undefined) {
          useAppStore.setState({ activeObjectId: data.activeObjectId });
        } else if (data.layoutTransform !== undefined) {
          useAppStore.setState({ activeObjectId: 'main-tile-layout' });
        }
        if (data.floorY !== undefined) setFloorY(data.floorY);
        if (data.backWallZ !== undefined) setBackWallZ(data.backWallZ);
        if (data.leftWallX !== undefined) setLeftWallX(data.leftWallX);
        if (data.rightWallX !== undefined) setRightWallX(data.rightWallX);
        if (data.ceilingY !== undefined) setCeilingY(data.ceilingY);
        if (data.soldAsMosaic !== undefined) setSoldAsMosaic(Boolean(data.soldAsMosaic));
        if (data.mosaicWidth !== undefined) setMosaicWidth(clampSafe(data.mosaicWidth, 12));
        if (data.mosaicHeight !== undefined) setMosaicHeight(clampSafe(data.mosaicHeight, 12));
        if (data.overage !== undefined) setOverage(Number(data.overage) || 10);
        if (data.hasNotes !== undefined) setHasNotes(Boolean(data.hasNotes));
        if (data.notes !== undefined) setNotes(String(data.notes || ''));
        if (data.angleDisplayMode !== undefined) setAngleDisplayMode(data.angleDisplayMode);

        if (data.backgroundImage !== undefined) setBackgroundImage(data.backgroundImage);
        if (data.isBgUnlocked !== undefined) setIsBgUnlocked(Boolean(data.isBgUnlocked));
        if (data.bgScale !== undefined) setBgScale(Number(data.bgScale) || 1);
        if (data.bgOffsetX !== undefined) setBgOffsetX(Number(data.bgOffsetX) || 0);
        if (data.bgOffsetY !== undefined) setBgOffsetY(Number(data.bgOffsetY) || 0);
        if (data.tileOpacity !== undefined) setTileOpacity(Number(data.tileOpacity) || 1);
        if (data.bgOpacity !== undefined) setBgOpacity(Number(data.bgOpacity) || 1);
        if (data.exportPhotoBg !== undefined) setExportPhotoBg(Boolean(data.exportPhotoBg));
        if (data.showAccentDistances !== undefined) setShowAccentDistances(Boolean(data.showAccentDistances));
        if (data.wallBoundaryShape !== undefined) {
          const VALID_WALL_SHAPE = ['rectangle', 'arch', 'oval', 'custom_arches'];
          setWallBoundaryShape(VALID_WALL_SHAPE.includes(data.wallBoundaryShape) ? data.wallBoundaryShape : 'rectangle');
        }
        if (data.wallArchHeight !== undefined) setWallArchHeight(Number(data.wallArchHeight) || 0);
        if (data.wallActiveArches !== undefined) setWallActiveArches(data.wallActiveArches);
        if (data.wallArchDepth !== undefined) setWallArchDepth(Number(data.wallArchDepth) || 0);
        if (data.wallAngle !== undefined) setWallAngle(Number(data.wallAngle) || 0);
        if (data.wallBorder !== undefined) setWallBorder(data.wallBorder);
        if (data.generatedRenders !== undefined) {
          setGeneratedRenders(data.generatedRenders);
        } else {
          setGeneratedRenders([]);
        }
        if (data.linkedSubfloorProjectId !== undefined) {
          useAppStore.getState().linkProject(data.linkedSubfloorProjectId);
        }
        if (data.integrationData !== undefined) {
          useAppStore.getState().setIntegrationData(data.integrationData);
        }

        useAppStore.setState({
          tileColorOverrides: data.tileColorOverrides || {},
          activeBrushColorIndex: data.activeBrushColorIndex !== undefined ? data.activeBrushColorIndex : 1,
        });

        const snapshot = {
          projectName: data.projectName || projectName,
          wallWidth: data.wallWidth !== undefined ? clampSafe(data.wallWidth, 120) : wallWidth,
          wallHeight: data.wallHeight !== undefined ? clampSafe(data.wallHeight, 96) : wallHeight,
          wallVertices: data.wallVertices || wallVertices,
          unit: data.unit || unit,
          shape: resolvedShape,
          tileWidth: data.tileWidth !== undefined ? clampSafe(data.tileWidth, 12) : tileWidth,
          tileHeight: data.tileHeight !== undefined ? clampSafe(data.tileHeight, 12) : tileHeight,
          pattern: resolvedPattern,
          groutWidth: data.groutWidth !== undefined ? Number(data.groutWidth) : groutWidth,
          angle: data.angle !== undefined ? Number(data.angle) : angle,
          tileName: data.tileName || tileName,
          tileColors: data.tileColors || tileColors,
          colorPattern: data.colorPattern || colorPattern,
          tilesPerStripe: data.tilesPerStripe !== undefined ? Number(data.tilesPerStripe) : tilesPerStripe,
          tileDotColor: data.tileDotColor || tileDotColor,
          activeCustomPattern: data.activeCustomPattern !== undefined ? data.activeCustomPattern : null,
          compositeColors: data.compositeColors || (data.tileDotColor ? { secondary: data.tileDotColor } : (compositeColors || { secondary: '#334155' })),
          colorVariation: data.colorVariation || colorVariation,
          groutColor: data.groutColor || groutColor,
          viewSettings: resolvedViewSettings,
          offsetX: data.offsetX !== undefined ? Number(data.offsetX) : offsetX,
          offsetY: data.offsetY !== undefined ? Number(data.offsetY) : offsetY,
          subAreas: data.subAreas || [],
          activeSubAreaId: data.activeSubAreaId || null,
          wallExtensions: data.wallExtensions || [],
          activeWallExtensionId: data.activeWallExtensionId || null,
          isPainted: data.isPainted !== undefined ? Boolean(data.isPainted) : isPainted,
          isBlankCanvasMode: data.isBlankCanvasMode !== undefined ? Boolean(data.isBlankCanvasMode) : isBlankCanvasMode,
          activePresetId: data.activePresetId || null,
          soldAsMosaic: data.soldAsMosaic !== undefined ? Boolean(data.soldAsMosaic) : soldAsMosaic,
          mosaicWidth: data.mosaicWidth !== undefined ? clampSafe(data.mosaicWidth, 12) : mosaicWidth,
          mosaicHeight: data.mosaicHeight !== undefined ? clampSafe(data.mosaicHeight, 12) : mosaicHeight,
          overage: data.overage !== undefined ? Number(data.overage) : overage,
          hasNotes: data.hasNotes !== undefined ? Boolean(data.hasNotes) : hasNotes,
          notes: data.notes || '',
          angleDisplayMode: data.angleDisplayMode !== undefined ? data.angleDisplayMode : angleDisplayMode,
          backgroundImage: data.backgroundImage !== undefined ? data.backgroundImage : backgroundImage,
          isBgUnlocked: data.isBgUnlocked !== undefined ? Boolean(data.isBgUnlocked) : isBgUnlocked,
          bgScale: data.bgScale || 1,
          bgOffsetX: data.bgOffsetX || 0,
          bgOffsetY: data.bgOffsetY || 0,
          tileOpacity: data.tileOpacity || 1,
          bgOpacity: data.bgOpacity || 1,
          exportPhotoBg: data.exportPhotoBg !== undefined ? Boolean(data.exportPhotoBg) : exportPhotoBg,
          showAccentDistances: data.showAccentDistances !== undefined ? Boolean(data.showAccentDistances) : showAccentDistances,
          wallBoundaryShape: data.wallBoundaryShape || 'rectangle',
          wallArchHeight: data.wallArchHeight || 0,
          wallActiveArches: data.wallActiveArches || { top: true, bottom: false, left: false, right: false },
          wallArchDepth: data.wallArchDepth || 0,
          wallAngle: data.wallAngle || 0,
          wallBorder: data.wallBorder || { enabled: false, tileName: 'Border Tile', tileWidth: 4, tileHeight: 2, cornerJoint: 'straight', color: '#1e293b' },
          mainShapeSettings: data.mainShapeSettings || {},
          foldLines: data.foldLines || [],
          roomDimensions: data.roomDimensions || roomDimensions,
          roomColors: data.roomColors || roomColors,
          layoutTransform: data.layoutTransform || layoutTransform,
          sceneObjects: data.sceneObjects || {
            'main-tile-layout': {
              id: 'main-tile-layout',
              type: 'tile_layout',
              position: (data.layoutTransform || layoutTransform).position || [0, 0, 0],
              rotation: [0, 0, 0],
              attachedPlane: (data.layoutTransform || layoutTransform).attachedPlane || 'back',
              metadata: {
                mountAnchor: (data.layoutTransform || layoutTransform).mountAnchor || 'back'
              }
            }
          },
          activeObjectId: data.activeObjectId || 'main-tile-layout',
          floorY: data.floorY !== undefined ? data.floorY : floorY,
          backWallZ: data.backWallZ !== undefined ? data.backWallZ : backWallZ,
          leftWallX: data.leftWallX !== undefined ? data.leftWallX : leftWallX,
          rightWallX: data.rightWallX !== undefined ? data.rightWallX : rightWallX,
          ceilingY: data.ceilingY !== undefined ? data.ceilingY : ceilingY,
          zoom: 1.0,
          tileColorOverrides: data.tileColorOverrides || {},
          activeBrushColorIndex: data.activeBrushColorIndex !== undefined ? data.activeBrushColorIndex : 1,
          linkedSubfloorProjectId: data.linkedSubfloorProjectId,
          integrationData: data.integrationData,
        };

        resetHistory(snapshot);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
        }
        alert('Project successfully loaded!');
      } catch (err) {
        console.warn('Failed to parse layout file:', err);
        alert('Failed to parse project file. The file may be corrupt or invalid.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleLoadCustomPreset = (data: any) => {
    const clampSafe = (val: any, backup: number) => {
      const num = Number(val);
      return isNaN(num) ? backup : Math.min(2000, Math.max(0.1, num));
    };

    if (data.projectName !== undefined) setProjectName(data.projectName);
    if (data.wallWidth !== undefined) setWallWidth(clampSafe(data.wallWidth, 120));
    if (data.wallHeight !== undefined) setWallHeight(clampSafe(data.wallHeight, 96));
    if (data.wallVertices !== undefined) setWallVertices(data.wallVertices);
    if (data.unit !== undefined) setUnit(data.unit === 'cm' ? 'cm' : 'in');

    const VALID_SHAPES: TileShape[] = ['rectangle', 'hexagon', 'round', 'diamond', 'chevron', 'octagon_dot', 'octagon', 'triangle', 'scallop', 'pebble'];
    let resolvedShape: TileShape = 'rectangle';
    if (data.shape !== undefined) {
      resolvedShape = VALID_SHAPES.includes(data.shape) ? data.shape : 'rectangle';
    }
    setShape(resolvedShape);
    if (data.activeCustomPattern !== undefined) {
      setActiveCustomPattern(data.activeCustomPattern);
    } else {
      setActiveCustomPattern(null);
    }

    if (data.tileWidth !== undefined) setTileWidth(clampSafe(data.tileWidth, 12));
    if (data.tileHeight !== undefined) setTileHeight(clampSafe(data.tileHeight, 12));

    const VALID_PATTERNS: RectanglePattern[] = ['stack', 'running_50', 'third_33', 'herringbone', 'basket_weave', 'versailles', 'plank'];
    let resolvedPattern: RectanglePattern = 'running_50';
    if (data.pattern !== undefined) {
      resolvedPattern = VALID_PATTERNS.includes(data.pattern) ? data.pattern : 'running_50';
    }
    setPattern(resolvedPattern);

    if (data.groutWidth !== undefined) {
      const val = Number(data.groutWidth);
      setGroutWidth(isNaN(val) ? 0.125 : Math.min(10, Math.max(0, val)));
    }
    if (data.angle !== undefined) setAngle(Number(data.angle) || 0);
    if (data.tileName !== undefined) setTileName(data.tileName);
    if (data.tileColors !== undefined) {
      setTileColors(data.tileColors);
    } else if (data.tileColor !== undefined) {
      setTileColors([data.tileColor]);
    }
    if (data.colorPattern !== undefined) setColorPattern(data.colorPattern);
    if (data.tilesPerStripe !== undefined) setTilesPerStripe(Number(data.tilesPerStripe) || 1);
    if (data.compositeColors !== undefined) {
      setCompositeColors(data.compositeColors);
    } else if (data.tileDotColor !== undefined) {
      setCompositeColors({ secondary: data.tileDotColor });
    }
    if (data.colorVariation !== undefined) setColorVariation(data.colorVariation);
    if (data.groutColor !== undefined) setGroutColor(data.groutColor);
    if (data.uploadedSvgText !== undefined) setUploadedSvgText(data.uploadedSvgText);
    if (data.patternAccentColor !== undefined) setPatternAccentColor(data.patternAccentColor || '#000000');
    const resolvedViewSettings = data.viewSettings ? {
      ...data.viewSettings,
      canvas: {
        showNodes: true,
        showDimensions: true,
        showAngles: true,
        showLabels: true,
        showFoldLines: true,
        showTextures: false,
        ...data.viewSettings.canvas,
      }
    } : {
      canvas: {
        showNodes: true,
        showDimensions: true,
        showAngles: true,
        showLabels: true,
        showFoldLines: true,
        showTextures: false,
      },
      pdf: {
        disableTileColor: data.disableTileColorOnPdf !== undefined ? Boolean(data.disableTileColorOnPdf) : false,
        showQuantities: data.printQuantities !== undefined ? Boolean(data.printQuantities) : true,
        showAngles: true,
        showPricesOnPdf: data.viewSettings?.pdf?.showPricesOnPdf !== undefined ? Boolean(data.viewSettings.pdf.showPricesOnPdf) : true,
        pdfLayoutMode: data.viewSettings?.pdf?.pdfLayoutMode || 'auto',
      },
      render: {
        enableReflection: data.tileSpecular !== undefined ? Boolean(data.tileSpecular) : false,
      }
    };
    setViewSettings(resolvedViewSettings);
    if (data.offsetX !== undefined) setOffsetX(!isNaN(Number(data.offsetX)) ? Number(data.offsetX) : 0);
    if (data.offsetY !== undefined) setOffsetY(!isNaN(Number(data.offsetY)) ? Number(data.offsetY) : 0);
    if (data.subAreas !== undefined) setSubAreas(data.subAreas);
    if (data.activeSubAreaId !== undefined) setActiveSubAreaId(data.activeSubAreaId);
    if (data.wallExtensions !== undefined) setWallExtensions(data.wallExtensions);
    if (data.activeWallExtensionId !== undefined) setActiveWallExtensionId(data.activeWallExtensionId);
    if (data.isPainted !== undefined) setIsPainted(Boolean(data.isPainted));
    if (data.isBlankCanvasMode !== undefined) setIsBlankCanvasMode(Boolean(data.isBlankCanvasMode));
    if (data.activePresetId !== undefined) setActivePresetId(data.activePresetId);
    // Always reset zoom to 1.0 (auto-fit) when loading custom presets to prevent clipping
    setZoom(1.0);
    if (data.mainShapeSettings !== undefined) setMainShapeSettings(data.mainShapeSettings);
    if (data.foldLines !== undefined) setFoldLines(data.foldLines);
    if (data.roomDimensions !== undefined) setRoomDimensions(data.roomDimensions);
    if (data.roomColors !== undefined) setRoomColors(data.roomColors);
    if (data.layoutTransform !== undefined) setLayoutTransform(data.layoutTransform);
    if (data.floorY !== undefined) setFloorY(data.floorY);
    if (data.backWallZ !== undefined) setBackWallZ(data.backWallZ);
    if (data.leftWallX !== undefined) setLeftWallX(data.leftWallX);
    if (data.rightWallX !== undefined) setRightWallX(data.rightWallX);
    if (data.ceilingY !== undefined) setCeilingY(data.ceilingY);
    if (data.soldAsMosaic !== undefined) setSoldAsMosaic(Boolean(data.soldAsMosaic));
    if (data.mosaicWidth !== undefined) setMosaicWidth(clampSafe(data.mosaicWidth, 12));
    if (data.mosaicHeight !== undefined) setMosaicHeight(clampSafe(data.mosaicHeight, 12));
    if (data.overage !== undefined) setOverage(Number(data.overage) || 10);
    if (data.hasNotes !== undefined) setHasNotes(Boolean(data.hasNotes));
    if (data.notes !== undefined) setNotes(String(data.notes || ''));
    if (data.angleDisplayMode !== undefined) setAngleDisplayMode(data.angleDisplayMode);

    if (data.backgroundImage !== undefined) setBackgroundImage(data.backgroundImage);
    if (data.isBgUnlocked !== undefined) setIsBgUnlocked(Boolean(data.isBgUnlocked));
    if (data.bgScale !== undefined) setBgScale(Number(data.bgScale) || 1);
    if (data.bgOffsetX !== undefined) setBgOffsetX(Number(data.bgOffsetX) || 0);
    if (data.bgOffsetY !== undefined) setBgOffsetY(Number(data.bgOffsetY) || 0);
    if (data.tileOpacity !== undefined) setTileOpacity(Number(data.tileOpacity) || 1);
    if (data.bgOpacity !== undefined) setBgOpacity(Number(data.bgOpacity) || 1);
    if (data.exportPhotoBg !== undefined) setExportPhotoBg(Boolean(data.exportPhotoBg));
    if (data.showAccentDistances !== undefined) setShowAccentDistances(Boolean(data.showAccentDistances));
    if (data.wallBoundaryShape !== undefined) {
      const VALID_WALL_SHAPE = ['rectangle', 'arch', 'oval', 'custom_arches'];
      setWallBoundaryShape(VALID_WALL_SHAPE.includes(data.wallBoundaryShape) ? data.wallBoundaryShape : 'rectangle');
    }
    if (data.wallArchHeight !== undefined) setWallArchHeight(Number(data.wallArchHeight) || 0);
    if (data.wallActiveArches !== undefined) setWallActiveArches(data.wallActiveArches);
    if (data.wallArchDepth !== undefined) setWallArchDepth(Number(data.wallArchDepth) || 0);
    if (data.wallAngle !== undefined) setWallAngle(Number(data.wallAngle) || 0);
    if (data.wallBorder !== undefined) setWallBorder(data.wallBorder);
    if (data.generatedRenders !== undefined) {
      setGeneratedRenders(data.generatedRenders);
    } else {
      setGeneratedRenders([]);
    }

    const snapshot = {
      projectName: data.projectName || projectName,
      wallWidth: data.wallWidth !== undefined ? clampSafe(data.wallWidth, 120) : wallWidth,
      wallHeight: data.wallHeight !== undefined ? clampSafe(data.wallHeight, 96) : wallHeight,
      wallVertices: data.wallVertices || wallVertices,
      unit: data.unit || unit,
      shape: resolvedShape,
      tileWidth: data.tileWidth !== undefined ? clampSafe(data.tileWidth, 12) : tileWidth,
      tileHeight: data.tileHeight !== undefined ? clampSafe(data.tileHeight, 12) : tileHeight,
      pattern: resolvedPattern,
      groutWidth: data.groutWidth !== undefined ? Number(data.groutWidth) : groutWidth,
      angle: data.angle !== undefined ? Number(data.angle) : angle,
      tileName: data.tileName || tileName,
      tileColors: data.tileColors || tileColors,
      colorPattern: data.colorPattern || colorPattern,
      tilesPerStripe: data.tilesPerStripe !== undefined ? Number(data.tilesPerStripe) : tilesPerStripe,
      tileDotColor: data.tileDotColor || tileDotColor,
      activeCustomPattern: data.activeCustomPattern !== undefined ? data.activeCustomPattern : null,
      colorVariation: data.colorVariation || colorVariation,
      groutColor: data.groutColor || groutColor,
      viewSettings: resolvedViewSettings,
      offsetX: data.offsetX !== undefined ? Number(data.offsetX) : offsetX,
      offsetY: data.offsetY !== undefined ? Number(data.offsetY) : offsetY,
      subAreas: data.subAreas || [],
      activeSubAreaId: data.activeSubAreaId || null,
      wallExtensions: data.wallExtensions || [],
      activeWallExtensionId: data.activeWallExtensionId || null,
      isPainted: data.isPainted !== undefined ? Boolean(data.isPainted) : isPainted,
      isBlankCanvasMode: data.isBlankCanvasMode !== undefined ? Boolean(data.isBlankCanvasMode) : isBlankCanvasMode,
      activePresetId: data.activePresetId || null,
      soldAsMosaic: data.soldAsMosaic !== undefined ? Boolean(data.soldAsMosaic) : soldAsMosaic,
      mosaicWidth: data.mosaicWidth !== undefined ? clampSafe(data.mosaicWidth, 12) : mosaicWidth,
      mosaicHeight: data.mosaicHeight !== undefined ? clampSafe(data.mosaicHeight, 12) : mosaicHeight,
      overage: data.overage !== undefined ? Number(data.overage) : overage,
      hasNotes: data.hasNotes !== undefined ? Boolean(data.hasNotes) : hasNotes,
      notes: data.notes || '',
      angleDisplayMode: data.angleDisplayMode !== undefined ? data.angleDisplayMode : angleDisplayMode,
      backgroundImage: data.backgroundImage !== undefined ? data.backgroundImage : backgroundImage,
      isBgUnlocked: data.isBgUnlocked !== undefined ? Boolean(data.isBgUnlocked) : isBgUnlocked,
      bgScale: data.bgScale || 1,
      bgOffsetX: data.bgOffsetX || 0,
      bgOffsetY: data.bgOffsetY || 0,
      tileOpacity: data.tileOpacity || 1,
      bgOpacity: data.bgOpacity || 1,
      exportPhotoBg: data.exportPhotoBg !== undefined ? Boolean(data.exportPhotoBg) : exportPhotoBg,
      showAccentDistances: data.showAccentDistances !== undefined ? Boolean(data.showAccentDistances) : showAccentDistances,
      wallBoundaryShape: data.wallBoundaryShape || 'rectangle',
      wallArchHeight: data.wallArchHeight || 0,
      wallActiveArches: data.wallActiveArches || { top: true, bottom: false, left: false, right: false },
      wallArchDepth: data.wallArchDepth || 0,
      wallAngle: data.wallAngle || 0,
      wallBorder: data.wallBorder || { enabled: false, tileName: 'Border Tile', tileWidth: 4, tileHeight: 2, cornerJoint: 'straight', color: '#1e293b' },
      mainShapeSettings: data.mainShapeSettings || {},
      foldLines: data.foldLines || [],
      roomDimensions: data.roomDimensions || roomDimensions,
      roomColors: data.roomColors || roomColors,
      layoutTransform: data.layoutTransform || layoutTransform,
      sceneObjects: data.sceneObjects || {
        'main-tile-layout': {
          id: 'main-tile-layout',
          type: 'tile_layout',
          position: (data.layoutTransform || layoutTransform).position || [0, 0, 0],
          rotation: [0, 0, 0],
          attachedPlane: (data.layoutTransform || layoutTransform).attachedPlane || 'back',
          metadata: {
            mountAnchor: (data.layoutTransform || layoutTransform).mountAnchor || 'back'
          }
        }
      },
      activeObjectId: data.activeObjectId || 'main-tile-layout',
      floorY: data.floorY !== undefined ? data.floorY : floorY,
      backWallZ: data.backWallZ !== undefined ? data.backWallZ : backWallZ,
      leftWallX: data.leftWallX !== undefined ? data.leftWallX : leftWallX,
      rightWallX: data.rightWallX !== undefined ? data.rightWallX : rightWallX,
      ceilingY: data.ceilingY !== undefined ? data.ceilingY : ceilingY,
      zoom: 1.0,
      tileColorOverrides: {},
      activeBrushColorIndex: 1,
      linkedSubfloorProjectId: null,
      integrationData: null,
    };

    useAppStore.setState({ 
      tileColorOverrides: {}, 
      activeBrushColorIndex: 1,
      linkedSubfloorProjectId: null,
      subfloorProducts: [],
      integrationData: null,
    });
    resetHistory(snapshot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wildvision:forceCanvasRedraw'));
    }
  };

  const handleNewProjectReset = () => {
    setProjectName('Kitchen Accent Backsplash');
    setWallWidth(96);
    setWallHeight(24);
    setUnit('in');
    setShape('rectangle');
    setTileWidth(6);
    setTileHeight(3);
    setPattern('running_50');
    setGroutWidth(0.125);
    setAngle(0);
    setTileName('White Gloss Ceramic Subway');
    setTileColors(['#f1f5f9']);
    setColorPattern('single');
    setGroutColor('#64748b');
    setViewSettings({
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
    });
    setSubAreas([]);
    setActiveSubAreaId(null);
    setWallExtensions([]);
    setActiveWallExtensionId(null);
    setRoomDimensions({ width: 120, height: 96, depth: 120 });
    setRoomColors({ base: '#f8fafc', overrides: { floor: '#94a3b8' } });
    setLayoutTransform({ position: [0, 0, 0], attachedPlane: 'back', mountAnchor: 'back' });
    setIsPainted(true);
    setIsBlankCanvasMode(false);
    setActivePresetId('subway-backsplash');
    setZoom(1.0);
    setSoldAsMosaic(false);
    setMosaicWidth(12);
    setMosaicHeight(12);
    setOverage(10);

    if (backgroundImage && backgroundImage.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImage);
    }
    setBackgroundImage(null);
    setIsBgUnlocked(false);
    setBgOffsetX(0);
    setBgOffsetY(0);
    setBgScale(1);
    setBgOpacity(1);
    setTileOpacity(1);
    setExportPhotoBg(true);
    setShowAccentDistances(false);
    setWallBoundaryShape('rectangle');
    setWallArchHeight(0);
    
    useAppStore.getState().setLiveCamera(null, null);
    
    const centered = calculateCenteredOffsets(96, 24, 'rectangle', 6, 3, 0.125, 'running_50');
    setOffsetX(centered.x);
    setOffsetY(centered.y);

    const defaultSnapshot = {
      projectName: 'Kitchen Accent Backsplash',
      wallWidth: 96,
      wallHeight: 24,
      unit: 'in' as const,
      shape: 'rectangle' as const,
      tileWidth: 6,
      tileHeight: 3,
      pattern: 'running_50' as const,
      groutWidth: 0.125,
      angle: 0,
      tileName: 'White Gloss Ceramic Subway',
      tileColors: ['#f1f5f9'],
      colorPattern: 'single' as const,
      tilesPerStripe: 1,
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
      offsetX: centered.x,
      offsetY: centered.y,
      subAreas: [],
      activeSubAreaId: null,
      wallExtensions: [],
      activeWallExtensionId: null,
      isPainted: true,
      isBlankCanvasMode: false,
      activePresetId: 'subway-backsplash',
      soldAsMosaic: false,
      mosaicWidth: 12,
      mosaicHeight: 12,
      overage: 10,
      activeCustomPattern: null,
      backgroundImage: null,
      isBgUnlocked: false,
      bgOffsetX: 0,
      bgOffsetY: 0,
      bgScale: 1,
      bgOpacity: 1,
      tileOpacity: 1,
      exportPhotoBg: true,
      showAccentDistances: false,
      wallBoundaryShape: 'rectangle' as const,
      wallArchHeight: 24,
      wallActiveArches: { top: true, bottom: false, left: false, right: false },
      wallArchDepth: 24,
      wallAngle: 0,
      wallBorder: {
        enabled: false,
        tileName: 'Border Tile',
        tileWidth: 4,
        tileHeight: 2,
        cornerJoint: 'straight' as const,
        color: '#1e293b'
      },
      roomDimensions: { width: 120, height: 96, depth: 120 },
      roomColors: { base: '#f8fafc', overrides: { floor: '#94a3b8' } },
      layoutTransform: { position: [0, 0, 0], attachedPlane: 'back', mountAnchor: 'back' },
      sceneObjects: {
        'main-tile-layout': {
          id: 'main-tile-layout',
          type: 'tile_layout',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          attachedPlane: 'back',
          metadata: {
            mountAnchor: 'back'
          }
        }
      },
      activeObjectId: 'main-tile-layout',
      linkedSubfloorProjectId: null,
      integrationData: null,
    };

    useAppStore.setState({
      linkedSubfloorProjectId: null,
      subfloorProducts: [],
      integrationData: null,
    });
    
    resetHistory(defaultSnapshot);
  };

  return {
    handleSaveProject,
    handleFileChange,
    handleLoadCustomPreset,
    handleNewProjectReset,
    fileInputRef,
  };
};
