import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface DeleteRenderModalProps {
  isOpen: boolean;
  renderItem: any | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteRenderModal: React.FC<DeleteRenderModalProps> = ({
  isOpen,
  renderItem,
  onClose,
  onConfirm,
}) => {
  const generatedRenders = useAppStore((state) => state.generatedRenders);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !renderItem) return null;

  // Calculate variations count if this is a parent/root render
  const isRoot = !renderItem.parent_id;
  const variations = isRoot
    ? generatedRenders.filter((r: any) => r.parent_id === renderItem.id)
    : [];
  const variationsCount = variations.length;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const displayName = renderItem.name?.trim()
    ? renderItem.name
    : renderItem.parent_id
    ? 'Variation'
    : 'Concept Render';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 leading-snug">
                Delete AI Render
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[240px]">
                {displayName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview image & Warning Message */}
        <div className="flex gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 items-center">
          {(renderItem.imageUrl || renderItem.sourceImage) && (
            <img
              src={renderItem.imageUrl || renderItem.sourceImage}
              alt="Render preview"
              className="w-16 h-16 object-cover rounded-lg border border-slate-800 shrink-0"
            />
          )}
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-100">{displayName}</span>
            <br />
            {variationsCount > 0 ? (
              <span className="text-amber-400/90 font-medium">
                Includes {variationsCount} photorealistic variation{variationsCount > 1 ? 's' : ''}.
              </span>
            ) : (
              <span className="text-slate-400">Single image concept.</span>
            )}
          </div>
        </div>

        {/* Detailed Disclaimer */}
        <div className="text-xs text-slate-300 leading-relaxed space-y-2 bg-red-950/30 border border-red-500/20 p-3.5 rounded-xl">
          {variationsCount > 0 ? (
            <p>
              <strong className="text-red-400 font-bold">Important:</strong> Deleting this concept will permanently remove the original AI render, its 3D snapshot, and <strong className="text-red-300 underline">all {variationsCount} associated variation{variationsCount > 1 ? 's' : ''}</strong> from storage and history.
            </p>
          ) : (
            <p>
              Are you sure you want to delete this AI render and its associated 3D snapshot? This action cannot be undone and will remove it from cloud storage.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition shadow-lg shadow-red-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
