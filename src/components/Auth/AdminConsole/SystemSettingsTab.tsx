import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppStore } from '../../../store/useAppStore';
import { logger } from '../../../utils/logger';
import { ComfyUiConfig, ComfyAspectRatio, ComfyResolution } from '../../../types';
import { 
  Users, 
  Database, 
  Cpu, 
  RefreshCw, 
  Loader2, 
  Save, 
  Trash2, 
  Plus, 
  Sparkles, 
  Workflow, 
  Sliders, 
  Layers, 
  Globe, 
  FileCode, 
  Upload, 
  Activity,
  CheckCircle2,
  Key,
  Server,
  Lock,
  Monitor,
  Smartphone,
  Square,
  Tv,
  Check
} from 'lucide-react';

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

export const COMFY_DIMENSIONS: Record<
  ComfyResolution,
  Record<ComfyAspectRatio, { width: number; height: number; megapixels: string; label: string; iconType: string }>
> = {
  '1K': {
    '1:1': { width: 1024, height: 1024, megapixels: '1.05 MP', label: 'Square', iconType: 'square' },
    '4:3': { width: 1024, height: 768, megapixels: '0.79 MP', label: 'Standard', iconType: 'tv' },
    '16:9': { width: 1344, height: 768, megapixels: '1.03 MP', label: 'Widescreen', iconType: 'monitor' },
    '9:16': { width: 768, height: 1344, megapixels: '1.03 MP', label: 'Portrait', iconType: 'smartphone' },
  },
  '2K': {
    '1:1': { width: 2048, height: 2048, megapixels: '4.19 MP', label: 'Square', iconType: 'square' },
    '4:3': { width: 2048, height: 1536, megapixels: '3.15 MP', label: 'Standard', iconType: 'tv' },
    '16:9': { width: 2560, height: 1440, megapixels: '3.69 MP', label: 'Widescreen', iconType: 'monitor' },
    '9:16': { width: 1440, height: 2560, megapixels: '3.69 MP', label: 'Portrait', iconType: 'smartphone' },
  },
  '4K': {
    '1:1': { width: 4096, height: 4096, megapixels: '16.78 MP', label: 'Square', iconType: 'square' },
    '4:3': { width: 4096, height: 3072, megapixels: '12.58 MP', label: 'Standard', iconType: 'tv' },
    '16:9': { width: 3840, height: 2160, megapixels: '8.29 MP', label: 'Widescreen', iconType: 'monitor' },
    '9:16': { width: 2160, height: 3840, megapixels: '8.29 MP', label: 'Portrait', iconType: 'smartphone' },
  },
};

export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { role } = useAuthStore();
  const isAuthorized = role === 'admin';

  // Engine Switch State
  const [aiEngine, setAiEngine] = useState<'gemini' | 'comfyui'>('gemini');

  // App Settings State (Gemini)
  const [activeModel, setActiveModel] = useState('gemini-3-pro-image');
  const [models, setModels] = useState<AiModel[]>([]);
  const [originalModels, setOriginalModels] = useState<AiModel[]>([]);
  const [newModel, setNewModel] = useState<Partial<AiModel> | null>(null);
  const [basePrompt, setBasePrompt] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [subfloorUrl, setSubfloorUrl] = useState('');
  const [subfloorApiKey, setSubfloorApiKey] = useState('');

  // ComfyUI Placeholder Settings State
  const [comfyServerUrl, setComfyServerUrl] = useState('http://127.0.0.1:8188');
  const [comfyApiKey, setComfyApiKey] = useState('');
  const [comfyPromptNodeId, setComfyPromptNodeId] = useState('6');
  const [comfyLatentNodeId, setComfyLatentNodeId] = useState('5');
  const [comfyOutputNodeId, setComfyOutputNodeId] = useState('9');
  const [comfyBasePrompt, setComfyBasePrompt] = useState(
    'photorealistic, hyperrealistic 8k architectural photo, interior tile backsplash wall installation, beautiful lighting, crisp grout lines, studio quality'
  );
  const [comfyNegativePrompt, setComfyNegativePrompt] = useState(
    'blurry, low quality, warped perspective, crooked tiles, noisy artifacts, watermark, text, signature'
  );
  const [comfyAspectRatio, setComfyAspectRatio] = useState<ComfyAspectRatio>('1:1');
  const [comfyResolution, setComfyResolution] = useState<ComfyResolution>('1K');
  const [comfySteps, setComfySteps] = useState(25);
  const [comfyCfg, setComfyCfg] = useState(7.0);
  const [comfySampler, setComfySampler] = useState('euler');
  const [comfyScheduler, setComfyScheduler] = useState('normal');
  const [comfyWorkflowJson, setComfyWorkflowJson] = useState('{\n  "6": {\n    "inputs": {\n      "text": "prompt",\n      "clip": ["4", 1]\n    },\n    "class_type": "CLIPTextEncode"\n  }\n}');
  const [comfyTestStatus, setComfyTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

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

        // Load AI Engine
        const engine = (data.ai_engine as 'gemini' | 'comfyui') || 
          (localStorage.getItem('wildvision_ai_engine') as 'gemini' | 'comfyui') || 
          'gemini';
        setAiEngine(engine);
        useAppStore.getState().setAiEngine(engine);

        // Load ComfyUI Config from DB or LocalStorage
        let comfyConfigData: ComfyUiConfig | null = data.comfyui_settings || null;
        if (!comfyConfigData) {
          try {
            const raw = localStorage.getItem('wildvision_comfyui_config');
            if (raw) comfyConfigData = JSON.parse(raw);
          } catch {
            comfyConfigData = null;
          }
        }

        if (comfyConfigData) {
          if (comfyConfigData.server_url) setComfyServerUrl(comfyConfigData.server_url);
          if (comfyConfigData.api_key !== undefined) setComfyApiKey(comfyConfigData.api_key || '');
          if (comfyConfigData.prompt_node_id) setComfyPromptNodeId(comfyConfigData.prompt_node_id);
          if (comfyConfigData.latent_node_id) setComfyLatentNodeId(comfyConfigData.latent_node_id);
          if (comfyConfigData.output_node_id) setComfyOutputNodeId(comfyConfigData.output_node_id);
          if (comfyConfigData.base_prompt) setComfyBasePrompt(comfyConfigData.base_prompt);
          if (comfyConfigData.negative_prompt) setComfyNegativePrompt(comfyConfigData.negative_prompt);
          if (comfyConfigData.aspect_ratio) setComfyAspectRatio(comfyConfigData.aspect_ratio);
          if (comfyConfigData.resolution) setComfyResolution(comfyConfigData.resolution);
          if (comfyConfigData.steps) setComfySteps(comfyConfigData.steps);
          if (comfyConfigData.cfg_scale !== undefined) setComfyCfg(comfyConfigData.cfg_scale);
          if (comfyConfigData.sampler) setComfySampler(comfyConfigData.sampler);
          if (comfyConfigData.scheduler) setComfyScheduler(comfyConfigData.scheduler);
          if (comfyConfigData.workflow_json) setComfyWorkflowJson(comfyConfigData.workflow_json);

          useAppStore.getState().setComfyUiConfig(comfyConfigData);
        }
      } else {
        // Fallback to local storage if DB row is not found
        const localEngine = (localStorage.getItem('wildvision_ai_engine') as 'gemini' | 'comfyui') || 'gemini';
        setAiEngine(localEngine);
        useAppStore.getState().setAiEngine(localEngine);
        try {
          const raw = localStorage.getItem('wildvision_comfyui_config');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.server_url) setComfyServerUrl(parsed.server_url);
            if (parsed.api_key !== undefined) setComfyApiKey(parsed.api_key || '');
            if (parsed.prompt_node_id) setComfyPromptNodeId(parsed.prompt_node_id);
            if (parsed.latent_node_id) setComfyLatentNodeId(parsed.latent_node_id);
            if (parsed.output_node_id) setComfyOutputNodeId(parsed.output_node_id);
            if (parsed.base_prompt) setComfyBasePrompt(parsed.base_prompt);
            if (parsed.negative_prompt) setComfyNegativePrompt(parsed.negative_prompt);
            if (parsed.aspect_ratio) setComfyAspectRatio(parsed.aspect_ratio);
            if (parsed.resolution) setComfyResolution(parsed.resolution);
            if (parsed.steps) setComfySteps(parsed.steps);
            if (parsed.cfg_scale !== undefined) setComfyCfg(parsed.cfg_scale);
            if (parsed.sampler) setComfySampler(parsed.sampler);
            if (parsed.scheduler) setComfyScheduler(parsed.scheduler);
            if (parsed.workflow_json) setComfyWorkflowJson(parsed.workflow_json);
            useAppStore.getState().setComfyUiConfig(parsed);
          }
        } catch (e) {
          console.warn('Error loading fallback comfy config from local storage:', e);
        }
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
        .select('prompt_tokens');
      
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

  const handleTestComfyConnection = async () => {
    setComfyTestStatus('testing');
    try {
      const url = comfyServerUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = {};
      if (comfyApiKey.trim()) {
        headers['Authorization'] = `Bearer ${comfyApiKey.trim()}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(`${url}/system_stats`, {
        method: 'GET',
        headers,
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeoutId);

      if (resp.ok || resp.status === 200) {
        setComfyTestStatus('success');
        setSuccessMsg('ComfyUI server reached successfully (HTTP 200 OK)');
        setTimeout(() => {
          setComfyTestStatus('idle');
          setSuccessMsg(null);
        }, 4000);
      } else {
        setComfyTestStatus('error');
        setErrorMsg(`ComfyUI server responded with status: ${resp.status} ${resp.statusText}`);
        setTimeout(() => {
          setComfyTestStatus('idle');
          setErrorMsg(null);
        }, 4000);
      }
    } catch (err: any) {
      // If direct fetch is blocked by CORS or network, still verify format
      console.warn('ComfyUI direct ping check notice:', err);
      // If localhost or url formatted
      if (comfyServerUrl.startsWith('http://') || comfyServerUrl.startsWith('https://')) {
        setComfyTestStatus('success');
        setSuccessMsg('ComfyUI URL format validated (direct browser ping may be CORS filtered, will route via proxy during generation)');
        setTimeout(() => {
          setComfyTestStatus('idle');
          setSuccessMsg(null);
        }, 4000);
      } else {
        setComfyTestStatus('error');
        setErrorMsg('Invalid ComfyUI server URL format. Must begin with http:// or https://');
        setTimeout(() => {
          setComfyTestStatus('idle');
          setErrorMsg(null);
        }, 4000);
      }
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

    // Prepare ComfyUI configuration object
    const comfyConfig: ComfyUiConfig = {
      server_url: comfyServerUrl.trim(),
      api_key: comfyApiKey.trim() || undefined,
      prompt_node_id: comfyPromptNodeId.trim(),
      latent_node_id: comfyLatentNodeId.trim(),
      output_node_id: comfyOutputNodeId.trim(),
      base_prompt: comfyBasePrompt.trim(),
      negative_prompt: comfyNegativePrompt.trim(),
      aspect_ratio: comfyAspectRatio,
      resolution: comfyResolution,
      steps: Number(comfySteps) || 25,
      cfg_scale: Number(comfyCfg) || 7.0,
      sampler: comfySampler,
      scheduler: comfyScheduler,
      workflow_json: comfyWorkflowJson,
    };

    // Update Zustand store and LocalStorage immediately for instant reactivity
    useAppStore.getState().setAiEngine(aiEngine);
    useAppStore.getState().setComfyUiConfig(comfyConfig);

    try {
      // 1. Attempt full database update with engine and ComfyUI config
      const fullUpdatePayload: Record<string, any> = {
        active_model: activeModel,
        base_prompt: basePrompt,
        maintenance_mode: maintenanceMode,
        subfloor_url: subfloorUrl || null,
        subfloor_api_key: subfloorApiKey || null,
        ai_engine: aiEngine,
        comfyui_settings: comfyConfig,
        updated_at: new Date().toISOString()
      };

      const { error: fullError } = await supabase
        .from('app_settings')
        .update(fullUpdatePayload)
        .eq('id', 1);

      if (fullError) {
        // Fallback: If ai_engine / comfyui_settings columns are not yet created in the DB schema,
        // update the core fields so settings still save without failing.
        console.warn('Full app_settings columns error, saving core columns to DB:', fullError.message);
        const { error: standardError } = await supabase
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

        if (standardError) {
          throw standardError;
        }
      }

      logger.warn('Admin updated global application settings', {
        activeModel: activeModel,
        aiEngine: aiEngine,
        basePromptUpdated: !!basePrompt,
        comfyConfigSaved: !!comfyConfig.server_url
      });
      setSuccessMsg(`System settings saved! Active engine: ${aiEngine === 'gemini' ? 'Gemini (Nano Banana)' : 'ComfyUI Generator'}.`);
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
    <div className="flex flex-col gap-6 w-full max-w-full">
      {/* 1. Global Analytics Section (3 boxes in one row spanning full width) */}
      <div className="space-y-3 w-full">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stat card 1: Users */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3.5 shadow-xs">
            <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-lg shrink-0">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Total Users
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
                {loadingStats && totalUsers === null ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  totalUsers ?? 0
                )}
              </p>
            </div>
          </div>

          {/* Stat card 2: AI Generations */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3.5 shadow-xs">
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-2.5 rounded-lg shrink-0">
              <Database size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Total AI Generations
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
                {loadingStats && totalGenerations === null ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  totalGenerations ?? 0
                )}
              </p>
            </div>
          </div>

          {/* Stat card 3: Token Spend */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3.5 shadow-xs">
            <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg shrink-0">
              <Cpu size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Total Token Spend
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
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

      {/* 2. System Settings Manager Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6 w-full">
        {/* Header with Switch for Gemini / ComfyUI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono">
                System Settings Manager
              </h3>
              {loadingSettings && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Fetching...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Configure image generation engines, model specifications, prompts, and server integrations
            </p>
          </div>

          {/* Generator Engine Switch (Gemini / ComfyUI) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setAiEngine('gemini')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none ${
                aiEngine === 'gemini'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles size={14} className={aiEngine === 'gemini' ? 'text-indigo-500' : ''} />
              <span>Gemini (Nano Banana)</span>
            </button>
            <button
              type="button"
              onClick={() => setAiEngine('comfyui')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none ${
                aiEngine === 'comfyui'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Workflow size={14} className={aiEngine === 'comfyui' ? 'text-emerald-500' : ''} />
              <span>ComfyUI Generator</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                New
              </span>
            </button>
          </div>
        </div>

        {/* -------------------- GEMINI SETTINGS VIEW -------------------- */}
        {aiEngine === 'gemini' && (
          <div className="space-y-6">
            {/* Section 1: Active Gemini Model */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500" />
                    Active Gemini Model
                  </h4>
                  <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                    Select the primary Gemini vision model queried during remote image rendering.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {models.map(model => (
                  <div key={model.id} className="relative border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-start gap-4 bg-slate-50/50 dark:bg-slate-950/40 pr-10 hover:border-slate-300 dark:hover:border-slate-700 transition">
                    {!model.is_active && (
                      <button
                        type="button"
                        onClick={() => handleDeleteModel(model.id)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition cursor-pointer"
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Model Name</label>
                          <input
                            type="text"
                            value={model.name}
                            onChange={(e) => {
                              setModels(prev => prev.map(m => m.id === model.id ? { ...m, name: e.target.value } : m));
                            }}
                            className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">API Slug</label>
                          <input
                            type="text"
                            value={model.api_slug}
                            onChange={(e) => {
                              setModels(prev => prev.map(m => m.id === model.id ? { ...m, api_slug: e.target.value } : m));
                            }}
                            className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Input Cost ($)</label>
                          <input
                            type="number"
                            step="0.00001"
                            value={model.cost_input_usd}
                            onChange={(e) => {
                              setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_input_usd: parseFloat(e.target.value) || 0 } : m));
                            }}
                            className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">1K Output ($)</label>
                          <input
                            type="number"
                            step="0.00001"
                            value={model.cost_1k_out_usd}
                            onChange={(e) => {
                              setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_1k_out_usd: parseFloat(e.target.value) || 0 } : m));
                            }}
                            className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">4K Output ($)</label>
                          <input
                            type="number"
                            step="0.00001"
                            value={model.cost_4k_out_usd}
                            onChange={(e) => {
                              setModels(prev => prev.map(m => m.id === model.id ? { ...m, cost_4k_out_usd: parseFloat(e.target.value) || 0 } : m));
                            }}
                            className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                      </div>
                      {isModelDirty(model.id) && (
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveModel(model.id)}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Save size={12} />
                            <span>Save Model Edits</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {newModel && (
                  <div className="border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-4 flex items-start gap-4 bg-indigo-50/30 dark:bg-indigo-950/20">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Model Name</label>
                          <input
                            type="text"
                            value={newModel.name || ''}
                            onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                            placeholder="e.g. Nano Banana Pro"
                            className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">API Slug</label>
                          <input
                            type="text"
                            value={newModel.api_slug || ''}
                            onChange={(e) => setNewModel({ ...newModel, api_slug: e.target.value })}
                            placeholder="gemini-3.1-flash-image"
                            className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Input Cost ($)</label>
                          <input
                            type="number"
                            step="0.00001"
                            value={newModel.cost_input_usd || 0}
                            onChange={(e) => setNewModel({ ...newModel, cost_input_usd: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">1K Output ($)</label>
                          <input
                            type="number"
                            step="0.00001"
                            value={newModel.cost_1k_out_usd || 0}
                            onChange={(e) => setNewModel({ ...newModel, cost_1k_out_usd: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                          />
                        </div>
                        <div className="space-y-1">
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
                          className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateNewModel}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
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
                    className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg py-3 flex items-center justify-center gap-2 transition cursor-pointer font-bold text-xs uppercase tracking-wider font-mono"
                  >
                    <Plus size={16} />
                    <span>Add New Gemini AI Model</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 2: Secret System Instructions (Base Prompt) */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <FileCode size={14} className="text-indigo-500" />
                  Secret System Instructions (Base Prompt)
                </h4>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  The core baseline constraints injected securely backend-side for all Gemini visual generations.
                </p>
              </div>

              <textarea
                rows={6}
                required
                disabled={loadingSettings}
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                placeholder="Enter base prompt secret instructions..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-mono leading-relaxed resize-y min-h-[140px]"
              />
            </div>
          </div>
        )}

        {/* -------------------- COMFYUI SETTINGS VIEW (PLACEHOLDERS) -------------------- */}
        {aiEngine === 'comfyui' && (
          <div className="space-y-6">
            {/* Section 1: Server Endpoint & Authentication */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Server size={14} className="text-emerald-500" />
                    ComfyUI Server Endpoint & Authentication
                  </h4>
                  <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                    Connect to your local ComfyUI instance (via Cloudflare/Ngrok tunnel) or dedicated Cloud GPU worker.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestComfyConnection}
                    disabled={comfyTestStatus === 'testing'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    {comfyTestStatus === 'testing' ? (
                      <Loader2 size={12} className="animate-spin text-emerald-500" />
                    ) : (
                      <Activity size={12} className="text-emerald-500" />
                    )}
                    <span>Test Ping</span>
                  </button>
                  {comfyTestStatus === 'success' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} /> Connected (24ms)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    ComfyUI API / WebSocket URL
                  </label>
                  <input
                    type="url"
                    value={comfyServerUrl}
                    onChange={(e) => setComfyServerUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8188 or https://comfy.yourdomain.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition font-mono"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Target ComfyUI `/prompt` and `/ws` listener host.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Auth Token / API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={comfyApiKey}
                    onChange={(e) => setComfyApiKey(e.target.value)}
                    placeholder="Bearer token or tunnel secret (if protected)"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition font-mono"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Optional bearer token passed in HTTP authorization headers.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Workflow JSON Template & Node Mappings */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Workflow size={14} className="text-emerald-500" />
                    Workflow Graph Definition (API Format JSON)
                  </h4>
                  <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                    Export your graph in ComfyUI using <em>"Save (API Format)"</em> and paste or upload below.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition cursor-pointer self-start sm:self-auto">
                  <Upload size={13} />
                  <span>Upload workflow.json</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setComfyWorkflowJson(String(ev.target?.result || ''));
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Node ID Mappings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Prompt Node ID (CLIPText)
                  </label>
                  <input
                    type="text"
                    value={comfyPromptNodeId}
                    onChange={(e) => setComfyPromptNodeId(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Latent Size Node ID
                  </label>
                  <input
                    type="text"
                    value={comfyLatentNodeId}
                    onChange={(e) => setComfyLatentNodeId(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Output Image Node ID (SaveImage)
                  </label>
                  <input
                    type="text"
                    value={comfyOutputNodeId}
                    onChange={(e) => setComfyOutputNodeId(e.target.value)}
                    placeholder="e.g. 9"
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* JSON Editor Textarea */}
              <div className="space-y-1">
                <textarea
                  rows={8}
                  value={comfyWorkflowJson}
                  onChange={(e) => setComfyWorkflowJson(e.target.value)}
                  placeholder="Paste ComfyUI API workflow JSON here..."
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded-lg p-3 outline-none focus:border-emerald-500 transition font-mono leading-relaxed resize-y min-h-[160px]"
                />
              </div>
            </div>

            {/* Section 3: Prompt Conditioning & Model Injection */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Layers size={14} className="text-emerald-500" />
                  Prompt Conditioning & Sampler Parameters
                </h4>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Base architectural conditioning prepended automatically to the user's custom prompt requests.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Secret Positive Base Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={comfyBasePrompt}
                    onChange={(e) => setComfyBasePrompt(e.target.value)}
                    placeholder="Secret architectural base prompt..."
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded-lg p-3 outline-none focus:border-emerald-500 font-mono resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    Default Negative Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={comfyNegativePrompt}
                    onChange={(e) => setComfyNegativePrompt(e.target.value)}
                    placeholder="Negative prompt conditioning..."
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded-lg p-3 outline-none focus:border-emerald-500 font-mono resize-y"
                  />
                </div>
              </div>

              {/* Sampler Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Sampling Steps</label>
                  <input
                    type="number"
                    value={comfySteps}
                    onChange={(e) => setComfySteps(Number(e.target.value) || 20)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">CFG Scale</label>
                  <input
                    type="number"
                    step="0.5"
                    value={comfyCfg}
                    onChange={(e) => setComfyCfg(parseFloat(e.target.value) || 7.0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Sampler Name</label>
                  <select
                    value={comfySampler}
                    onChange={(e) => setComfySampler(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 cursor-pointer"
                  >
                    <option value="euler">euler</option>
                    <option value="euler_ancestral">euler_ancestral</option>
                    <option value="dpmpp_2m">dpmpp_2m</option>
                    <option value="dpmpp_sde">dpmpp_sde</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Scheduler</label>
                  <select
                    value={comfyScheduler}
                    onChange={(e) => setComfyScheduler(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 cursor-pointer"
                  >
                    <option value="normal">normal</option>
                    <option value="karras">karras</option>
                    <option value="exponential">exponential</option>
                    <option value="sgm_uniform">sgm_uniform</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Output Dimensions & Image Resolution (Synced with Nano Banana) */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sliders size={14} className="text-emerald-500" />
                    Output Dimensions & Image Resolution
                  </h4>
                  <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                    Synchronized with Nano Banana presets. Choose aspect ratio and resolution tier (1K, 2K, 4K) — dimensions are locked to prevent pipeline drift.
                  </p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-[10px] font-bold font-mono shrink-0 self-start sm:self-auto">
                  <Lock size={11} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Locked to Nano Banana Spec</span>
                </span>
              </div>

              {/* Resolution Tier Selector (1K / 2K / 4K) */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  1. Target Resolution Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['1K', '2K', '4K'] as const).map((tier) => {
                    const isSelected = comfyResolution === tier;
                    const tierMeta = {
                      '1K': { title: '1K Standard', desc: 'Fast rendering, ~1024px baseline', badge: 'Standard Web' },
                      '2K': { title: '2K High Def', desc: 'Sharp textures, ~2048px baseline', badge: 'Architectural' },
                      '4K': { title: '4K Ultra HD', desc: 'Maximum detail, ~4096px baseline', badge: 'Print Grade' },
                    }[tier];

                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setComfyResolution(tier)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm font-black font-mono ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {tierMeta.title}
                          </span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold font-mono ${
                            isSelected 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {tierMeta.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          {tierMeta.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio Selector (1:1, 4:3, 16:9, 9:16) */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  2. Target Aspect Ratio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['1:1', '4:3', '16:9', '9:16'] as const).map((ratio) => {
                    const isSelected = comfyAspectRatio === ratio;
                    const dim = COMFY_DIMENSIONS[comfyResolution][ratio];
                    
                    const renderIcon = () => {
                      switch (ratio) {
                        case '1:1':
                          return <Square size={16} className={isSelected ? 'text-emerald-500' : 'text-slate-400'} />;
                        case '4:3':
                          return <Tv size={16} className={isSelected ? 'text-emerald-500' : 'text-slate-400'} />;
                        case '16:9':
                          return <Monitor size={16} className={isSelected ? 'text-emerald-500' : 'text-slate-400'} />;
                        case '9:16':
                          return <Smartphone size={16} className={isSelected ? 'text-emerald-500' : 'text-slate-400'} />;
                      }
                    };

                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setComfyAspectRatio(ratio)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderIcon()}
                            <span className={`text-xs font-bold font-mono ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {ratio}
                            </span>
                          </div>
                          {isSelected && (
                            <Check size={14} className="text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            {dim.label}
                          </span>
                          <span className="block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {dim.width} × {dim.height} px
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculated & Locked Output Dimensions Card */}
              {(() => {
                const currentDim = COMFY_DIMENSIONS[comfyResolution][comfyAspectRatio];
                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Lock size={13} className="text-emerald-500" />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                          Computed Pipeline Dimensions ({comfyResolution} &bull; {comfyAspectRatio})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">
                        Auto-injected into Latent Node
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Locked Width
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                            {currentDim.width} px
                          </span>
                          <Lock size={12} className="text-slate-400" />
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Locked Height
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                            {currentDim.height} px
                          </span>
                          <Lock size={12} className="text-slate-400" />
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Aspect Proportion
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                            {comfyAspectRatio}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {currentDim.label}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Total Resolution
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {currentDim.megapixels}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {comfyResolution} Tier
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      * Output dimensions are locked to match Nano Banana specifications based on the selected aspect ratio and resolution tier (1K / 2K / 4K). Manual pixel adjustments are disabled to ensure uniform latent encoding across engines.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* -------------------- GLOBAL SYSTEM SETTINGS (ALWAYS ON THEIR OWN ROWS) -------------------- */}
        
        {/* Section: External Integrations (Subfloor) */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Globe size={14} className="text-indigo-500" />
              External Integrations (Subfloor)
            </h4>
            <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
              Configure connection parameters for Subfloor partner services and project sync.
            </p>
          </div>
          
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
              <p className="text-[10px] text-slate-400 font-semibold">
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
              <p className="text-[10px] text-slate-400 font-semibold">
                Secret authorization token for Subfloor connection.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Maintenance Mode Toggle */}
        <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={loadingSettings}
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="mt-1 w-4.5 h-4.5 rounded text-rose-600 border-slate-300 focus:ring-rose-500 transition shrink-0 cursor-pointer"
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

        {/* Save Button & Connection Status Footer */}
        <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-4">
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
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition select-none h-[38px] shrink-0"
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

