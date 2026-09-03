import React from 'react';
import { Home, HelpCircle, Lock, Unlock } from 'lucide-react';
import { RoomDimensionsPanel } from './RoomSetup/RoomDimensionsPanel';
import { ImportedLayoutsPanel } from './RoomSetup/ImportedLayoutsPanel';
import { CustomBoxesPanel } from './RoomSetup/CustomBoxesPanel';
import { ClayModelsPanel } from './RoomSetup/ClayModelsPanel';
import { AdvancedSurfacesPanel } from './RoomSetup/AdvancedSurfacesPanel';
import { useAppStore } from '../../store/useAppStore';

export const RoomSetupEditor: React.FC = () => {
  const mainLayout = useAppStore((state) => state.sceneObjects['main-tile-layout']);
  const toggleObjectLock = useAppStore((state) => state.toggleObjectLock);

  const isLocked = mainLayout?.isLocked || false;

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

      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
          {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
          Main Feature Lock
        </span>
        <button
          onClick={() => toggleObjectLock('main-tile-layout')}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
            isLocked ? 'bg-amber-500' : 'bg-slate-200'
          }`}
          title={isLocked ? "Unlock Main Feature" : "Lock Main Feature Position"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              isLocked ? 'translate-x-4.5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <RoomDimensionsPanel />
      <ImportedLayoutsPanel />
      <AdvancedSurfacesPanel />
    </div>
  );
};
