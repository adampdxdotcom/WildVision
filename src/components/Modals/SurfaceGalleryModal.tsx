import React, { useRef, useState, useEffect } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSurfaces } from '../../hooks/useSurfaces';

interface SurfaceGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSurface?: (urlOrBase64: string) => void;
}

export const SurfaceGalleryModal: React.FC<SurfaceGalleryModalProps> = ({ isOpen, onClose, onSelectSurface }) => {
  const { customSurfaces } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const { uploadSurface, deleteSurface, fetchSurfaces, isLoading } = useSurfaces();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchSurfaces();
    }
  }, [isOpen, user, fetchSurfaces]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const newSurface = await uploadSurface(file);
      if (newSurface && onSelectSurface) {
        onSelectSurface(newSurface.url_or_base64);
      }
      onClose();
    } catch (err: any) {
      alert(`Error uploading file: ${err.message}`);
    }
  };

  const handleSelect = (surface: any) => {
    if (onSelectSurface) {
      onSelectSurface(surface.url_or_base64);
    }
    onClose();
  };

  const handleDelete = async (e: React.MouseEvent, surface: any) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${surface.name}"?`)) {
      try {
        await deleteSurface(surface.id, surface.is_local_only, surface.url_or_base64);
      } catch (err: any) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Surface Gallery</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Uploader Section */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Upload Custom Slab</h3>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Processing & Uploading...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Drag and drop your image here
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Supports JPEG, PNG, WEBP (Max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Browse Files
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gallery Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              {user ? 'Your Saved Surfaces' : 'Local Session Surfaces'}
            </h3>
            
            {!user && customSurfaces.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Log in to save surfaces to your account permanently.
                </p>
              </div>
            )}

            {user && customSurfaces.length === 0 && !isLoading && (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500">No surfaces saved yet.</p>
              </div>
            )}

            {customSurfaces.length > 0 && (
              <div className="grid grid-cols-3 gap-4 max-h-[300px] overflow-y-auto p-1">
                {customSurfaces.map((surface) => (
                  <div
                    key={surface.id}
                    onClick={() => handleSelect(surface)}
                    className="group relative aspect-square rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 hover:border-blue-500 transition-all"
                  >
                    <img
                      src={surface.url_or_base64}
                      alt={surface.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                        <span className="text-white text-xs font-medium truncate pr-2">
                          {surface.name}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, surface)}
                          className="p-1.5 bg-white/20 hover:bg-red-500 rounded text-white transition-colors backdrop-blur-sm"
                          title="Delete Surface"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
