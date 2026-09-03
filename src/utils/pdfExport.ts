import { jsPDF } from 'jspdf';
import { MeasurementUnit, WallExtension, TileShape, RectanglePattern, SubArea, ColorVariation, ColorPattern, CanvasLabel, FoldLine, AngleDisplayMode } from '../types';
import { generateTiles } from './generator';
import { computeComprehensiveStatistics } from './analytics';
import { getTrueArea, getCombinedWallBounds, getPolygonArea } from './geometry';
import { logger } from './logger';
import { useAppStore } from '../store/useAppStore';

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

  const canvas = document.querySelector('canvas');
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
      let mainQtyWithOverage = 0;
      if (soldAsMosaic) {
        const conversionFactor = unit === 'in' ? 144 : 929.0304;
        const sheetSqFt = ((mosaicWidth || 12) * (mosaicHeight || 12)) / conversionFactor;
        const netAreaSqFt = (stats.mainReport.netArea || 0) / conversionFactor;
        mainQtyWithOverage = Math.ceil((netAreaSqFt * (1 + overage / 100)) / (sheetSqFt || 1));
      } else {
        const mainTotalTiles = stats.mainReport.totalTilesUsed || 0;
        mainQtyWithOverage = Math.ceil(mainTotalTiles * (1 + overage / 100));
      }
      pdf.text(`Est. Material: ${mainQtyWithOverage} ${soldAsMosaic ? 'sheets' : 'tiles'}`, col2X + 2, col2Y);
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

  if (!subAreas || subAreas.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No accents or niches in this layout.', col3X + 2, col3Y);
  } else {
    const parentSubAreas = subAreas.filter((s) => !s.linkedMaterialId);
    parentSubAreas.forEach((sa, idx) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      const childCount = subAreas.filter((s) => s.linkedMaterialId === sa.id).length;
      let saName = sa.name || `Sub-Area ${idx + 1}`;
      if (childCount > 0) {
        saName += ` (+${childCount})`;
      }
      const splitSaName = pdf.splitTextToSize(saName, 52);
      pdf.text(splitSaName, col3X + 2, col3Y);
      col3Y += splitSaName.length * 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);

      const children = subAreas.filter((s) => s.linkedMaterialId === sa.id);
      const parentNetArea = sa.width * sa.height;
      const childrenNetArea = children.reduce((sum, c) => sum + c.width * c.height, 0);
      const saNetArea = parentNetArea + childrenNetArea;

      const saAreaStr = unit === 'in' ? `${(saNetArea / 144).toFixed(2)} sq ft` : `${saNetArea.toFixed(1)} sq ${unit}`;
      pdf.text(`Area: ${saAreaStr}`, col3X + 2, col3Y);
      col3Y += 4.5;

      if (printQuantities !== false) {
        const saReport = stats.subAreaReports.find((r) => r.subAreaId === sa.id);
        const isSaMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : soldAsMosaic;
        let saQtyWithOverage = 0;
        if (isSaMosaic) {
          const conversionFactor = unit === 'in' ? 144 : 929.0304;
          const samW = sa.mosaicWidth || mosaicWidth || 12;
          const samH = sa.mosaicHeight || mosaicHeight || 12;
          const saSheetSqFt = (samW * samH) / conversionFactor;
          const saNetSqFt = saNetArea / conversionFactor;
          saQtyWithOverage = Math.ceil((saNetSqFt * (1 + overage / 100)) / (saSheetSqFt || 1));
        } else {
          let saTotalTiles = saReport?.report.totalTilesUsed || 0;
          children.forEach((c) => {
            const cRep = stats.subAreaReports.find((r) => r.subAreaId === c.id);
            saTotalTiles += cRep?.report.totalTilesUsed || 0;
          });
          saQtyWithOverage = Math.ceil(saTotalTiles * (1 + overage / 100));
        }
        pdf.text(`Est. Material: ${saQtyWithOverage} ${isSaMosaic ? 'sheets' : 'tiles'}`, col3X + 2, col3Y);
        col3Y += 4.5;
      }
      col3Y += 2;
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
  pdf.text('SUGGESTED ORDER', estCardX + 104, headerY);
  pdf.text('UNIT COST', estCardX + 144, headerY);
  pdf.text('TOTAL EST.', estCardX + 174, headerY, { align: 'right' });
  pdf.line(estCardX, headerY + 2, estCardX + estCardWidth, headerY + 2);

  const rows: Array<{
    areaName: string;
    materialType: string;
    suggestedOrderText: string;
    unitCostText: string;
    totalCost: number;
  }> = [];

  const stats = computeComprehensiveStatistics({
    ...params,
    reuseCuts: params.reuseCuts ?? useAppStore.getState().reuseCuts,
  });

  const getAreaEstimates = (areaId: string) => {
    let areaName = '';
    let materialName = '';
    let settings = purchasingSettings[areaId];
    if (!settings && areaId === 'main') settings = purchasingSettings.main;
    if (!settings) return null;

    let totalRawTiles = 0;
    let netAreaSqIn = 0;
    let saObj: SubArea | undefined;

    if (areaId === 'main') {
      if (isBlankCanvasMode) return null;
      areaName = 'Main Wall Area';
      materialName = tileName || 'Main Wall Tile';
      totalRawTiles = stats.mainReport.totalTilesUsed || 0;
      netAreaSqIn = stats.mainReport.netArea || 0;

      const linkedChildren = subAreas.filter((s) => s.linkedMaterialId === 'main');
      if (linkedChildren.length > 0) {
        areaName += ` (+${linkedChildren.length})`;
        linkedChildren.forEach((child) => {
          const childReport = stats.subAreaReports.find((r) => r.subAreaId === child.id)?.report;
          totalRawTiles += childReport?.totalTilesUsed || 0;
          netAreaSqIn += childReport?.netArea || child.width * child.height;
        });
      }
    } else {
      saObj = subAreas.find((s) => s.id === areaId);
      if (!saObj) return null;
      areaName = saObj.name || 'Sub-Area';
      materialName = saObj.tileName || 'Accent Tile';

      const parentReport = stats.subAreaReports.find((r) => r.subAreaId === areaId)?.report;
      totalRawTiles = parentReport?.totalTilesUsed || 0;
      netAreaSqIn = parentReport?.netArea || saObj.width * saObj.height;

      const linkedChildren = subAreas.filter((s) => s.linkedMaterialId === areaId);
      if (linkedChildren.length > 0) {
        areaName += ` (+${linkedChildren.length})`;
        linkedChildren.forEach((child) => {
          const childReport = stats.subAreaReports.find((r) => r.subAreaId === child.id)?.report;
          totalRawTiles += childReport?.totalTilesUsed || 0;
          netAreaSqIn += childReport?.netArea || child.width * child.height;
        });
      }
    }

    const isImperial = unit === 'in';
    const conversionFactor = isImperial ? 144 : 929.0304;

    const isMosaic = areaId === 'main' ? (soldAsMosaic || false) : (saObj?.soldAsMosaic !== undefined ? saObj.soldAsMosaic : (soldAsMosaic || false));
    const mW = areaId === 'main' ? mosaicWidth : (saObj?.mosaicWidth || mosaicWidth);
    const mH = areaId === 'main' ? mosaicHeight : (saObj?.mosaicHeight || mosaicHeight);
    const tW = areaId === 'main' ? tileWidth : (saObj?.tileWidth || tileWidth);
    const tH = areaId === 'main' ? tileHeight : (saObj?.tileHeight || tileHeight);

    const sheetSqIn = isMosaic ? ((mW || 12) * (mH || 12)) : ((tW || 6) * (tH || 6));
    const sheetSqFt = sheetSqIn / conversionFactor;

    let totalRequiredSqFt = 0;
    let suggestedOrderText = '';
    let unitCostText = '';
    let totalCost = 0;

    if (isMosaic) {
      const netAreaSqFt = netAreaSqIn / conversionFactor;
      totalRequiredSqFt = netAreaSqFt * (1 + overage / 100);
      const sheetsNeeded = Math.ceil(totalRequiredSqFt / (sheetSqFt || 1));

      if (settings.purchaseType === 'carton') {
        const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
        const pricePerSqFt = settings.pricePerSqFt || 0;
        const cartonsNeeded = sqFtPerCarton > 0 ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
        const purchasedSqFt = cartonsNeeded * sqFtPerCarton;
        totalCost = purchasedSqFt * pricePerSqFt;
        suggestedOrderText = `${cartonsNeeded} Cartons`;
        unitCostText = `$${Number(pricePerSqFt || 0).toFixed(2)} / sq.ft`;
      } else {
        const pricePerSheet = settings.pricePerSheet || 0;
        totalCost = sheetsNeeded * pricePerSheet;
        suggestedOrderText = `${sheetsNeeded} Sheets (${(sheetsNeeded * sheetSqFt).toFixed(2)} sq ft)`;
        unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / sheet`;
      }
    } else {
      const physicalAreaSqIn = totalRawTiles * sheetSqIn;
      const physicalAreaSqFt = physicalAreaSqIn / conversionFactor;
      totalRequiredSqFt = physicalAreaSqFt * (1 + overage / 100);

      if (settings.purchaseType === 'carton') {
        const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
        const pricePerSqFt = settings.pricePerSqFt || 0;
        const cartonsNeeded = sqFtPerCarton > 0 ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
        const purchasedSqFt = cartonsNeeded * sqFtPerCarton;
        totalCost = purchasedSqFt * pricePerSqFt;
        suggestedOrderText = `${cartonsNeeded} Cartons`;
        unitCostText = `$${Number(pricePerSqFt || 0).toFixed(2)} / sq.ft`;
      } else if (settings.purchaseType === 'piece') {
        const pricePerSheet = settings.pricePerSheet || 0;
        const piecesNeeded = Math.ceil(totalRawTiles * (1 + overage / 100));
        totalCost = piecesNeeded * pricePerSheet;
        suggestedOrderText = `${piecesNeeded} Pieces`;
        unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / piece`;
      } else {
        const pricePerSheet = settings.pricePerSheet || 0;
        const sheetsNeeded = sheetSqFt > 0 ? Math.ceil(totalRequiredSqFt / sheetSqFt) : 0;
        totalCost = sheetsNeeded * pricePerSheet;
        suggestedOrderText = `${sheetsNeeded} Sheets`;
        unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / sheet`;
      }
    }

    return {
      areaName,
      materialType: materialName,
      suggestedOrderText,
      unitCostText,
      totalCost,
    };
  };

  const isPaint = params.colorPattern === 'paint' && stats.mainReport.colorGroups && stats.mainReport.colorGroups.length > 0;

  if (isPaint) {
    const mainSettings = purchasingSettings['main'];
    if (mainSettings) {
      stats.mainReport.colorGroups!.forEach((g) => {
        const isImperial = unit === 'in';
        const conversionFactor = isImperial ? 144 : 929.0304;

        const groupRawTiles = g.count || 0;
        const isMosaic = soldAsMosaic || false;
        const sheetSqIn = isMosaic ? (mosaicWidth * mosaicHeight) : (tileWidth * tileHeight);

        const physicalAreaSqIn = groupRawTiles * sheetSqIn;
        const physicalAreaSqFt = physicalAreaSqIn / conversionFactor;
        const totalRequiredSqFt = physicalAreaSqFt * (1 + overage / 100);

        let suggestedOrderText = '';
        let unitCostText = '';
        let totalCost = 0;

        if (mainSettings.purchaseType === 'carton') {
          const sqFtPerCarton = Number(mainSettings.sqFtPerCarton) || 0;
          const pricePerSqFt = mainSettings.pricePerSqFt || 0;
          const cartonsNeeded = sqFtPerCarton > 0 ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
          const purchasedSqFt = cartonsNeeded * sqFtPerCarton;
          totalCost = purchasedSqFt * pricePerSqFt;
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
          areaName: `Main Wall (${g.color})`,
          materialType: tileName || 'Main Wall Tile',
          suggestedOrderText,
          unitCostText,
          totalCost,
        });
      });
    }
  } else {
    const mainEst = getAreaEstimates('main');
    if (mainEst) rows.push(mainEst);
  }

  subAreas.filter((sa) => !sa.linkedMaterialId).forEach((sa) => {
    const saEst = getAreaEstimates(sa.id);
    if (saEst) rows.push(saEst);
  });

  let rowY = estCardY + 21;
  let grandTotal = 0;

  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(estCardX + 4, rowY - 5, estCardWidth - 8, 7.5, 'F');
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(row.areaName, estCardX + 6, rowY);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    const wrappedMatType = pdf.splitTextToSize(row.materialType, 56);
    pdf.text(wrappedMatType, estCardX + 44, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(79, 70, 229);
    pdf.text(row.suggestedOrderText, estCardX + 104, rowY);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(row.unitCostText, estCardX + 144, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(`$${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, estCardX + 174, rowY, { align: 'right' });

    grandTotal += row.totalCost;
    rowY += 8.2;
  });

  const totalY = estCardY + estCardHeight - 12;
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.line(estCardX + 4, totalY - 2, estCardX + estCardWidth - 4, totalY - 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(79, 70, 229);
  const grandTotalText = `Grand Total Estimated Material Cost: $${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(grandTotalText, estCardX + estCardWidth - 6, totalY + 4, { align: 'right' });
}
