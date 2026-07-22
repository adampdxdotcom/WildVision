import { supabase } from './supabaseClient';
import { useAuthStore } from '../store/useAuthStore';

// Environment Detection
const isDev = import.meta.env.DEV || 
  (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.includes('dev-')
  ));

const environment = isDev ? 'development' : 'production';

/**
 * Core logging function that asynchronously saves a log entry to Supabase.
 * It runs in a fire-and-forget manner and is safe from throwing errors
 * that could interrupt the main application thread.
 */
async function saveLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: Record<string, any>) {
  try {
    const userId = useAuthStore.getState().user?.id || null;
    const mergedMetadata = {
      ...metadata,
      environment
    };

    // Execute fire-and-forget insert
    await supabase.from('system_logs').insert({
      level,
      message,
      user_id: userId,
      metadata: mergedMetadata
    });
  } catch (error) {
    // Silently handle error so logging failures do not crash the application
    console.error('Logger failed to write to database:', error);
  }
}

/**
 * Centralized logging utility that outputs to browser console and records to database.
 */
export const logger = {
  info(message: string, metadata?: Record<string, any>) {
    console.info(message, metadata);
    saveLog('INFO', message, metadata);
  },
  
  warn(message: string, metadata?: Record<string, any>) {
    console.warn(message, metadata);
    saveLog('WARN', message, metadata);
  },

  error(message: string, metadata?: Record<string, any>) {
    console.error(message, metadata);
    saveLog('ERROR', message, metadata);
  }
};
