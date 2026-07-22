import React from 'react';
import { Home, HelpCircle } from 'lucide-react';
import { RoomDimensionsPanel } from './RoomSetup/RoomDimensionsPanel';
import { ImportedLayoutsPanel } from './RoomSetup/ImportedLayoutsPanel';
import { CustomBoxesPanel } from './RoomSetup/CustomBoxesPanel';
import { ClayModelsPanel } from './RoomSetup/ClayModelsPanel';
import { AdvancedSurfacesPanel } from './RoomSetup/AdvancedSurfacesPanel';

export const RoomSetupEditor: React.FC = () => {
  return (
    <div id="room-setup-area" className="bg-white rounded border border-slate-200 p-5 shadow-xs animate-fade-in mb-4">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 group relative">
          <Home className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1 cursor-help">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Room Setup Area</h3>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute top-full left-0 mt-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none leading-relaxed font-normal normal-case font-sans">
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
            Define the physical boundaries of the entire static environment (width, height, depth) and customize surface colors.
          </div>
        </div>
      </div>

      <RoomDimensionsPanel />
      <ImportedLayoutsPanel />
      <AdvancedSurfacesPanel />
    </div>
  );
};
