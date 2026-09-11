import { jsPDF } from 'jspdf';
import { MeasurementUnit, WallExtension, TileShape, RectanglePattern, SubArea, ColorVariation, ColorPattern, CanvasLabel, FoldLine, AngleDisplayMode, AreaReport } from '../types';
import { generateTiles } from './generator';
import { computeComprehensiveStatistics } from './analytics';
import { getTrueArea, getCombinedWallBounds, getPolygonArea } from './geometry';
import { logger } from './logger';
import { useAppStore } from '../store/useAppStore';
import { computeAreaQuantities, aggregateAreaReports } from './quantityEngine';

export interface PDFExportParams {
  projectName: string;
  wallWidth: number;
  wallHeight: number;
  wallVertices?: {x: number, y: number}[];
  unit: MeasurementUnit;
  wallExtensions: WallExtension[];
  tileName: string;
  shape: TileShape;
  tileWidth: number;
  tileHeight: number;
  pattern: RectanglePattern;
  groutWidth: number;
  subAreas: SubArea[];
  zoom: number;
  setZoom: (zoom: number) => void;
  tileColors?: string[];
  colorPattern?: ColorPattern;
  tilesPerStripe?: number;
  tileColor?: string;
  groutColor: string;
  tileSpecular: boolean;
  isPainted: boolean;
  offsetX: number;
  offsetY: number;
  angle: number;
  activeSubAreaId: string | null;
  wallBorder?: any;
  isBlankCanvasMode?: boolean;
  hasNotes?: boolean;
  notes?: string;
  soldAsMosaic?: boolean;
  mosaicWidth?: number;
  mosaicHeight?: number;
  overage?: number;
  printQuantities?: boolean;
  disableTileColorOnPdf?: boolean;
  exportPhotoBg?: boolean;
  backgroundImage?: string | null;
  bgScale?: number;
  bgOffsetX?: number;
  bgOffsetY?: number;
  tileOpacity?: number;
  bgOpacity?: number;
  showAccentDistances?: boolean;
  wallBoundaryShape?: 'rectangle' | 'arch' | 'oval' | 'custom_arches';
  wallArchHeight?: number;
  wallActiveArches?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  wallArchDepth?: number;
  wallAngle?: number;
  colorVariation?: ColorVariation;
  tileDotColor?: string;
  isPicket?: boolean;
  picketLength?: number;
  canvasLabels?: CanvasLabel[];
  foldLines?: FoldLine[];
  pdfLayoutMode?: 'auto' | '1page' | '2page' | '3page';
  angleDisplayMode?: AngleDisplayMode;
  showPricesOnPdf?: boolean;
  purchasingSettings?: Record<string, {
    purchaseType: 'carton' | 'sheet' | 'piece';
    sqFtPerCarton: number | '';
    pricePerSqFt: number;
    pricePerSheet: number;
  }>;
  activeCustomPattern?: any;
  flatsketVerticalRows?: number;
  flatsketHorizontalRows?: number;
  reuseCuts?: boolean;
  outputMode?: 'download' | 'base64';
  elevationMetadata?: { wallWidth: number, wallHeight: number };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src; // <-- Set the source last to kick off the load safely
  });
}

function drawPdfHeaderAndFooter(
  pdf: jsPDF,
  pageNum: number,
  projectName: string,
  wallWidth: number,
  wallHeight: number,
  unit: string,
  isMultiPage: boolean,
  totalPages: number
) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42);
  pdf.text(projectName || 'Untitled Tile Layout Project', 15, 20);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(79, 70, 229);
  const sizeText = `Wall Size: ${wallWidth} x ${wallHeight} ${unit}`;
  const sizeWidth = pdf.getTextWidth(sizeText);
  pdf.text(sizeText, 195 - sizeWidth, 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  const dateStr = new Date().toLocaleDateString();
  pdf.text(`Tile Layout Report - Generated ${dateStr}`, 15, 27);

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(15, 31, 195, 31);

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Generated using WildVision Tile Layout Engine', 15, 285);

  if (isMultiPage) {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pageNum} of ${totalPages}`, 105, 285, { align: 'center' });
  }

  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(148, 163, 184);
  pdf.text('Layout and quantities are only estimates.', 195, 285, { align: 'right' });
}

async function generateHighResDiagram(
  params: PDFExportParams,
  canvas: HTMLCanvasElement,
  subAreas: SubArea[],
  bounds: { width: number; height: number; minX: number; minY: number }
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (err) {
    logger.error('Failed to capture canvas diagram:', err);
    return null;
  }
}

export function handleExportPDF(params: PDFExportParams): Promise<string | void> {
  const oldZoom = params.zoom;
  if (oldZoom > 1.0) {
    params.setZoom(1.0);
    return new Promise<string | void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await runExport(params, oldZoom);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }, 180);
    });
  } else {
    return runExport(params, oldZoom);
  }
}

export async function runExport(params: PDFExportParams, originalZoom: number): Promise<string | void> {
  const {
    projectName,
    wallWidth,
    wallHeight,
    wallVertices,
    unit,
    wallExtensions,
    subAreas: rawSubAreas,
    setZoom,
    pdfLayoutMode = 'auto',
    showPricesOnPdf = true,
    purchasingSettings = {},
  } = params;

  const state = useAppStore.getState();
  const subAreas = (rawSubAreas || []).filter((sa) => sa.visible !== false);

  // Explicitly locate the 2D layout canvas to guarantee 3D WebGL or overlay canvases are never captured
  let canvas = (document.getElementById('tile-canvas-2d') as HTMLCanvasElement) ||
               (document.querySelector('canvas[data-canvas-type="2d"]') as HTMLCanvasElement);

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    // If the 2D canvas was just switched to active, wait a brief moment for render
    await new Promise((r) => setTimeout(r, 150));
    canvas = (document.getElementById('tile-canvas-2d') as HTMLCanvasElement) ||
             (document.querySelector('canvas[data-canvas-type="2d"]') as HTMLCanvasElement) ||
             canvas;
  }

  if (!canvas) {
    const allCanvases = Array.from(document.querySelectorAll('canvas'));
    canvas = (allCanvases.find((c) => c.id === 'tile-canvas-2d') ||
              allCanvases.find((c) => {
                if (c.id === 'tile-canvas-overlay' || c.getAttribute('data-canvas-type') === 'overlay') return false;
                try {
                  return c.getContext('2d') !== null && c.width > 50 && c.height > 50;
                } catch {
                  return false;
                }
              }) ||
              allCanvases[0]) as HTMLCanvasElement;
  }

  if (!canvas) {
    alert('Canvas element not found. Please paint the canvas first.');
    if (originalZoom > 1.0) setZoom(originalZoom);
    return;
  }

  try {
    const bounds = getCombinedWallBounds(wallWidth, wallHeight, wallExtensions, wallVertices);
    const displayWallWidth = bounds.width;
    const displayWallHeight = bounds.height;

    // Generate diagram image from canvas
    const imgData = await generateHighResDiagram(params, canvas, subAreas, bounds);
    if (!imgData) {
      if (originalZoom > 1.0) setZoom(originalZoom);
      return;
    }

    const pdfElevationUrl = useAppStore.getState().pdfElevationUrl;
    const pdf = new jsPDF('p', 'mm', 'a4');

    let isThreePage = false;
    let isTwoPage = false;

    if (pdfElevationUrl && (pdfLayoutMode === 'auto' || pdfLayoutMode === '3page')) {
      isThreePage = true;
    } else if (pdfLayoutMode === '2page') {
      isTwoPage = true;
    } else if (pdfLayoutMode === 'auto') {
      isTwoPage = subAreas.length > 0 || (wallExtensions && wallExtensions.length > 0);
    }
    
    const totalPages = isThreePage ? 3 : (isTwoPage ? 2 : 1);

    // Draw page 1 header and footer
    drawPdfHeaderAndFooter(pdf, 1, projectName, displayWallWidth, displayWallHeight, unit, isTwoPage || isThreePage, totalPages);

    const maxDiagWidth = 180;
    const maxDiagHeight = (isTwoPage || isThreePage) ? 200 : 110;

    const dpr = window.devicePixelRatio || 1;
    // We use rough estimation of aspect ratio based on bounding box
    const canvasAspect = imgData.width / imgData.height;

    let renderWidth = maxDiagWidth;
    let renderHeight = maxDiagWidth / canvasAspect;

    if (renderHeight > maxDiagHeight) {
      renderHeight = maxDiagHeight;
      renderWidth = maxDiagHeight * canvasAspect;
    }

    const xOffset = 15 + (maxDiagWidth - renderWidth) / 2;
    const yOffset = 38 + (maxDiagHeight - renderHeight) / 2;

    pdf.addImage(imgData.dataUrl, 'PNG', xOffset, yOffset, renderWidth, renderHeight);

    const diagramLabel = wallVertices && wallVertices.length >= 3
      ? `Main Wall Boundary Bounds: ${displayWallWidth} ${unit} Width × ${displayWallHeight} ${unit} Height`
      : `Main Wall Boundary: ${displayWallWidth} ${unit} Width × ${displayWallHeight} ${unit} Height`;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(79, 70, 229); 
    const textWidth = pdf.getTextWidth(diagramLabel);
    pdf.text(diagramLabel, 15 + (maxDiagWidth - textWidth) / 2, yOffset + renderHeight + 8);

    if (isThreePage) {
      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 2, projectName, displayWallWidth, displayWallHeight, unit, true, totalPages);
      
      try {
        if (pdfElevationUrl) {
          console.log("Phase 1 Handshake - Elevation Metadata:", params.elevationMetadata);
          const orthoImg = await loadImage(pdfElevationUrl);
          const oAspect = orthoImg.width / orthoImg.height;
          let oRenderWidth = maxDiagWidth;
          let oRenderHeight = maxDiagWidth / oAspect;
          if (oRenderHeight > maxDiagHeight) {
            oRenderHeight = maxDiagHeight;
            oRenderWidth = maxDiagHeight * oAspect;
          }
          const oXOffset = 15 + (maxDiagWidth - oRenderWidth) / 2;
          const oYOffset = 38 + (maxDiagHeight - oRenderHeight) / 2;
          pdf.addImage(orthoImg, 'JPEG', oXOffset, oYOffset, oRenderWidth, oRenderHeight);
          
          if (params.elevationMetadata) {
            const { roomDimensions, subAreas, wallVertices } = useAppStore.getState();
            const activeWallW = params.elevationMetadata.wallWidth;
            const activeWallH = params.elevationMetadata.wallHeight;
            const scale = oRenderWidth / activeWallW; // PDF points per real-world inch
            
            pdf.setDrawColor(100, 100, 100);
            pdf.setLineWidth(0.5);
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            
            const formatFeet = (inches: number) => {
              const ft = Math.floor(inches / 12);
              const inch = Math.round(inches % 12);
              return inch > 0 ? `${ft}' ${inch}"` : `${ft}'`;
            };
            
            // TOP (Width)
            const topY = oYOffset - 12; // Pull close
            pdf.line(oXOffset, topY, oXOffset + oRenderWidth, topY); // Main line
            pdf.line(oXOffset, oYOffset, oXOffset, oYOffset - 12); // Left witness (tight 12pt tick)
            pdf.line(oXOffset + oRenderWidth, oYOffset, oXOffset + oRenderWidth, oYOffset - 12); // Right witness (tight 12pt tick)
            pdf.text(formatFeet(activeWallW), oXOffset + (oRenderWidth / 2), topY - 3, { align: "center" });

            // LEFT (Height)
            const leftX = oXOffset - 12; // Pull close
            pdf.line(leftX, oYOffset, leftX, oYOffset + oRenderHeight); // Main line
            pdf.line(oXOffset, oYOffset, oXOffset - 12, oYOffset); // Top witness (tight 12pt tick)
            pdf.line(oXOffset, oYOffset + oRenderHeight, oXOffset - 12, oYOffset + oRenderHeight); // Bottom witness (tight 12pt tick)
            pdf.text(formatFeet(activeWallH), leftX - 4, oYOffset + (oRenderHeight / 2), { align: "right", baseline: "middle" });
            
            let minX = 0, maxX = activeWallW, minY = 0, maxY = activeWallH;
            if (wallVertices && wallVertices.length > 0) {
              minX = Math.min(...wallVertices.map(v => v.x));
              maxX = Math.max(...wallVertices.map(v => v.x));
              minY = Math.min(...wallVertices.map(v => v.y));
              maxY = Math.max(...wallVertices.map(v => v.y));
            }
            const tileW = maxX - minX;
            const tileH = maxY - minY;
            const tilePdfLeft = oXOffset + (minX * scale);
            const tilePdfRight = oXOffset + (maxX * scale);
            const tilePdfBottom = (oYOffset + oRenderHeight) - (minY * scale);
            const tilePdfTop = (oYOffset + oRenderHeight) - (maxY * scale);
            
            pdf.setFontSize(8);
            pdf.setLineWidth(0.3);
            
            // BOTTOM
            const botY = tilePdfBottom + 8;
            pdf.line(tilePdfLeft, botY, tilePdfRight, botY);
            pdf.line(tilePdfLeft, tilePdfBottom, tilePdfLeft, botY + 2);
            pdf.line(tilePdfRight, tilePdfBottom, tilePdfRight, botY + 2);
            pdf.text(String(tileW) + '"', tilePdfLeft + (tilePdfRight - tilePdfLeft)/2, botY + 4, { align: "center", baseline: "top" });
            
            // RIGHT
            const rightX = tilePdfRight + 8;
            pdf.line(rightX, tilePdfTop, rightX, tilePdfBottom);
            pdf.line(tilePdfRight, tilePdfTop, rightX + 2, tilePdfTop);
            pdf.line(tilePdfRight, tilePdfBottom, rightX + 2, tilePdfBottom);
            pdf.text(String(tileH) + '"', rightX + 4, tilePdfTop + (tilePdfBottom - tilePdfTop)/2, { align: "left", baseline: "middle" });
            
            subAreas.forEach(sa => {
              const pdfX = oXOffset + (sa.x * scale);
              const pdfY = (oYOffset + oRenderHeight) - ((sa.y + sa.height) * scale);
              const pdfW = sa.width * scale;
              const pdfH = sa.height * scale;
              
              pdf.line(pdfX, pdfY - 4, pdfX + pdfW, pdfY - 4);
              pdf.text(String(sa.width) + '"', pdfX + (pdfW / 2), pdfY - 6, { align: "center" });
              
              pdf.line(pdfX + pdfW + 4, pdfY, pdfX + pdfW + 4, pdfY + pdfH);
              pdf.text(String(sa.height) + '"', pdfX + pdfW + 6, pdfY + (pdfH / 2), { align: "left", baseline: "middle" });
            });
          }

          const label3d = "3D Real Render Elevation View";
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(79, 70, 229); 
          const textW = pdf.getTextWidth(label3d);
          pdf.text(label3d, 15 + (maxDiagWidth - textW) / 2, oYOffset + oRenderHeight + 8);
        } else {
          throw new Error("No URL provided");
        }
      } catch (err) {
        console.error("Failed to load 3D elevation image:", err);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(12);
        pdf.setTextColor(100, 116, 139);
        const placeholder = "3D Elevation Image Unavailable";
        const w = pdf.getTextWidth(placeholder);
        pdf.text(placeholder, 15 + (maxDiagWidth - w)/2, 38 + maxDiagHeight/2);
      }

      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 3, projectName, displayWallWidth, displayWallHeight, unit, true, totalPages);
    } else if (isTwoPage) {
      pdf.addPage();
      drawPdfHeaderAndFooter(pdf, 2, projectName, displayWallWidth, displayWallHeight, unit, true, totalPages);
    }

    const hasConfiguredPurchasing = !!(
      purchasingSettings &&
      Object.keys(purchasingSettings).length > 0
    );
    const activeShowPrices = showPricesOnPdf && hasConfiguredPurchasing;

    const cardX = 15;
    const isMultiPage = isTwoPage || isThreePage;
    const cardY = isMultiPage ? 38 : yOffset + renderHeight + 12;
    const cardWidth = 180;
    const cardHeight = isMultiPage 
      ? (activeShowPrices ? 110 : 237) 
      : (activeShowPrices ? 55 : Math.max(80, 280 - cardY - 5));

    drawSpecificationsCard(pdf, cardX, cardY, cardWidth, cardHeight, isMultiPage, displayWallWidth, displayWallHeight, subAreas, params);

    if (activeShowPrices) {
      const estCardX = 15;
      const estCardY = isMultiPage ? 158 : cardY + cardHeight + 6;
      const estCardWidth = 180;
      const estCardHeight = isMultiPage ? 117 : 280 - estCardY - 5;
      
      drawPricingCard(pdf, estCardX, estCardY, estCardWidth, estCardHeight, subAreas, params);
    }

    if (!isMultiPage) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); 
      pdf.text('Generated using WildVision Tile Layout Engine', 15, 285);
      pdf.text('Layout and quantities are only estimates.', 195, 285, { align: 'right' });
    }

    if (params.outputMode === 'base64') {
      return pdf.output('datauristring');
    } else {
      pdf.save(`${projectName.toLowerCase().replace(/\s+/g, '_')}_specification_sheet.pdf`);
    }
  } finally {
    if (originalZoom > 1.0) {
      setZoom(originalZoom);
    }
  }
}

function drawSpecificationsCard(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  isMultiPage: boolean,
  displayWallWidth: number,
  displayWallHeight: number,
  subAreas: SubArea[],
  params: PDFExportParams
) {
  const {
    unit,
    isBlankCanvasMode,
    tileName,
    shape,
    tileWidth,
    tileHeight,
    pattern,
    printQuantities,
    soldAsMosaic,
    mosaicWidth,
    mosaicHeight,
    overage = 10,
    purchasingSettings = {},
  } = params;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.35);
  pdf.rect(x, y, width, height, 'F');
  pdf.rect(x, y, width, height, 'D');

  pdf.setFillColor(79, 70, 229);
  pdf.rect(x, y, width, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('SPECIFICATIONS & TILES', x + 6, y + 5.5);

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);
  pdf.line(x + 58, y + 12, x + 58, y + height - 6);
  pdf.line(x + 118, y + 12, x + 118, y + height - 6);

  // Column 1: Wall Configuration
  const col1X = x + 6;
  let col1Y = y + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Wall Configuration', col1X, col1Y);
  col1Y += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Overall Size: ${displayWallWidth} x ${displayWallHeight} ${unit}`, col1X + 2, col1Y);
  col1Y += 4.5;

  const stats = computeComprehensiveStatistics({
    ...params,
    reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
  });

  const netArea = stats.mainReport.netArea || 0;
  const areaStr = unit === 'in' ? `${(netArea / 144).toFixed(2)} sq ft` : `${netArea.toFixed(1)} sq ${unit}`;
  pdf.text(`Total Area: ${areaStr}`, col1X + 2, col1Y);

  // Column 2: Main Wall Tile
  const col2X = x + 62;
  let col2Y = y + 14;
  if (isBlankCanvasMode) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Main Wall Tile', col2X, col2Y);
    col2Y += 5;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Blank Canvas Mode Active', col2X + 2, col2Y);
    col2Y += 4.5;
    pdf.text('(Main tile layer is disabled)', col2X + 2, col2Y);
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Main Wall Tile', col2X, col2Y);
    col2Y += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    const nameStr = tileName || 'Main Wall Tile';
    const splitName = pdf.splitTextToSize(nameStr, 52);
    pdf.text(splitName, col2X + 2, col2Y);
    col2Y += splitName.length * 4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);

    if (soldAsMosaic) {
      pdf.text(`Mosaic Sheet: ${mosaicWidth || 12}" x ${mosaicHeight || 12}"`, col2X + 2, col2Y);
      col2Y += 4.5;
    } else {
      pdf.text(`Tile Size: ${tileWidth || 6}" x ${tileHeight || 6}" (${shape || 'rectangle'})`, col2X + 2, col2Y);
      col2Y += 4.5;
      pdf.text(`Pattern: ${pattern || 'grid'}`, col2X + 2, col2Y);
      col2Y += 4.5;
    }

    if (printQuantities !== false) {
      const defaultSetting = purchasingSettings?.['main'] || { purchaseType: soldAsMosaic ? 'sheet' : 'piece', pricePerSqFt: 0, pricePerSheet: 0, sqFtPerCarton: '' };
      const mainChildren = subAreas.filter((s) => s.linkedMaterialId === 'main' && !s.isCutout && s.accentType !== 'cutout');
      const mainChildReports = mainChildren.map((c) => stats.subAreaReports.find((r) => r.subAreaId === c.id)?.report).filter(Boolean);
      const mainAggReport = aggregateAreaReports(stats.mainReport, mainChildReports);

      const mainStats = computeAreaQuantities({
        areaId: 'main',
        report: mainAggReport,
        settings: defaultSetting as any,
        overage,
        reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
        unit,
        mainSoldAsMosaic: !!soldAsMosaic,
        mainTileWidth: tileWidth,
        mainTileHeight: tileHeight,
        mainMosaicWidth: mosaicWidth,
        mainMosaicHeight: mosaicHeight,
        subAreas,
      });
      const noteStr = mainChildren.length > 0 ? ` (incl. ${mainChildren.length} linked)` : '';
      pdf.text(`Est. Material: ${mainStats.recQty} ${soldAsMosaic ? 'sheets' : 'tiles'}${noteStr}`, col2X + 2, col2Y);
    }
  }

  // Column 3: Accents & Niches
  const col3X = x + 118;
  let col3Y = y + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Accents & Niches', col3X, col3Y);
  col3Y += 5;

  const activeSubAreas = (subAreas || []).filter((s) => !s.isCutout && s.accentType !== 'cutout' && s.visible !== false);

  if (activeSubAreas.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No accents or niches in this layout.', col3X + 2, col3Y);
  } else {
    const availableHeight = (y + height) - col3Y - 4;
    const itemSpacing = Math.min(13, Math.max(8.5, availableHeight / activeSubAreas.length));
    const isCompact = itemSpacing < 11;

    activeSubAreas.forEach((sa, idx) => {
      if (col3Y + itemSpacing > y + height) return;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(isCompact ? 7.5 : 8.5);
      pdf.setTextColor(15, 23, 42);

      let saName = sa.name || `Sub-Area ${idx + 1}`;
      if (sa.linkedMaterialId) {
        const linkedParentName = sa.linkedMaterialId === 'main'
          ? 'Main Wall'
          : subAreas.find((s) => s.id === sa.linkedMaterialId)?.name || 'Parent Profile';
        saName += ` (Shares ${linkedParentName})`;
      }

      const splitSaName = pdf.splitTextToSize(saName, 54);
      pdf.text(splitSaName[0], col3X + 2, col3Y);
      const nameH = isCompact ? 3.4 : 3.8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(isCompact ? 7 : 7.5);
      pdf.setTextColor(51, 65, 85);

      const saNetArea = sa.width * sa.height;
      const saAreaStr = unit === 'in' ? `${(saNetArea / 144).toFixed(2)} sq ft` : `${saNetArea.toFixed(1)} sq ${unit}`;

      let estMatStr = '';
      if (printQuantities !== false) {
        const saReport = stats.subAreaReports.find((r) => r.subAreaId === sa.id)?.report || {
          netArea: saNetArea,
          fullTilesCount: 0,
          cutTilesCount: 0,
          totalTilesUsed: 0,
        };
        const isSaMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : soldAsMosaic;
        const saSettings = (sa.linkedMaterialId === 'main'
          ? purchasingSettings?.['main']
          : (sa.linkedMaterialId ? purchasingSettings?.[sa.linkedMaterialId] : purchasingSettings?.[sa.id])) || {
          purchaseType: isSaMosaic ? 'sheet' : 'piece',
          pricePerSqFt: 0,
          pricePerSheet: 0,
          sqFtPerCarton: '',
        };

        const saQuantities = computeAreaQuantities({
          areaId: sa.id,
          report: saReport,
          settings: saSettings as any,
          overage,
          reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
          unit,
          mainSoldAsMosaic: !!soldAsMosaic,
          subArea: sa,
          mainTileWidth: tileWidth,
          mainTileHeight: tileHeight,
          mainMosaicWidth: mosaicWidth,
          mainMosaicHeight: mosaicHeight,
          subAreas,
        });
        estMatStr = ` | Est: ${saQuantities.recQty} ${isSaMosaic ? 'sheets' : 'tiles'}`;
      }

      pdf.text(`Area: ${saAreaStr}${estMatStr}`, col3X + 2, col3Y + nameH);
      col3Y += itemSpacing;
    });
  }
}

function drawPricingCard(
  pdf: jsPDF,
  estCardX: number,
  estCardY: number,
  estCardWidth: number,
  estCardHeight: number,
  subAreas: SubArea[],
  params: PDFExportParams
) {
  const {
    isBlankCanvasMode = false,
    tileName,
    soldAsMosaic,
    mosaicWidth = 12,
    mosaicHeight = 12,
    tileWidth = 6,
    tileHeight = 6,
    overage = 10,
    purchasingSettings = {},
    unit,
  } = params;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.35);
  pdf.rect(estCardX, estCardY, estCardWidth, estCardHeight, 'F');
  pdf.rect(estCardX, estCardY, estCardWidth, estCardHeight, 'D');

  pdf.setFillColor(241, 245, 249);
  pdf.rect(estCardX, estCardY, estCardWidth, 9, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(estCardX, estCardY + 9, estCardX + estCardWidth, estCardY + 9);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('MATERIAL ESTIMATES & PRICING', estCardX + 6, estCardY + 6);

  const headerY = estCardY + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('DESIGN AREA', estCardX + 6, headerY);
  pdf.text('MATERIAL', estCardX + 44, headerY);
  pdf.text('USAGE / ORDER', estCardX + 102, headerY);
  pdf.text('UNIT COST', estCardX + 142, headerY);
  pdf.text('TOTAL EST.', estCardX + 174, headerY, { align: 'right' });
  pdf.line(estCardX, headerY + 2, estCardX + estCardWidth, headerY + 2);

  const stats = computeComprehensiveStatistics({
    ...params,
    reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
  });

  const activeSubAreas = (subAreas || []).filter((sa) => !sa.isCutout && sa.accentType !== 'cutout' && sa.visible !== false);

  interface TableRowItem {
    type: 'standalone' | 'sub_area_item' | 'subtotal';
    areaName: string;
    materialType: string;
    suggestedOrderText: string;
    unitCostText: string;
    totalCost: number;
  }

  const rows: TableRowItem[] = [];

  interface AreaDef {
    id: string;
    name: string;
    isParent: boolean;
    subArea?: SubArea;
    report: AreaReport;
  }

  interface MaterialGroup {
    id: string;
    materialName: string;
    settings: any;
    isMosaic: boolean;
    parentSubArea?: SubArea;
    areas: AreaDef[];
  }

  function processMaterialGroup(group: MaterialGroup) {
    const childReports = group.areas.filter((a) => !a.isParent).map((a) => a.report);
    const combinedReport = aggregateAreaReports(group.areas[0].report, childReports);

    const combinedStats = computeAreaQuantities({
      areaId: group.id,
      report: combinedReport,
      settings: group.settings,
      overage,
      reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
      unit,
      mainSoldAsMosaic: !!soldAsMosaic,
      subArea: group.parentSubArea,
      mainTileWidth: tileWidth,
      mainTileHeight: tileHeight,
      mainMosaicWidth: mosaicWidth,
      mainMosaicHeight: mosaicHeight,
      colorPattern: params.colorPattern,
      subAreas,
    });

    let unitCostText = '';
    if (group.settings.purchaseType === 'carton') {
      unitCostText = `$${Number(group.settings.pricePerSqFt || 0).toFixed(2)} / sq.ft`;
    } else if (group.settings.purchaseType === 'piece') {
      unitCostText = `$${Number(group.settings.pricePerSheet || 0).toFixed(2)} / piece`;
    } else {
      unitCostText = `$${Number(group.settings.pricePerSheet || 0).toFixed(2)} / sheet`;
    }

    if (group.areas.length === 1) {
      // Standalone single area
      rows.push({
        type: 'standalone',
        areaName: group.areas[0].name,
        materialType: group.materialName,
        suggestedOrderText: combinedStats.ordStr,
        unitCostText,
        totalCost: combinedStats.fCost,
      });
    } else {
      // Multiple areas sharing this material: break down each area and present a subtotal
      group.areas.forEach((area) => {
        const aStats = computeAreaQuantities({
          areaId: area.id,
          report: area.report,
          settings: group.settings,
          overage,
          reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
          unit,
          mainSoldAsMosaic: !!soldAsMosaic,
          subArea: area.subArea || group.parentSubArea,
          mainTileWidth: tileWidth,
          mainTileHeight: tileHeight,
          mainMosaicWidth: mosaicWidth,
          mainMosaicHeight: mosaicHeight,
          colorPattern: params.colorPattern,
          subAreas,
        });

        let aUsageStr = '';
        if (group.settings.purchaseType === 'carton') {
          aUsageStr = `${aStats.surfaceAreaSqFt.toFixed(2)} sq ft usage`;
        } else if (group.settings.purchaseType === 'piece') {
          aUsageStr = `${aStats.recQty} Pieces (${aStats.surfaceAreaSqFt.toFixed(2)} sq ft)`;
        } else {
          aUsageStr = `${aStats.recQty} Sheets (${aStats.surfaceAreaSqFt.toFixed(2)} sq ft)`;
        }

        let aCost = 0;
        if (group.settings.purchaseType === 'carton') {
          const ratio = combinedStats.effectiveAreaSqFt > 0
            ? (aStats.effectiveAreaSqFt / combinedStats.effectiveAreaSqFt)
            : (1 / group.areas.length);
          aCost = combinedStats.fCost * ratio;
        } else {
          aCost = aStats.fCost;
        }

        rows.push({
          type: 'sub_area_item',
          areaName: area.name,
          materialType: group.materialName,
          suggestedOrderText: aUsageStr,
          unitCostText,
          totalCost: aCost,
        });
      });

      // Subtotal row for combined order
      rows.push({
        type: 'subtotal',
        areaName: `Subtotal: ${group.materialName}`,
        materialType: `Combined: ${combinedStats.surfaceAreaSqFt.toFixed(2)} sq ft (+${overage}% waste)`,
        suggestedOrderText: combinedStats.ordStr,
        unitCostText,
        totalCost: combinedStats.fCost,
      });
    }
  }

  const isPaint = params.colorPattern === 'paint' && stats.mainReport.colorGroups && stats.mainReport.colorGroups.length > 0;

  // 1. Main Wall Group
  if (!isBlankCanvasMode) {
    const mainSettings = purchasingSettings['main'] || {
      purchaseType: soldAsMosaic ? 'sheet' : 'piece',
      pricePerSqFt: 0,
      pricePerSheet: 0,
      sqFtPerCarton: '',
    };
    const mainChildren = activeSubAreas.filter((sa) => sa.linkedMaterialId === 'main');

    if (isPaint) {
      stats.mainReport.colorGroups!.forEach((g) => {
        const isImperial = unit === 'in';
        const conversionFactor = isImperial ? 144 : 929.0304;
        const groupRawTiles = g.count || 0;
        const isMosaic = soldAsMosaic || false;
        const sheetSqIn = isMosaic ? (mosaicWidth * mosaicHeight) : (tileWidth * tileHeight);
        const physicalAreaSqFt = (groupRawTiles * sheetSqIn) / conversionFactor;
        const totalRequiredSqFt = physicalAreaSqFt * (1 + overage / 100);

        let suggestedOrderText = '';
        let unitCostText = '';
        let totalCost = 0;

        if (mainSettings.purchaseType === 'carton') {
          const sqFtPerCarton = Number(mainSettings.sqFtPerCarton) || 0;
          const pricePerSqFt = mainSettings.pricePerSqFt || 0;
          const cartonsNeeded = sqFtPerCarton > 0 ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
          totalCost = cartonsNeeded * sqFtPerCarton * pricePerSqFt;
          suggestedOrderText = `${cartonsNeeded} Cartons`;
          unitCostText = `$${Number(pricePerSqFt || 0).toFixed(2)} / sq.ft`;
        } else if (mainSettings.purchaseType === 'piece') {
          const pricePerSheet = mainSettings.pricePerSheet || 0;
          const piecesNeeded = Math.ceil(groupRawTiles * (1 + overage / 100));
          totalCost = piecesNeeded * pricePerSheet;
          suggestedOrderText = `${piecesNeeded} Pieces`;
          unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / piece`;
        } else {
          const pricePerSheet = mainSettings.pricePerSheet || 0;
          const sheetAreaSqFt = sheetSqIn / conversionFactor;
          const sheetsNeeded = sheetAreaSqFt > 0 ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
          totalCost = sheetsNeeded * pricePerSheet;
          suggestedOrderText = `${sheetsNeeded} Sheets`;
          unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / sheet`;
        }

        rows.push({
          type: 'standalone',
          areaName: `Main Wall (${g.color})`,
          materialType: tileName || 'Main Wall Tile',
          suggestedOrderText,
          unitCostText,
          totalCost,
        });
      });

      mainChildren.forEach((ca) => {
        const caReport = stats.subAreaReports.find((r) => r.subAreaId === ca.id)?.report || {
          netArea: ca.width * ca.height,
          fullTilesCount: 0,
          cutTilesCount: 0,
          totalTilesUsed: 0,
        };
        const caStats = computeAreaQuantities({
          areaId: ca.id,
          report: caReport,
          settings: mainSettings as any,
          overage,
          reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
          unit,
          mainSoldAsMosaic: !!soldAsMosaic,
          subArea: ca,
          mainTileWidth: tileWidth,
          mainTileHeight: tileHeight,
          mainMosaicWidth: mosaicWidth,
          mainMosaicHeight: mosaicHeight,
          colorPattern: params.colorPattern,
          subAreas,
        });
        const unitCostText = mainSettings.purchaseType === 'carton'
          ? `$${Number(mainSettings.pricePerSqFt || 0).toFixed(2)} / sq.ft`
          : `$${Number(mainSettings.pricePerSheet || 0).toFixed(2)} / ${mainSettings.purchaseType === 'piece' ? 'piece' : 'sheet'}`;
        rows.push({
          type: 'standalone',
          areaName: ca.name || 'Niche',
          materialType: tileName || 'Main Wall Tile',
          suggestedOrderText: caStats.ordStr,
          unitCostText,
          totalCost: caStats.fCost,
        });
      });
    } else {
      const mainAreas: AreaDef[] = [
        {
          id: 'main',
          name: 'Main Wall Area',
          isParent: true,
          report: stats.mainReport,
        },
        ...mainChildren.map((ca) => ({
          id: ca.id,
          name: ca.name || 'Niche / Accent',
          isParent: false,
          subArea: ca,
          report: stats.subAreaReports.find((r) => r.subAreaId === ca.id)?.report || {
            netArea: ca.width * ca.height,
            fullTilesCount: 0,
            cutTilesCount: 0,
            totalTilesUsed: 0,
          },
        })),
      ];

      processMaterialGroup({
        id: 'main',
        materialName: tileName || 'Main Wall Tile',
        settings: mainSettings,
        isMosaic: !!soldAsMosaic,
        areas: mainAreas,
      });
    }
  }

  // 2. Sub-Area Groups (Accents/Niches)
  const parentSubAreas = activeSubAreas.filter(
    (sa) => !sa.linkedMaterialId || (sa.linkedMaterialId !== 'main' && !activeSubAreas.some((p) => p.id === sa.linkedMaterialId))
  );

  parentSubAreas.forEach((sa) => {
    const isSaMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : soldAsMosaic;
    const saSettings = purchasingSettings[sa.id] || {
      purchaseType: isSaMosaic ? 'sheet' : 'piece',
      pricePerSqFt: 0,
      pricePerSheet: 0,
      sqFtPerCarton: '',
    };
    const saChildren = activeSubAreas.filter((c) => c.linkedMaterialId === sa.id);
    const parentReport = stats.subAreaReports.find((r) => r.subAreaId === sa.id)?.report || {
      netArea: sa.width * sa.height,
      fullTilesCount: 0,
      cutTilesCount: 0,
      totalTilesUsed: 0,
    };

    const groupAreas: AreaDef[] = [
      {
        id: sa.id,
        name: sa.name || 'Accent Area',
        isParent: true,
        subArea: sa,
        report: parentReport,
      },
      ...saChildren.map((ca) => ({
        id: ca.id,
        name: ca.name || 'Accent Area',
        isParent: false,
        subArea: ca,
        report: stats.subAreaReports.find((r) => r.subAreaId === ca.id)?.report || {
          netArea: ca.width * ca.height,
          fullTilesCount: 0,
          cutTilesCount: 0,
          totalTilesUsed: 0,
        },
      })),
    ];

    processMaterialGroup({
      id: sa.id,
      materialName: sa.tileName || 'Accent Tile',
      settings: saSettings,
      isMosaic: !!isSaMosaic,
      parentSubArea: sa,
      areas: groupAreas,
    });
  });

  // Draw rows
  const availableRowHeight = estCardHeight - 34;
  const totalRows = rows.length;
  const rowSpacing = Math.min(8.0, Math.max(5.5, availableRowHeight / Math.max(totalRows, 1)));
  const fontSize = rowSpacing < 6.8 ? 7 : 7.5;

  let rowY = estCardY + 20;

  rows.forEach((row, index) => {
    const isSubtotal = row.type === 'subtotal';
    const isSubItem = row.type === 'sub_area_item';

    if (isSubtotal) {
      pdf.setFillColor(241, 245, 249);
      pdf.rect(estCardX + 4, rowY - (rowSpacing * 0.65), estCardWidth - 8, rowSpacing, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.2);
      pdf.line(estCardX + 4, rowY - (rowSpacing * 0.65), estCardX + estCardWidth - 4, rowY - (rowSpacing * 0.65));
      pdf.line(estCardX + 4, rowY + (rowSpacing * 0.35), estCardX + estCardWidth - 4, rowY + (rowSpacing * 0.35));
    } else if (!isSubItem && index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(estCardX + 4, rowY - (rowSpacing * 0.65), estCardWidth - 8, rowSpacing, 'F');
    }

    // Column 1: DESIGN AREA
    if (isSubtotal) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(15, 23, 42);
    } else if (isSubItem) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(51, 65, 85);
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(15, 23, 42);
    }
    const displayName = isSubItem ? `  • ${row.areaName}` : row.areaName;
    const splitName = pdf.splitTextToSize(displayName, 36);
    pdf.text(splitName[0], isSubItem ? estCardX + 7 : estCardX + 6, rowY);

    // Column 2: MATERIAL
    if (isSubtotal) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(fontSize - 0.5);
      pdf.setTextColor(100, 116, 139);
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(71, 85, 105);
    }
    const splitMat = pdf.splitTextToSize(row.materialType, 54);
    pdf.text(splitMat[0], estCardX + 44, rowY);

    // Column 3: USAGE / ORDER
    if (isSubtotal || !isSubItem) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(79, 70, 229);
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(71, 85, 105);
    }
    const splitOrder = pdf.splitTextToSize(row.suggestedOrderText, 38);
    pdf.text(splitOrder[0], estCardX + 102, rowY);

    // Column 4: UNIT COST
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(100, 116, 139);
    pdf.text(row.unitCostText, estCardX + 142, rowY);

    // Column 5: TOTAL EST.
    if (isSubtotal || !isSubItem) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(15, 23, 42);
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(71, 85, 105);
    }
    pdf.text(
      `$${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      estCardX + 174,
      rowY,
      { align: 'right' }
    );

    rowY += rowSpacing;
  });

  // Calculate Grand Total from standalone rows and subtotal rows (no double-counting)
  let grandTotal = 0;
  rows.forEach((row) => {
    if (row.type === 'standalone' || row.type === 'subtotal') {
      grandTotal += row.totalCost;
    }
  });

  const totalY = estCardY + estCardHeight - 12;
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.line(estCardX + 4, totalY - 2, estCardX + estCardWidth - 4, totalY - 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(79, 70, 229);
  const grandTotalText = `Grand Total Estimated Material Cost: $${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(grandTotalText, estCardX + estCardWidth - 6, totalY + 4, { align: 'right' });
}
