import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ArrowLeft, Info, FileDown, Lock } from 'lucide-react';

export interface ExportPanelProps {
  handleExportPDF?: (outputMode?: 'download' | 'base64') => Promise<string | void> | void;
  setActiveTab2: (tabId: number) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  handleExportPDF,
  setActiveTab2
}) => {
  const {
    projectName,
    wallWidth,
    wallHeight,
    unit,
    tileWidth,
    tileHeight,
    shape,
    viewSettings,
    updateViewSetting,
    angleDisplayMode,
    setAngleDisplayMode,
    linkedSubfloorProjectId,
    isPushingDocument,
    pushDocumentToSubfloor
  } = useAppStore();

  const { user, openAuthModal, showToast } = useAuthStore();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handlePdfTrigger = async () => {
    setIsExporting(true);
    try {
      await handleExportPDF?.('download');
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePushToSubfloor = async () => {
    if (!linkedSubfloorProjectId) return;
    try {
      const pdfBase64 = await handleExportPDF?.('base64');
      if (typeof pdfBase64 === 'string') {
        const filename = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'tile_layout'}.pdf`;
        const success = await pushDocumentToSubfloor(pdfBase64, filename);
        if (success) {
          showToast('Successfully saved PDF to Subfloor project!', 'success');
        } else {
          showToast('Failed to save PDF to Subfloor.', 'error');
        }
      }
    } catch (err) {
      console.error("PDF push failed", err);
      showToast('Failed to generate or push PDF.', 'error');
    }
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-5 animate-fade-in text-slate-700">
      {/* Header section with back button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-150">
        <button
          type="button"
          onClick={() => setActiveTab2(1)}
          disabled={isExporting}
          className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-650 transition text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Editing</span>
        </button>
        <span className="text-[10px] uppercase font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-wide">
          Export Options
        </span>
      </div>

      {/* Document Details Info Section */}
      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
          <Info className="w-3.5 h-3.5 text-indigo-550 shrink-0" />
          <span>PDF Document Export</span>
        </div>
        <p className="text-[10.5px] text-indigo-950 font-medium leading-relaxed font-sans">
          Set up your document configuration and pagination layout details to generate a highly detailed, professional tile laying job blueprint report.
        </p>
      </div>

      {/* Pagination Strategy / Layout Options Selection */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          PDF Page Layout
        </h3>
        
        <div className="space-y-2.5">
          <select
            value={viewSettings.pdf.pdfLayoutMode}
            onChange={(e) => updateViewSetting('pdf', 'pdfLayoutMode', e.target.value as 'auto' | '1page' | '2page' | '3page')}
            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="auto">Smart Auto (Recommended)</option>
            <option value="1page">Compact (Force 1-Page)</option>
            <option value="2page">Expanded (Force 2-Page)</option>
            <option value="3page">Deluxe (Force 3-Page)</option>
          </select>
          <p className="text-[10px] text-slate-500">
            {viewSettings.pdf.pdfLayoutMode === 'auto' 
              ? 'Automatically optimizes layout pages based on project complexity (e.g. active accents or niches).'
              : viewSettings.pdf.pdfLayoutMode === '1page'
                ? 'Forces all metrics, blueprints, and tables onto a single compact page.'
                : viewSettings.pdf.pdfLayoutMode === '2page'
                  ? 'Expands document to 2 pages, giving visual canvas full layout space on Page 1.'
                  : 'Deluxe 3-page export, includes high-fidelity 3D elevation renders and full metrics.'}
          </p>
        </div>
      </div>

      {/* PDF Render/Document Options */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Document Customization
        </h3>
        <div className="space-y-2 text-xs text-slate-650">
          <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
            <input
              type="checkbox"
              id="setting-print-quantities"
              checked={viewSettings.pdf.showQuantities}
              onChange={(e) => updateViewSetting('pdf', 'showQuantities', e.target.checked)}
              className="accent-indigo-600 rounded-xs cursor-pointer h-4 w-4"
            />
            <span>Print Suggested Tile Quantities on PDF</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
            <input
              type="checkbox"
              id="setting-print-prices"
              checked={viewSettings.pdf.showPricesOnPdf}
              onChange={(e) => updateViewSetting('pdf', 'showPricesOnPdf', e.target.checked)}
              className="accent-indigo-600 rounded-xs cursor-pointer h-4 w-4"
            />
            <span>Print Tile Prices on PDF</span>
          </label>
          
          <div className="space-y-1.5 pt-2 border-t border-slate-100/70">
            <label htmlFor="setting-angle-display-mode" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Angle Annotations
            </label>
            <select
              id="setting-angle-display-mode"
              value={angleDisplayMode}
              onChange={(e) => setAngleDisplayMode(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 py-1.5 px-2 outline-hidden focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer"
            >
              <option value="all">Show All Angles</option>
              <option value="non-standard">Hide Standard (90°/180°/270°)</option>
              <option value="none">Hide All Angles</option>
            </select>
          </div>
        </div>
      </div>

      {/* Current Project Summary Preview Info */}
      <div className="border-t border-slate-100 pt-4 space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Document Details
        </h3>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-slate-50 p-2 border border-slate-150 rounded">
            <span className="text-slate-450 block font-sans">Project Title</span>
            <span className="text-slate-800 font-bold truncate block">{projectName || 'Untitled'}</span>
          </div>
          <div className="bg-slate-50 p-2 border border-slate-150 rounded">
            <span className="text-slate-450 block font-sans">Dimensions</span>
            <span className="text-slate-800 font-bold block">{wallWidth} x {wallHeight} {unit}</span>
          </div>
          <div className="bg-slate-50 p-2 border border-slate-150 rounded col-span-2">
            <span className="text-slate-450 block font-sans">Selected Tile Specs</span>
            <span className="text-slate-800 font-bold block truncate capitalize">
              {tileWidth}&ldquo; &times; {tileHeight}&ldquo; {shape}
            </span>
          </div>
        </div>
      </div>

      {/* Action Trigger Button */}
      <div className="pt-4 border-t border-slate-150">
        <button
          type="button"
          disabled={isExporting}
          onClick={() => {
            if (user) {
              handlePdfTrigger();
            } else {
              openAuthModal("Log in to download professional PDF blueprints and specifications.");
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-650/70 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer select-none tracking-wide h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : user ? (
            <FileDown className="w-4 h-4 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 shrink-0" />
          )}
          <span>{isExporting ? "Compiling PDF..." : "Generate & Download PDF"}</span>
        </button>

        {linkedSubfloorProjectId && (
          <button
            type="button"
            disabled={isExporting || isPushingDocument}
            onClick={handlePushToSubfloor}
            className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:bg-indigo-50/70 disabled:text-indigo-400 text-indigo-700 font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer select-none h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPushingDocument ? (
              <>
                <svg className="animate-spin h-4 w-4 text-indigo-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving to Subfloor...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 shrink-0 text-indigo-600" />
                <span>Save PDF to Subfloor</span>
              </>
            )}
          </button>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={isExporting || isPushingDocument}
            onClick={() => setActiveTab2(1)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel and Return to Drafting
          </button>
        </div>
      </div>
    </div>
  );
};
