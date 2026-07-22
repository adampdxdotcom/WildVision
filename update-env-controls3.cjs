const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', 'utf8');

code = code.replace(
  "import { Sun, Moon, FileText } from 'lucide-react';",
  "import { Sun, Moon, FileText, Check, Loader2 } from 'lucide-react';"
);

code = code.replace(
  "  const user = useAuthStore(state => state.user);",
  "  const user = useAuthStore(state => state.user);\n  const [isCapturing, setIsCapturing] = React.useState(false);\n  const [showSuccess, setShowSuccess] = React.useState(false);\n\n  const handleCaptureElevation = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    if (isCapturing) return;\n    setIsCapturing(true);\n    setTimeout(() => {\n      setIsCapturing(false);\n      setShowSuccess(true);\n      setTimeout(() => {\n        setShowSuccess(false);\n      }, 2500);\n    }, 1500);\n  };"
);

const newButton = `
      {(orthoLock && user) && (
        <button
          onClick={handleCaptureElevation}
          className={\`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-sm pointer-events-auto cursor-pointer \${
            isLightMode
              ? 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-slate-50'
              : 'bg-slate-800/90 text-slate-200 border-slate-700/60 hover:bg-slate-700'
          }\`}
          title="Set PDF Elevation"
        >
          {isCapturing ? (
            <>
              <Loader2 size={13} className={\`animate-spin \${isLightMode ? "text-slate-500" : "text-slate-400"}\`} />
              <span>Capturing...</span>
            </>
          ) : showSuccess ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span>Elevation Set!</span>
            </>
          ) : (
            <>
              <FileText size={13} className={isLightMode ? "text-slate-500" : "text-slate-400"} />
              <span>Set PDF Elevation</span>
            </>
          )}
        </button>
      )}
`;

code = code.replace(
  /\{\(orthoLock && user\) && \([\s\S]*?\)\}/,
  newButton.trim()
);

fs.writeFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', code);
