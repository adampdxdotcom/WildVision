import { useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { setGlobalChannel } from '../utils/syncBroadcaster';

export const useMultiplayer = () => {
  const { currentProjectId, setOnlineUsers, updateCollaboratorCursor, removeCollaborator, applyRemoteSync, acquireLock, releaseLock, clearLocksForUser } = useAppStore();
  const { user, first_name, last_name, avatar_url } = useAuthStore();

  // Generate a consistent color based on user ID or random
  const getCursorColor = (userId: string) => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    if (!currentProjectId || !user) {
      setOnlineUsers({});
      return;
    }

    const channelName = `room:${currentProjectId}`;
    const channel = supabase.channel(channelName);
    
    setGlobalChannel(channel);

    const cursorColor = getCursorColor(user.id);

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: Record<string, any> = {};
        
        for (const id in presenceState) {
          const presences = presenceState[id];
          if (presences.length > 0) {
            const p = presences[0] as any;
            users[p.id] = {
              id: p.id,
              email: p.email,
              name: p.name,
              avatar_url: p.avatar_url,
              cursorColor: p.cursorColor
            };
          }
        }
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Optional: Could handle specific joins if needed
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (leftPresences.length > 0) {
          const p = leftPresences[0] as any;
          removeCollaborator(p.id);
          clearLocksForUser(p.id);
        }
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        if (payload.senderId && payload.senderId !== user.id) {
          updateCollaboratorCursor(payload.senderId, payload.x, payload.y);
        }
      })
      .on('broadcast', { event: 'lock_element' }, ({ payload }) => {
        if (payload.elementId && payload.userId && payload.userId !== user.id) {
          acquireLock(payload.elementId, payload.userId);
        }
      })
      .on('broadcast', { event: 'unlock_element' }, ({ payload }) => {
        if (payload.elementId) {
          releaseLock(payload.elementId);
        }
      })
      .on('broadcast', { event: 'state_sync' }, ({ payload }) => {
        // Do not process our own broadcast if sender info was attached, or just process.
        // Actually, realtime broadcast only goes to other clients anyway!
        if (payload.actionType && payload.payload !== undefined) {
          applyRemoteSync(payload.actionType, payload.payload);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const displayName = first_name 
            ? `${first_name} ${last_name || ''}`.trim()
            : user.email;
            
          await channel.track({
            id: user.id,
            email: user.email,
            name: displayName,
            avatar_url: avatar_url,
            cursorColor
          });
        }
      });

    return () => {
      channel.unsubscribe();
      setGlobalChannel(null);
      setOnlineUsers({});
    };
  }, [currentProjectId, user, first_name, last_name, avatar_url, setOnlineUsers, removeCollaborator, updateCollaboratorCursor, applyRemoteSync, acquireLock, releaseLock, clearLocksForUser]);
};
