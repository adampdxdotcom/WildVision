import { StateCreator } from 'zustand';

export interface Collaborator {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  cursorColor: string;
  cursorX?: number;
  cursorY?: number;
}

export interface CollaborationSlice {
  onlineUsers: Record<string, Collaborator>;
  setOnlineUsers: (users: Record<string, Collaborator>) => void;
  updateCollaboratorCursor: (userId: string, x: number, y: number) => void;
  removeCollaborator: (userId: string) => void;
  isReceivingRemoteUpdate: boolean;
  setIsReceivingRemoteUpdate: (val: boolean) => void;
  applyRemoteSync: (actionType: string, payload: any) => void;
  lockedElements: Record<string, string>;
  acquireLock: (elementId: string, userId: string) => void;
  releaseLock: (elementId: string) => void;
  clearLocksForUser: (userId: string) => void;
}

export const createCollaborationSlice: StateCreator<
  any,
  [],
  [],
  CollaborationSlice
> = (set, get) => ({
  onlineUsers: {},
  setOnlineUsers: (users) => set((state) => {
    const nextUsers = { ...users };
    // Preserve existing cursor positions
    Object.keys(nextUsers).forEach(id => {
      if (state.onlineUsers[id]) {
        nextUsers[id].cursorX = state.onlineUsers[id].cursorX;
        nextUsers[id].cursorY = state.onlineUsers[id].cursorY;
      }
    });
    return { onlineUsers: nextUsers };
  }),
  updateCollaboratorCursor: (userId, x, y) => set((state) => {
    const user = state.onlineUsers[userId];
    if (!user) return state;
    return {
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: { ...user, cursorX: x, cursorY: y }
      }
    };
  }),
  removeCollaborator: (userId) => set((state) => {
    const newUsers = { ...state.onlineUsers };
    delete newUsers[userId];
    return { onlineUsers: newUsers };
  }),
  isReceivingRemoteUpdate: false,
  setIsReceivingRemoteUpdate: (val) => set({ isReceivingRemoteUpdate: val }),
  lockedElements: {},
  acquireLock: (elementId, userId) => set((state) => ({
    lockedElements: { ...state.lockedElements, [elementId]: userId }
  })),
  releaseLock: (elementId) => set((state) => {
    const newLocks = { ...state.lockedElements };
    delete newLocks[elementId];
    return { lockedElements: newLocks };
  }),
  clearLocksForUser: (userId) => set((state) => {
    const newLocks = { ...state.lockedElements };
    let changed = false;
    Object.entries(newLocks).forEach(([elementId, lockUserId]) => {
      if (lockUserId === userId) {
        delete newLocks[elementId];
        changed = true;
      }
    });
    return changed ? { lockedElements: newLocks } : {};
  }),
  applyRemoteSync: (actionType, payload) => {
    set({ isReceivingRemoteUpdate: true });
    try {
      const store = get();
      switch(actionType) {
        case 'GLOBAL_HISTORY_RESTORE':
          if (store.restoreSnapshot) store.restoreSnapshot(payload);
          if (store.setLastSavedState) store.setLastSavedState(JSON.parse(JSON.stringify(payload)));
          if (store.setFutureStateStack) store.setFutureStateStack([]);
          break;
        case 'setWallVertices':
          if (store.setWallVertices) store.setWallVertices(payload);
          break;
        case 'setSubAreas':
          if (store.setSubAreas) store.setSubAreas(payload);
          break;
        case 'setTileWidth':
          if (store.setTileWidth) store.setTileWidth(payload);
          break;
        case 'setTileHeight':
          if (store.setTileHeight) store.setTileHeight(payload);
          break;
        case 'setPattern':
          if (store.setPattern) store.setPattern(payload);
          break;
        case 'setGroutWidth':
          if (store.setGroutWidth) store.setGroutWidth(payload);
          break;
        case 'setGroutColor':
          if (store.setGroutColor) store.setGroutColor(payload);
          break;
        case 'setTileColorOverride':
          if (store.setTileColorOverride) store.setTileColorOverride(payload.tileId, payload.colorIndex);
          break;
        case 'clearAllTileColorOverrides':
          if (store.clearAllTileColorOverrides) store.clearAllTileColorOverrides();
          break;
        case 'removeTileColor':
          if (store.removeTileColor) store.removeTileColor(payload);
          break;
        case 'setTileName':
          if (store.setTileName) store.setTileName(payload);
          break;
        case 'setTileColors':
          if (store.setTileColors) store.setTileColors(payload);
          break;
        case 'setFlatsketVerticalRows':
          if (store.setFlatsketVerticalRows) store.setFlatsketVerticalRows(payload);
          break;
        case 'setFlatsketHorizontalRows':
          if (store.setFlatsketHorizontalRows) store.setFlatsketHorizontalRows(payload);
          break;
        case 'setBasketWeaveMultiplier':
          if (store.setBasketWeaveMultiplier) store.setBasketWeaveMultiplier(payload);
          break;
        // add other structural state updaters if needed
        default:
          console.warn('Unknown actionType in remote sync:', actionType);
      }
    } finally {
      set({ isReceivingRemoteUpdate: false });
    }
  }
});
