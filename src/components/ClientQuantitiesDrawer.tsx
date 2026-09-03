import React, { useEffect, useRef } from 'react';
import { X, Calculator } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ClientQuantitiesView } from './ClientQuantitiesView';

interface ClientQuantitiesDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ClientQuantitiesDrawer: React.FC<ClientQuantitiesDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const publicShowPricing = useAppStore((state) => state.publicShowPricing);
  const storeIsOpen = useAppStore((state) => state.isClientQuantitiesOpen);
  const setStoreIsOpen = useAppStore((state) => state.setIsClientQuantitiesOpen);

  const activeIsOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    setStoreIsOpen(false);
  };

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the drawer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeIsOpen && drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        const triggerBtn = document.getElementById('client-quantities-trigger-btn');
        if (triggerBtn && triggerBtn.contains(event.target as Node)) {
          return;
        }
        handleClose();
      }
    };

    if (activeIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeIsOpen]);

  // Close when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeIsOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIsOpen]);

  if (!activeIsOpen) return null;

  const title = publicShowPricing
    ? 'Material Quantities & Cost Estimator'
    : 'Material Quantities & Specifications';

  return (
    <div
      data-prevent-canvas-scroll="true"
      className="absolute inset-0 z-40 flex pointer-events-auto select-none overflow-hidden"
    >
      {/* Backdrop covering the canvas grid area strictly below top header bar */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Slide-out drawer panel anchored to left edge inside canvas container */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full sm:w-[600px] max-w-full h-full bg-slate-900 border-r border-slate-700/80 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0"
      >
        {/* Top header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-slate-100 shrink-0">
          <div className="flex items-center gap-2 truncate pr-2">
            <Calculator className="w-4 h-4 text-indigo-400 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-100 truncate">
              {title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body wrapping ClientQuantitiesView */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-900 select-text">
          <ClientQuantitiesView />
        </div>
      </div>
    </div>
  );
};
