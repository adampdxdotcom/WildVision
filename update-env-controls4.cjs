const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', 'utf8');

code = code.replace(
  /\{\(orthoLock && user\) && \([\s\S]*?\)\}/g,
  `{(orthoLock && user) && (
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
      )}`
);

fs.writeFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', code);
