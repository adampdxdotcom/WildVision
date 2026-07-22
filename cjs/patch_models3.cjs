const fs = require('fs');
let code = fs.readFileSync('src/components/Auth/AdminConsole/SystemSettingsTab.tsx', 'utf8');

const oldCard = `                <div key={model.id} className="border border-slate-200 dark:border-slate-800 rounded-md p-4 mb-3 flex items-start gap-4 bg-white dark:bg-slate-900">
                  <div className="pt-2">
                    <input
                      type="radio"
                      name="activeModel"
                      checked={model.is_active}
                      onChange={() => {
                        setModels(prev => prev.map(m => 
                          m.id === model.id ? { ...m, is_active: true } : { ...m, is_active: false }
                        ));
                        setActiveModel(model.api_slug);
                      }}
                      className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex gap-3 w-full">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Model Name</label>
                        <input
                          type="text"
                          value={model.name}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, name: e.target.value } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-medium"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">API Slug</label>
                        <input
                          type="text"
                          value={model.api_slug}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, api_slug: e.target.value } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 w-full">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Input Cost ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={model.cost_input_usd}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_input_usd: parseFloat(e.target.value) || 0 } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">1K Output ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={model.cost_1k_out_usd}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_1k_out_usd: parseFloat(e.target.value) || 0 } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">4K Output ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={model.cost_4k_out_usd}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_4k_out_usd: parseFloat(e.target.value) || 0 } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>`;

const newCard = `                <div key={model.id} className="relative border border-slate-200 dark:border-slate-800 rounded-md p-4 mb-3 flex items-start gap-4 bg-white dark:bg-slate-900 pr-10">
                  {!model.is_active && (
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(model.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition"
                      title="Delete Model"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="pt-2">
                    <input
                      type="radio"
                      name="activeModel"
                      checked={model.is_active}
                      onChange={() => handleActivateModel(model.id)}
                      className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex gap-3 w-full">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Model Name</label>
                        <input
                          type="text"
                          value={model.name}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, name: e.target.value } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-medium"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">API Slug</label>
                        <input
                          type="text"
                          value={model.api_slug}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, api_slug: e.target.value } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 w-full">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Input Cost ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={model.cost_input_usd}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_input_usd: parseFloat(e.target.value) || 0 } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">1K Output ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={model.cost_1k_out_usd}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_1k_out_usd: parseFloat(e.target.value) || 0 } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">4K Output ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={model.cost_4k_out_usd}
                          onChange={(e) => {
                            setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_4k_out_usd: parseFloat(e.target.value) || 0 } : m));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                    </div>
                    {isModelDirty(model.id) && (
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveModel(model.id)}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded text-xs font-bold transition shadow-sm"
                        >
                          <Save size={12} />
                          <span>Save Edits</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>`;

code = code.replace(oldCard, newCard);

fs.writeFileSync('src/components/Auth/AdminConsole/SystemSettingsTab.tsx', code);
