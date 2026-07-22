import { jsPDF } from 'jspdf';
import { MeasurementUnit, WallExtension, TileShape, RectanglePattern, SubArea, ColorVariation, ColorPattern, CanvasLabel, FoldLine, AngleDisplayMode } from '../types';
import { generateTiles } from './generator';
import { computeComprehensiveStatistics } from './analytics';
import { getTrueArea, getCombinedWallBounds, getPolygonArea } from './geometry';
import { logger } from './logger';
import { useAppStore } from '../store/useAppStore';

import { Viewport, mapToCanvas } from '../components/TileCanvas/canvasUtils';
import { drawCanvasBacking, drawWallBackingFrame, defineCombinedWallPath, drawFoldLines } from '../components/TileCanvas/wallPainter';
import {
  drawMainTiles,
  drawSubAreas,
  drawBorder,
} from '../components/TileCanvas/painters';
import { drawWallMeasurements, drawSubAreaDimensions } from '../components/TileCanvas/dimensionPainter';

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

    try {
      const {
        isBlankCanvasMode = false,
        overage = 10,
        mosaicWidth = 12,
        mosaicHeight = 12
      } = params;

      let parentArea = wallWidth * wallHeight;
      if (wallVertices && wallVertices.length >= 3) {
        parentArea = getPolygonArea(wallVertices);
      } else if (params.wallBoundaryShape && params.wallBoundaryShape !== 'rectangle') {
        parentArea = getTrueArea({
          width: wallWidth,
          height: wallHeight,
          boundaryShape: params.wallBoundaryShape as any,
          archHeight: params.wallArchHeight,
          activeArches: params.wallActiveArches,
          archDepth: params.wallArchDepth
        });
      }
      if (!wallVertices && wallExtensions && wallExtensions.length > 0) {
        parentArea += wallExtensions.reduce((sum, ext) => sum + getTrueArea(ext), 0);
      }
      const childrenArea = subAreas.reduce((sum, sa) => sum + getTrueArea(sa), 0);
      const netArea = Math.max(0, parentArea - childrenArea);

      let totalEstimatedCost = 0;
      let hasPrices = false;
      if (purchasingSettings && Object.keys(purchasingSettings).length > 0) {
        hasPrices = true;
        const isImperial = unit === 'in';
        const conversionFactor = isImperial ? 144 : 929.0304;

        // Main Wall Area estimate
        if (!isBlankCanvasMode) {
          const settings = purchasingSettings['main'];
          if (settings) {
            const baseSqFt = isImperial ? (netArea / 144) : (netArea / 929.0304);
            const totalRequiredSqFt = baseSqFt * (1 + (overage / 100));

            if (settings.purchaseType === 'carton') {
              const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
              const pricePerSqFt = settings.pricePerSqFt || 0;
              const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
              totalEstimatedCost += cartonsNeeded * sqFtPerCarton * pricePerSqFt;
            } else if (settings.purchaseType === 'piece') {
              const pricePerSheet = settings.pricePerSheet || 0;
              const tW = params.tileWidth || 6;
              const tH = params.tileHeight || 6;
              const sheetAreaSqFt = (tW * tH) / conversionFactor;
              const piecesNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
              totalEstimatedCost += piecesNeeded * pricePerSheet;
            } else {
              const pricePerSheet = settings.pricePerSheet || 0;
              const mW = mosaicWidth;
              const mH = mosaicHeight;
              const sheetAreaSqFt = (mW * mH) / conversionFactor;
              const sheetsNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
              totalEstimatedCost += sheetsNeeded * pricePerSheet;
            }
          }
        }

        // Sub-areas estimates
        subAreas.forEach((sa) => {
          const settings = purchasingSettings[sa.id];
          if (settings) {
            const rawArea = getTrueArea(sa);
            const baseSqFt = isImperial ? (rawArea / 144) : (rawArea / 929.0304);
            const totalRequiredSqFt = baseSqFt * (1 + (overage / 100));

            if (settings.purchaseType === 'carton') {
              const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
              const pricePerSqFt = settings.pricePerSqFt || 0;
              const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
              totalEstimatedCost += cartonsNeeded * sqFtPerCarton * pricePerSqFt;
            } else if (settings.purchaseType === 'piece') {
              const pricePerSheet = settings.pricePerSheet || 0;
              const tW = sa.tileWidth || params.tileWidth || 6;
              const tH = sa.tileHeight || params.tileHeight || 6;
              const sheetAreaSqFt = (tW * tH) / conversionFactor;
              const piecesNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
              totalEstimatedCost += piecesNeeded * pricePerSheet;
            } else {
              const pricePerSheet = settings.pricePerSheet || 0;
              const mW = sa.mosaicWidth || mosaicWidth;
              const mH = sa.mosaicHeight || mosaicHeight;
              const sheetAreaSqFt = (mW * mH) / conversionFactor;
              const sheetsNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
              totalEstimatedCost += sheetsNeeded * pricePerSheet;
            }
          }
        });
      }
      
      logger.info('PDF Specifications generated', {
        netArea,
        totalEstimatedCost: hasPrices ? totalEstimatedCost : undefined,
        projectName
      });
    } catch (logErr) {
      console.warn('Could not log PDF specs info:', logErr);
      logger.info('PDF Specifications generated');
    }

    if (params.outputMode === 'base64') {
      return pdf.output('datauristring');
    }

    pdf.save(`${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'tile_layout'}.pdf`);
  } catch (err) {
    console.error('Failed to export PDF:', err);
    alert('An error occurred while generating the PDF export.');
    throw err;
  } finally {
    if (originalZoom > 1.0) {
      params.setZoom(originalZoom);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateHighResDiagram(params: PDFExportParams, canvas: HTMLCanvasElement, subAreas: SubArea[], bounds: any) {
  const {
    wallWidth, wallHeight, wallVertices, unit, wallExtensions, shape, tileWidth, tileHeight, pattern, groutWidth, offsetX, offsetY, angle, activeSubAreaId,
    isBlankCanvasMode, soldAsMosaic, mosaicWidth, mosaicHeight, overage, disableTileColorOnPdf, exportPhotoBg, backgroundImage, bgScale, bgOffsetX, bgOffsetY,
    tileOpacity, bgOpacity, showAccentDistances, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallAngle, colorVariation, tileDotColor,
    isPicket, picketLength, canvasLabels, foldLines, tileColors, tileColor, groutColor, tileSpecular, isPainted, colorPattern, tilesPerStripe, angleDisplayMode,
    activeCustomPattern, flatsketVerticalRows, flatsketHorizontalRows
  } = params;

  const dpr = window.devicePixelRatio || 1;
  const dimensionsWidth = canvas.width / dpr;
  const dimensionsHeight = canvas.height / dpr;

  const combinedWidth = bounds.width;
  const combinedHeight = bounds.height;
  const minX = bounds.minX;
  const minY = bounds.minY;

  let rotatedBoundsWidth = combinedWidth;
  let rotatedBoundsHeight = combinedHeight;
  if (wallAngle && wallAngle !== 0) {
    const rad = (wallAngle * Math.PI) / 180;
    rotatedBoundsWidth = combinedWidth * Math.abs(Math.cos(rad)) + combinedHeight * Math.abs(Math.sin(rad));
    rotatedBoundsHeight = combinedWidth * Math.abs(Math.sin(rad)) + combinedHeight * Math.abs(Math.cos(rad));
  }

  const padding = 80;
  const baseScale = Math.min(
    (dimensionsWidth - padding * 2) / (rotatedBoundsWidth || 1),
    (dimensionsHeight - padding * 2) / (rotatedBoundsHeight || 1)
  );
  const scale = baseScale * 1.0; 

  const renderW = combinedWidth * scale;
  const renderH = combinedHeight * scale;
  const cornerX = (dimensionsWidth - renderW) / 2;
  const cornerY = (dimensionsHeight - renderH) / 2;

  const viewport: Viewport = { cornerX, cornerY, renderW, renderH, scale, minX, minY };
  const pad = 42; 
  const rW = rotatedBoundsWidth * scale;
  const rH = rotatedBoundsHeight * scale;
  const cropX = Math.max(0, (dimensionsWidth - rW) / 2 - pad);
  const cropY = Math.max(0, (dimensionsHeight - rH) / 2 - pad);
  const cropW = Math.min(dimensionsWidth - cropX, rW + pad * 2);
  const cropH = Math.min(dimensionsHeight - cropY, rH + pad * 2);

  const scaleFactor = 4; 

  let loadedImg: HTMLImageElement | null = null;
  if (exportPhotoBg && backgroundImage) {
    try {
      loadedImg = await loadImage(backgroundImage);
    } catch (err) {
      console.error('Error loading background image for PDF export:', err);
    }
  }

  const superCanvas = document.createElement('canvas');
  superCanvas.width = dimensionsWidth * scaleFactor;
  superCanvas.height = dimensionsHeight * scaleFactor;
  const superCtx = superCanvas.getContext('2d');
  if (!superCtx) return null;

  superCtx.scale(scaleFactor, scaleFactor);
  superCtx.clearRect(0, 0, dimensionsWidth, dimensionsHeight);

  if (loadedImg) {
    superCtx.save();
    superCtx.globalAlpha = bgOpacity || 1;
    const cx = dimensionsWidth / 2;
    const cy = dimensionsHeight / 2;
    superCtx.translate(cx + (bgOffsetX || 0), cy + (bgOffsetY || 0));
    superCtx.scale(bgScale || 1, bgScale || 1);
    superCtx.drawImage(loadedImg, -loadedImg.width / 2, -loadedImg.height / 2);
    superCtx.restore();
  }

  drawCanvasBacking(superCtx, dimensionsWidth, dimensionsHeight, !!loadedImg, true, viewport, unit);

  superCtx.save(); 
  if (wallAngle && wallAngle !== 0) {
    const cx = viewport.cornerX + viewport.renderW / 2;
    const cy = viewport.cornerY + viewport.renderH / 2;
    superCtx.translate(cx, cy);
    superCtx.rotate((wallAngle * Math.PI) / 180);
    superCtx.translate(-cx, -cy);
  }

  superCtx.save();
  superCtx.fillStyle = '#1e293b';
  superCtx.strokeStyle = '#1e293b';
  superCtx.lineJoin = 'round';
  superCtx.lineWidth = 7;
  defineCombinedWallPath(superCtx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
  superCtx.fill();
  superCtx.stroke();
  
  superCtx.globalAlpha = tileOpacity || 1;
  superCtx.fillStyle = isPainted ? groutColor : 'rgba(226, 232, 240, 0.8)';
  defineCombinedWallPath(superCtx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
  superCtx.fill();

  if (!isPainted) {
    superCtx.fillStyle = '#64748b';
    superCtx.font = '13px system-ui, sans-serif';
    superCtx.textAlign = 'center';
    superCtx.fillText("Click 'Paint Canvas' to layout tiles", viewport.cornerX + viewport.renderW / 2, viewport.cornerY + viewport.renderH / 2);
  }
  superCtx.restore();

  if (isPainted) {
    superCtx.save();
    defineCombinedWallPath(superCtx, viewport, wallWidth, wallHeight, wallExtensions, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, 0, wallVertices);
    superCtx.clip();

    if (!isBlankCanvasMode) {
      const mainTiles = generateTiles({ wallWidth, wallHeight, shape, tileWidth, tileHeight, pattern, groutWidth, offsetX, offsetY, angle, extensions: wallExtensions, isPicket, picketLength, wallVertices, activeCustomPattern, flatsketVerticalRows, flatsketHorizontalRows, layoutId: 'main' });
      superCtx.save();
      superCtx.globalAlpha = tileOpacity || 1;
      const resolvedTileColors = tileColors || (tileColor ? [tileColor] : ['#f1f5f9']);
      drawMainTiles(superCtx, mainTiles, viewport, resolvedTileColors, colorPattern || 'single', tileSpecular, subAreas, wallWidth, wallHeight, tileWidth, tileHeight, shape, wallExtensions, disableTileColorOnPdf, colorVariation, tileDotColor, groutWidth, tilesPerStripe, wallVertices);
      superCtx.restore();
    } else {
      superCtx.save();
      superCtx.fillStyle = 'rgba(255, 255, 255, 0.16)'; 
      superCtx.font = 'bold 15px "Space Grotesk", "Inter", system-ui, sans-serif';
      superCtx.textAlign = 'center';
      superCtx.textBaseline = 'middle';
      const diag = Math.sqrt(dimensionsWidth * dimensionsWidth + dimensionsHeight * dimensionsHeight);
      const stepX = 145; 
      const stepY = 64;  
      superCtx.translate(dimensionsWidth / 2, dimensionsHeight / 2);
      superCtx.rotate(-25 * Math.PI / 180);
      let rowCount = 0;
      for (let y = -diag; y < diag; y += stepY) {
        const xOffset = (rowCount % 2) * (stepX / 2);
        for (let x = -diag + xOffset; x < diag; x += stepX) superCtx.fillText('Blank Canvas', x, y);
        rowCount++;
      }
      superCtx.restore();
    }
    superCtx.restore();

    const wallBorder = (params as any).wallBorder; 
    if (wallBorder?.enabled) {
      const defaultBColor = tileColors && tileColors.length > 0 ? tileColors[0] : '#f1f5f9';
      const selectedBColor = wallBorder.color || defaultBColor;
      const finalBColor = disableTileColorOnPdf ? '#ffffff' : selectedBColor;
      drawBorder(superCtx, { x: 0, y: 0, w: wallWidth, h: wallHeight }, wallBorder, false, viewport, 0, finalBColor, groutColor, groutWidth);
    }

    drawSubAreas(superCtx, subAreas, activeSubAreaId, viewport, tileSpecular, unit, wallWidth, wallHeight, wallExtensions, false, tileOpacity, disableTileColorOnPdf, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallVertices, false, null);
    drawSubAreaDimensions(superCtx, viewport, subAreas, showAccentDistances || false, unit, !!loadedImg, true, angleDisplayMode);
  }

  drawWallMeasurements(superCtx, viewport, combinedWidth, combinedHeight, unit, wallWidth, wallHeight, wallExtensions, !!loadedImg, [], false, wallVertices, true, angleDisplayMode);

  if (foldLines && foldLines.length > 0 && wallVertices) {
    const wallToScreen = (wx: number, wy: number) => {
      const pt = mapToCanvas(wx, wy, viewport);
      return { px: pt.x, py: pt.y };
    };
    drawFoldLines(superCtx, foldLines, wallVertices, wallToScreen);
  }

  if (canvasLabels && canvasLabels.length > 0) {
    superCtx.save();
    superCtx.font = 'bold 11.5px "Space Grotesk", "Inter", "Helvetica Neue", sans-serif';
    superCtx.textAlign = 'center';
    superCtx.textBaseline = 'middle';
    canvasLabels.forEach((label) => {
      const pt = mapToCanvas(label.x, label.y, viewport);
      superCtx.fillStyle = '#ffffff';
      const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0]];
      offsets.forEach(([ox, oy]) => superCtx.fillText(label.text, pt.x + ox * 0.8, pt.y + oy * 0.8));
      superCtx.fillStyle = '#0f172a';
      superCtx.fillText(label.text, pt.x, pt.y);
    });
    superCtx.restore();
  }
  superCtx.restore();

  const sx = cropX * scaleFactor;
  const sy = cropY * scaleFactor;
  const sw = cropW * scaleFactor;
  const sh = cropH * scaleFactor;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    superCanvas.width = 0;
    superCanvas.height = 0;
    return null;
  }

  tempCtx.drawImage(superCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  const dataUrl = tempCanvas.toDataURL('image/png');

  // CRITICAL MEMORY CLEANUP: Collapse the canvas dimensions to 0.
  // This forces the browser to immediately destroy the GPU backing stores and reclaim memory.
  superCanvas.width = 0;
  superCanvas.height = 0;
  tempCanvas.width = 0;
  tempCanvas.height = 0;

  return {
    dataUrl,
    width: sw,
    height: sh
  };
}

function drawPdfHeaderAndFooter(pdf: jsPDF, pageIndex: number, projectName: string, displayWallWidth: number, displayWallHeight: number, unit: string, isTwoPage: boolean, totalPages: number) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42); 
  pdf.text(projectName || 'Untitled Tile Layout Project', 15, 20);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(79, 70, 229); 
  const topRightDimText = `Wall Size: ${displayWallWidth} x ${displayWallHeight} ${unit}`;
  const topWidth = pdf.getTextWidth(topRightDimText);
  pdf.text(topRightDimText, 195 - topWidth, 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); 
  const today = new Date().toLocaleDateString();
  pdf.text(`Tile Layout Report - Generated ${today}`, 15, 27);

  pdf.setDrawColor(226, 232, 240); 
  pdf.setLineWidth(0.5);
  pdf.line(15, 31, 195, 31);

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184); 
  pdf.text('Generated using WildVision Tile Layout Engine', 15, 285);
  
  if (isTwoPage) {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184); 
    pdf.text(`Page ${pageIndex} of ${totalPages}`, 105, 285, { align: 'center' });
  }
  
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(148, 163, 184); 
  pdf.text('Layout and quantities are only estimates.', 195, 285, { align: 'right' });
}

function drawSpecificationsCard(pdf: jsPDF, cardX: number, cardY: number, cardWidth: number, cardHeight: number, isTwoPage: boolean, displayWallWidth: number, displayWallHeight: number, subAreas: SubArea[], params: PDFExportParams) {
  const { unit, wallWidth, wallHeight, wallVertices, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallExtensions, isBlankCanvasMode, tileName, shape, tileWidth, tileHeight, pattern, printQuantities, soldAsMosaic, mosaicWidth, mosaicHeight, overage = 10 } = params;

  pdf.setFillColor(248, 250, 252); 
  pdf.setDrawColor(203, 213, 225); 
  pdf.setLineWidth(0.35);
  pdf.rect(cardX, cardY, cardWidth, cardHeight, 'F');
  pdf.rect(cardX, cardY, cardWidth, cardHeight, 'D');

  pdf.setFillColor(79, 70, 229); 
  pdf.rect(cardX, cardY, cardWidth, 8, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('SPECIFICATIONS & TILES', cardX + 6, cardY + 5.5);

  pdf.setDrawColor(226, 232, 240); 
  pdf.setLineWidth(0.2);
  pdf.line(cardX + 58, cardY + 12, cardX + 58, cardY + cardHeight - 6);
  pdf.line(cardX + 118, cardY + 12, cardX + 118, cardY + cardHeight - 6);

  const col1X = cardX + 6;
  let col1Y = cardY + 14;
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
  
  const statsReport = computeComprehensiveStatistics(params);
  const totalWallAreaInUnits = statsReport.mainReport.netArea || 0;
  
  pdf.text(`Total Area: ${unit === 'in' ? (totalWallAreaInUnits / 144).toFixed(2) + ' sq ft' : totalWallAreaInUnits.toFixed(1) + ' sq ' + unit}`, col1X + 2, col1Y);
  col1Y += 4.5;

  const col2X = cardX + 62;
  let col2Y = cardY + 14;
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
    const mainName = tileName || 'Main Wall Tile';
    const wrappedMainName = pdf.splitTextToSize(mainName, 52);
    pdf.text(wrappedMainName, col2X + 2, col2Y);
    col2Y += wrappedMainName.length * 4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);
    const mainDimText = (shape === 'rectangle' || shape === 'diamond') ? `${tileWidth} x ${tileHeight} ${unit}` : `${tileWidth} x ${tileWidth} ${unit} (${shape})`;
    pdf.text(`Dimensions: ${mainDimText}`, col2X + 2, col2Y);
    col2Y += 4.5;

    let patternLabel = pattern.toUpperCase();
    if (pattern === 'running_50') patternLabel = '1/2 Running Bond';
    else if (pattern === 'third_33') patternLabel = '1/3 Running Bond';
    else if (pattern === 'stack') patternLabel = 'Stacked Grid';
    else if (pattern === 'herringbone') patternLabel = 'Herringbone (45°)';
    else if (pattern === 'basket_weave') patternLabel = 'Basket Weave';
    else if (pattern === 'plank') patternLabel = 'Plank (Vertical Columns)';

    pdf.text(`Layout: ${patternLabel}`, col2X + 2, col2Y);
    col2Y += 4.5;

    if (printQuantities !== false) {
      const stats = computeComprehensiveStatistics(params);
      let parentArea = wallWidth * wallHeight;
      if (wallVertices && wallVertices.length >= 3) {
        parentArea = getPolygonArea(wallVertices);
      } else if (wallBoundaryShape && wallBoundaryShape !== 'rectangle') {
        parentArea = getTrueArea({ width: wallWidth, height: wallHeight, boundaryShape: wallBoundaryShape as any, archHeight: wallArchHeight, activeArches: wallActiveArches, archDepth: wallArchDepth });
      }
      if (!wallVertices && wallExtensions && wallExtensions.length > 0) {
        parentArea += wallExtensions.reduce((sum, ext) => sum + getTrueArea(ext), 0);
      }
      const childrenArea = subAreas.reduce((sum, sa) => sum + getTrueArea(sa), 0);
      const netArea = Math.max(0, parentArea - childrenArea);
      
      let estTiles = 0;
      let estPrimary = 0;
      let estSecondary = 0;
      
      if (soldAsMosaic) {
         const mArea = ((mosaicWidth||12) * (mosaicHeight||12)) / 144;
         estTiles = Math.ceil((netArea * (1 + overage / 100)) / mArea);
      } else {
         estTiles = Math.ceil(stats.mainReport.totalTilesUsed * (1 + overage / 100));
         if (stats.mainReport.primaryPieceCount) estPrimary = Math.ceil(stats.mainReport.primaryPieceCount * (1 + overage / 100));
         if (stats.mainReport.secondaryPieceCount) estSecondary = Math.ceil(stats.mainReport.secondaryPieceCount * (1 + overage / 100));
      }
      
      pdf.text(`Net Area: ${unit === 'in' ? (netArea / 144).toFixed(2) + ' sq ft' : netArea.toFixed(1) + ' sq ' + unit}`, col2X + 2, col2Y);
      col2Y += 4.5;
      
      if (!soldAsMosaic && estSecondary > 0) {
        pdf.text(`Est. Primary: ${estPrimary} tiles`, col2X + 2, col2Y);
        col2Y += 4.5;
        pdf.text(`Est. Accent/Dot: ${estSecondary} tiles`, col2X + 2, col2Y);
        col2Y += 4.5;
      } else {
        pdf.text(`Est. Material: ${estTiles} ${soldAsMosaic ? 'sheets' : 'tiles'}`, col2X + 2, col2Y);
        col2Y += 4.5;
      }
      
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`(inc ${overage}% overage)`, col2X + 2, col2Y);
    }
  }

  const col3X = cardX + 122;
  let col3Y = cardY + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Accents & Niches', col3X, col3Y);
  col3Y += 5;

  if (subAreas.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No accents or niches in this layout.', col3X + 2, col3Y);
  } else {
    subAreas.forEach((sa, i) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      const name = sa.name || `Sub-Area ${i + 1}`;
      const wrappedName = pdf.splitTextToSize(name, 52);
      pdf.text(wrappedName, col3X + 2, col3Y);
      col3Y += wrappedName.length * 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      const saArea = getTrueArea(sa);
      pdf.text(`Area: ${unit === 'in' ? (saArea / 144).toFixed(2) + ' sq ft' : saArea.toFixed(1) + ' sq ' + unit}`, col3X + 2, col3Y);
      col3Y += 4.5;

      if (printQuantities !== false) {
         let estSaTiles = 0;
         const saSoldAsMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : soldAsMosaic;
         if (saSoldAsMosaic) {
            const mArea = ((sa.mosaicWidth||mosaicWidth||12) * (sa.mosaicHeight||mosaicHeight||12)) / 144;
            estSaTiles = Math.ceil((saArea * (1 + overage / 100)) / mArea);
         } else {
            const tArea = ((sa.tileWidth||tileWidth) * (sa.tileHeight||tileHeight)) / 144;
            estSaTiles = Math.ceil((saArea * (1 + overage / 100)) / tArea);
         }
         pdf.text(`Est. Material: ${estSaTiles} ${saSoldAsMosaic ? 'sheets' : 'tiles'}`, col3X + 2, col3Y);
         col3Y += 4.5;
      }
      col3Y += 2;
    });
  }
}

function drawPricingCard(pdf: jsPDF, estCardX: number, estCardY: number, estCardWidth: number, estCardHeight: number, subAreas: SubArea[], params: PDFExportParams) {
  const { isBlankCanvasMode, tileName, soldAsMosaic, mosaicWidth, mosaicHeight, tileWidth, tileHeight, wallWidth, wallHeight, wallVertices, wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallExtensions, overage = 10, purchasingSettings = {}, unit } = params;
  
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

  let headerY = estCardY + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139); 
  pdf.text('DESIGN AREA', estCardX + 6, headerY);
  pdf.text('MATERIAL', estCardX + 44, headerY);
  pdf.text('SUGGESTED ORDER', estCardX + 104, headerY);
  pdf.text('UNIT COST', estCardX + 144, headerY);
  pdf.text('TOTAL EST.', estCardX + 174, headerY, { align: 'right' });

  pdf.line(estCardX, headerY + 2, estCardX + estCardWidth, headerY + 2);

  const rows: any[] = [];
  const stats = computeComprehensiveStatistics(params);

  const getAreaEstimates = (areaId: string) => {
    let areaName = '';
    let materialType = '';
    let isMosaic = false;
    let settings = purchasingSettings[areaId];
    if (!settings && areaId === 'main') settings = purchasingSettings['main'];
    if (!settings) return null;
    let rawArea = 0;
    let sa: SubArea | undefined;
    let totalRawTiles = 0;

    if (areaId === 'main') {
      if (isBlankCanvasMode) return null;
      areaName = 'Main Wall Area';
      materialType = tileName || 'Main Wall Tile';
      isMosaic = soldAsMosaic || false;
      totalRawTiles = stats.mainReport.totalTilesUsed;
      
      let parentArea = wallWidth * wallHeight;
      if (wallVertices && wallVertices.length >= 3) {
        parentArea = getPolygonArea(wallVertices);
      } else if (wallBoundaryShape && wallBoundaryShape !== 'rectangle') {
        parentArea = getTrueArea({ width: wallWidth, height: wallHeight, boundaryShape: wallBoundaryShape as any, archHeight: wallArchHeight, activeArches: wallActiveArches, archDepth: wallArchDepth });
      }
      if (!wallVertices && wallExtensions && wallExtensions.length > 0) {
        parentArea += wallExtensions.reduce((sum, ext) => sum + getTrueArea(ext), 0);
      }
      const childrenArea = subAreas.reduce((sum, sa) => sum + getTrueArea(sa), 0);
      const netArea = Math.max(0, parentArea - childrenArea);
      rawArea = netArea;
    } else {
      sa = subAreas.find(s => s.id === areaId);
      if (!sa) return null;
      areaName = sa.name || 'Sub-Area';
      materialType = sa.tileName || 'Accent Tile';
      isMosaic = sa.soldAsMosaic !== undefined ? sa.soldAsMosaic : (soldAsMosaic || false);
      rawArea = getTrueArea(sa);
      totalRawTiles = stats.subAreaReports.find(r => r.subAreaId === areaId)?.report.totalTilesUsed || 0;
    }

    const isImperial = unit === 'in';
    const baseSqFt = isImperial ? (rawArea / 144) : (rawArea / 929.0304);
    const totalRequiredSqFt = baseSqFt * (1 + (overage / 100));

    let suggestedOrderText = '';
    let unitCostText = '';
    let totalCost = 0;

    if (settings.purchaseType === 'carton') {
      const sqFtPerCarton = Number(settings.sqFtPerCarton) || 0;
      const pricePerSqFt = settings.pricePerSqFt || 0;
      
      const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
      const purchasedSqFt = cartonsNeeded * sqFtPerCarton;
      totalCost = purchasedSqFt * pricePerSqFt;
      
      suggestedOrderText = `${cartonsNeeded} Cartons`;
      unitCostText = `${Number(pricePerSqFt || 0).toFixed(2)} / sq.ft`;
    } else if (settings.purchaseType === 'piece') {
      const pricePerSheet = settings.pricePerSheet || 0;
      const piecesNeeded = Math.ceil(totalRawTiles * (1 + (overage / 100)));
      totalCost = piecesNeeded * pricePerSheet;
      
      suggestedOrderText = `${piecesNeeded} Pieces`;
      unitCostText = `${Number(pricePerSheet || 0).toFixed(2)} / piece`;
    } else {
      const pricePerSheet = settings.pricePerSheet || 0;
      const mW = areaId === 'main'
        ? (mosaicWidth || 12)
        : (sa!.mosaicWidth || mosaicWidth || 12);
      const mH = areaId === 'main'
        ? (mosaicHeight || 12)
        : (sa!.mosaicHeight || mosaicHeight || 12);
      const conversionFactor = isImperial ? 144 : 929.0304;
      const sheetAreaSqFt = (mW * mH) / conversionFactor;
      
      const sheetsNeeded = (sheetAreaSqFt > 0) ? Math.ceil(totalRequiredSqFt / sheetAreaSqFt) : 0;
      totalCost = sheetsNeeded * pricePerSheet;
      
      suggestedOrderText = `${sheetsNeeded} Sheets`;
      unitCostText = `${Number(pricePerSheet || 0).toFixed(2)} / sheet`;
    }

    return { areaName, materialType, suggestedOrderText, unitCostText, totalCost };
  };
  const isPaint = params.colorPattern === 'paint' && stats.mainReport.colorGroups && stats.mainReport.colorGroups.length > 0;

  if (isPaint) {
    const mainSettings = purchasingSettings['main'];
    if (mainSettings) {
      stats.mainReport.colorGroups!.forEach((g) => {
        const isImperial = unit === 'in';
        const baseSqFt = isImperial ? (g.netArea / 144) : (g.netArea / 929.0304);
        const totalRequiredSqFt = baseSqFt * (1 + (overage / 100));

        let suggestedOrderText = '';
        let unitCostText = '';
        let totalCost = 0;

        if (mainSettings.purchaseType === 'carton') {
          const sqFtPerCarton = Number(mainSettings.sqFtPerCarton) || 0;
          const pricePerSqFt = mainSettings.pricePerSqFt || 0;
          
          const cartonsNeeded = (sqFtPerCarton > 0) ? Math.ceil(totalRequiredSqFt / sqFtPerCarton) : 0;
          const purchasedSqFt = cartonsNeeded * sqFtPerCarton;
          totalCost = purchasedSqFt * pricePerSqFt;
          
          suggestedOrderText = `${cartonsNeeded} Cartons`;
          unitCostText = `$${Number(pricePerSqFt || 0).toFixed(2)} / sq.ft`;
        } else if (mainSettings.purchaseType === 'piece') {
          const pricePerSheet = mainSettings.pricePerSheet || 0;
          const tW = params.tileWidth || 6;
          const tH = params.tileHeight || 6;
          const conversionFactor = isImperial ? 144 : 929.0304;
          const sheetAreaSqFt = (tW * tH) / conversionFactor;
          const reqSqFt = isImperial ? (g.netArea / 144) : (g.netArea / 929.0304);
          const reqSqFtWithOverage = reqSqFt * (1 + (overage / 100));
          const piecesNeeded = sheetAreaSqFt > 0 ? Math.ceil(reqSqFtWithOverage / sheetAreaSqFt) : 0;
          totalCost = piecesNeeded * pricePerSheet;
          
          suggestedOrderText = `${piecesNeeded} Pieces`;
          unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / piece`;
        } else {
          const pricePerSheet = mainSettings.pricePerSheet || 0;
          const mW = mosaicWidth || 12;
          const mH = mosaicHeight || 12;
          const conversionFactor = isImperial ? 144 : 929.0304;
          const sheetAreaSqFt = (mW * mH) / conversionFactor;
          const reqSqFt = isImperial ? (g.netArea / 144) : (g.netArea / 929.0304);
          const reqSqFtWithOverage = reqSqFt * (1 + (overage / 100));
          const sheetsNeeded = sheetAreaSqFt > 0 ? Math.ceil(reqSqFtWithOverage / sheetAreaSqFt) : 0;
          totalCost = sheetsNeeded * pricePerSheet;
          
          suggestedOrderText = `${sheetsNeeded} Sheets`;
          unitCostText = `$${Number(pricePerSheet || 0).toFixed(2)} / sheet`;
        }

        rows.push({
          areaName: `Main Wall (${g.color})`,
          materialType: `Custom Paint Override`,
          suggestedOrderText,
          unitCostText,
          totalCost
        });
      });
    }
  } else {
    const mainEst = getAreaEstimates('main');
    if (mainEst) rows.push(mainEst);
  }

  subAreas.forEach((sa) => {
    const saEst = getAreaEstimates(sa.id);
    if (saEst) rows.push(saEst);
  });

  let rowY = estCardY + 23;
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
