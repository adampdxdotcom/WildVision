import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

if (!(import.meta as any).env.VITE_SUPABASE_URL || !(import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase configuration is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
