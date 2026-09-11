import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { computeComprehensiveStatistics } from '../utils/analytics';
import { Info, Calculator, Layers, Tag } from 'lucide-react';
import { computeAreaQuantities } from '../utils/quantityEngine';

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

  const isCutoutAccent = (sa?: any): boolean => {
    if (!sa) return false;
    return sa.isCutout === true || sa.accentType === 'cutout';
  };

  React.useEffect(() => {
    if (activeTab !== 'totals' && activeTab !== 'main') {
      const sa = subAreas.find((s) => s.id === activeTab);
      if (!sa || isCutoutAccent(sa)) {
        setActiveTab('totals');
      }
    }
  }, [activeTab, subAreas]);

  const activeSa = activeTab === 'main' || activeTab === 'totals'
    ? null
    : subAreas.find((sa) => sa.id === activeTab && !isCutoutAccent(sa));

  const activeChildCount = activeSa ? subAreas.filter(s => s.linkedMaterialId === activeSa.id && s.visible !== false && !isCutoutAccent(s)).length : 0;

  const settings = purchasingSettings[activeTab] || {
    purchaseType: 'carton',
    sqFtPerCarton: '',
    pricePerSqFt: 0,
    pricePerSheet: 0,
  };

  const isMosaic = settings.purchaseType === 'sheet' || (activeTab === 'main' ? mainSoldAsMosaic : activeSa?.soldAsMosaic === true);

  const getAggregatedReport = (tabId: string) => {
    let report = tabId === 'main'
      ? mainReport
      : (subAreaReports.find((r) => r.subAreaId === tabId)?.report || mainReport);

    const childIds = subAreas.filter(s => s.linkedMaterialId === tabId && !isCutoutAccent(s)).map(s => s.id);
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

    return computeAreaQuantities({
      areaId,
      report,
      settings: set,
      overage,
      reuseCuts,
      unit,
      mainSoldAsMosaic,
      subArea: sa,
      mainTileWidth,
      mainTileHeight,
      mainMosaicWidth,
      mainMosaicHeight,
      colorPattern,
      subAreas,
    });
  };

  const getGroupAreaBreakdown = (areaId: string) => {
    const conversionFactor = unit === 'in' ? 144 : 929.0304;
    const overageMult = 1 + overage / 100;

    let parentName = '';
    let parentNetArea = 0;

    if (areaId === 'main') {
      parentName = 'Main Wall Area';
      parentNetArea = mainReport.netArea || 0;
    } else {
      const sa = subAreas.find(s => s.id === areaId);
      parentName = sa?.name || 'Accent Profile';
      const saRep = subAreaReports.find(r => r.subAreaId === areaId)?.report;
      parentNetArea = saRep?.netArea || 0;
    }

    const parentNetSqFt = parentNetArea / conversionFactor;

    const linkedChildren = subAreas.filter(
      s => s.linkedMaterialId === areaId && s.visible !== false && !isCutoutAccent(s)
    );

    const childItems = linkedChildren.map(c => {
      const cRep = subAreaReports.find(r => r.subAreaId === c.id)?.report;
      const cNetArea = cRep?.netArea || 0;
      const cNetSqFt = cNetArea / conversionFactor;
      return {
        id: c.id,
        name: c.name || 'Child Accent',
        isParent: false,
        netAreaSqFt: cNetSqFt,
        percentage: 0,
      };
    });

    const totalNetSqFt = parentNetSqFt + childItems.reduce((sum, item) => sum + item.netAreaSqFt, 0);
    const totalWithWasteSqFt = totalNetSqFt * overageMult;

    const parentItem = {
      id: areaId,
      name: parentName,
      isParent: true,
      netAreaSqFt: parentNetSqFt,
      percentage: totalNetSqFt > 0 ? (parentNetSqFt / totalNetSqFt) * 100 : 100,
    };

    childItems.forEach(item => {
      item.percentage = totalNetSqFt > 0 ? (item.netAreaSqFt / totalNetSqFt) * 100 : 0;
    });

    return {
      parentName,
      items: [parentItem, ...childItems],
      parentNetSqFt,
      childItems,
      totalNetSqFt,
      totalWithWasteSqFt,
      hasChildren: childItems.length > 0,
    };
  };

  const activeStats = activeTab === 'totals' ? null : getAreaStats(activeTab);
  const activeGroupBreakdown = activeTab === 'totals' ? null : getGroupAreaBreakdown(activeTab);
  const mainChildCount = subAreas.filter(s => s.linkedMaterialId === 'main' && s.visible !== false && !isCutoutAccent(s)).length;
  const currentArea = activeStats ? activeStats.currArea : 0;
  const currentEffectiveAreaSqFt = activeStats ? activeStats.effectiveAreaSqFt : 0;
  const overageMultiplier = activeStats ? activeStats.overageMult : (1 + overage / 100);
  const sheetAreaSqIn = activeStats ? activeStats.sheetSqIn : 144;
  const recommendedQty = activeStats ? activeStats.recQty : 0;
  const qtyUnit = activeStats ? activeStats.qUnit : 'Pieces';

  const validSubAreaReports = subAreaReports.filter(report =>
    subAreas.some(sa => sa.id === report.subAreaId && !sa.linkedMaterialId && !isCutoutAccent(sa))
  );
  const overflowToGrid = validSubAreaReports.length > 3;
  const isPaintPattern = activeStats ? activeStats.isPaintPat : false;
  const totalColorGroupCost = activeStats ? activeStats.totColorCost : 0;
  const normalCost = activeStats ? activeStats.normCost : 0;

  const allAreas: string[] = [];
  if (!isBlankCanvasMode) allAreas.push('main');
  validSubAreaReports.forEach(r => allAreas.push(r.subAreaId));
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
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate">Main Wall Area</span>
                {mainChildCount > 0 && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                    +{mainChildCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${activeTab === 'main' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200/60 text-slate-500'}`}>
                Base
              </span>
            </button>
          )}

          {/* Sub Areas Buttons */}
          {validSubAreaReports.length > 0 && (
            <div className={overflowToGrid ? "grid grid-cols-2 gap-1.5" : "flex flex-wrap gap-1.5"}>
              {validSubAreaReports.map((saReport) => {
                const isSelected = activeTab === saReport.subAreaId;
                const sa = subAreas.find((s) => s.id === saReport.subAreaId);
                const isSaMosaic = sa?.soldAsMosaic === true;
                const childCount = subAreas.filter(s => s.linkedMaterialId === sa?.id && s.visible !== false && !isCutoutAccent(s)).length;
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
          {totalsCards.map((c) => {
             const b = getGroupAreaBreakdown(c.id);
             return (
               <div
                 key={c.id}
                 className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-indigo-200 transition-colors cursor-pointer"
                 onClick={() => setActiveTab(c.id)}
               >
                 <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <span className="font-bold text-slate-700 text-sm truncate">{c.name}</span>
                     {c.childCount > 0 && (
                       <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                         +{c.childCount} linked
                       </span>
                     )}
                   </div>
                   {publicShowPricing && (
                     <span className="font-mono text-indigo-700 font-bold shrink-0">
                       ${(c.fCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                   )}
                 </div>

                 {b.hasChildren ? (
                   <div className="space-y-1.5 mb-2.5 bg-slate-50/80 p-2.5 rounded border border-slate-100 text-[11px]">
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex justify-between pb-1 border-b border-slate-200/60">
                       <span>Group Area Breakdown</span>
                       <span>Net Area</span>
                     </div>
                     {b.items.map((item) => (
                       <div key={item.id} className="flex justify-between items-center text-slate-600">
                         <span className={`truncate max-w-[170px] ${item.isParent ? 'font-semibold text-slate-800' : 'pl-2 text-slate-600'}`}>
                           {item.isParent ? `${item.name} (Parent)` : `↳ ${item.name}`}
                         </span>
                         <span className="font-mono font-medium text-slate-700">
                           {item.netAreaSqFt.toFixed(2)} sq ft
                         </span>
                       </div>
                     ))}
                     <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60 font-bold text-slate-800">
                       <span>Combined Net Total</span>
                       <span className="font-mono text-indigo-700">{b.totalNetSqFt.toFixed(2)} sq ft</span>
                     </div>
                   </div>
                 ) : (
                   <div className="flex justify-between items-center">
                     <span className="text-slate-500 font-medium">Surface Area</span>
                     <span className="font-bold text-slate-800">{((c.effectiveAreaSqFt || 0)).toFixed(2)} sq ft</span>
                   </div>
                 )}

                 <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                   <span className="text-slate-500 font-medium">
                     {b.hasChildren ? 'Estimated Order (Total)' : 'Estimated Order'}
                   </span>
                   <span className="font-bold text-slate-800 font-mono">{c.ordStr}</span>
                 </div>
               </div>
             );
          })}
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
          {/* Surface Area Breakdown for Parent + Children */}
          {activeGroupBreakdown && activeGroupBreakdown.hasChildren && (
            <div className="mt-2 mb-3 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Surface Area Breakdown
                  </span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded font-mono">
                    Parent + {activeGroupBreakdown.items.length - 1} Linked {activeGroupBreakdown.items.length - 1 === 1 ? 'Child' : 'Children'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Shared Material
                </span>
              </div>

              <div className="divide-y divide-slate-200/70 text-xs">
                {activeGroupBreakdown.items.map((item) => (
                  <div key={item.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.isParent ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded shrink-0 font-mono">
                          Parent
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-600 pl-2 shrink-0">
                          ↳
                        </span>
                      )}
                      <span className={`truncate ${item.isParent ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-slate-800">
                        {item.netAreaSqFt.toFixed(2)} sq ft
                      </span>
                      <span className="text-slate-400 text-[10px] w-9 text-right">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold">Combined Net Surface Area</span>
                  <span className="font-bold text-slate-800">{activeGroupBreakdown.totalNetSqFt.toFixed(2)} sq ft</span>
                </div>
                <div className="flex justify-between items-center bg-indigo-50/70 px-2 py-1 rounded text-indigo-900">
                  <span className="font-bold">Total with +{overage}% Waste</span>
                  <span className="font-black text-indigo-700">{activeGroupBreakdown.totalWithWasteSqFt.toFixed(2)} sq ft</span>
                </div>
              </div>
            </div>
          )}

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
                      {isMosaic ? 'Total Raw Sheets' : 'Total Raw Tiles'}
                    </span>
                  </div>
                )}

                {isMosaic && activeStats && (
                  <div className="h-6 flex items-center pt-1 text-[11px] font-mono text-indigo-700 font-semibold">
                    <span>
                      {activeStats.sheetInputMode === 'sqft'
                        ? `Sheet Coverage (${activeStats.sheetSqFt.toFixed(3)} sq ft)`
                        : `Sheet Size (${activeStats.sW}" × ${activeStats.sH}")`}
                    </span>
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
                      {activeStats ? activeStats.totalRawCount : ((activeReport.fullTilesCount || 0) + Math.ceil(reuseCuts ? (activeReport.fractionalCutCount || 0) : (activeReport.strictCutCount || activeReport.cutTilesCount || 0)))}
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
                    {(activeStats ? activeStats.recommendedSqFt : (currentEffectiveAreaSqFt * overageMultiplier)).toFixed(2)} <span className="text-[12px] font-semibold">sq ft</span>
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
          {activeTab !== 'totals' && !isMosaic && (
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
                      <div>
                        <span className="font-semibold text-slate-500 font-mono text-[11px] uppercase tracking-wider block">
                          Suggested Order
                        </span>
                        {activeGroupBreakdown && activeGroupBreakdown.hasChildren && (
                          <span className="text-[10px] text-indigo-600 font-medium block">
                            Calculated on combined total ({activeGroupBreakdown.totalWithWasteSqFt.toFixed(2)} sq ft)
                          </span>
                        )}
                      </div>
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
