import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { logger } from '../../../utils/logger';
import { Users, Database, Cpu, RefreshCw, Loader2, Save, Trash2, Plus } from 'lucide-react';

interface SystemSettingsTabProps {
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

interface AiModel {
  id: string;
  name: string;
  api_slug: string;
  cost_input_usd: number;
  cost_1k_out_usd: number;
  cost_4k_out_usd: number;
  is_active: boolean;
}

export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { role } = useAuthStore();
  const isAuthorized = role === 'admin';

  // App Settings State
  const [activeModel, setActiveModel] = useState('gemini-3-pro-image');
  const [models, setModels] = useState<AiModel[]>([]);
  const [originalModels, setOriginalModels] = useState<AiModel[]>([]);
  const [newModel, setNewModel] = useState<Partial<AiModel> | null>(null);
  const [basePrompt, setBasePrompt] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [subfloorUrl, setSubfloorUrl] = useState('');
  const [subfloorApiKey, setSubfloorApiKey] = useState('');

  // Stats State
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalGenerations, setTotalGenerations] = useState<number | null>(null);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);

  // Loading States
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Connection status states
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase.from('ai_models').select('*').order('name');
      if (!error && data) {
        setModels(data);
        setOriginalModels(JSON.parse(JSON.stringify(data)));
      }
    } catch (err) {
      console.error('Error fetching ai_models:', err);
    }
  };


  const fetchSettings = async () => {
    setLoadingSettings(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setActiveModel(data.active_model || 'gemini-3-pro-image');
        setBasePrompt(data.base_prompt || '');
        setMaintenanceMode(!!data.maintenance_mode);
        setSubfloorUrl(data.subfloor_url || '');
        setSubfloorApiKey(data.subfloor_api_key || '');
      }
    } catch (err: any) {
      console.error('Error fetching app settings:', err);
      setErrorMsg(`Failed to load system settings: ${err.message || err}`);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingStats(true);
    try {
      // 1. Total Users
      const { count: userCount, error: userErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (userErr) throw userErr;
      setTotalUsers(userCount);

      // 2. Total AI Generations
      const { count: genCount, error: genErr } = await supabase
        .from('ai_renders')
        .select('*', { count: 'exact', head: true });
      if (genErr) throw genErr;
      setTotalGenerations(genCount);

      // 3. Total Token Spend
      const { data: renderData, error: renderErr } = await supabase
        .from('ai_renders')
        .select('prompt_tokens'); // sum prompt_tokens & any other potential token columns
      
      if (renderErr) throw renderErr;

      let sumTokens = 0;
      if (renderData) {
        sumTokens = renderData.reduce((acc, curr: any) => {
          const p = curr.prompt_tokens || 0;
          const o = curr.output_tokens || 0;
          const t = curr.total_tokens || 0;
          return acc + p + o + t;
        }, 0);
      }
      setTotalTokens(sumTokens);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setErrorMsg(`Failed to load global analytics: ${err.message || err}`);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveModel = async (modelId: string) => {
    const modelToSave = models.find(m => m.id === modelId);
    if (!modelToSave) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({
          name: modelToSave.name,
          api_slug: modelToSave.api_slug,
          cost_input_usd: modelToSave.cost_input_usd,
          cost_1k_out_usd: modelToSave.cost_1k_out_usd,
          cost_4k_out_usd: modelToSave.cost_4k_out_usd
        })
        .eq('id', modelId);
      if (error) throw error;
      setSuccessMsg('Model updated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(`Error updating model: ${err.message}`);
    }
  };

  const handleActivateModel = async (modelId: string) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: true })
        .eq('id', modelId);
      if (error) throw error;
      const activatedModel = models.find(m => m.id === modelId);
      if (activatedModel) {
        setActiveModel(activatedModel.api_slug);
      }
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(`Error activating model: ${err.message}`);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId);
      if (error) throw error;
      setSuccessMsg('Model deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(`Error deleting model: ${err.message}`);
    }
  };

  const isModelDirty = (modelId: string) => {
    const current = models.find(m => m.id === modelId);
    const original = originalModels.find(m => m.id === modelId);
    if (!current || !original) return false;
    return current.name !== original.name ||
           current.api_slug !== original.api_slug ||
           current.cost_input_usd !== original.cost_input_usd ||
           current.cost_1k_out_usd !== original.cost_1k_out_usd ||
           current.cost_4k_out_usd !== original.cost_4k_out_usd;
  };

  const handleCreateNewModel = async () => {
    if (!newModel) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .insert({
          name: newModel.name,
          api_slug: newModel.api_slug,
          cost_input_usd: newModel.cost_input_usd,
          cost_1k_out_usd: newModel.cost_1k_out_usd,
          cost_4k_out_usd: newModel.cost_4k_out_usd,
          is_active: false
        });
      if (error) throw error;
      setSuccessMsg('Model added successfully');
      setNewModel(null);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(`Error creating model: ${err.message}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;

    setSavingSettings(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          active_model: activeModel,
          base_prompt: basePrompt,
          maintenance_mode: maintenanceMode,
          subfloor_url: subfloorUrl || null,
          subfloor_api_key: subfloorApiKey || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) {
        throw error;
      }

      logger.warn('Admin updated global application settings', {
        activeModel: activeModel,
        basePromptUpdated: !!basePrompt
      });
      setSuccessMsg('System settings successfully saved and synced with backend.');
      setTimeout(() => setSuccessMsg(null), 4000);

      // Immediately test connection after DB update completes
      if (subfloorUrl && subfloorApiKey) {
        setConnectionStatus('testing');
        setConnectionMessage('Verifying connection...');

        try {
          const { data, error: invokeError } = await supabase.functions.invoke('subfloor-proxy', {
            body: { endpoint: '/projects', method: 'GET' }
          });

          if (invokeError) {
            const status = (invokeError as any).status || (invokeError as any).statusCode || 500;
            if (status === 401) {
              setConnectionStatus('error');
              setConnectionMessage('Invalid Master API Key.');
            } else {
              setConnectionStatus('error');
              setConnectionMessage('Cannot reach server. Verify the URL.');
            }
          } else if (data && (data.error || data.status === 401)) {
            const errStr = String(data.error || '').toLowerCase();
            if (errStr.includes('unauthorized') || errStr.includes('api key') || errStr.includes('key')) {
              setConnectionStatus('error');
              setConnectionMessage('Invalid Master API Key.');
            } else {
              setConnectionStatus('error');
              setConnectionMessage('Cannot reach server. Verify the URL.');
            }
          } else {
            setConnectionStatus('success');
            setConnectionMessage('Connected successfully.');
          }
        } catch (err: any) {
          const status = err?.status || err?.statusCode || 500;
          if (status === 401) {
            setConnectionStatus('error');
            setConnectionMessage('Invalid Master API Key.');
          } else {
            setConnectionStatus('error');
            setConnectionMessage('Cannot reach server. Verify the URL.');
          }
        }
      }
    } catch (err: any) {
      console.error('Error saving app settings:', err);
      setErrorMsg(`Failed to save settings: ${err.message || err}`);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchSettings();
      fetchAnalytics();
      fetchModels();
    }
  }, [isAuthorized]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Global Analytics Section (Left 1/3) */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
            Global Analytics
          </h3>
          <button 
            type="button"
            onClick={fetchAnalytics}
            disabled={loadingStats}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw size={12} className={loadingStats ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Stat card 1: Users */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3.5">
            <div className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 p-2.5 rounded-lg shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Total Users
              </p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
                {loadingStats && totalUsers === null ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  totalUsers ?? 0
                )}
              </p>
            </div>
          </div>

          {/* Stat card 2: AI Generations */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3.5">
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-450 p-2.5 rounded-lg shrink-0">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Total AI Generations
              </p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
                {loadingStats && totalGenerations === null ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  totalGenerations ?? 0
                )}
              </p>
            </div>
          </div>

          {/* Stat card 3: Token Spend */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3.5">
            <div className="bg-rose-500/10 text-rose-600 dark:text-rose-455 p-2.5 rounded-lg shrink-0">
              <Cpu size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Total Token Spend
              </p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
                {loadingStats && totalTokens === null ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  totalTokens?.toLocaleString() ?? 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings Form (Right 2/3) */}
      <form onSubmit={handleSaveSettings} className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
            System Settings Manager
          </h3>
          {loadingSettings && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Fetching latest...
            </span>
          )}
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4.5 bg-white dark:bg-slate-900 shadow-sm">
          {/* Active Model Field */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
              Active Gemini Model
            </label>
            <div className="flex flex-col">
              {models.map(model => (
                <div key={model.id} className="relative border border-slate-200 dark:border-slate-800 rounded-md p-4 mb-3 flex items-start gap-4 bg-white dark:bg-slate-900 pr-10">
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
                </div>
              ))}

              {newModel && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 mb-3 flex items-start gap-4 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex gap-3 w-full">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Model Name</label>
                        <input
                          type="text"
                          value={newModel.name || ''}
                          onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-medium"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">API Slug</label>
                        <input
                          type="text"
                          value={newModel.api_slug || ''}
                          onChange={(e) => setNewModel({ ...newModel, api_slug: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 w-full">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Input Cost ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={newModel.cost_input_usd || 0}
                          onChange={(e) => setNewModel({ ...newModel, cost_input_usd: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">1K Output ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={newModel.cost_1k_out_usd || 0}
                          onChange={(e) => setNewModel({ ...newModel, cost_1k_out_usd: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">4K Output ($)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={newModel.cost_4k_out_usd || 0}
                          onChange={(e) => setNewModel({ ...newModel, cost_4k_out_usd: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setNewModel(null)}
                        className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded text-xs font-bold transition shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewModel}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-bold transition shadow-sm"
                      >
                        <Save size={12} />
                        <span>Save Model</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {!newModel && (
                <button
                  type="button"
                  onClick={() => setNewModel({ name: '', api_slug: '', cost_input_usd: 0, cost_1k_out_usd: 0, cost_4k_out_usd: 0, is_active: false })}
                  className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md py-3 flex items-center justify-center gap-2 transition cursor-pointer font-bold text-sm"
                >
                  <Plus size={16} />
                  <span>Add AI Model</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Default model key queried during remote generation.
            </p>
          </div>

          {/* Base Prompt Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
              Secret System Instructions (Base Prompt)
            </label>
            <textarea
              rows={6}
              required
              disabled={loadingSettings}
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder="Enter base prompt secret instructions..."
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-mono leading-relaxed resize-y min-h-[150px]"
            />
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              The core baseline constraints injected securely backend-side for all generations.
            </p>
          </div>

          {/* External Integrations Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
              External Integrations (Subfloor)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  Subfloor Instance URL
                </label>
                <input
                  type="url"
                  disabled={loadingSettings}
                  value={subfloorUrl}
                  onChange={(e) => setSubfloorUrl(e.target.value)}
                  placeholder="https://flooring.dumbleigh.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-medium"
                />
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Target API location for Subfloor contract handshakes.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  Subfloor Master API Key
                </label>
                <input
                  type="password"
                  disabled={loadingSettings}
                  value={subfloorApiKey}
                  onChange={(e) => setSubfloorApiKey(e.target.value)}
                  placeholder="sf_live_..."
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-mono leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Secret authorization token for Subfloor connection.
                </p>
              </div>
            </div>
          </div>

          {/* Maintenance Mode Toggle */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={loadingSettings}
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="mt-1 w-4.5 h-4.5 rounded text-rose-600 border-slate-300 focus:ring-rose-500 transition shrink-0"
              />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Maintenance Mode Active
                </p>
                <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                  If enabled, global non-admin API triggers will be temporarily paused with a notice message.
                </p>
              </div>
            </label>
          </div>

          {/* Save Button & Connection Status */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
            <div>
              {connectionStatus !== 'idle' && (
                <div className="flex items-center gap-2 text-xs font-bold font-mono">
                  {connectionStatus === 'testing' && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      <span className="text-slate-500 dark:text-slate-400">Verifying connection...</span>
                    </>
                  )}
                  {connectionStatus === 'success' && (
                    <>
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                      <span className="text-green-600 dark:text-green-400">{connectionMessage}</span>
                    </>
                  )}
                  {connectionStatus === 'error' && (
                    <>
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0" />
                      <span className="text-red-600 dark:text-red-400">{connectionMessage}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingSettings || savingSettings}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded shadow-xs hover:shadow-sm cursor-pointer transition select-none h-[36px] shrink-0"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
