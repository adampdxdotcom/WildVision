import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  subfloor_url: string | null;
  subfloor_api_key: string | null;
  isPasswordResetRequired: boolean;
  setPasswordResetRequired: (required: boolean) => void;
  updateProfileNames: (firstName: string | null, lastName: string | null) => void;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  authReasonMessage: string | null;
  openAuthModal: (message?: string | null) => void;
  closeAuthModal: () => void;
  toastMessage: { text: string; type: 'success' | 'error' } | null;
  showToast: (text: string, type: 'success' | 'error') => void;
  clearToast: () => void;
}

const fetchUserProfile = async (userId: string): Promise<{ role: string; avatar_url: string | null; first_name: string | null; last_name: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, avatar_url, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching user profile:', error);
      return { role: 'free', avatar_url: null, first_name: null, last_name: null };
    }
    return {
      role: data?.role ?? 'free',
      avatar_url: data?.avatar_url ?? null,
      first_name: data?.first_name ?? null,
      last_name: data?.last_name ?? null,
    };
  } catch (err) {
    console.error('Exception fetching user profile:', err);
    return { role: 'free', avatar_url: null, first_name: null, last_name: null };
  }
};

const fetchSubfloorSettings = async (): Promise<{ subfloor_url: string | null; subfloor_api_key: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('subfloor_url, subfloor_api_key')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching subfloor settings:', error);
      return { subfloor_url: null, subfloor_api_key: null };
    }
    return {
      subfloor_url: data?.subfloor_url ?? null,
      subfloor_api_key: data?.subfloor_api_key ?? null,
    };
  } catch (err) {
    console.error('Exception fetching subfloor settings:', err);
    return { subfloor_url: null, subfloor_api_key: null };
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  role: null,
  avatar_url: null,
  first_name: null,
  last_name: null,
  subfloor_url: null,
  subfloor_api_key: null,
  isAuthModalOpen: false,
  authReasonMessage: null,
  isPasswordResetRequired: false,
  toastMessage: null,

  openAuthModal: (message = null) => set({ isAuthModalOpen: true, authReasonMessage: message }),
  closeAuthModal: () => set({ isAuthModalOpen: false, authReasonMessage: null }),
  setPasswordResetRequired: (required: boolean) => set({ isPasswordResetRequired: required }),
  updateProfileNames: (firstName: string | null, lastName: string | null) => set({ first_name: firstName, last_name: lastName }),
  showToast: (text, type) => set({ toastMessage: { text, type } }),
  clearToast: () => set({ toastMessage: null }),

  initializeAuth: async () => {
    try {
      // 1. Get current active session
      const { data: { session } } = await supabase.auth.getSession();
      let role: string | null = null;
      let avatar_url: string | null = null;
      let first_name: string | null = null;
      let last_name: string | null = null;
      let subfloor_url: string | null = null;
      let subfloor_api_key: string | null = null;
      
      const settings = await fetchSubfloorSettings();
      subfloor_url = settings.subfloor_url;
      subfloor_api_key = settings.subfloor_api_key;

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        role = profile.role;
        avatar_url = profile.avatar_url;
        first_name = profile.first_name;
        last_name = profile.last_name;
      }
      set({
        session,
        user: session?.user ?? null,
        role,
        avatar_url,
        first_name,
        last_name,
        subfloor_url,
        subfloor_api_key,
        loading: false,
      });

      // 2. Listen to authentication state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        let role: string | null = null;
        let avatar_url: string | null = null;
        let first_name: string | null = null;
        let last_name: string | null = null;
        let subfloor_url: string | null = null;
        let subfloor_api_key: string | null = null;

        const settings = await fetchSubfloorSettings();
        subfloor_url = settings.subfloor_url;
        subfloor_api_key = settings.subfloor_api_key;

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          role = profile.role;
          avatar_url = profile.avatar_url;
          first_name = profile.first_name;
          last_name = profile.last_name;
        }
        
        const updates: Partial<AuthState> = {
          session,
          user: session?.user ?? null,
          role,
          avatar_url,
          first_name,
          last_name,
          subfloor_url,
          subfloor_api_key,
          loading: false,
        };

        if (event === 'PASSWORD_RECOVERY') {
          updates.isPasswordResetRequired = true;
          console.log('[Auth] PASSWORD_RECOVERY event detected, setting isPasswordResetRequired to true.');
        }

        set(updates);
      });
    } catch (error) {
      console.error('Error during Supabase auth initialization:', error);
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, role: null, avatar_url: null, first_name: null, last_name: null, subfloor_url: null, subfloor_api_key: null });
      try {
        const { logger } = await import('../utils/logger');
        logger.info('User logged out');
      } catch (logErr) {
        console.warn('Failed to log user out event:', logErr);
      }
    } catch (error: any) {
      console.error('Error during Supabase sign out:', error);
      try {
        const { logger } = await import('../utils/logger');
        logger.error('Logout failed', { error: error.message || String(error) });
      } catch {}
    }
  },
}));
