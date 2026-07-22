import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

export const DEV_NOTES_TEXT = "Paste your developer notes, architectural logs, or roadmap checklists here. This file is dynamically loaded from public/projectnotes/sessionnotes.txt.";

export const BUGS_TEXT = `# Open Bugs

- **Segment Locking**: If a segment has two adjacent locked segments, one of them will not stay locked when manually adjusting the segment length.
- **Node Out of Bounds**: When dragging a node outside of a bounding box, it becomes difficult to control and shoots off at odd angles.`;

export const ROAD_MAP_TEXT = `# Future Update Ideas

- **Advanced 3D Environmental Textures**: Add more customizable tile layouts and material finishes to walls and floor planes.
- **Improved CAD Tools**: Support custom bezier curve drawing, snapping improvements, and high-precision laser measure integration.
- **Collaborative Real-time Workspace**: Real-time project syncing and live cursor sharing for remote contractor-architect sessions.`;

// Helper to strip emojis and standard graphical characters to ensure clean text
const stripEmojis = (text: string): string => {
  return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '');
};

// Inline parser for bold markup (**bold text**)
const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

interface DevNotesPanelProps {
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const DevNotesPanel: React.FC<DevNotesPanelProps> = ({ setErrorMsg, setSuccessMsg }) => {
  const [activeTab, setActiveTab] = useState<'Session Notes' | 'File Breakdown' | 'Bugs' | 'Road Map'>('Session Notes');
  const [rawText, setRawText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [fileBreakdownText, setFileBreakdownText] = useState<string>('');

  const getActiveText = () => {
    switch (activeTab) {
      case 'Session Notes':
        return rawText;
      case 'File Breakdown':
        return fileBreakdownText;
      case 'Bugs':
        return BUGS_TEXT;
      case 'Road Map':
        return ROAD_MAP_TEXT;
      default:
        return '';
    }
  };

  const stripMarkdownForCopy = (text: string) => {
    return text.split('\n').map(line => {
      let cleanLine = stripEmojis(line);
      const trimmed = cleanLine.trim();

      if (!trimmed) return cleanLine;

      if (cleanLine.startsWith('# ')) {
        cleanLine = cleanLine.slice(2);
      } else if (cleanLine.startsWith('## ')) {
        cleanLine = cleanLine.slice(3);
      } else if (cleanLine.startsWith('### ')) {
        cleanLine = cleanLine.slice(4);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.slice(2);
        const leadingSpaces = cleanLine.length - cleanLine.trimStart().length;
        const indent = ' '.repeat(leadingSpaces);
        cleanLine = indent + '• ' + content;
      }
      
      // Remove inline bold markup
      return cleanLine.replace(/\*\*(.*?)\*\*/g, '$1');
    }).join('\n');
  };

  const handleCopy = () => {
    const activeText = getActiveText();
    const formattedText = stripMarkdownForCopy(activeText);
    navigator.clipboard.writeText(formattedText)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text:', err);
      });
  };

  useEffect(() => {
    const fetchNotes = async () => {
      const cacheBuster = new Date().getTime();
      try {
        setLoading(true);
        // Try fetching standard lowercase notes path (defined in server setup or copied)
        let response = await fetch(`/projectnotes/sessionnotes.txt?t=${cacheBuster}`);
        if (!response.ok) {
          // Fallback to exact case just in case
          response = await fetch(`/projectnotes/sessionNotes.txt?t=${cacheBuster}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch developer log file (Status: ${response.status})`);
        }

        const text = await response.text();
        setRawText(text);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching developer notes:', err);
        const errorMsg = "File not found. Ensure the /projectnotes/ directory is located inside the /public/ directory so Vite can serve it as a static asset.";
        setError(errorMsg);
        setRawText(errorMsg);
        setErrorMsg(errorMsg);
      } finally {
        setLoading(false);
      }

      try {
        const fbResponse = await fetch(`/projectnotes/filebreakdown.txt?t=${cacheBuster}`);
        if (fbResponse.ok) {
          const fbText = await fbResponse.text();
          setFileBreakdownText(fbText);
        }
      } catch (e) {
        console.warn('Could not fetch file breakdown log.');
      }
    };

    fetchNotes();
  }, [setErrorMsg]);

  // Main custom Markdown line parser
  const parseMarkdownLine = (line: string, index: number) => {
    const cleanLine = stripEmojis(line);
    const trimmed = cleanLine.trim();

    if (!trimmed) {
      return <div key={index} className="h-2" id={`spacer-${index}`} />;
    }

    if (cleanLine.startsWith('# ')) {
      return (
        <h1 
          key={index} 
          className="text-base font-bold text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1 font-mono tracking-tight" 
          id={`h1-${index}`}
        >
          {cleanLine.slice(2)}
        </h1>
      );
    }

    if (cleanLine.startsWith('## ')) {
      return (
        <h2 
          key={index} 
          className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2 tracking-tight" 
          id={`h2-${index}`}
        >
          {cleanLine.slice(3)}
        </h2>
      );
    }

    if (cleanLine.startsWith('### ')) {
      return (
        <h3 
          key={index} 
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1.5" 
          id={`h3-${index}`}
        >
          {cleanLine.slice(4)}
        </h3>
      );
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      const leadingSpaces = cleanLine.length - cleanLine.trimStart().length;
      const indentClass = leadingSpaces > 4 ? "pl-8" : leadingSpaces > 0 ? "pl-4" : "";
      return (
        <div 
          key={index} 
          className={`flex items-start space-x-2 my-1 ${indentClass}`} 
          id={`bullet-${index}`}
        >
          <span className="text-rose-500 mt-1 flex-shrink-0 text-[10px] select-none">•</span>
          <span className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
            {renderInlineMarkdown(content)}
          </span>
        </div>
      );
    }

    return (
      <p 
        key={index} 
        className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed my-1.5" 
        id={`p-${index}`}
      >
        {renderInlineMarkdown(cleanLine)}
      </p>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 font-sans animate-fade-in" id="dev-notes-panel">
      {/* Title Header */}
      <div 
        className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" 
        id="dev-notes-header"
      >
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">
            Developer Notes & Session Logs
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Review architectural structures, developer logs, and project release configurations.
          </p>
        </div>
      </div>

      {/* Sub-navigation Controls & Copy Button */}
      <div className="flex items-center justify-between" id="dev-notes-nav-row">
        <div 
          className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/50 rounded-lg" 
          id="dev-notes-tabs"
        >
          <button
            onClick={() => setActiveTab('Session Notes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'Session Notes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            id="tab-session-notes"
          >
            Session Notes
          </button>
          <button
            onClick={() => setActiveTab('File Breakdown')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'File Breakdown'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            id="tab-file-breakdown"
          >
            File Breakdown
          </button>
          <button
            onClick={() => setActiveTab('Bugs')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'Bugs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            id="tab-bugs"
          >
            Bugs
          </button>
          <button
            onClick={() => setActiveTab('Road Map')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'Road Map'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            id="tab-roadmap"
          >
            Road Map
          </button>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            isCopied
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400'
              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm'
          }`}
          id="copy-text-btn"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Text</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Card Container */}
      <div 
        className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-5 overflow-y-auto max-h-[70vh] shadow-inner flex flex-col space-y-1"
        id="dev-notes-content"
      >
        {activeTab === 'Session Notes' && loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3" id="dev-notes-loading">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-mono">Fetching session notes...</p>
          </div>
        ) : activeTab === 'Session Notes' && error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg" id="dev-notes-error">
            <h4 className="text-xs font-semibold text-rose-800 dark:text-rose-400 mb-1">Could Not Load Logs</h4>
            <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
              {rawText}
            </p>
          </div>
        ) : (
          <div className="flex flex-col select-text" id="dev-notes-markdown-container">
            {getActiveText().split('\n').map((line, idx) => parseMarkdownLine(line, idx))}
          </div>
        )}
      </div>

      {/* Warning/Info Prompt footer */}
      <div 
        className="p-3 bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 font-semibold leading-normal" 
        id="dev-notes-footer"
      >
        <strong>System Reminder:</strong> Changing these notes will not alter live compiler parameters. For actual build modification, update the corresponding source files in the workspace.
      </div>
    </div>
  );
};
