import React, { useEffect } from 'react';
import { Sun, Moon, FileText, Check, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../utils/supabaseClient';

interface EnvironmentControls3DProps {
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
  enableRealisticDepth: boolean;
  setEnableRealisticDepth: (val: boolean) => void;
}

export const EnvironmentControls3D: React.FC<EnvironmentControls3DProps> = ({
  isLightMode,
  setIsLightMode,
  enableRealisticDepth,
  setEnableRealisticDepth,
}) => {
  const orthoLock = useAppStore(state => state.orthoLock);
  const currentProjectId = useAppStore(state => state.currentProjectId);
  const setPdfElevationUrl = useAppStore(state => state.setPdfElevationUrl);
  const user = useAuthStore(state => state.user);
  
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const handleCaptureElevation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCapturing) return;
    setIsCapturing(true);
    window.dispatchEvent(new CustomEvent('wildvision:trigger-elevation-capture'));
  };

  useEffect(() => {
    const handleBlobReady = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const blob = customEvent.detail;
      const user = useAuthStore.getState().user;
      
      if (!blob || !user) {
        setIsCapturing(false);
        return;
      }

      try {
        const currentProjectId = useAppStore.getState().currentProjectId;
        const fileName = `${user.id}/elevations/elev_${currentProjectId || 'local'}_${Date.now()}.jpg`;

        const { error } = await supabase.storage
          .from('wildvision_renders')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (error) throw error;

        const { data, error: urlError } = await supabase.storage
          .from('wildvision_renders')
          .createSignedUrl(fileName, 3600);

        if (urlError) throw urlError;

        if (data && data.signedUrl) {
          useAppStore.getState().setPdfElevationUrl(data.signedUrl);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2500);
        }
      } catch (err) {
        console.error('Failed to upload elevation:', err);
      } finally {
        setIsCapturing(false);
      }
    };

    window.addEventListener('wildvision:elevation-blob-ready', handleBlobReady);
    return () => window.removeEventListener('wildvision:elevation-blob-ready', handleBlobReady);
  }, []);

  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pointer-events-auto">
      <button
        onClick={() => setIsLightMode(!isLightMode)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-sm pointer-events-auto cursor-pointer ${
          isLightMode
            ? 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-slate-50'
            : 'bg-slate-800/90 text-slate-200 border-slate-700/60 hover:bg-slate-700'
        }`}
        title="Toggle Light/Dark 3D View"
      >
        {isLightMode ? (
          <>
            <Sun size={13} className="text-amber-500 animate-[spin_5s_linear_infinite]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon size={13} className="text-indigo-400" />
            <span>Dark Mode</span>
          </>
        )}
      </button>

      <button
        onClick={() => setEnableRealisticDepth(!enableRealisticDepth)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-sm pointer-events-auto cursor-pointer ${
          enableRealisticDepth
            ? isLightMode
              ? 'bg-indigo-50/95 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/90'
              : 'bg-slate-800/90 text-indigo-300 border-indigo-700/40 hover:bg-slate-700'
            : isLightMode
              ? 'bg-white/95 text-slate-500 border-slate-200/80 hover:bg-slate-50'
              : 'bg-slate-800/90 text-slate-400 border-slate-700/60 hover:bg-slate-700'
        }`}
        title={enableRealisticDepth ? "Deactivate high-fidelity depth mapping (Faster performance)" : "Activate realistic depth and bevels (Requires more GPU/CPU)"}
      >
        {enableRealisticDepth ? (
          <>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>HD Depth: ON</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            <span>HD Depth: OFF (Fast Draft)</span>
          </>
        )}
      </button>

      {(orthoLock && user && currentProjectId) && (
        <button
          onClick={handleCaptureElevation}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-sm pointer-events-auto cursor-pointer ${
            isLightMode
              ? 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-slate-50'
              : 'bg-slate-800/90 text-slate-200 border-slate-700/60 hover:bg-slate-700'
          }`}
          title="Set PDF Elevation"
        >
          {isCapturing ? (
            <>
              <Loader2 size={13} className={`animate-spin ${isLightMode ? "text-slate-500" : "text-slate-400"}`} />
              <span>Capturing...</span>
            </>
          ) : showSuccess ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span>Elevation Set!</span>
            </>
          ) : (
            <>
              <FileText size={13} className={isLightMode ? "text-slate-500" : "text-slate-400"} />
              <span>Set PDF Elevation</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
