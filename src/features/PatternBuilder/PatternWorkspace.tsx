import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PenTool, Columns, Eye } from 'lucide-react';
import VertexEditorCanvas from './VertexEditorCanvas';
import TessellationPreview from './TessellationPreview';

export default function PatternWorkspace() {
  const workspaceView = useAppStore(state => state.workspaceView);
  const setWorkspaceView = useAppStore(state => state.setWorkspaceView);

  return (
    <div className="flex flex-col flex-1 h-full w-full min-h-0 min-w-0 bg-[#F9F9FB] relative">
      {/* Floating Viewport HUD */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white border border-[#E5E7EB] shadow-md rounded-full flex p-1">
        <button
          onClick={() => setWorkspaceView('design')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
            workspaceView === 'design'
              ? 'bg-[#F3F4F6] text-indigo-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
          title="Design View"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Design</span>
        </button>
        <button
          onClick={() => setWorkspaceView('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
            workspaceView === 'split'
              ? 'bg-[#F3F4F6] text-indigo-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
          title="Split View"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>
        <button
          onClick={() => setWorkspaceView('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
            workspaceView === 'preview'
              ? 'bg-[#F3F4F6] text-indigo-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
          title="Preview View"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 w-full h-full min-h-0 min-w-0 pt-4 pb-16 px-4 gap-4">
        {workspaceView === 'design' && (
          <div className="flex-1 h-full min-h-0 min-w-0 relative">
            <VertexEditorCanvas />
          </div>
        )}
        
        {workspaceView === 'preview' && (
          <div className="flex-1 h-full min-h-0 min-w-0 relative">
            <TessellationPreview />
          </div>
        )}

        {workspaceView === 'split' && (
          <>
            <div className="flex-1 h-full min-h-0 min-w-0 relative border-r border-[#E5E7EB]">
              <VertexEditorCanvas />
            </div>
            <div className="flex-1 h-full min-h-0 min-w-0 relative bg-[#F9F9FB]">
              <TessellationPreview />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
