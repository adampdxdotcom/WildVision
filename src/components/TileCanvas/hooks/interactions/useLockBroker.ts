import { useAppStore } from '../../../../store/useAppStore';
import { useAuthStore } from '../../../../store/useAuthStore';
import { broadcastLock, broadcastUnlock } from '../../../../utils/syncBroadcaster';

export const useLockBroker = () => {
  const lockedElements = useAppStore(state => state.lockedElements);
  const acquireLock = useAppStore(state => state.acquireLock);
  const releaseLock = useAppStore(state => state.releaseLock);
  const user = useAuthStore(state => state.user);

  const isElementLocked = (elementId: string) => {
    return lockedElements[elementId] && lockedElements[elementId] !== user?.id;
  };

  const lockElement = (elementId: string) => {
    if (isElementLocked(elementId)) return false;
    if (user) {
      acquireLock(elementId, user.id);
      broadcastLock(elementId, user.id);
    }
    return true;
  };

  const unlockElement = (elementId: string) => {
    if (user) {
      releaseLock(elementId);
      broadcastUnlock(elementId);
    }
  };

  return {
    user,
    lockedElements,
    isElementLocked,
    lockElement,
    unlockElement,
  };
};
