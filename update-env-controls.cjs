const fs = require('fs');
let code = fs.readFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', 'utf8');

code = code.replace(
  "import { Sun, Moon } from 'lucide-react';",
  "import { Sun, Moon, FileText } from 'lucide-react';\nimport { useAppStore } from '../../store/useAppStore';"
);

code = code.replace(
  "export const EnvironmentControls3D: React.FC<EnvironmentControls3DProps> = ({",
  "export const EnvironmentControls3D: React.FC<EnvironmentControls3DProps> = ({\n"
);

code = code.replace(
  "  setEnableRealisticDepth,\n}) => {",
  "  setEnableRealisticDepth,\n}) => {\n  const orthoLock = useAppStore(state => state.orthoLock);"
);

const newButton = `
      {orthoLock && (
        <button
          onClick={(e) => e.stopPropagation()}
          className={\`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-sm pointer-events-auto cursor-pointer \${
            isLightMode
              ? 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-slate-50'
              : 'bg-slate-800/90 text-slate-200 border-slate-700/60 hover:bg-slate-700'
          }\`}
          title="Set PDF Elevation"
        >
          <FileText size={13} className={isLightMode ? "text-slate-500" : "text-slate-400"} />
          <span>Set PDF Elevation</span>
        </button>
      )}
`;

code = code.replace(
  "      </button>\n    </div>",
  "      </button>\n" + newButton + "    </div>"
);

fs.writeFileSync('src/components/TileCanvas3D/EnvironmentControls3D.tsx', code);
