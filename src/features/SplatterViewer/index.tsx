import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const SplatterViewer: React.FC = () => {
  const before_splat_url = useAppStore((state) => state.before_splat_url);
  const after_splat_url = useAppStore((state) => state.after_splat_url);

  const targetUrl = after_splat_url || before_splat_url;

  if (!targetUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <span className="text-slate-500 font-medium">No 3D Splat Data Available for this project.</span>
      </div>
    );
  }

  const encodedUrl = encodeURIComponent(targetUrl);
  const baseUrl = import.meta.env.VITE_SPLATTER_BASE_URL || 'https://splatter.subfloor.app';
  const iframeSrc = `${baseUrl}/?url=${encodedUrl}&embed=true&client=desktop`;

  return (
    <div className="w-full h-full relative">
      <iframe
        src={iframeSrc}
        className="w-full h-full border-none"
        allow="xr-spatial-tracking"
        title="3D Splat Viewer"
      />
    </div>
  );
};

export default SplatterViewer;
