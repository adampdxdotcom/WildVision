import { StateCreator } from 'zustand';
import { supabase } from '../../utils/supabaseClient';

export interface ActiveAiModel {
  api_slug: string;
  cost_input_usd: number;
  cost_1k_out_usd: number;
  cost_4k_out_usd: number;
}

export interface AiRenderItem {
  id: string;
  imageUrl?: string;
  sourceImage?: string;
  cameraPosition?: number[];
  cameraTarget?: number[];
  cameraFov?: number;
  prompt?: string;
  created_at?: string;
  camera_state?: any;
  prompt_tokens?: number;
  output_images?: number;
  parent_id?: string | null;
  model_used?: string;
  output_tokens?: number;
  name?: string;
  notes?: string;
}

export interface AiRenderSlice {
  capture3DTrigger: number;
  setCapture3DTrigger: (val: number | ((prev: number) => number)) => void;
  reset3DTrigger: number;
  setReset3DTrigger: (val: number | ((prev: number) => number)) => void;
  captured3DImage: string | null;
  setCaptured3DImage: (val: string | null | ((prev: string | null) => string | null)) => void;
  wildVisionPrompt: string;
  setWildVisionPrompt: (val: string | ((prev: string) => string)) => void;
  overlayFocalLength: number | null;
  setOverlayFocalLength: (val: number | null | ((prev: number | null) => number | null)) => void;
  isWildVisionOpen: boolean;
  setIsWildVisionOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  generatedRenders: AiRenderItem[];
  setGeneratedRenders: (
    val:
      | AiRenderItem[]
      | ((prev: AiRenderItem[]) => AiRenderItem[])
  ) => void;
  updateRenderDetails: (renderId: string, updates: { name?: string; notes?: string }) => Promise<void>;
  activeView: 'canvas' | 'gallery';
  setActiveView: (view: 'canvas' | 'gallery') => void;
  monthlyRenderCount: number;
  monthlyPromptTokens: number;
  monthlyOutputTokens: number;
  monthlyCreditsUsed: number;
  fetchMonthlyRenderCount: (userId: string) => Promise<void>;
  styleReferenceImage: string | null;
  setStyleReferenceImage: (val: string | null) => void;
  renderAspectRatio: '1:1' | '4:3' | '16:9' | '9:16';
  setRenderAspectRatio: (val: '1:1' | '4:3' | '16:9' | '9:16' | ((prev: '1:1' | '4:3' | '16:9' | '9:16') => '1:1' | '4:3' | '16:9' | '9:16')) => void;
  renderResolution: '1K' | '2K' | '4K';
  setRenderResolution: (val: '1K' | '2K' | '4K' | ((prev: '1K' | '2K' | '4K') => '1K' | '2K' | '4K')) => void;
  getRenderCreditCost: () => number;
  activeAiModel: ActiveAiModel | null;
  setActiveAiModel: (model: ActiveAiModel | null) => void;
}

export const createAiRenderSlice: StateCreator<any, [], [], AiRenderSlice> = (set, get) => ({
  capture3DTrigger: 0,
  setCapture3DTrigger: (updater) => set((state: any) => ({ capture3DTrigger: typeof updater === 'function' ? updater(state.capture3DTrigger) : updater })),
  reset3DTrigger: 0,
  setReset3DTrigger: (updater) => set((state: any) => ({ reset3DTrigger: typeof updater === 'function' ? updater(state.reset3DTrigger) : updater })),
  captured3DImage: null,
  setCaptured3DImage: (updater) => set((state: any) => ({ captured3DImage: typeof updater === 'function' ? updater(state.captured3DImage) : updater })),
  wildVisionPrompt: '',
  setWildVisionPrompt: (updater) => set((state: any) => ({ wildVisionPrompt: typeof updater === 'function' ? updater(state.wildVisionPrompt) : updater })),
  overlayFocalLength: null,
  setOverlayFocalLength: (updater) => set((state: any) => ({ overlayFocalLength: typeof updater === 'function' ? updater(state.overlayFocalLength) : updater })),
  isWildVisionOpen: false,
  setIsWildVisionOpen: (updater) => set((state: any) => ({ isWildVisionOpen: typeof updater === 'function' ? updater(state.isWildVisionOpen) : updater })),
  generatedRenders: [],
  setGeneratedRenders: (updater) => set((state: any) => ({ generatedRenders: typeof updater === 'function' ? updater(state.generatedRenders) : updater })),
  updateRenderDetails: async (renderId, updates) => {
    try {
      const { error } = await supabase
        .from('ai_renders')
        .update(updates)
        .eq('id', renderId);

      if (error) {
        throw error;
      }

      set((state: any) => ({
        generatedRenders: state.generatedRenders.map((render: any) =>
          render.id === renderId ? { ...render, ...updates } : render
        ),
      }));
    } catch (err) {
      console.error('Failed to update render details:', err);
      throw err;
    }
  },
  activeView: 'canvas',
  setActiveView: (viewName) => set({ activeView: viewName }),
  monthlyRenderCount: 0,
  monthlyPromptTokens: 0,
  monthlyOutputTokens: 0,
  monthlyCreditsUsed: 0,
  fetchMonthlyRenderCount: async (userId: string) => {
    try {
      const now = new Date();
      const current20th = new Date(now.getFullYear(), now.getMonth(), 20, 0, 0, 0);
      let billingStart = current20th;
      if (now < current20th) {
        const prevDate = new Date(current20th);
        prevDate.setMonth(prevDate.getMonth() - 1);
        billingStart = prevDate;
      }
      const isoString = billingStart.toISOString();

      const { data, error } = await supabase
        .from('ai_renders')
        .select('prompt_tokens, output_tokens, output_images, credit_cost')
        .eq('user_id', userId)
        .gte('created_at', isoString);

      if (error) {
        console.warn('Could not fetch monthly render details (unconfigured or database offline):', error.message || error);
        return;
      }

      const promptTokensSum = (data || []).reduce((acc: number, curr: any) => acc + (curr.prompt_tokens || 0), 0);
      const outputTokensSum = (data || []).reduce((acc: number, curr: any) => acc + (curr.output_tokens || 0), 0);
      const creditsUsedSum = (data || []).reduce((acc: number, curr: any) => acc + (curr.credit_cost !== undefined && curr.credit_cost !== null ? curr.credit_cost : (curr.output_images || 1)), 0);

      set({ 
        monthlyRenderCount: (data || []).length,
        monthlyPromptTokens: promptTokensSum,
        monthlyOutputTokens: outputTokensSum,
        monthlyCreditsUsed: creditsUsedSum
      });
    } catch (err) {
      console.warn('Exception in fetchMonthlyRenderCount (possibly unconfigured):', err);
    }
  },
  styleReferenceImage: null,
  setStyleReferenceImage: (val) => set({ styleReferenceImage: val }),
  renderAspectRatio: '4:3',
  setRenderAspectRatio: (updater) => set((state: any) => ({ renderAspectRatio: typeof updater === 'function' ? updater(state.renderAspectRatio) : updater })),
  renderResolution: '1K',
  setRenderResolution: (updater) => set((state: any) => ({ renderResolution: typeof updater === 'function' ? updater(state.renderResolution) : updater })),
  activeAiModel: null,
  setActiveAiModel: (model) => set({ activeAiModel: model }),

  getRenderCreditCost: () => {
    const res = get().renderResolution;
    return res === '4K' ? 2 : 1;
  },
});
