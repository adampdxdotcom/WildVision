import React, { useState } from 'react';
import { MousePointer2, PenLine, Spline, Eraser, BoxSelect, Scissors, Type, PaintBucket, Pin, Expand, Paintbrush } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const FloatingToolbar: React.FC = React.memo(() => {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const activeWallExtensionId = useAppStore(state => state.activeWallExtensionId);
  const setActiveWallExtensionId = useAppStore(state => state.setActiveWallExtensionId);
  const tutorialStepIndex = useAppStore(state => state.tutorialStepIndex);
  const isReadOnly = useAppStore(state => state.isReadOnly);
  
  const [isHovered, setIsHovered] = useState(false);

  if (isReadOnly) return null;

  const isExpanded = isHovered || tutorialStepIndex === 4 || tutorialStepIndex === 5;
  const isSelectorTutorialHighlight = tutorialStepIndex === 4;

  const canonicalTools = [
    {
      id: 'select' as const,
      title: 'Selector Tool',
      icon: <MousePointer2 size={16} strokeWidth={2.5} />,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('select');
      },
      className: isSelectorTutorialHighlight
        ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 animate-pulse'
        : activeTool === 'select'
          ? 'bg-indigo-100 text-indigo-700 shadow-inner'
          : 'hover:bg-slate-100 text-slate-600'
    },
    {
      id: 'paint' as const,
      title: 'Paint Tool',
      icon: <Paintbrush size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('paint');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'paint' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'extrude' as const,
      title: 'Full Segment Extrude (U-shape bump-out)',
      icon: <Expand size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('extrude');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'extrude' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'marquee' as const,
      title: 'Marquee Select Nodes',
      icon: <BoxSelect size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('marquee');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'marquee' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'pen' as const,
      title: 'Add Corner Node',
      icon: <PenLine size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('pen');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'pen' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'pen-arch' as const,
      title: 'Add Arch Node',
      icon: <Spline size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('pen-arch');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'pen-arch' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'fold-line' as const,
      title: 'Add Fold Line (Connect Nodes)',
      icon: <Scissors size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('fold-line');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'fold-line' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'fill' as const,
      title: 'Accent Fill Tool',
      icon: <PaintBucket size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('fill');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'fill' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'text' as const,
      title: 'Add Text Label',
      icon: <Type size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('text');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'text' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'eraser' as const,
      title: 'Eraser Tool (Delete Node)',
      icon: <Eraser size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('eraser');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'eraser' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    },
    {
      id: 'pin' as const,
      title: 'Anchor Pin (Set 3D Main Wall)',
      icon: <Pin size={16} strokeWidth={2.5}/>,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTool('pin');
        setActiveWallExtensionId(null);
      },
      className: activeTool === 'pin' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-slate-100 text-slate-600',
    }
  ];

  // Render currently active tool first when the toolbar is collapsed, maintaining canonical order when expanded
  const displayTools = isExpanded
    ? canonicalTools
    : [
        canonicalTools.find((t) => t.id === activeTool) || canonicalTools[0],
        ...canonicalTools.filter((t) => t.id !== activeTool)
      ];

  return (
    <div 
      id="floating-toolbar" 
      className="absolute top-3 left-3 z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex items-center bg-white/95 backdrop-blur-sm rounded-lg shadow-sm text-slate-700 border border-slate-200 select-none overflow-hidden transition-all duration-300 ease-in-out p-1"
        style={{ width: isExpanded ? '400px' : '40px' }}
      >
        <div className="flex items-center gap-1 w-max shrink-0">
          {displayTools.map((tool) => (
            <button
              key={tool.id}
              className={`p-2 rounded cursor-pointer transition shrink-0 ${tool.className}`}
              onClick={tool.onClick}
              title={tool.title}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

