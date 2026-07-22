import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { generateUserDataArchive } from '../utils/dataExporter';
import { logger } from '../utils/logger';

export interface UseDataExportReturn {
  executeExport: () => Promise<void>;
  isExporting: boolean;
  progressMessage: string;
}

/**
 * Hook to manage loading state, progress feedback, and error notifications
 * for downloading the user's saved layouts and photorealistic images.
 */
export const useDataExport = (): UseDataExportReturn => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const user = useAuthStore((state) => state.user);
  const showToast = useAuthStore((state) => state.showToast);

  const executeExport = useCallback(async () => {
    if (!user || !user.id) {
      showToast("You must be logged in to export your data.", "error");
      return;
    }

    setIsExporting(true);
    setProgressMessage("Starting export...");

    try {
      logger.info('User initiated data export archive');
      await generateUserDataArchive(supabase, user.id, (message: string) => {
        setProgressMessage(message);
      });
      showToast("Data archive downloaded successfully!", "success");
    } catch (error: any) {
      console.error("Data export failed:", error);
      logger.error('Action failed', { error: error.message || String(error) });
      showToast(error?.message || "Data export failed. Please try again.", "error");
    } finally {
      setIsExporting(false);
      setProgressMessage('');
    }
  }, [user, showToast]);

  return {
    executeExport,
    isExporting,
    progressMessage,
  };
};
