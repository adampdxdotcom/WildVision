import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { User, LogOut, ChevronDown, Settings, LogIn, ShieldAlert } from 'lucide-react';

interface UserDropdownProps {
  onLoginClick: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ onLoginClick }) => {
  const { user, signOut, role, avatar_url } = useAuthStore();
  const setIsAccountSettingsOpen = useAppStore((state) => state.setIsAccountSettingsOpen);
  const setIsAdminConsoleOpen = useAppStore((state) => state.setIsAdminConsoleOpen);
  const setIsUpgradeModalOpen = useAppStore((state) => state.setIsUpgradeModalOpen);
  const setIsWildVisionOpen = useAppStore((state) => state.setIsWildVisionOpen);
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Reset imageError when user or avatar_url changes
  useEffect(() => {
    setImageError(false);
  }, [user?.id, avatar_url]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    setIsWildVisionOpen(false);
    setIsAccountSettingsOpen(true);
  };

  const handleAdminClick = () => {
    setIsOpen(false);
    setIsAdminConsoleOpen(true);
  };

  if (!user) {
    return (
      <button
        type="button"
        onClick={onLoginClick}
        className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-4.5 border border-slate-200 rounded shadow-xs cursor-pointer transition select-none h-[32px] font-sans"
        title="Log in / Sign up to connect"
      >
        <LogIn className="w-3.5 h-3.5 text-slate-500" />
        <span>Log In</span>
      </button>
    );
  }

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Dropdown toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1.5 bg-white hover:bg-slate-50 border rounded shadow-xs cursor-pointer transition select-none h-[32px] px-3 max-w-[190px] sm:max-w-[240px] ${
          isOpen ? 'border-primary-light ring-2 ring-indigo-500/10' : 'border-slate-200'
        }`}
        title="View your user profile and settings"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {avatar_url && !imageError ? (
            <img
              src={avatar_url}
              alt="User avatar"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-150"
            />
          ) : (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-650 font-bold text-[10px] shrink-0 border border-slate-150">
              {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-750 truncate max-w-[100px] sm:max-w-[130px]">
            {user.email}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-600' : ''}`}
        />
      </button>

      {/* Floating Menu menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-lg py-1 z-[110] animate-in fade-in slide-in-from-top-1 duration-150 transform origin-top-left">
          <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800/60 font-sans">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Signed in as
            </span>
            <span className="block text-xs font-bold text-slate-750 dark:text-slate-200 truncate mt-0.5" title={user.email}>
              {user.email}
            </span>
          </div>

          <div className="p-1">
            {(role === 'admin' || (user as any)?.role === 'admin' || (user as any)?.app_metadata?.role === 'admin') && (
              <button
                onClick={handleAdminClick}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <ShieldAlert size={14} className="text-rose-500" />
                <span>Admin Console</span>
              </button>
            )}

            <button
              onClick={handleSettingsClick}
              className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Settings size={14} className="text-slate-400" />
              <span>User Settings</span>
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-md text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/20 transition cursor-pointer"
            >
              <LogOut size={14} className="text-slate-450 hover:text-rose-500" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
