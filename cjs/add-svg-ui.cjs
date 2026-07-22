const fs = require('fs');
const file = 'src/components/Auth/AdminConsole/ModelLibraryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const svgUi = `
            {/* SVG Source Select */}
            <div className="space-y-1 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                2D SVG Blueprint (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSvgSource('url');
                    setSvgUploadError(null);
                  }}
                  className={\`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono uppercase transition \${
                    svgSource === 'url'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }\`}
                >
                  SVG URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSvgSource('upload');
                    setSvgUploadError(null);
                  }}
                  className={\`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono uppercase transition \${
                    svgSource === 'upload'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }\`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* SVG URL Input */}
            {svgSource === 'url' ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={svgUrl}
                  onChange={(e) => setSvgUrl(e.target.value)}
                  placeholder="Paste a direct .svg link"
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                />
              </div>
            ) : (
              /* File Drag and Drop zone */
              <div className="space-y-1">
                <div
                  onDragOver={handleSvgDragOver}
                  onDragLeave={handleSvgDragLeave}
                  onDrop={handleSvgDrop}
                  onClick={() => document.getElementById('admin-svg-file-input')?.click()}
                  className={\`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition \${
                    isDraggingSvg
                      ? 'border-indigo-500 bg-indigo-50/10'
                      : uploadSvgFile
                      ? 'border-emerald-500 bg-emerald-50/5'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-100/50'
                  }\`}
                >
                  <input
                    id="admin-svg-file-input"
                    type="file"
                    accept=".svg"
                    onChange={handleSvgFileChange}
                    className="hidden"
                  />
                  {uploadSvgFile ? (
                    <div className="space-y-1">
                      <Box className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {uploadSvgFile.name}
                      </p>
                      <p className="text-[9px] text-slate-455">
                        Click or drop another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-350">
                        Click or Drag .svg here
                      </p>
                      <p className="text-[9px] text-slate-455">
                        Max file size: 15MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
`;

const glbEndMarker = `                  )}
                </div>
              </div>
            )}`;

content = content.replace(glbEndMarker, glbEndMarker + "\n" + svgUi);
fs.writeFileSync(file, content);
