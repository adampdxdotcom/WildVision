import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { computeComprehensiveStatistics } from '../utils/analytics';
import { Info, Calculator, Layers, Tag } from 'lucide-react';

export const ClientQuantitiesView: React.FC = () => {
  // Store state for layout parameters
  const wallWidth = useAppStore((state) => state.wallWidth);
  const wallHeight = useAppStore((state) => state.wallHeight);
  const shape = useAppStore((state) => state.shape);
  const tileWidth = useAppStore((state) => state.tileWidth);
  const tileHeight = useAppStore((state) => state.tileHeight);
  const pattern = useAppStore((state) => state.pattern);
  const groutWidth = useAppStore((state) => state.groutWidth);
  const offsetX = useAppStore((state) => state.offsetX);
  const offsetY = useAppStore((state) => state.offsetY);
  const subAreas = useAppStore((state) => state.subAreas);
  const angle = useAppStore((state) => state.angle);
  const wallExtensions = useAppStore((state) => state.wallExtensions);
  const isBlankCanvasMode = useAppStore((state) => state.isBlankCanvasMode);
  const wallBoundaryShape = useAppStore((state) => state.wallBoundaryShape);
  const wallArchHeight = useAppStore((state) => state.wallArchHeight);
  const wallActiveArches = useAppStore((state) => state.wallActiveArches);
  const wallArchDepth = useAppStore((state) => state.wallArchDepth);
  const wallAngle = useAppStore((state) => state.wallAngle);
  const isPicket = useAppStore((state) => state.isPicket);
  const picketLength = useAppStore((state) => state.picketLength);
  const wallVertices = useAppStore((state) => state.wallVertices);
  const activeCustomPattern = useAppStore((state) => state.activeCustomPattern);
  const flatsketVerticalRows = useAppStore((state) => state.flatsketVerticalRows);
  const flatsketHorizontalRows = useAppStore((state) => state.flatsketHorizontalRows);

  const unit = useAppStore((state) => state.unit);
  const overage = useAppStore((state) => state.overage);
  const purchasingSettings = useAppStore((state) => state.purchasingSettings);
  const reuseCuts = useAppStore((state) => state.reuseCuts);

  const mainSoldAsMosaic = useAppStore((state) => state.soldAsMosaic);
  const mainMosaicWidth = useAppStore((state) => state.mosaicWidth);
  const mainMosaicHeight = useAppStore((state) => state.mosaicHeight);
  const mainTileWidth = useAppStore((state) => state.tileWidth);
  const mainTileHeight = useAppStore((state) => state.tileHeight);

  const publicShowPricing = useAppStore((state) => state.publicShowPricing);
  const colorPattern = useAppStore((state) => state.colorPattern);

  const [activeTab, setActiveTab] = useState<string>('totals');

  // Compute stats report dynamically from layout state
  const comprehensiveReport = useMemo(() => {
    return computeComprehensiveStatistics({
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
  }, [
    wallWidth, wallHeight, shape, tileWidth, tileHeight, pattern, groutWidth,
    offsetX, offsetY, subAreas, angle, wallExtensions, isBlankCanvasMode,
    wallBoundaryShape, wallArchHeight, wallActiveArches, wallArchDepth, wallAngle,
    isPicket, picketLength, wallVertices, activeCustomPattern,
    flatsketVerticalRows, flatsketHorizontalRows
  ]);

  const { mainReport, subAreaReports = [] } = comprehensiveReport;

  const activeSa = activeTab === 'main' || activeTab === 'totals'
    ? null
    : subAreas.find((sa) => sa.id === activeTab);

  const activeChildCount = activeSa ? subAreas.filter(s => s.linkedMaterialId === activeSa.id).length : 0;

  const settings = purchasingSettings[activeTab] || {
    purchaseType: 'carton',
    sqFtPerCarton: '',
    pricePerSqFt: 0,
    pricePerSheet: 0,
  };

  const isMosaic = activeTab === 'main' ? mainSoldAsMosaic : activeSa?.soldAsMosaic === true;

  const getAggregatedReport = (tabId: string) => {
    let report = tabId === 'main'
      ? mainReport
      : (subAreaReports.find((r) => r.subAreaId === tabId)?.report || mainReport);

    const childIds = subAreas.filter(s => s.linkedMaterialId === tabId).map(s => s.id);
    if (childIds.length > 0) {
      const childReports = childIds
        .map(id => subAreaReports.find(r => r.subAreaId === id)?.report)
        .filter((r): r is NonNullable<typeof r> => Boolean(r));

      if (childReports.length > 0) {
        report = JSON.parse(JSON.stringify(report));
        if (!report.colorGroups) {
          report.colorGroups = [];
        }

        childReports.forEach((cReport) => {
          report.netArea = (report.netArea || 0) + (cReport.netArea || 0);
          report.totalTilesUsed = (report.totalTilesUsed || 0) + (cReport.totalTilesUsed || 0);
          report.fullTilesCount = (report.fullTilesCount || 0) + (cReport.fullTilesCount || 0);
          report.cutTilesCount = (report.cutTilesCount || 0) + (cReport.cutTilesCount || 0);
          if (cReport.strictCutCount !== undefined) {
            report.strictCutCount = (report.strictCutCount || 0) + cReport.strictCutCount;
          }
          if (cReport.fractionalCutCount !== undefined) {
            report.fractionalCutCount = (report.fractionalCutCount || 0) + cReport.fractionalCutCount;
          }
          if (cReport.primaryPieceCount !== undefined) {
            report.primaryPieceCount = (report.primaryPieceCount || 0) + cReport.primaryPieceCount;
          }
          if (cReport.secondaryPieceCount !== undefined) {
            report.secondaryPieceCount = (report.secondaryPieceCount || 0) + cReport.secondaryPieceCount;
          }

          if (cReport.colorGroups && cReport.colorGroups.length > 0) {
            cReport.colorGroups.forEach((cGroup) => {
              const existingGroup = report.colorGroups?.find(
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
                report.colorGroups?.push({ ...cGroup });
              }
            });
          }
        });

        if (report.colorGroups && report.netArea && report.netArea > 0) {
          const totalNetArea = report.netArea;
          report.colorGroups.forEach((cg) => {
            cg.percentage = (cg.netArea / totalNetArea) * 100;
          });
        }
      }
    }
    return report;
  };

  const activeReport = activeTab === 'totals' ? mainReport : getAggregatedReport(activeTab);

  const getAreaStats = (areaId: string) => {
    const report = getAggregatedReport(areaId);
    const sa = areaId === 'main' ? null : subAreas.find(s => s.id === areaId);
    
    const set = purchasingSettings[areaId] || {
      purchaseType: 'carton',
      sqFtPerCarton: '',
      pricePerSqFt: 0,
      pricePerSheet: 0,
    };

    const isMos = areaId === 'main' ? mainSoldAsMosaic : sa?.soldAsMosaic === true;
    const currArea = report.netArea || 0;
    const overageMult = 1 + overage / 100;
    const conversionFactor = unit === 'in' ? 144 : 929.0304;

    let sW = 12;
    let sH = 12;
    let sheetSqIn = 144;

    if (isMos) {
       sW = areaId === 'main' ? (mainMosaicWidth || 12) : (sa?.mosaicWidth || 12);
       sH = areaId === 'main' ? (mainMosaicHeight || 12) : (sa?.mosaicHeight || 12);
       sheetSqIn = sW * sH;
    } else {
       sW = areaId === 'main' ? (mainTileWidth || 6) : (sa?.tileWidth || 6);
       sH = areaId === 'main' ? (mainTileHeight || 6) : (sa?.tileHeight || 6);
       sheetSqIn = sW * sH;
    }

    const sheetSqFt = sheetSqIn / conversionFactor;
    const surfaceAreaSqFt = currArea / conversionFactor;

    let fullCount = 0;
    let cutCount = 0;
    let totalRawCount = 0;
    let effectiveAreaSqFt = surfaceAreaSqFt;
    let recQty = 0;
    let qUnit = 'Tiles';

    if (isMos) {
      fullCount = Math.floor(surfaceAreaSqFt / (sheetSqFt || 1));
      const remainingSqFt = Math.max(0, surfaceAreaSqFt - (fullCount * sheetSqFt));
      cutCount = remainingSqFt > 0.0001 ? Math.ceil(remainingSqFt / (sheetSqFt || 1)) : 0;
      totalRawCount = Math.ceil(surfaceAreaSqFt / (sheetSqFt || 1));

      const recommendedSheets = Math.ceil((surfaceAreaSqFt * overageMult) / (sheetSqFt || 1));
      recQty = recommendedSheets;
      qUnit = 'Sheets';
      effectiveAreaSqFt = recommendedSheets * sheetSqFt;
    } else {
      fullCount = report.fullTilesCount || 0;
      cutCount = Math.ceil(reuseCuts ? (report.fractionalCutCount || 0) : (report.strictCutCount || report.cutTilesCount || 0));
      const totalRawTiles = fullCount + cutCount;
      totalRawCount = totalRawTiles;

      const physicalAreaSqIn = totalRawTiles * sheetSqIn; 
      const physicalAreaSqFt = physicalAreaSqIn / conversionFactor;
      
      effectiveAreaSqFt = physicalAreaSqFt;

      if (set.purchaseType === 'sheet') {
        const recAreaSqIn = physicalAreaSqIn * overageMult;
        recQty = sheetSqIn > 0 ? Math.ceil(recAreaSqIn / sheetSqIn) : 0;
        qUnit = 'Sheets';
      } else {
        recQty = Math.ceil(totalRawTiles * overageMult);
        qUnit = 'Pieces';
      }
    }

    const isPaintPat = areaId === 'main' && colorPattern === 'paint' && !!report.colorGroups;

    const totColorCost = isPaintPat && report.colorGroups
      ? report.colorGroups.reduce((sum, g) => {
          const groupAreaSqFt = g.netArea / conversionFactor;
          const groupAreaWithOverage = groupAreaSqFt * overageMult;

          if (set.purchaseType === 'carton') {
            const cartons = set.sqFtPerCarton ? Math.ceil(groupAreaWithOverage / Number(set.sqFtPerCarton)) : 0;
            return sum + (cartons * Number(set.sqFtPerCarton) * set.pricePerSqFt);
          } else if (set.purchaseType === 'piece') {
            const pieces = Math.ceil(g.count * overageMult);
            return sum + (pieces * set.pricePerSheet);
          } else {
            const sheets = sheetSqFt > 0 ? Math.ceil(groupAreaWithOverage / sheetSqFt) : 0;
            return sum + (sheets * set.pricePerSheet);
          }
        }, 0)
      : 0;

    const normCost = set.purchaseType === 'carton'
      ? (set.sqFtPerCarton ? Math.ceil((effectiveAreaSqFt * overageMult) / Number(set.sqFtPerCarton)) * Number(set.sqFtPerCarton) * set.pricePerSqFt : 0)
      : recQty * set.pricePerSheet;

    const fCost = isPaintPat ? totColorCost : normCost;

    let ordStr = '';
    if (isPaintPat) {
      ordStr = 'Multi-color Order';
    } else {
      if (set.purchaseType === 'carton') {
        const cartons = set.sqFtPerCarton ? Math.ceil((effectiveAreaSqFt * overageMult) / Number(set.sqFtPerCarton)) : 0;
        ordStr = `${cartons} Cartons`;
      } else {
        ordStr = `${recQty} ${qUnit}`;
      }
    }
    
    const childCount = sa ? subAreas.filter(s => s.linkedMaterialId === sa.id).length : 0;
    const name = areaId === 'main' ? 'Main Wall Area' : (sa?.name || 'Accent Area');

    return {
      id: areaId,
      report,
      set,
      isMos,
      currArea,
      surfaceAreaSqFt,
      effectiveAreaSqFt,
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
      childCount
    };
  };

  const activeStats = activeTab === 'totals' ? null : getAreaStats(activeTab);
  const currentArea = activeStats ? activeStats.currArea : 0;
  const currentEffectiveAreaSqFt = activeStats ? activeStats.effectiveAreaSqFt : 0;
  const overageMultiplier = activeStats ? activeStats.overageMult : (1 + overage / 100);
  const sheetAreaSqIn = activeStats ? activeStats.sheetSqIn : 144;
  const recommendedQty = activeStats ? activeStats.recQty : 0;
  const qtyUnit = activeStats ? activeStats.qUnit : 'Pieces';
  const overflowToGrid = subAreaReports.length > 3;
  const isPaintPattern = activeStats ? activeStats.isPaintPat : false;
  const totalColorGroupCost = activeStats ? activeStats.totColorCost : 0;
  const normalCost = activeStats ? activeStats.normCost : 0;

  const allAreas: string[] = [];
  if (!isBlankCanvasMode) allAreas.push('main');
  subAreaReports.filter(report => subAreas.some(sa => sa.id === report.subAreaId && !sa.linkedMaterialId)).forEach(r => allAreas.push(r.subAreaId));
  const totalsCards = allAreas.map(getAreaStats);
  const totalCostCombined = totalsCards.reduce((sum, c) => sum + (c.fCost || 0), 0);
  const totalSqFtCombined = totalsCards.reduce((sum, c) => sum + (c.effectiveAreaSqFt || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-slate-700">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 tracking-wide font-mono uppercase">
            Material Specifications & Quantities
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
          Client Presentation Mode
        </span>
      </div>

      {/* Design Area Selector Buttons */}
      <div className="mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">
          Select Design Area
        </span>
        
        <div className="space-y-2">
          {/* Totals Button */}
          <button
            onClick={() => setActiveTab('totals')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex justify-between items-center cursor-pointer mb-2 ${
              activeTab === 'totals'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-600'
            }`}
          >
            <span>Project Totals</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === 'totals' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200/60 text-slate-500'}`}>
              All Areas
            </span>
          </button>

          {/* Main Wall Button */}
          {!isBlankCanvasMode && (
            <button
              onClick={() => setActiveTab('main')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex justify-between items-center cursor-pointer ${
                activeTab === 'main'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <span>Main Wall Area</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === 'main' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200/60 text-slate-500'}`}>
                Base
              </span>
            </button>
          )}

          {/* Sub Areas Buttons */}
          {subAreaReports.length > 0 && (
            <div className={overflowToGrid ? "grid grid-cols-2 gap-1.5" : "flex flex-wrap gap-1.5"}>
              {subAreaReports.filter(report => subAreas.some(sa => sa.id === report.subAreaId && !sa.linkedMaterialId)).map((saReport) => {
                const isSelected = activeTab === saReport.subAreaId;
                const sa = subAreas.find((s) => s.id === saReport.subAreaId);
                const isSaMosaic = sa?.soldAsMosaic === true;
                const childCount = subAreas.filter(s => s.linkedMaterialId === sa?.id).length;
                return (
                  <button
                    key={saReport.subAreaId}
                    onClick={() => setActiveTab(saReport.subAreaId)}
                    className={`flex-1 min-w-[100px] px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-600 hover:text-slate-700'
                    }`}
                  >
                    <div className="truncate font-semibold text-[11px]" title={saReport.name}>
                      {saReport.name}{childCount > 0 ? ` (+${childCount})` : ''}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {isSaMosaic ? 'Mosaic Area' : 'Accent Area'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'totals' ? (
        <div className="space-y-3 relative mt-2 text-xs">
          {totalsCards.map((c) => (
             <div
               key={c.id}
               className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-indigo-200 transition-colors cursor-pointer"
               onClick={() => setActiveTab(c.id)}
             >
               <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                 <span className="font-bold text-slate-700 text-sm">{c.name} {c.childCount > 0 ? ` (+${c.childCount})` : ''}</span>
                 {publicShowPricing && (
                   <span className="font-mono text-indigo-700 font-bold">
                     ${(c.fCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                 )}
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500 font-medium">Surface Area</span>
                 <span className="font-bold text-slate-800">{((c.effectiveAreaSqFt || 0)).toFixed(2)} sq ft</span>
               </div>
               <div className="flex justify-between items-center mt-1">
                 <span className="text-slate-500 font-medium">Estimated Order</span>
                 <span className="font-bold text-slate-800">{c.ordStr}</span>
               </div>
             </div>
          ))}
          {totalsCards.length === 0 && (
            <div className="text-center text-slate-400 py-6 font-medium text-[11px]">
               No areas available.
            </div>
          )}
          {totalsCards.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
               <span className="font-bold text-indigo-700 text-[11px] uppercase tracking-widest font-mono">
                 Grand Total Coverage
               </span>
               <div className="text-right">
                 <span className="font-mono font-bold text-slate-800 text-sm block">
                   {(totalSqFtCombined || 0).toFixed(2)} sq ft
                 </span>
                 {publicShowPricing && (
                   <span className="font-mono font-black text-indigo-700 text-lg block mt-0.5">
                     ${(totalCostCombined || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                 )}
               </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Material Breakdown Cards */}
          <div className="mt-2 space-y-3">
            <div className="grid grid-cols-2 gap-x-3 text-xs">
              <div className="space-y-3.5 text-left">
                <div className="h-6 flex items-center">
                  <span className="font-semibold text-slate-500">Total Surface Area</span>
                </div>
                
                <div className="h-6 flex items-center">
                  <span className="font-semibold text-slate-500">
                    {isMosaic ? 'Perfect Sheets Used' : 'Perfect Tiles Used'}
                  </span>
                </div>
                
                <div className="h-6 flex items-center">
                  <span className="font-semibold text-slate-500">
                    {isMosaic ? 'Cut Sheets Needed' : (reuseCuts ? 'Equivalent Cut Tiles' : 'Cut Pieces Needed')}
                  </span>
                </div>

                {(!isMosaic && activeReport.secondaryPieceCount && activeReport.secondaryPieceCount > 0) ? (
                  <>
                    <div className="h-6 flex items-center pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700">Primary Tiles</span>
                    </div>
                    <div className="h-6 flex items-center pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700">Accent/Dot Tiles</span>
                    </div>
                  </>
                ) : (
                  <div className="h-6 flex items-center pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-700">
                      {isMosaic ? 'Total Raw Sheets Equivalent' : 'Total Raw Tiles'}
                    </span>
                  </div>
                )}

                {isMosaic && activeStats && (
                  <div className="h-6 flex items-center pt-1 text-[11px] font-mono text-indigo-700 font-semibold">
                    <span>Sheet Size ({activeStats.sW}" × {activeStats.sH}")</span>
                  </div>
                )}

                <div className="flex flex-col justify-center pt-2 border-t border-slate-100 mt-2">
                  <span className="font-bold text-lg text-indigo-700 leading-tight">Recommended</span>
                  <span className="text-[11px] font-medium text-slate-400 mt-0.5">(+{overage}% Waste)</span>
                </div>
              </div>

              <div className="space-y-3.5 text-right">
                <div className="h-6 flex items-center justify-end">
                  <span className="font-bold text-slate-800">
                    {activeStats ? activeStats.surfaceAreaSqFt.toFixed(2) : (currentArea / 144).toFixed(2)} sq ft
                  </span>
                </div>
                
                <div className="h-6 flex items-center justify-end">
                  <span className="font-bold text-slate-800">
                    {activeStats ? activeStats.fullCount : activeReport.fullTilesCount}
                  </span>
                </div>
                
                <div className="h-6 flex items-center justify-end">
                  <span className="font-bold text-slate-800">
                    {activeStats ? activeStats.cutCount : Math.ceil(reuseCuts ? (activeReport.fractionalCutCount || 0) : (activeReport.strictCutCount || activeReport.cutTilesCount))}
                  </span>
                </div>

                {(!isMosaic && activeReport.secondaryPieceCount && activeReport.secondaryPieceCount > 0) ? (
                  <>
                    <div className="h-6 flex items-center justify-end pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-900">{activeReport.primaryPieceCount}</span>
                    </div>
                    <div className="h-6 flex items-center justify-end pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-900">{activeReport.secondaryPieceCount}</span>
                    </div>
                  </>
                ) : (
                  <div className="h-6 flex items-center justify-end pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-900">
                      {(activeReport.fullTilesCount || 0) + Math.ceil(reuseCuts ? (activeReport.fractionalCutCount || 0) : (activeReport.strictCutCount || activeReport.cutTilesCount || 0))}
                    </span>
                  </div>
                )}

                {isMosaic && activeStats && (
                  <div className="h-6 flex items-center justify-end pt-1 font-mono text-indigo-700 font-bold text-[11px]">
                    <span>{activeStats.sheetSqFt.toFixed(3)} sq ft / sheet</span>
                  </div>
                )}

                <div className="flex flex-col items-end justify-center pt-2 border-t border-slate-100 bg-indigo-50/40 p-2 rounded-lg px-2 mt-2">
                  <span className="font-bold text-xl text-indigo-700">
                    {((currentEffectiveAreaSqFt) * overageMultiplier).toFixed(2)} <span className="text-[12px] font-semibold">sq ft</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {recommendedQty} {qtyUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Color Group Breakdown for Paint Pattern */}
            {isPaintPattern && activeReport.colorGroups && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  Color Group Breakdown
                </span>
                <div className="space-y-1.5">
                  {activeReport.colorGroups.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded border border-slate-300 shrink-0" style={{ backgroundColor: g.color }} />
                        <span className="font-mono font-bold text-[11px]">{g.color}</span>
                      </div>
                      <div className="font-mono text-slate-600 text-[11px]">
                        <span>{(g.netArea / 144).toFixed(2)} sq ft</span>
                        <span className="mx-1.5">|</span>
                        <span>{g.count} tiles ({g.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Non-Interactive Calculation Method Badge */}
          {activeTab !== 'totals' && (
            <div className="mt-5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 font-mono flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  Calculation Method: {reuseCuts ? 'Reuse Cuts' : 'Strict Pieces'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono">
                  {reuseCuts ? 'Optimized' : 'Standard'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                {reuseCuts 
                  ? "Cut pieces are mathematically combined into full tiles with a 15% kerf penalty. This produces a lower raw material count assuming installer recycling." 
                  : "Every cut piece, regardless of size, counts as one full tile. This produces a higher raw count but ensures sufficient material even with no recycling."}
              </p>
            </div>
          )}

          {/* Purchasing & Costs Estimator Section (Only rendered if publicShowPricing is true) */}
          {publicShowPricing && (
            <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Purchasing & Costs Estimator
                </h4>
                <span className="text-[10px] bg-indigo-50 text-indigo-750 font-bold px-2.5 py-1 rounded font-mono uppercase border border-indigo-100">
                  {activeTab === 'main' ? 'Main Wall' : (activeSa?.name || 'Accent')}{activeChildCount > 0 ? ` (+${activeChildCount})` : ''}
                </span>
              </div>

              {/* Static Purchasing Unit & Saved Rates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Purchasing Unit
                  </span>
                  <span className="font-bold text-slate-800 capitalize font-mono text-xs mt-0.5 block">
                    {settings.purchaseType}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Unit Price Rate
                  </span>
                  <span className="font-bold text-indigo-700 font-mono text-xs mt-0.5 block">
                    {settings.purchaseType === 'carton' ? (
                      `$${(settings.pricePerSqFt || 0).toFixed(2)} / sq ft (${settings.sqFtPerCarton || 0} sq ft/carton)`
                    ) : settings.purchaseType === 'sheet' ? (
                      `$${(settings.pricePerSheet || 0).toFixed(2)} / sheet`
                    ) : (
                      `$${(settings.pricePerSheet || 0).toFixed(2)} / piece`
                    )}
                  </span>
                </div>
              </div>

              {/* Order & Cost Calculations Output */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs">
                {isPaintPattern && activeReport.colorGroups ? (
                  <div className="space-y-3">
                    <span className="font-semibold text-slate-500 font-mono text-[10px] uppercase tracking-wider block border-b border-indigo-100 pb-1">
                      Suggested Order by Color
                    </span>
                    <div className="space-y-2">
                      {activeReport.colorGroups.map((g, idx) => {
                        const groupAreaSqFt = g.netArea / 144;
                        const groupAreaWithOverage = groupAreaSqFt * overageMultiplier;
                        const cartons = settings.sqFtPerCarton ? Math.ceil(groupAreaWithOverage / Number(settings.sqFtPerCarton)) : 0;
                        const sheets = sheetAreaSqIn > 0 ? Math.ceil((g.netArea * overageMultiplier) / sheetAreaSqIn) : 0;
                        const pieces = Math.ceil(g.count * overageMultiplier);
                        const qtyStr = settings.purchaseType === 'carton' ? `${cartons} Cartons` : settings.purchaseType === 'piece' ? `${pieces} Pieces` : `${sheets} Sheets`;
                        const cost = settings.purchaseType === 'carton'
                          ? (cartons * Number(settings.sqFtPerCarton) * settings.pricePerSqFt)
                          : settings.purchaseType === 'piece' 
                          ? (pieces * settings.pricePerSheet)
                          : (sheets * settings.pricePerSheet);

                        return (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3.5 h-3.5 rounded border border-slate-300 shadow-2xs shrink-0" style={{ backgroundColor: g.color }} />
                              <span className="font-semibold text-slate-600 font-mono text-[11px]">{g.color}</span>
                              <span className="text-[10px] text-slate-400">({g.percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="font-mono text-slate-800 text-right text-[11px]">
                              <span className="font-bold">{qtyStr}</span>
                              <span className="text-slate-400 mx-1.5">|</span>
                              <span className="font-bold text-slate-700">${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-indigo-100 mt-2">
                      <span className="font-bold text-indigo-700 font-mono text-[11px] uppercase tracking-wider">
                        Grand Total Cost
                      </span>
                      <span className="font-mono font-black text-indigo-750 text-base">
                        ${totalColorGroupCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                        Suggested Order
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {activeStats?.ordStr || `${recommendedQty} ${qtyUnit}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-indigo-100">
                      <span className="font-bold text-indigo-700 font-mono text-[11px] uppercase tracking-wider">
                        Estimated Cost
                      </span>
                      <span className="font-mono font-black text-indigo-750 text-base">
                        ${normalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
