// src/store/slices/integrationSlice.ts
import { StateCreator } from 'zustand';
import { supabase } from '../../utils/supabaseClient';

export interface SubfloorProject {
  id: number;
  name: string;
}

export interface SubfloorProduct {
  variant_id: string;
  product_name: string;
  variant_name: string;
  dimensions: string;
  carton_size: number | null;
  is_project_sample?: boolean;
  pricing_unit: string | null;
  unit_cost: number | null;
  retail_price: number | null;
  hex_color: string | null;
  visual_shape: string | null;
}

export interface IntegrationData {
  variant_id?: string;
  carton_size?: number;
  product_name?: string;
  variant_name?: string;
  retail_price?: number;
  unit_cost?: number;
  pricing_unit?: string;
}

export interface IntegrationSlice {
  subfloorUrl: string | null;
  subfloorApiKey: string | null;
  isSavingCredentials: boolean;
  saveError: string | null;
  saveSubfloorCredentials: (url: string | null, apiKey: string | null) => Promise<void>;

  // Step 5 & 6 properties
  subfloorProjects: SubfloorProject[];
  subfloorProducts: SubfloorProduct[];
  linkedSubfloorProjectId: number | null;
  isFetchingIntegration: boolean;
  integrationData: IntegrationData | null;

  // Step 7 properties
  isExportingQuantities: boolean;
  isExportingMedia: boolean;
  isPushingEstimate: boolean;
  pushEstimateError: string | null;
  isEstimateLocked: boolean;
  isPushingDocument: boolean;
  pushDocumentError: string | null;

  // Actions
  fetchSubfloorProjects: () => Promise<void>;
  fetchSubfloorProducts: (projectId?: number) => Promise<void>;
  linkProject: (id: number | null) => void;
  setIntegrationData: (data: IntegrationData | null) => void;
  exportQuantitiesToSubfloor: (payload: any) => Promise<void>;
  exportMediaToSubfloor: (imageUrl: string, caption: string) => Promise<void>;
  pushEstimateToSubfloor: (estimateData: any) => Promise<boolean>;
  pushDocumentToSubfloor: (pdfBase64: string, filename: string) => Promise<boolean>;
  syncLinkToSubfloor: (subfloorProjectId: number, currentWildVisionId: string) => Promise<boolean>;
}

export const createIntegrationSlice: StateCreator<any, [], [], IntegrationSlice> = (set, get) => {
  return {
    subfloorUrl: null, // Initialized as null, loaded dynamically
    subfloorApiKey: null, // Initialized as null, loaded dynamically
    isSavingCredentials: false,
    saveError: null,

    subfloorProjects: [],
    subfloorProducts: [],
    linkedSubfloorProjectId: null,
    isFetchingIntegration: false,
    integrationData: null,

    isExportingQuantities: false,
    isExportingMedia: false,
    isPushingEstimate: false,
    pushEstimateError: null,
    isEstimateLocked: false,
    isPushingDocument: false,
    pushDocumentError: null,

    saveSubfloorCredentials: async (url, apiKey) => {
      set({ isSavingCredentials: true, saveError: null });
      try {
        const { useAuthStore } = await import('../useAuthStore');
        const user = useAuthStore.getState().user;
        if (!user) {
          throw new Error('No authenticated user session found.');
        }

        const { error } = await supabase
          .from('app_settings')
          .update({
            subfloor_url: url,
            subfloor_api_key: apiKey
          })
          .eq('id', 1);

        if (error) {
          throw error;
        }

        set({
          subfloorUrl: url,
          subfloorApiKey: apiKey,
          isSavingCredentials: false,
          saveError: null
        });

        // Sync with useAuthStore dynamically
        useAuthStore.setState({
          subfloor_url: url,
          subfloor_api_key: apiKey
        });

      } catch (err: any) {
        try {
          const { logger } = await import('../../utils/logger');
          logger.error('Failed to save Subfloor credentials', { error: err.message || err });
        } catch (logErr) {
          console.error('Logger import failed:', logErr);
        }

        set({
          isSavingCredentials: false,
          saveError: err.message || 'Failed to save Subfloor credentials'
        });
      }
    },

    fetchSubfloorProjects: async () => {
      set({ isFetchingIntegration: true });
      try {
        const { useAuthStore } = await import('../useAuthStore');
        const authState = useAuthStore.getState();
        const apiKey = authState.subfloor_api_key;
        if (!apiKey) {
          set({ isFetchingIntegration: false });
          return;
        }

        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: { endpoint: '/projects', method: 'GET' }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        const projects = Array.isArray(data) ? data : (data?.projects || []);
        set({ subfloorProjects: projects, isFetchingIntegration: false });
      } catch (err: any) {
        console.error('Failed to fetch Subfloor projects:', err);
        set({ isFetchingIntegration: false });
      }
    },

    fetchSubfloorProducts: async (projectId?: number) => {
      set({ isFetchingIntegration: true });
      try {
        const { useAuthStore } = await import('../useAuthStore');
        const authState = useAuthStore.getState();
        const apiKey = authState.subfloor_api_key;
        if (!apiKey) return;

        const endpoint = projectId ? `/products?project_id=${projectId}` : '/products';
        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: { endpoint, method: 'GET' }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        const products = Array.isArray(data) ? data : (data?.products || []);
        set({ subfloorProducts: products, isFetchingIntegration: false });
      } catch (err: any) {
        console.error('Failed to fetch Subfloor products:', err);
        set({ isFetchingIntegration: false });
      }
    },

    linkProject: (id) => {
      set({ linkedSubfloorProjectId: id });
      if (id !== null) {
        get().fetchSubfloorProducts(id);
      }
    },

    setIntegrationData: (data) => {
      set({ integrationData: data });
    },

    exportQuantitiesToSubfloor: async (payload) => {
      const projectId = get().linkedSubfloorProjectId;
      if (!projectId) {
        throw new Error('No linked Subfloor project found.');
      }
      set({ isExportingQuantities: true });
      try {
        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: {
            endpoint: `/projects/${projectId}/quantities`,
            method: 'POST',
            body: payload
          }
        });
        if (error) throw error;
        set({ isExportingQuantities: false });
      } catch (err: any) {
        set({ isExportingQuantities: false });
        console.error('Failed to export quantities to Subfloor:', err);
        throw err;
      }
    },

    exportMediaToSubfloor: async (imageUrl, caption) => {
      const projectId = get().linkedSubfloorProjectId;
      if (!projectId) {
        throw new Error('No linked Subfloor project found.');
      }
      set({ isExportingMedia: true });
      try {
        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: {
            endpoint: `/projects/${projectId}/media`,
            method: 'POST',
            body: { imageUrl, caption }
          }
        });
        if (error) throw error;
        set({ isExportingMedia: false });
      } catch (err: any) {
        set({ isExportingMedia: false });
        console.error('Failed to export media to Subfloor:', err);
        throw err;
      }
    },

    pushEstimateToSubfloor: async (estimateData) => {
      const linkedSubfloorProjectId = get().linkedSubfloorProjectId;
      if (!linkedSubfloorProjectId) {
        set({ pushEstimateError: 'No linked Subfloor project found.' });
        return false;
      }
      
      set({ isPushingEstimate: true, pushEstimateError: null });
      try {
        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: {
            endpoint: `/projects/${linkedSubfloorProjectId}/quantities`,
            method: 'POST',
            body: estimateData
          }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        set({ isPushingEstimate: false, isEstimateLocked: false });
        return true;
      } catch (err: any) {
        console.error('Failed to push estimate to Subfloor:', err);
        
        let errorMsg = err.message || 'An error occurred while pushing estimate.';
        let isLocked = false;
        
        if (errorMsg.includes('locked Purchase Order') || err?.context?.status === 409 || err.status === 409) {
          isLocked = true;
          errorMsg = "Subfloor has already locked and purchased materials for this project.";
        }
        
        set({ 
          isPushingEstimate: false, 
          pushEstimateError: errorMsg,
          isEstimateLocked: isLocked
        });
        return false;
      }
    },

    pushDocumentToSubfloor: async (pdfBase64, filename) => {
      const linkedSubfloorProjectId = get().linkedSubfloorProjectId;
      if (!linkedSubfloorProjectId) {
        set({ pushDocumentError: 'No linked Subfloor project found.' });
        return false;
      }
      
      set({ isPushingDocument: true, pushDocumentError: null });
      try {
        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: {
            endpoint: `/projects/${linkedSubfloorProjectId}/documents`,
            method: 'POST',
            body: { pdfBase64, filename }
          }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        set({ isPushingDocument: false });
        return true;
      } catch (err: any) {
        console.error('Failed to push document to Subfloor:', err);
        set({ 
          isPushingDocument: false, 
          pushDocumentError: err.message || 'An error occurred while pushing document.' 
        });
        return false;
      }
    },

    syncLinkToSubfloor: async (subfloorProjectId, currentWildVisionId) => {
      try {
        const { data, error } = await supabase.functions.invoke('subfloor-proxy', {
          body: {
            endpoint: `/projects/${subfloorProjectId}/link`,
            method: 'PATCH',
            body: { wildvisionId: currentWildVisionId }
          }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        return true;
      } catch (err: any) {
        console.error('Failed to sync link to Subfloor:', err);
        return false;
      }
    }
  };
};