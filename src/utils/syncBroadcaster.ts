import throttle from 'lodash/throttle';

let globalChannel: any = null;

export const setGlobalChannel = (channel: any) => {
  globalChannel = channel;
};

export const broadcastCursor = throttle((x: number, y: number, userId: string) => {
  if (globalChannel) {
    globalChannel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { x, y, senderId: userId }
    });
  }
}, 40);

export const broadcastStateSync = (actionType: string, payload: any) => {
  setTimeout(() => {
    if (globalChannel) {
      globalChannel.send({
        type: 'broadcast',
        event: 'state_sync',
        payload: { actionType, payload }
      });
    }
  }, 0);
};

export const broadcastLock = (elementId: string, userId: string) => {
  if (globalChannel) {
    globalChannel.send({
      type: 'broadcast',
      event: 'lock_element',
      payload: { elementId, userId }
    });
  }
};

export const broadcastUnlock = (elementId: string) => {
  if (globalChannel) {
    globalChannel.send({
      type: 'broadcast',
      event: 'unlock_element',
      payload: { elementId }
    });
  }
};
