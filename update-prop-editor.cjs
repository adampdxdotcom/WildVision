const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/ActivePropEditor.tsx', 'utf8');

const calcInsert = `
  const objHeight = activeObject.metadata?.dimensions?.[1] || 0;
  const restingFloorY = -(roomDimensions.height / 2) + (objHeight / 2);
  const displayElevation = Math.max(0, activeObject.position[1] - restingFloorY);

  return (`;

code = code.replace(/return \(/, calcInsert);

const sliderRegex = /Elevation from Floor[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/;

const newSliderBlock = `Elevation from Floor
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, roomDimensions.height - objHeight)}
                step={0.5}
                value={displayElevation}
                onChange={(e) => {
                  const sliderValue = parseFloat(e.target.value) || 0;
                  const newTrueY = restingFloorY + sliderValue;
                  updateSceneObject(activeObjectId, { position: [activeObject.position[0], newTrueY, activeObject.position[2]] });
                }}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, roomDimensions.height - objHeight)}
                  step={0.5}
                  value={Number(displayElevation.toFixed(2))}
                  onChange={(e) => {
                    const sliderValue = parseFloat(e.target.value) || 0;
                    const newTrueY = restingFloorY + sliderValue;
                    updateSceneObject(activeObjectId, { position: [activeObject.position[0], newTrueY, activeObject.position[2]] });
                  }}
                  className="w-14 px-1.5 py-1 border rounded text-[10px] font-semibold bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-500 text-right pr-4"
                />
                <span className="absolute right-1 top-1 text-[9px] text-slate-400 font-medium">in</span>
              </div>
            </div>
          </div>
        </div>`;

code = code.replace(/Elevation from Floor[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/, newSliderBlock);

fs.writeFileSync('src/components/Sidebar/ActivePropEditor.tsx', code);
