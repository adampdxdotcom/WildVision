import React from 'react';
import { ComprehensiveReport, MeasurementUnit } from '../types';
import { getPolygonArea, getTrueArea } from '../utils/geometry';
import { HelpCircle, Lock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';

interface QuantitiesPanelProps {
  comprehensiveReport: ComprehensiveReport;
  wallWidth: number;
  wallHeight: number;
  wallVertices?: {x: number, y: number}[];
  unit: MeasurementUnit;
  overage: number;
}

export const QuantitiesPanel: React.FC<QuantitiesPanelProps> = ({
  comprehensiveReport,
  wallWidth,
  wallHeight,
  wallVertices,
  unit,
  overage,
}) => {
  const { mainReport, subAreaReports = [] } = comprehensiveReport;
  const subAreas = useAppStore((state) => state.subAreas);
  const purchasingSettings = useAppStore((state) => state.purchasingSettings);
  const updatePurchasingSetting = useAppStore((state) => state.updatePurchasingSetting);

  // Integration store fields
  const subfloorApiKey = useAuthStore((state) => state.subfloor_api_key);
  const linkedSubfloorProjectId = useAppStore((state) => state.linkedSubfloorProjectId);
  const integrationData = useAppStore((state) => state.integrationData);
  const subfloorProducts = useAppStore((state) => state.subfloorProducts);
  const pushEstimateToSubfloor = useAppStore((state) => state.pushEstimateToSubfloor);
  const isPushingEstimate = useAppStore((state) => state.isPushingEstimate);
  const isEstimateLocked = useAppStore((state) => state.isEstimateLocked);

  const { user, openAuthModal, showToast } = useAuthStore();

  const isBlankCanvasMode = useAppStore(state => state.isBlankCanvasMode);
  const reuseCuts = useAppStore(state => state.reuseCuts);
  const setReuseCuts = useAppStore(state => state.setReuseCuts);
  const [activeTab, setActiveTab] = React.useState<string>('totals');

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

  const mainSoldAsMosaic = useAppStore(state => state.soldAsMosaic);
  const mainMosaicWidth = useAppStore(state => state.mosaicWidth);
  const mainMosaicHeight = useAppStore(state => state.mosaicHeight);
  const mainTileWidth = useAppStore(state => state.tileWidth);
  const mainTileHeight = useAppStore(state => state.tileHeight);
  
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

  let activeReport = activeTab === 'totals' ? mainReport : getAggregatedReport(activeTab);

  const getAreaStats = (areaId) => {
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
      // Mosaic Sheet Math based on Square Feet:
      // sheetSqFt = (mosaicWidth * mosaicHeight) / conversionFactor
      // fullCount (Perfect Sheets Used) = Math.floor(surfaceAreaSqFt / sheetSqFt)
      // cutCount (Cut Sheets Needed) = remainder > 0 ? Math.ceil(remainder / sheetSqFt) : 0
      // totalRawCount (Total Raw Sheets) = Math.ceil(surfaceAreaSqFt / sheetSqFt)
      fullCount = Math.floor(surfaceAreaSqFt / (sheetSqFt || 1));
      const remainingSqFt = Math.max(0, surfaceAreaSqFt - (fullCount * sheetSqFt));
      cutCount = remainingSqFt > 0.0001 ? Math.ceil(remainingSqFt / (sheetSqFt || 1)) : 0;
      totalRawCount = Math.ceil(surfaceAreaSqFt / (sheetSqFt || 1));

      const recommendedSheets = Math.ceil((surfaceAreaSqFt * overageMult) / (sheetSqFt || 1));
      recQty = recommendedSheets;
      qUnit = 'Sheets';
      effectiveAreaSqFt = recommendedSheets * sheetSqFt;
    } else {
      // Standard Tile Math
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

    const isPaintPat = areaId === 'main' && useAppStore.getState().colorPattern === 'paint' && !!report.colorGroups;

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
  const areaLabel = unit === 'in' ? 'sq in' : 'sq cm';
  const overageMultiplier = activeStats ? activeStats.overageMult : (1 + overage / 100);
  const sheetAreaSqIn = activeStats ? activeStats.sheetSqIn : 144;
  const recommendedQty = activeStats ? activeStats.recQty : 0;
  const qtyUnit = activeStats ? activeStats.qUnit : 'Pieces';
  const overflowToGrid = subAreaReports.length > 3;
  const isPaintPattern = activeStats ? activeStats.isPaintPat : false;
  const totalColorGroupCost = activeStats ? activeStats.totColorCost : 0;
  const normalCost = activeStats ? activeStats.normCost : 0;
  
  const allAreas = [];
  if (!isBlankCanvasMode) allAreas.push('main');
  subAreaReports.filter(report => subAreas.some(sa => sa.id === report.subAreaId && !sa.linkedMaterialId)).forEach(r => allAreas.push(r.subAreaId));
  const totalsCards = allAreas.map(getAreaStats);
  const totalCostCombined = totalsCards.reduce((sum, c) => sum + (c.fCost || 0), 0);
  

  const handleExportToSubfloor = async () => {
    if (linkedSubfloorProjectId === null) return;

    const lineItems: any[] = [];

    if (isPaintPattern && activeReport.colorGroups) {
      activeReport.colorGroups.forEach(g => {
        const groupAreaSqFt = g.netArea / 144;
        const groupAreaWithOverage = groupAreaSqFt * overageMultiplier;
        
        let qty = 0;
        let unit = 'SF';
        
        if (settings.purchaseType === 'carton' && settings.sqFtPerCarton) {
          qty = Math.ceil(groupAreaWithOverage / Number(settings.sqFtPerCarton));
          unit = 'Carton';
        } else if (settings.purchaseType === 'piece') {
          qty = Math.ceil(g.count * overageMultiplier);
          unit = 'Piece';
        } else {
          qty = sheetAreaSqIn > 0 ? Math.ceil((g.netArea * overageMultiplier) / sheetAreaSqIn) : 0;
          unit = 'Sheet';
        }

        const matchedProduct = subfloorProducts.find(p => p.hex_color?.toLowerCase() === g.color.toLowerCase());
        const variantId = matchedProduct?.variant_id || integrationData?.variant_id || 'unknown';

        lineItems.push({
          variantId,
          quantity: qty,
          unit
        });
      });
    } else {
      let qty = 0;
      let unit = 'SF';
      
      if (settings.purchaseType === 'carton' && settings.sqFtPerCarton) {
        qty = Math.ceil((currentEffectiveAreaSqFt * overageMultiplier) / Number(settings.sqFtPerCarton));
        unit = 'Carton';
      } else if (settings.purchaseType === 'piece') {
        qty = Math.ceil(recommendedQty);
        unit = 'Piece';
      } else {
        qty = Math.ceil(recommendedQty);
        unit = 'Sheet';
      }

      lineItems.push({
        variantId: integrationData?.variant_id || 'unknown',
        quantity: qty,
        unit
      });
    }

    const payload = {
      lineItems
    };

    const success = await pushEstimateToSubfloor(payload);
    if (success) {
      showToast('Successfully exported estimates to Subfloor!', 'success');
    } else {
      const { useAppStore } = await import('../store/useAppStore');
      const errorMsg = useAppStore.getState().pushEstimateError || 'Failed to export estimates to Subfloor.';
      showToast(errorMsg, 'error');
    }
  };

  return (
    <div className="bg-white rounded border border-slate-200 shadow-sm p-4 text-slate-700">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 group relative">
          <div className="flex items-center gap-1 cursor-help">
            <h3 className="text-sm font-bold text-slate-800">Material Quantities</h3>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
          </div>

          {/* Tooltip */}
          <div className="absolute top-full left-0 mt-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none leading-relaxed font-normal normal-case">
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
            This area shows general quantities of tile for each area. Please double check these quantities against your own calculations.
          </div>
        </div>
      </div>

        <div className="mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            Select Design Area
          </span>
          
          <div className="space-y-2">
            {/* Totals button */}
            <button
              onClick={() => setActiveTab('totals')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold border transition-all flex justify-between items-center cursor-pointer mb-2 ${
                activeTab === 'totals'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <span>Project Totals</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === 'totals' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200/60 text-slate-500'}`}>
                All
              </span>
            </button>

            {/* Main Wall button */}
            {!isBlankCanvasMode && (
              <button
                onClick={() => setActiveTab('main')}
                className={`w-full text-left px-3 py-2 rounded text-xs font-semibold border transition-all flex justify-between items-center cursor-pointer ${
                  activeTab === 'main'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70 text-slate-600'
                }`}
              >
                <span>Main Wall Area</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === 'main' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200/60 text-slate-500'}`}>
                  Base
                </span>
              </button>
            )}

            {/* Grid or Flex wrap depending on count of sub-area reports */}
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
                      className={`flex-1 min-w-[100px] px-2.5 py-2 rounded text-xs font-medium border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold'
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70 text-slate-600 hover:text-slate-700'
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
             <div key={c.id} className="p-3 bg-white border border-slate-150 rounded-lg shadow-sm hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => setActiveTab(c.id)}>
               <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                 <span className="font-bold text-slate-700 text-sm">{c.name} {c.childCount > 0 ? ` (+${c.childCount})` : ''}</span>
                 <span className="font-mono text-indigo-700 font-bold">${(c.fCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500 font-medium">Area</span>
                 <span className="font-bold text-slate-800">{((c.effectiveAreaSqFt || 0)).toFixed(2)} sq ft</span>
               </div>
               <div className="flex justify-between items-center mt-1">
                 <span className="text-slate-500 font-medium">Suggested Order</span>
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
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50">
               <span className="font-bold text-indigo-700 text-[11px] uppercase tracking-widest font-mono">Grand Total</span>
               <span className="font-mono font-black text-indigo-750 text-xl">${(totalCostCombined || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

        {/* Lock Overlay (only if guest) */}
        {!user && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center p-3 text-center z-10">
            <div className="bg-white/95 border border-slate-200 p-4 rounded-xl shadow-lg max-w-[210px] flex flex-col items-center gap-2.5 text-slate-800">
              <div className="p-1.5 bg-indigo-50 rounded-full text-indigo-600">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
                Create a free account to unlock material estimations and cut sheets.
              </p>
              <button
                type="button"
                onClick={() => openAuthModal("Log in to unlock precise material estimations.")}
                className="w-full text-[10.5px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg shadow-sm transition cursor-pointer shrink-0"
              >
                Unlock Estimator
              </button>
            </div>
          </div>
        )}
        </div>
      ) : (
      <>
      <div className="relative mt-2">
        <div className="grid grid-cols-2 gap-x-3 text-xs mb-4">
          {/* Column 1: Labels (Crisp and Unblurred) */}
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

          {/* Column 2: Calculated results (blurred if Guest) */}
          <div className={`space-y-3.5 text-right transition-all duration-300 ${!user ? 'blur-md select-none pointer-events-none opacity-40' : ''}`}>
            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{activeStats ? activeStats.surfaceAreaSqFt.toFixed(2) : (currentArea / 144).toFixed(2)} sq ft</span>
            </div>
            
            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{activeStats ? activeStats.fullCount : activeReport.fullTilesCount}</span>
            </div>
            
            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{activeStats ? activeStats.cutCount : Math.ceil(reuseCuts ? (activeReport.fractionalCutCount || 0) : (activeReport.strictCutCount || activeReport.cutTilesCount))}</span>
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
                <span className="font-bold text-slate-900">{(activeReport.fullTilesCount || 0) + Math.ceil(reuseCuts ? (activeReport.fractionalCutCount || 0) : (activeReport.strictCutCount || activeReport.cutTilesCount || 0))}</span>
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

        {isPaintPattern && activeReport.colorGroups && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Color Group Breakdown</span>
            <div className="space-y-1.5">
              {activeReport.colorGroups.map((g, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border border-slate-350 shrink-0" style={{ backgroundColor: g.color }} />
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

        {/* Lock Overlay (only if guest) */}
        {!user && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center p-3 text-center z-10">
            <div className="bg-white/95 border border-slate-200 p-4 rounded-xl shadow-lg max-w-[210px] flex flex-col items-center gap-2.5 text-slate-800">
              <div className="p-1.5 bg-indigo-50 rounded-full text-indigo-600">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
                Create a free account to unlock material estimations and cut sheets.
              </p>
              <button
                type="button"
                onClick={() => openAuthModal("Log in to unlock precise material estimations.")}
                className="w-full text-[10.5px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg shadow-sm transition cursor-pointer shrink-0"
              >
                Unlock Estimator
              </button>
            </div>
          </div>
        )}
      </div>

            {/* Tile Count Method Toggle */}
      {activeTab !== 'totals' && (
         <div className="mt-5 mb-1 px-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] font-bold text-slate-700 tracking-wide font-mono">
                Calculation Method: Strict Pieces vs. Reuse Cuts
              </span>
              <div className="relative flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setReuseCuts(false)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${!reuseCuts ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Strict Pieces
                </button>
                <button
                  type="button"
                  onClick={() => setReuseCuts(true)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${reuseCuts ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Reuse Cuts
                </button>
              </div>
            </label>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
               {reuseCuts 
                  ? "Cut pieces are mathematically combined into full tiles with a 15% kerf penalty. This produces a lower raw material count assuming perfect installer recycling." 
                  : "Every cut piece, regardless of size, counts as one full tile. This produces a higher raw count but ensures you have enough material even with no recycling."}
            </p>
         </div>
      )}

      {/* Purchasing & Cost Calculations Section */}
      <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
            Purchasing & Costs Estimator
          </h4>
          <span className="text-[10px] bg-indigo-50 text-indigo-750 font-bold px-2.5 py-1 rounded font-mono uppercase border border-indigo-100">
            {activeTab === 'main' ? 'Main Wall' : (activeSa?.name || 'Accent')}{activeChildCount > 0 ? ` (+${activeChildCount})` : ''}
          </span>
        </div>

        {/* Purchasing Unit Toggle */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Purchasing Unit
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 border border-slate-155 rounded-lg">
            <button
              type="button"
              onClick={() => updatePurchasingSetting(activeTab, { purchaseType: 'carton' })}
              className={`py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                settings.purchaseType === 'carton'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Carton
            </button>
            <button
              type="button"
              onClick={() => updatePurchasingSetting(activeTab, { purchaseType: 'sheet' })}
              className={`py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                settings.purchaseType === 'sheet'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sheet
            </button>
            <button
              type="button"
              onClick={() => updatePurchasingSetting(activeTab, { purchaseType: 'piece' })}
              className={`py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                settings.purchaseType === 'piece'
                  ? 'bg-white text-indigo-750 shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Piece
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-2 gap-3">
          {settings.purchaseType === 'carton' ? (
            <>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Sq Ft Per Carton
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={settings.sqFtPerCarton || ''}
                  onChange={(e) => updatePurchasingSetting(activeTab, { sqFtPerCarton: e.target.value === '' ? '' : Math.max(0.1, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-slate-50 text-slate-800 text-xs border border-slate-250 rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 focus:bg-white transition font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Price Per Sq Ft
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={settings.pricePerSqFt || ''}
                    onChange={(e) => updatePurchasingSetting(activeTab, { pricePerSqFt: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-slate-50 text-slate-800 text-xs border border-slate-250 rounded-lg pl-6 pr-2.5 py-2 outline-none focus:border-indigo-500 focus:bg-white transition font-mono font-medium"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                {settings.purchaseType === 'piece' ? 'Price Per Piece' : 'Price Per Sheet'}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={settings.pricePerSheet || ''}
                  onChange={(e) => updatePurchasingSetting(activeTab, { pricePerSheet: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-slate-50 text-slate-800 text-xs border border-slate-250 rounded-lg pl-6 pr-2.5 py-2 outline-none focus:border-indigo-500 focus:bg-white transition font-mono font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Real-time Ordering & Cost Calculations */}
        <div className={`mt-3 p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl space-y-1.5 text-xs transition-all duration-300 ${!user ? 'blur-md select-none pointer-events-none opacity-40' : ''}`}>
          {isPaintPattern && activeReport.colorGroups ? (
            <div className="space-y-3">
              <span className="font-semibold text-slate-500 font-mono text-[10px] uppercase tracking-wider block border-b border-indigo-100/30 pb-1">Suggested Order by Color</span>
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
                        <div className="w-3.5 h-3.5 rounded border border-slate-350 shadow-sm shrink-0" style={{ backgroundColor: g.color }} />
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
              <div className="flex justify-between items-center pt-2.5 border-t border-indigo-100/30 mt-2">
                <span className="font-bold text-indigo-700 font-mono text-[11px] uppercase tracking-wider">Grand Total Cost</span>
                <span className="font-mono font-black text-indigo-750 text-base">
                  ${totalColorGroupCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 font-mono text-[11px] uppercase tracking-wider">Suggested Order</span>
                <span className="font-mono font-black text-slate-800 text-sm">
                  {activeStats?.ordStr || `${recommendedQty} ${qtyUnit}`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-indigo-100/30">
                <span className="font-bold text-indigo-700 font-mono text-[11px] uppercase tracking-wider">Estimated Cost</span>
                <span className="font-mono font-black text-indigo-750 text-base">
                  ${normalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Export to Subfloor Button */}
        {subfloorApiKey && (
          <div className="pt-2">
            {isEstimateLocked && (
              <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[10px] font-semibold leading-snug flex gap-1.5">
                <span className="text-amber-500">⚠️</span>
                <span>Subfloor has already purchased materials for this project. Estimate updates are disabled.</span>
              </div>
            )}
            <button
              type="button"
              disabled={isPushingEstimate || linkedSubfloorProjectId === null || isEstimateLocked}
              onClick={handleExportToSubfloor}
              title={linkedSubfloorProjectId === null ? "Link a Subfloor project to enable syncing." : undefined}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-lg text-xs font-bold text-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${
                linkedSubfloorProjectId === null || isEstimateLocked
                  ? 'bg-slate-300 text-slate-500 border-slate-200 cursor-not-allowed opacity-60'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              {isPushingEstimate ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting to Subfloor...
                </>
              ) : (
                isEstimateLocked ? 'Order Locked' : (linkedSubfloorProjectId === null ? 'Link Subfloor Project to Sync' : 'Export Estimates to Subfloor')
              )}
            </button>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
