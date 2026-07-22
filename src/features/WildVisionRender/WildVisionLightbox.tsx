import React, { useEffect, useState } from 'react';
import { X, Download, SplitSquareHorizontal, ChevronsLeftRight, Box, Share2, UploadCloud } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { downloadImageSecurely } from '../../utils/imageUtils';

interface WildVisionLightboxProps {
  id: string;
  aiImage: string;
  sourceImage?: string;
  name?: string;
  notes?: string;
  onClose: () => void;
}

export const WildVisionLightbox: React.FC<WildVisionLightboxProps> = ({ id, aiImage, sourceImage, name, notes, onClose }) => {
  const { currentProjectId, generateShareLink, projectName } = useAppStore();
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Subfloor Integration hooks
  const subfloorApiKey = useAuthStore(state => state.subfloor_api_key);
  const linkedSubfloorProjectId = useAppStore(state => state.linkedSubfloorProjectId);
  const exportMediaToSubfloor = useAppStore(state => state.exportMediaToSubfloor);
  const isExportingMedia = useAppStore(state => state.isExportingMedia);
  const showToast = useAuthStore(state => state.showToast);

  const handleSendToSubfloor = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedSubfloorProjectId === null) return;
    try {
      await exportMediaToSubfloor(aiImage, name || "WildVision Design");
      showToast('Successfully uploaded image to Subfloor Gallery!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload image to Subfloor Gallery.', 'error');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProjectId) return;
    setIsSharing(true);
    try {
      const url = await generateShareLink(id);
      if (url) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy share link:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const [isComparing, setIsComparing] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Calculate metadata dynamically on mount/change
  useEffect(() => {
    if (!aiImage) return;

    // Dimensions & Aspect Ratio
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setDimensions({ width: w, height: h });

      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(w, h);
      const aspectW = w / divisor;
      const aspectH = h / divisor;

      const ratio = w / h;
      let ratioStr = `${aspectW}:${aspectH}`;
      if (Math.abs(ratio - 16 / 9) < 0.05) ratioStr = '16:9';
      else if (Math.abs(ratio - 4 / 3) < 0.05) ratioStr = '4:3';
      else if (Math.abs(ratio - 1) < 0.05) ratioStr = '1:1';
      else if (Math.abs(ratio - 1.5) < 0.05) ratioStr = '3:2';
      else if (Math.abs(ratio - 2 / 3) < 0.05) ratioStr = '2:3';
      else if (Math.abs(ratio - 9 / 16) < 0.05) ratioStr = '9:16';
      else if (Math.abs(ratio - 3 / 4) < 0.05) ratioStr = '3:4';

      setAspectRatio(ratioStr);
    };
    img.src = aiImage;

    // File Size calculation from Base64 or Fetch
    if (aiImage.startsWith('data:')) {
      const base64Content = aiImage.split(',')[1];
      if (base64Content) {
        let padding = 0;
        if (base64Content.endsWith('==')) padding = 2;
        else if (base64Content.endsWith('=')) padding = 1;

        const sizeInBytes = (base64Content.length * (3 / 4)) - padding;
        if (sizeInBytes >= 1024 * 1024) {
          setFileSize(`${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`);
        } else {
          setFileSize(`${(sizeInBytes / 1024).toFixed(0)} KB`);
        }
      }
    } else {
      fetch(aiImage, { method: 'HEAD' })
        .then((res) => {
          const len = res.headers.get('content-length');
          if (len) {
            const sizeInBytes = parseInt(len);
            if (sizeInBytes >= 1024 * 1024) {
              setFileSize(`${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`);
            } else {
              setFileSize(`${(sizeInBytes / 1024).toFixed(0)} KB`);
            }
          }
        })
        .catch(() => {
          // Fallback or ignore CORS errors
        });
    }
  }, [aiImage]);

  const handleDownloadAI = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const projectPrefix = projectName ? projectName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : 'wildvision';
    await downloadImageSecurely(aiImage, `${projectPrefix}-render-${id}.jpg`);
  };

  const handleDownload3D = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sourceImage) return;
    const projectPrefix = projectName ? projectName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : 'wildvision';
    await downloadImageSecurely(sourceImage, `${projectPrefix}-blueprint-${id}.jpg`);
  };

  return (
    <div 
      className="fixed inset-0 z-[999] flex flex-col bg-black/95 backdrop-blur-md animate-fade-in animate-duration-200 select-none p-4"
      onClick={onClose}
    >
      {/* Image Container */}
      <div 
        className="flex-1 min-h-0 relative flex items-center justify-center w-full max-w-[90vw] mx-auto animate-in zoom-in-95 duration-200 mb-4" 
        onClick={(e) => e.stopPropagation()}
      >
        {isComparing && sourceImage ? (
          /* Slider interactive mode */
          <div 
            className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-lg shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bottom Image: AI Render */}
            <img 
              src={aiImage} 
              alt="AI Render" 
              className="max-w-full max-h-full object-contain select-none pointer-events-none rounded-lg"
              referrerPolicy="no-referrer"
            />

            {/* Top Image: 3D Source */}
            <img 
              src={sourceImage} 
              alt="3D Source" 
              className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none rounded-lg"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
              }}
              referrerPolicy="no-referrer"
            />

            {/* Floating Labels */}
            <div className="absolute top-4 left-4 z-30 pointer-events-none select-none bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-white/20 shadow-lg">
              3D Source Blueprint
            </div>
            <div className="absolute top-4 right-4 z-30 pointer-events-none select-none bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-white/20 shadow-lg">
              AI Photoreal Render
            </div>

            {/* Invisible Native Range Input */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sliderPosition} 
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-25"
            />

            {/* Visual Divider Line */}
            <div 
              className="absolute top-0 bottom-0 w-[2.5px] bg-white pointer-events-none z-10 shadow-[0_0_12px_rgba(0,0,0,0.6)]"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              {/* Grabber Handle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border border-slate-200">
                <ChevronsLeftRight className="w-4 h-4 text-slate-800" />
              </div>
            </div>
          </div>
        ) : (
          /* Normal static image mode */
          <img 
            src={aiImage} 
            alt="Wild Vision render full screen" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-800"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Structured Footer */}
      <div 
        className="w-full max-w-[90vw] mx-auto bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 backdrop-blur-md z-50 mb-2" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Metadata */}
        <div className="flex flex-col gap-1.5 w-full sm:w-1/2 items-start text-left">
          {name ? (
            <div className="text-sm font-bold text-white tracking-tight">{name}</div>
          ) : (
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Render Specifications</div>
          )}
          
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-400 font-mono">
            {aspectRatio && (
              <>
                <span className="text-indigo-400 font-semibold bg-indigo-950/50 border border-indigo-900 px-1.5 py-0.5 rounded text-[10px]">{aspectRatio}</span>
                <span className="text-slate-700">•</span>
              </>
            )}
            {dimensions && (
              <>
                <span>{dimensions.width} × {dimensions.height} px</span>
                {fileSize && <span className="text-slate-700">•</span>}
              </>
            )}
            {fileSize && (
              <span>{fileSize}</span>
            )}
            {!dimensions && !fileSize && !aspectRatio && (
              <span className="text-slate-500 italic">Calculating specifications...</span>
            )}
          </div>

          {notes && (
            <div className="text-xs text-slate-400 bg-slate-950/40 border border-slate-850/50 rounded-lg p-2.5 mt-1.5 w-full max-h-[80px] overflow-y-auto leading-relaxed italic">
              {notes}
            </div>
          )}
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {sourceImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsComparing(prev => !prev);
              }}
              title={isComparing ? "Show AI Render Only" : "Compare with 3D View Slider"}
              className={`p-2 rounded-lg border transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm text-xs font-bold uppercase tracking-wider ${
                isComparing 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500' 
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              <SplitSquareHorizontal className="w-4 h-4" />
              <span>{isComparing ? "Slider On" : "Slider Off"}</span>
            </button>
          )}

          {/* Save AI Render Button */}
          <button
            type="button"
            onClick={handleDownloadAI}
            title="Save AI Render (Download high-resolution photorealistic photograph)"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Save AI</span>
          </button>

          {/* Save 3D Blueprint Button */}
          {sourceImage && (
            <button
              type="button"
              onClick={handleDownload3D}
              title="Save 3D Blueprint (Download source model structural snapshot)"
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Box className="w-4 h-4" />
              <span>Save 3D</span>
            </button>
          )}

          {/* Send to Subfloor Gallery Button */}
          {subfloorApiKey && (
            <button
              type="button"
              disabled={isExportingMedia || linkedSubfloorProjectId === null}
              onClick={handleSendToSubfloor}
              title={linkedSubfloorProjectId === null ? "Link a Subfloor project to enable syncing." : "Send image directly to the linked Subfloor project's media gallery"}
              className={`p-2 rounded-lg border transition-all duration-150 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm ${
                linkedSubfloorProjectId === null
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 cursor-pointer'
              }`}
            >
              {isExportingMedia ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Send to Subfloor</span>
                </>
              )}
            </button>
          )}

          {/* Share Link Button */}
          <button
            type="button"
            disabled={!currentProjectId || isSharing}
            onClick={handleShare}
            title={currentProjectId ? "Share Link (Copy presentation link to clipboard)" : "Save project to cloud to enable sharing"}
            className={`p-2 rounded-lg border transition-all duration-150 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm ${
              !currentProjectId 
                ? 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed' 
                : copied
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 cursor-pointer'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{copied ? "Copied!" : isSharing ? "Sharing..." : "Share Link"}</span>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-slate-800 mx-1" />

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close Full Screen View"
            className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 rounded-lg border border-rose-900/50 transition-all duration-150 cursor-pointer flex items-center justify-center shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
