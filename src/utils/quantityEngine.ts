import { AreaReport, PurchasingSetting, SubArea } from '../types';

export interface AreaQuantityParams {
  areaId: string;
  report: AreaReport;
  settings: PurchasingSetting;
  overage: number; // percentage, e.g. 10 for 10%
  reuseCuts: boolean;
  unit: 'in' | 'cm';
  mainSoldAsMosaic: boolean;
  subArea?: SubArea | null;
  mainTileWidth?: number;
  mainTileHeight?: number;
  mainMosaicWidth?: number;
  mainMosaicHeight?: number;
  colorPattern?: string;
  subAreas?: SubArea[];
}

export interface ColorBreakdownItem {
  color: string;
  count: number;
  fractionalCount?: number;
  recQty: number;
  subtotal: number;
}

export interface AreaQuantityStats {
  id: string;
  report: AreaReport;
  set: PurchasingSetting;
  isMos: boolean;
  sheetInputMode: 'dimensions' | 'sqft';
  currArea: number;
  surfaceAreaSqFt: number;
  effectiveAreaSqFt: number;
  recommendedSqFt: number;
  overageMult: number;
  sW: number;
  sH: number;
  sheetSqIn: number;
  sheetSqFt: number;
  fullCount: number;
  cutCount: number;
  totalRawCount: number;
  recQty: number;
  qUnit: 'Cartons' | 'Sheets' | 'Pieces' | 'Tiles';
  isPaintPat: boolean;
  totColorCost: number;
  normCost: number;
  fCost: number;
  ordStr: string;
  name: string;
  childCount: number;
}

export interface ProjectTotalsStats {
  totalSurfaceSqFt: number;
  totalEffectiveSqFt: number;
  totalRecommendedSqFt: number;
  totalCost: number;
}

/**
 * Calculates standardized physical quantities, package recommendations, and costs
 * for an area (main floor/wall or sub-area).
 */
export function computeAreaQuantities(params: AreaQuantityParams): AreaQuantityStats {
  const {
    areaId,
    report,
    settings,
    overage,
    reuseCuts,
    unit,
    mainSoldAsMosaic,
    subArea,
    mainTileWidth = 6,
    mainTileHeight = 6,
    mainMosaicWidth = 12,
    mainMosaicHeight = 12,
    colorPattern,
    subAreas = [],
  } = params;

  const isMos = settings.purchaseType === 'sheet' || (areaId === 'main' ? mainSoldAsMosaic : subArea?.soldAsMosaic === true);
  const conversionFactor = unit === 'in' ? 144 : 929.0304;
  const sheetInputMode = settings.sheetInputMode || 'dimensions';

  let sW = 12;
  let sH = 12;
  let sheetSqIn = 144;
  let sheetSqFt = 1;

  if (isMos) {
    if (sheetInputMode === 'sqft' && settings.sqFtPerSheet && Number(settings.sqFtPerSheet) > 0) {
      sheetSqFt = Number(settings.sqFtPerSheet);
      sheetSqIn = sheetSqFt * conversionFactor;
      const sideEstimate = Math.sqrt(sheetSqIn);
      sW = Number(sideEstimate.toFixed(1));
      sH = Number(sideEstimate.toFixed(1));
    } else {
      sW = Number(settings.sheetWidth) || (areaId === 'main' ? (mainMosaicWidth || 12) : (subArea?.mosaicWidth || 12));
      sH = Number(settings.sheetHeight) || (areaId === 'main' ? (mainMosaicHeight || 12) : (subArea?.mosaicHeight || 12));
      sheetSqIn = sW * sH;
      sheetSqFt = sheetSqIn / conversionFactor;
    }
  } else {
    sW = areaId === 'main' ? (mainTileWidth || 6) : (subArea?.tileWidth || 6);
    sH = areaId === 'main' ? (mainTileHeight || 6) : (subArea?.tileHeight || 6);
    sheetSqIn = sW * sH;
    sheetSqFt = sheetSqIn / conversionFactor;
  }

  const currArea = report.netArea || 0;
  const surfaceAreaSqFt = currArea / conversionFactor;
  const overageMult = 1 + overage / 100;

  // Use canvas layout simulation for tiles and sheets
  let fullCount = report.fullTilesCount || 0;
  const isStrictSheets = isMos || settings.purchaseType === 'sheet';
  let cutCount = Math.ceil(
    (!isStrictSheets && reuseCuts)
      ? (report.fractionalCutCount || 0)
      : (report.strictCutCount || report.cutTilesCount || 0)
  );
  let totalRawTiles = fullCount + cutCount;

  // Fallback if layout simulation has not populated tiles yet but area exists
  if (totalRawTiles === 0 && surfaceAreaSqFt > 0) {
    totalRawTiles = Math.ceil(surfaceAreaSqFt / (sheetSqFt || 1));
    fullCount = Math.floor(surfaceAreaSqFt / (sheetSqFt || 1));
    cutCount = Math.max(0, totalRawTiles - fullCount);
  }

  const totalRawCount = totalRawTiles;
  const physicalAreaSqFt = totalRawCount * sheetSqFt;
  const effectiveAreaSqFt = physicalAreaSqFt;

  let recQty = 0;
  let qUnit: 'Cartons' | 'Sheets' | 'Pieces' = 'Pieces';
  let recommendedSqFt = 0;

  if (settings.purchaseType === 'carton') {
    const cartons = settings.sqFtPerCarton ? Math.ceil((physicalAreaSqFt * overageMult) / Number(settings.sqFtPerCarton)) : 0;
    recQty = cartons;
    qUnit = 'Cartons';
    recommendedSqFt = cartons * (Number(settings.sqFtPerCarton) || 0);
  } else if (settings.purchaseType === 'sheet' || isMos) {
    recQty = Math.ceil(totalRawCount * overageMult);
    qUnit = 'Sheets';
    recommendedSqFt = recQty * sheetSqFt;
  } else {
    recQty = Math.ceil(totalRawCount * overageMult);
    qUnit = 'Pieces';
    recommendedSqFt = recQty * sheetSqFt;
  }

  const isPaintPat = areaId === 'main' && colorPattern === 'paint' && !!report.colorGroups;

  const totColorCost = isPaintPat && report.colorGroups
    ? report.colorGroups.reduce((sum, g) => {
        const groupAreaSqFt = g.netArea / conversionFactor;
        const groupAreaWithOverage = groupAreaSqFt * overageMult;

        if (settings.purchaseType === 'carton') {
          const cartons = settings.sqFtPerCarton ? Math.ceil(groupAreaWithOverage / Number(settings.sqFtPerCarton)) : 0;
          return sum + (cartons * Number(settings.sqFtPerCarton) * settings.pricePerSqFt);
        } else if (settings.purchaseType === 'piece') {
          const pieces = Math.ceil(g.count * overageMult);
          return sum + (pieces * settings.pricePerSheet);
        } else {
          const sheets = sheetSqFt > 0 ? Math.ceil(groupAreaWithOverage / sheetSqFt) : 0;
          return sum + (sheets * settings.pricePerSheet);
        }
      }, 0)
    : 0;

  const normCost = settings.purchaseType === 'carton'
    ? (settings.sqFtPerCarton ? Math.ceil((effectiveAreaSqFt * overageMult) / Number(settings.sqFtPerCarton)) * Number(settings.sqFtPerCarton) * settings.pricePerSqFt : 0)
    : recQty * settings.pricePerSheet;

  const fCost = isPaintPat ? totColorCost : normCost;

  let ordStr = '';
  if (isPaintPat) {
    ordStr = 'Multi-color Order';
  } else {
    if (settings.purchaseType === 'carton') {
      const cartons = settings.sqFtPerCarton ? Math.ceil((effectiveAreaSqFt * overageMult) / Number(settings.sqFtPerCarton)) : 0;
      ordStr = `${cartons} Cartons`;
    } else {
      ordStr = `${recQty} ${qUnit}`;
    }
  }

  const childCount = areaId === 'main'
    ? subAreas.filter(s => s.linkedMaterialId === 'main' && s.visible !== false).length
    : (subArea ? subAreas.filter(s => s.linkedMaterialId === subArea.id && s.visible !== false).length : 0);
  const name = areaId === 'main' ? 'Main Wall Area' : (subArea?.name || 'Accent Area');

  return {
    id: areaId,
    report,
    set: settings,
    isMos,
    sheetInputMode: settings.sheetInputMode || 'dimensions',
    currArea,
    surfaceAreaSqFt,
    effectiveAreaSqFt,
    recommendedSqFt,
    overageMult,
    sW,
    sH,
    sheetSqIn,
    sheetSqFt,
    fullCount,
    cutCount,
    totalRawCount,
    recQty,
    qUnit,
    isPaintPat,
    totColorCost,
    normCost,
    fCost,
    ordStr,
    name,
    childCount,
  };
}

/**
 * Merges a primary AreaReport with one or more child AreaReports (e.g. linked niches/accents).
 * Aggregates net area, tile counts, and color groups cleanly so combined order quantities are exact.
 */
export function aggregateAreaReports(
  primaryReport: AreaReport,
  childReports: (AreaReport | undefined | null)[]
): AreaReport {
  const validChildren = childReports.filter((r): r is AreaReport => Boolean(r));
  if (validChildren.length === 0) return primaryReport;

  const merged: AreaReport = JSON.parse(JSON.stringify(primaryReport));
  if (!merged.colorGroups) merged.colorGroups = [];

  validChildren.forEach((cReport) => {
    merged.netArea = (merged.netArea || 0) + (cReport.netArea || 0);
    merged.totalTilesUsed = (merged.totalTilesUsed || 0) + (cReport.totalTilesUsed || 0);
    merged.fullTilesCount = (merged.fullTilesCount || 0) + (cReport.fullTilesCount || 0);
    merged.cutTilesCount = (merged.cutTilesCount || 0) + (cReport.cutTilesCount || 0);
    if (cReport.strictCutCount !== undefined) {
      merged.strictCutCount = (merged.strictCutCount || 0) + cReport.strictCutCount;
    }
    if (cReport.fractionalCutCount !== undefined) {
      merged.fractionalCutCount = (merged.fractionalCutCount || 0) + cReport.fractionalCutCount;
    }
    if (cReport.primaryPieceCount !== undefined) {
      merged.primaryPieceCount = (merged.primaryPieceCount || 0) + cReport.primaryPieceCount;
    }
    if (cReport.secondaryPieceCount !== undefined) {
      merged.secondaryPieceCount = (merged.secondaryPieceCount || 0) + cReport.secondaryPieceCount;
    }

    if (cReport.colorGroups && cReport.colorGroups.length > 0) {
      cReport.colorGroups.forEach((cGroup) => {
        const existingGroup = merged.colorGroups?.find(
          (cg) => cg.color.toLowerCase() === cGroup.color.toLowerCase()
        );
        if (existingGroup) {
          existingGroup.count = (existingGroup.count || 0) + (cGroup.count || 0);
          existingGroup.netArea = (existingGroup.netArea || 0) + (cGroup.netArea || 0);
          if (cGroup.strictCutCount !== undefined) {
            existingGroup.strictCutCount = (existingGroup.strictCutCount || 0) + cGroup.strictCutCount;
          }
          if (cGroup.fractionalCutCount !== undefined) {
            existingGroup.fractionalCutCount = (existingGroup.fractionalCutCount || 0) + cGroup.fractionalCutCount;
          }
          if (cGroup.fullCount !== undefined) {
            existingGroup.fullCount = (existingGroup.fullCount || 0) + cGroup.fullCount;
          }
        } else {
          merged.colorGroups?.push({ ...cGroup });
        }
      });
    }
  });

  if (merged.colorGroups && merged.netArea && merged.netArea > 0) {
    const totalNetArea = merged.netArea;
    merged.colorGroups.forEach((cg) => {
      cg.percentage = (cg.netArea / totalNetArea) * 100;
    });
  }

  return merged;
}

/**
 * Computes project-wide totals aggregated across main area and all active sub-areas.
 */
export function computeProjectTotals(statsList: (AreaQuantityStats | null | undefined)[]): ProjectTotalsStats {
  let totalSurfaceSqFt = 0;
  let totalEffectiveSqFt = 0;
  let totalRecommendedSqFt = 0;
  let totalCost = 0;

  statsList.forEach((stat) => {
    if (stat) {
      totalSurfaceSqFt += stat.surfaceAreaSqFt;
      totalEffectiveSqFt += stat.effectiveAreaSqFt;
      totalRecommendedSqFt += stat.recommendedSqFt;
      totalCost += stat.fCost;
    }
  });

  return {
    totalSurfaceSqFt,
    totalEffectiveSqFt,
    totalRecommendedSqFt,
    totalCost,
  };
}
