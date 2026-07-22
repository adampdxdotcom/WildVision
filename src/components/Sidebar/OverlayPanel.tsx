import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { processUploadedImage } from '../../utils/imageUtils';
import { logger } from '../../utils/logger';
import {
  Camera,
  HelpCircle,
  Unlock,
  Lock,
  Sparkles
} from 'lucide-react';

export const OverlayPanel: React.FC = () => {
  const {
    backgroundImage, setBackgroundImage,
    isBgUnlocked, setIsBgUnlocked,
    bgScale, setBgScale,
    bgOffsetX, setBgOffsetX,
    bgOffsetY, setBgOffsetY,
    tileOpacity, setTileOpacity,
    bgOpacity, setBgOpacity,
    exportPhotoBg, setExportPhotoBg,
    overlayFocalLength, setOverlayFocalLength,
    setSavedCameraFov
  } = useAppStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      window.alert('The file is too large. Selected photos must be smaller than 5MB.');
      e.target.value = '';
      return;
    }

    try {
      const { base64, focalLength } = await processUploadedImage(file);
      
      setOverlayFocalLength(focalLength);
      setBackgroundImage(base64);
      setIsBgUnlocked(true);
      logger.info('Background photo compressed and loaded');
    } catch (err: any) {
      window.alert('Failed to process the selected image file.');
      setOverlayFocalLength(null);
      logger.error('Failed to process/compress background photo', { error: err?.message || String(err) });
    }
    e.target.value = ''; // Reset input
  };

  const handleRemovePhoto = () => {
    if (backgroundImage && backgroundImage.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImage);
    }
    setBackgroundImage(null);
    setIsBgUnlocked(false);
    setBgScale(1);
    setBgOffsetX(0);
    setBgOffsetY(0);
    setTileOpacity(1);
    setOverlayFocalLength(null);
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-5 shadow-xs space-y-4 animate-fade-in text-xs text-slate-600">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 group relative">
          <Camera className="w-4 h-4 text-indigo-500" />
          <div className="flex items-center gap-1 cursor-help">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">Room Photo Overlay</h3>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
          </div>

          {/* Tooltip */}
          <div className="absolute top-full left-0 mt-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none leading-relaxed font-normal normal-case">
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
            For a general idea of what your layout might look like in a room, upload a photo. For best results, take a photo perfectly straight-on and level with the wall to avoid perspective distortion.
          </div>
        </div>
      </div>

      {!backgroundImage ? (
        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-6 cursor-pointer text-center group transition bg-slate-50/30 hover:bg-slate-50">
            <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2 transition" />
            <span className="font-bold text-slate-700 block text-xs">Upload Room Photo</span>
            <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, or WEBP photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded bg-slate-200 border border-slate-300 overflow-hidden flex-shrink-0">
                <img src={backgroundImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-700 block truncate text-[11px]">Photo Loaded</span>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 mt-0.5 cursor-pointer"
                >
                  Remove photo
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBgUnlocked(!isBgUnlocked)}
              className={`px-2.5 py-1.5 rounded text-[11px] font-semibold tracking-tight cursor-pointer transition flex items-center gap-1 shadow-2xs ${
                isBgUnlocked
                  ? 'bg-amber-100 hover:bg-amber-150 text-amber-800 border border-amber-200 font-bold'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold'
              }`}
            >
              {isBgUnlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  Move Mode
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  Locked
                </>
              )}
            </button>
          </div>

          {overlayFocalLength !== null && (
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-col">
                <span className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Camera Lens EXIF Detected
                </span>
                <span className="text-[10px] text-emerald-600 mt-0.5">
                  Focal Length: <strong>{overlayFocalLength}mm</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newFov = 2 * Math.atan(24 / (2 * overlayFocalLength)) * (180 / Math.PI);
                  setSavedCameraFov(newFov);
                  console.log(`Matched 3D Camera Perspective: mm=${overlayFocalLength} -> fov=${newFov.toFixed(1)}`);
                }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-all cursor-pointer shadow-xs self-start sm:self-center"
              >
                Match 3D Camera Perspective
              </button>
            </div>
          )}

          {isBgUnlocked ? (
            <div className="space-y-4 bg-amber-50/40 border border-amber-100 p-3.5 rounded-lg">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px] uppercase tracking-wider mb-1">
                <Unlock className="w-3.5 h-3.5" />
                Adjust Photo Placement
              </div>
              
              <p className="text-[10px] text-amber-700 leading-relaxed font-sans">
                Drag directly on the wall canvas area to pan your room photo. Use the slider below to scale it up/down to align with your wall outline.
              </p>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold">Photo Scale</span>
                  <span className="font-bold text-indigo-600 font-mono">{Math.round(bgScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.02"
                  value={bgScale}
                  onChange={(e) => setBgScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold">Photo Opacity</span>
                  <span className="font-bold text-indigo-600 font-mono">{Math.round(bgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBgScale(1);
                    setBgOffsetX(0);
                    setBgOffsetY(0);
                  }}
                  className="text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-1 px-2 rounded transition cursor-pointer"
                >
                  Reset Position & Scale
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold">Tile Overlay Opacity</span>
                  <span className="font-bold text-indigo-600 font-mono">{Math.round(tileOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={tileOpacity}
                  onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-[9px] text-slate-400 block mt-1 leading-normal font-sans">
                  Blend the layout tiles with the room photo coordinates to inspect overlapping placement.
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 mt-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-[11px]">
              <input
                type="checkbox"
                id="export-photo-bg-checkbox"
                checked={exportPhotoBg}
                onChange={(e) => setExportPhotoBg(e.target.checked)}
                className="accent-indigo-600 rounded-xs cursor-pointer"
              />
              <span>Include Photo Background in PDF Export</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
