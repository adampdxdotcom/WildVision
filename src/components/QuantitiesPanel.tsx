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

  const [activeTab, setActiveTab] = React.useState<string>('main');

  const activeSa = activeTab === 'main'
    ? null
    : subAreas.find((sa) => sa.id === activeTab);

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

  const activeReport = activeTab === 'main'
    ? mainReport
    : (subAreaReports.find((r) => r.subAreaId === activeTab)?.report || mainReport);

  const currentArea = activeReport.netArea || 0;

  const areaLabel = unit === 'in' ? 'sq in' : 'sq cm';
  const overageMultiplier = 1 + overage / 100;

  let sheetAreaSqIn = 144;
  if (isMosaic) {
     const sW = activeTab === 'main' ? (mainMosaicWidth || 12) : (activeSa?.mosaicWidth || 12);
     const sH = activeTab === 'main' ? (mainMosaicHeight || 12) : (activeSa?.mosaicHeight || 12);
     sheetAreaSqIn = sW * sH;
  } else {
     const tW = activeTab === 'main' ? (mainTileWidth || 6) : (activeSa?.tileWidth || 6);
     const tH = activeTab === 'main' ? (mainTileHeight || 6) : (activeSa?.tileHeight || 6);
     sheetAreaSqIn = tW * tH;
  }

  let recommendedQty = 0;
  let qtyUnit = 'Tiles';

  if (settings.purchaseType === 'sheet') {
    const recommendedAreaSqIn = currentArea * overageMultiplier;
    recommendedQty = sheetAreaSqIn > 0 ? Math.ceil(recommendedAreaSqIn / sheetAreaSqIn) : 0;
    qtyUnit = 'Sheets';
  } else if (settings.purchaseType === 'piece') {
    recommendedQty = Math.ceil(activeReport.totalTilesUsed * overageMultiplier);
    qtyUnit = 'Pieces';
  } else {
    recommendedQty = Math.ceil(activeReport.totalTilesUsed * overageMultiplier);
    qtyUnit = 'Pieces';
  }

  const overflowToGrid = subAreaReports.length > 3;

  const isPaintPattern = activeTab === 'main' && useAppStore.getState().colorPattern === 'paint' && !!activeReport.colorGroups;

  const totalColorGroupCost = isPaintPattern && activeReport.colorGroups
    ? activeReport.colorGroups.reduce((sum, g) => {
        const groupAreaSqFt = g.netArea / 144;
        const groupAreaWithOverage = groupAreaSqFt * overageMultiplier;
        if (settings.purchaseType === 'carton') {
          const cartons = settings.sqFtPerCarton ? Math.ceil(groupAreaWithOverage / Number(settings.sqFtPerCarton)) : 0;
          return sum + (cartons * Number(settings.sqFtPerCarton) * settings.pricePerSqFt);
        } else if (settings.purchaseType === 'piece') {
          const pieces = Math.ceil(g.count * overageMultiplier);
          return sum + (pieces * settings.pricePerSheet);
        } else {
          const sheets = sheetAreaSqIn > 0 ? Math.ceil((g.netArea * overageMultiplier) / sheetAreaSqIn) : 0;
          return sum + (sheets * settings.pricePerSheet);
        }
      }, 0)
    : 0;

  const normalCost = settings.purchaseType === 'carton'
    ? (settings.sqFtPerCarton ? Math.ceil((currentArea / 144) / Number(settings.sqFtPerCarton)) * Number(settings.sqFtPerCarton) * settings.pricePerSqFt : 0)
    : recommendedQty * settings.pricePerSheet;

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
        qty = Math.ceil(((currentArea / 144) * overageMultiplier) / Number(settings.sqFtPerCarton));
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

      {subAreaReports.length > 0 && (
        <div className="mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            Select Design Area
          </span>
          
          <div className="space-y-2">
            {/* Main Wall button */}
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

            {/* Grid or Flex wrap depending on count of sub-area reports */}
            <div className={overflowToGrid ? "grid grid-cols-2 gap-1.5" : "flex flex-wrap gap-1.5"}>
              {subAreaReports.filter(report => subAreas.some(sa => sa.id === report.subAreaId)).map((saReport) => {
                const isSelected = activeTab === saReport.subAreaId;
                const sa = subAreas.find((s) => s.id === saReport.subAreaId);
                const isSaMosaic = sa?.soldAsMosaic === true;
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
                      {saReport.name}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {isSaMosaic ? 'Mosaic Area' : 'Accent Area'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
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
                {isMosaic ? 'Cut Sheets Need' : 'Cut Tiles Need'}
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
                  {isMosaic ? 'Total Raw Sheets equivalent' : 'Total Raw Tiles'}
                </span>
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
              <span className="font-bold text-slate-800">{(currentArea / 144).toFixed(2)} sq ft</span>
            </div>
            
            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{activeReport.fullTilesCount}</span>
            </div>
            
            <div className="h-6 flex items-center justify-end">
              <span className="font-bold text-slate-800">{activeReport.cutTilesCount}</span>
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
                <span className="font-bold text-slate-900">{activeReport.totalTilesUsed}</span>
              </div>
            )}

            <div className="flex flex-col items-end justify-center pt-2 border-t border-slate-100 bg-indigo-50/40 p-2 rounded-lg px-2 mt-2">
              <span className="font-bold text-xl text-indigo-700">
                {((currentArea / 144) * overageMultiplier).toFixed(2)} <span className="text-[12px] font-semibold">sq ft</span>
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

      {/* Purchasing & Cost Calculations Section */}
      <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
            Purchasing & Costs Estimator
          </h4>
          <span className="text-[10px] bg-indigo-50 text-indigo-750 font-bold px-2.5 py-1 rounded font-mono uppercase border border-indigo-100">
            {activeTab === 'main' ? 'Main Wall' : (activeSa?.name || 'Accent')}
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
                  {settings.purchaseType === 'carton' 
                    ? `${settings.sqFtPerCarton ? Math.ceil((currentArea / 144) / Number(settings.sqFtPerCarton)) : 0} Cartons` 
                    : `${recommendedQty} Sheets`}
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
    </div>
  );
};
