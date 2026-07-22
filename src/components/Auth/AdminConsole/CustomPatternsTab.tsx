import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAppStore } from '../../../store/useAppStore';
import { Upload, FileJson, RefreshCw, Loader2, Trash2, X, ShieldAlert, Plus } from 'lucide-react';

interface CustomPatternsTabProps {
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const CustomPatternsTab: React.FC<CustomPatternsTabProps> = ({
  setErrorMsg,
  setSuccessMsg,
}) => {
  // Pattern uploader state
  const [patternFile, setPatternFile] = useState<File | null>(null);
  const [isPatternDragging, setIsPatternDragging] = useState(false);
  const [patternUploadError, setPatternUploadError] = useState<string | null>(null);
  const [customPatterns, setCustomPatterns] = useState<any[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [isUploadingPattern, setIsUploadingPattern] = useState(false);

  // New React-based modal deletion state
  const [patternToDelete, setPatternToDelete] = useState<any | null>(null);
  const [isDeletingPattern, setIsDeletingPattern] = useState(false);

  const fetchCustomPatterns = async () => {
    setLoadingPatterns(true);
    setPatternUploadError(null);
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setCustomPatterns(data || []);
    } catch (err: any) {
      console.error('Error fetching custom patterns:', err);
      setPatternUploadError(`Failed to load custom patterns: ${err.message || err}`);
    } finally {
      setLoadingPatterns(false);
    }
  };

  const validatePatternJSON = (json: any): string | null => {
    if (!json || typeof json !== 'object') {
      return 'Invalid JSON object.';
    }
    if (typeof json.patternName !== 'string' || !json.patternName.trim()) {
      return 'Missing or invalid "patternName" (must be a non-empty string).';
    }
    if (typeof json.blockWidth !== 'number' || isNaN(json.blockWidth) || json.blockWidth <= 0) {
      return 'Missing or invalid "blockWidth" (must be a positive number).';
    }
    if (typeof json.blockHeight !== 'number' || isNaN(json.blockHeight) || json.blockHeight <= 0) {
      return 'Missing or invalid "blockHeight" (must be a positive number).';
    }
    if (!Array.isArray(json.tiles)) {
      return 'Missing or invalid "tiles" (must be an array).';
    }
    if (json.tiles.length === 0) {
      return 'The "tiles" array cannot be empty.';
    }
    for (let i = 0; i < json.tiles.length; i++) {
      const tile = json.tiles[i];
      if (!tile || typeof tile !== 'object') {
        return `Tile at index ${i} is not a valid object.`;
      }
    }
    return null;
  };

  const handlePatternDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPatternDragging(true);
  };

  const handlePatternDragLeave = () => {
    setIsPatternDragging(false);
  };

  const handlePatternDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPatternDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json')) {
        setPatternFile(file);
        setPatternUploadError(null);
      } else {
        setPatternUploadError('Only .json files are supported.');
      }
    }
  };

  const handlePatternFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.json')) {
        setPatternFile(file);
        setPatternUploadError(null);
      } else {
        setPatternUploadError('Only .json files are supported.');
      }
    }
  };

  const handleUploadPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternFile) {
      setPatternUploadError('Please select a JSON file to upload.');
      return;
    }

    setIsUploadingPattern(true);
    setPatternUploadError(null);

    try {
      const reader = new FileReader();
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(patternFile);
      });

      let parsedJSON: any;
      try {
        parsedJSON = JSON.parse(fileContent);
      } catch (parseErr) {
        throw new Error('Failed to parse file as JSON. Please ensure it is a valid JSON file.');
      }

      const validationError = validatePatternJSON(parsedJSON);
      if (validationError) {
        throw new Error(validationError);
      }

      const { error } = await supabase
        .from('custom_patterns')
        .insert({
          name: parsedJSON.patternName,
          pattern_data: parsedJSON
        });

      if (error) {
        throw error;
      }

      setSuccessMsg(`Successfully uploaded custom pattern "${parsedJSON.patternName}"!`);
      setPatternFile(null);
      
      const fileInput = document.getElementById('pattern-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await fetchCustomPatterns();
      try {
        await useAppStore.getState().fetchCustomPatternsList();
      } catch (storeErr) {
        console.warn('Failed to refresh global custom patterns list:', storeErr);
      }
    } catch (err: any) {
      console.error('Error uploading custom pattern:', err);
      setPatternUploadError(err.message || 'Failed to upload custom pattern.');
    } finally {
      setIsUploadingPattern(false);
    }
  };

  const executeDeletePattern = () => {
    if (!patternToDelete) return;

    console.log('FIRING RAW PROMISE DELETE FOR:', patternToDelete.id);

    if (!supabase) {
      console.error('FATAL: supabase client is undefined!');
      setPatternUploadError('FATAL: supabase client is undefined!');
      setPatternToDelete(null);
      return;
    }

    setIsDeletingPattern(true);
    setPatternUploadError(null);

    Promise.resolve(
      supabase
        .from('custom_patterns')
        .delete()
        .eq('id', patternToDelete.id)
    )
      .then((response) => {
        console.log('SUPABASE RAW RESPONSE:', response);
        if (response.error) {
          console.error('SUPABASE RETURNED ERROR:', response.error);
          setPatternUploadError(`Failed to delete pattern: ${response.error.message || response.error}`);
        } else {
          console.log('SUCCESSFUL DELETE. UPDATING UI.');
          setSuccessMsg(`Successfully deleted pattern "${patternToDelete.name}".`);
          setCustomPatterns((prev) => prev.filter((p) => p.id !== patternToDelete.id));
          
          Promise.resolve(useAppStore.getState().fetchCustomPatternsList())
            .then(() => {
              console.log('Global custom patterns list refreshed successfully');
            })
            .catch((storeErr) => {
              console.warn('Failed to refresh global custom patterns list:', storeErr);
            });
        }
        setPatternToDelete(null);
      })
      .catch((err) => {
        console.error('PROMISE CATCH FATAL ERROR:', err);
        setPatternUploadError(`Failed to delete pattern: ${err.message || err}`);
        setPatternToDelete(null);
      })
      .finally(() => {
        setIsDeletingPattern(false);
      });
  };

  useEffect(() => {
    fetchCustomPatterns();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
          Custom Layout Patterns
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Upload and manage custom layout tessellations. These patterns will be stored as JSONB files in the database and made available for complex tile rendering.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Uploader */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-rose-500" />
            Upload Pattern File
          </h4>

          <form onSubmit={handleUploadPattern} className="space-y-3.5">
            {/* File Drag and Drop zone */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                Drag & Drop JSON file
              </label>
              <div
                onDragOver={handlePatternDragOver}
                onDragLeave={handlePatternDragLeave}
                onDrop={handlePatternDrop}
                onClick={() => document.getElementById('pattern-file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                  isPatternDragging
                    ? 'border-indigo-500 bg-indigo-50/10'
                    : patternFile
                    ? 'border-emerald-500 bg-emerald-50/5'
                    : 'border-slate-200 dark:border-slate-850 hover:bg-slate-100/50'
                }`}
              >
                <input
                  id="pattern-file-input"
                  type="file"
                  accept=".json"
                  onChange={handlePatternFileChange}
                  className="hidden"
                />
                {patternFile ? (
                  <div className="space-y-1">
                    <FileJson className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-full">
                      {patternFile.name}
                    </p>
                    <p className="text-[9px] text-slate-450">
                      Click or drop another file to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-350">
                      Click or Drag .json here
                    </p>
                    <p className="text-[9px] text-slate-450">
                      Must follow Phase 1 pattern schema
                    </p>
                  </div>
                )}
              </div>
            </div>

            {patternUploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-[11px] font-mono leading-relaxed">
                {patternUploadError}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploadingPattern || !patternFile}
              className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer transition font-mono uppercase tracking-wider h-[38px]"
            >
              {isUploadingPattern ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Pattern...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Pattern</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
              Or Design Visually
            </span>
            <button
              type="button"
              onClick={() => {
                const store = useAppStore.getState();
                let schema = store.activeCustomPattern;
                if (schema) {
                  if (typeof schema === 'string') {
                    try {
                      schema = JSON.parse(schema);
                    } catch (e) {
                      console.error("Failed to parse custom pattern JSON", e);
                    }
                  }
                  if (typeof schema === 'object') {
                    const activeStr = JSON.stringify(store.activeCustomPattern);
                    const dbId = store.customPatternsList?.find(p => JSON.stringify(p.pattern_data) === activeStr)?.id;
                    store.loadFromSchema(schema, dbId);
                  }
                }
                store.setViewMode('pattern_studio');
                store.setIsAdminConsoleOpen(false);
              }}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Launch Pattern Studio
            </button>
          </div>
        </div>

        {/* Right Column: Existing Patterns List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono">
              Current Patterns ({customPatterns.length})
            </h4>
            <button
              type="button"
              onClick={fetchCustomPatterns}
              disabled={loadingPatterns}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition cursor-pointer"
              title="Refresh patterns list"
            >
              <RefreshCw size={12} className={loadingPatterns ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono border-b border-slate-150 dark:border-slate-850">
                  <tr>
                    <th className="px-4 py-2.5">Pattern Name</th>
                    <th className="px-3 py-2.5">Block Bounds</th>
                    <th className="px-3 py-2.5">Tiles Count</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60">
                  {loadingPatterns && customPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Loading custom patterns...</span>
                        </div>
                      </td>
                    </tr>
                  ) : customPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No custom patterns found in the database.
                      </td>
                    </tr>
                  ) : (
                    customPatterns.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300 font-semibold">
                        <td className="px-4 py-3 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 shrink-0">
                              <FileJson className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs truncate max-w-[200px]">{p.name}</p>
                              <p className="text-[9px] text-slate-455 font-mono truncate max-w-[200px]" title={p.id}>
                                ID: {p.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[10.5px]">
                          {p.pattern_data?.blockWidth && p.pattern_data?.blockHeight
                            ? `${p.pattern_data.blockWidth}" × ${p.pattern_data.blockHeight}"`
                            : 'N/A'}
                        </td>
                        <td className="px-3 py-3 font-mono text-[10.5px]">
                          {Array.isArray(p.pattern_data?.tiles) ? p.pattern_data.tiles.length : 0}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPatternToDelete(p)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition cursor-pointer animate-fade-in"
                            title="Delete pattern"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Pattern React Confirmation Modal */}
      {patternToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setPatternToDelete(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-slate-900 dark:text-white z-[130]">
            <div className="flex items-center gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                <ShieldAlert size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-rose-655 dark:text-rose-400">
                Delete Custom Pattern
              </h3>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                Are you sure you want to delete this custom pattern?
              </p>
              <div className="bg-slate-50 dark:bg-slate-955/50 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 text-[11px] font-mono space-y-1 text-slate-500 dark:text-slate-400">
                <div><strong className="text-slate-700 dark:text-slate-300">Name:</strong> {patternToDelete.name}</div>
                <div><strong className="text-slate-700 dark:text-slate-300">ID:</strong> {patternToDelete.id}</div>
                <div><strong className="text-slate-700 dark:text-slate-300">Block Bounds:</strong> {patternToDelete.pattern_data?.blockWidth}" × {patternToDelete.pattern_data?.blockHeight}"</div>
                <div><strong className="text-slate-700 dark:text-slate-300">Tiles Count:</strong> {Array.isArray(patternToDelete.pattern_data?.tiles) ? patternToDelete.pattern_data.tiles.length : 0}</div>
              </div>
              <p className="text-[10.5px] text-rose-500 font-bold leading-relaxed">
                Warning: This action is permanent, completely removes this pattern from the database, and cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPatternToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPattern}
                onClick={executeDeletePattern}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 h-[36px]"
              >
                {isDeletingPattern ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Pattern</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
