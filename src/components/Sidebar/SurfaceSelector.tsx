import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { SurfaceGalleryModal } from '../Modals/SurfaceGalleryModal';

interface SurfaceSelectorProps {
  currentUrl?: string;
  onSelect: (url: string) => void;
  label?: string;
}

export const SurfaceSelector: React.FC<SurfaceSelectorProps> = ({ 
  currentUrl, 
  onSelect, 
  label = "Surface Material" 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Thumbnail Preview */}
        <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
          {currentUrl ? (
            <img src={currentUrl} alt="Surface preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors text-center"
        >
          {currentUrl ? 'Change Slab' : 'Load Custom Slab'}
        </button>
      </div>

      <SurfaceGalleryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectSurface={onSelect} 
      />
    </div>
  );
};
