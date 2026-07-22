import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useProjectLock = () => {
  const { currentProjectId, isLockedByAnotherTab, setIsLockedByAnotherTab } = useAppStore();

  // Create a unique stable tab ID using sessionStorage
  const tabId = useMemo(() => {
    if (typeof window === 'undefined') return 'server_tab';
    let id = sessionStorage.getItem('wildvision_tab_id');
    if (!id) {
      id = 'tab_' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('wildvision_tab_id', id);
    }
    return id;
  }, []);

  // Instantiate standard Web BroadcastChannel
  const channel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel('wildvision_project_lock');
    }
    return null;
  }, []);

  // Track the last project ID to gracefully release lock on navigation/unload
  const lastProjectIdRef = useRef<string | null>(null);

  // Effect 1: Handle release of previous project ID on navigation/unmount
  useEffect(() => {
    const oldId = lastProjectIdRef.current;
    if (oldId && oldId !== currentProjectId) {
      if (channel) {
        channel.postMessage({ type: 'RELEASE_PROJECT', projectId: oldId, tabId });
      }
    }
    lastProjectIdRef.current = currentProjectId;
  }, [currentProjectId, channel, tabId]);

  // Effect 2: Broadcast release of project lock on tab close/unload
  useEffect(() => {
    const handleUnload = () => {
      if (currentProjectId && channel) {
        channel.postMessage({ type: 'RELEASE_PROJECT', projectId: currentProjectId, tabId });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [currentProjectId, channel, tabId]);

  // Effect 3: Handle active status broadcasting and focus-based check-ins
  useEffect(() => {
    if (!currentProjectId || !channel) {
      // If we are not in a project, we are not locked
      if (isLockedByAnotherTab) {
        setIsLockedByAnotherTab(false);
      }
      return;
    }

    // On loading a project, query other tabs to check for active concurrent sessions
    setIsLockedByAnotherTab(false);
    channel.postMessage({ type: 'QUERY_ACTIVE', projectId: currentProjectId, tabId });

    // Define function to assert we are actively editing
    const announceActivity = () => {
      if (!useAppStore.getState().isLockedByAnotherTab) {
        channel.postMessage({ type: 'PING_ACTIVE', projectId: currentProjectId, tabId });
      }
    };

    // Broadcast our active state initially
    announceActivity();

    // Re-verify/ping on tab focus or visibility change to ensure state remains clean
    window.addEventListener('focus', announceActivity);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        announceActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', announceActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentProjectId, channel, tabId, setIsLockedByAnotherTab]);

  // Effect 4: BroadcastChannel Listener for incoming tab synchronization events
  useEffect(() => {
    if (!channel) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, projectId, tabId: senderTabId } = event.data;

      // Ignore our own broadcasted events
      if (senderTabId === tabId) return;

      const state = useAppStore.getState();
      const currentId = state.currentProjectId;

      // Only respond to messages concerning the active loaded project
      if (projectId !== currentId || !currentId) return;

      if (type === 'QUERY_ACTIVE') {
        // A secondary tab loaded the project and is querying active editors.
        // If we are currently active (unlocked), assert our dominance so the new tab locks itself.
        if (!state.isLockedByAnotherTab) {
          channel.postMessage({ type: 'PING_ACTIVE', projectId, tabId });
        }
      } else if (type === 'PING_ACTIVE') {
        // Another tab declared that they are actively editing this project.
        // We must lock our autosave state to prevent concurrent overwrite corruption.
        setIsLockedByAnotherTab(true);
      } else if (type === 'RELEASE_PROJECT') {
        // The active editing tab closed or exited to the browser.
        // We can safely release our lock and query if there are any other tabs remaining.
        if (state.isLockedByAnotherTab) {
          setIsLockedByAnotherTab(false);
          channel.postMessage({ type: 'QUERY_ACTIVE', projectId, tabId });
        }
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
    };
  }, [channel, tabId, setIsLockedByAnotherTab]);
};
