import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { MousePointer2 } from 'lucide-react';

export interface MultiplayerCursorsProps {
  wallToScreen: (wx: number, wy: number) => { px: number, py: number };
}

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({ wallToScreen }) => {
  const { onlineUsers } = useAppStore();
  const { user } = useAuthStore();

  const localUserId = user?.id;
  const otherUsers = Object.values(onlineUsers || {}).filter(u => u.id !== localUserId && u.cursorX !== undefined && u.cursorY !== undefined);

  if (otherUsers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {otherUsers.map(collaborator => {
        if (collaborator.cursorX === undefined || collaborator.cursorY === undefined) return null;
        
        // Translate CAD coordinates to screen coordinates
        const { px: screenX, py: screenY } = wallToScreen(collaborator.cursorX, collaborator.cursorY);
        
        const displayName = collaborator.name || collaborator.email || 'User';

        return (
          <div
            key={collaborator.id}
            className="absolute top-0 left-0 flex flex-col items-start pointer-events-none"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: 'transform 0.05s linear' // 50ms transition for smoothness between ticks
            }}
          >
            {/* Standard Cursor svg from lucide-react, styled customly */}
            <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
              <path d="M5.65376 21.0051L2.03853 3.30397C1.52309 0.781604 4.54486 -1.04505 6.6432 0.380963L22.1581 10.9238C24.1685 12.2894 23.7712 15.3414 21.464 16.2573L15.3402 18.6888C14.8624 18.8785 14.4751 19.2483 14.2541 19.7214L11.5173 25.5786C10.5366 27.678 7.42597 27.2842 6.96347 24.9754L5.65376 21.0051Z" fill={collaborator.cursorColor || '#FF0000'} stroke="white" strokeWidth="2"/>
            </svg>
            
            <div 
              className="px-2 py-1 text-[10px] font-bold text-white rounded shadow-sm whitespace-nowrap mt-1 ml-3"
              style={{ backgroundColor: collaborator.cursorColor }}
            >
              {displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
};
