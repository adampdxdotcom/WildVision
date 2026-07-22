import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, Settings, Users, Box, FileJson, Terminal, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

// Modular Child Tab Components
import { SystemSettingsTab } from './AdminConsole/SystemSettingsTab';
import { UserManagementTab } from './AdminConsole/UserManagementTab';
import { ModelLibraryTab } from './AdminConsole/ModelLibraryTab';
import { CustomPatternsTab } from './AdminConsole/CustomPatternsTab';
import { DiagnosticsPanel } from './AdminConsole/DiagnosticsPanel';
import { DevNotesPanel } from './AdminConsole/DevNotesPanel';

export const AdminDashboardModal: React.FC = () => {
  const { role } = useAuthStore();
  const { isAdminConsoleOpen, setIsAdminConsoleOpen } = useAppStore();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'models' | 'patterns' | 'diagnostics' | 'dev-notes'>('settings');

  // Shared Alert / Notification States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAuthorized = role === 'admin';

  if (!isAdminConsoleOpen) return null;

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAdminConsoleOpen(false);
  };

  return (
    <div 
      id="admin-dashboard-container"
      className="flex-1 w-full h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden font-sans shadow-md"
    >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="bg-rose-500/10 text-rose-600 p-2 rounded-lg">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Admin Console
                <span className="text-[10px] font-bold bg-rose-500/15 text-rose-600 px-2 py-0.5 rounded-full font-mono uppercase">
                  Privileged
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-semibold tracking-wide">
                Manage global application constants, API keys, and model parameters
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isAuthorized ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <ShieldAlert className="w-16 h-16 text-rose-500 animate-bounce mb-4" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Access Restricted
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                You do not have administrative privileges. Row Level Security policies prevent reading or writing admin state.
              </p>
            </div>
          ) : (
            <>
              {/* Shared notification banners */}
              {errorMsg && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-3 mb-4">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-3 mb-4">
                  <Sparkles size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-150 dark:border-slate-800 gap-4 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider font-mono border-b-2 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  <Settings size={14} />
                  <span>System Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('users');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider font-mono border-b-2 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'users'
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  <Users size={14} />
                  <span>User Management</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('models');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider font-mono border-b-2 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'models'
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  <Box size={14} />
                  <span>3D Model Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('patterns');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider font-mono border-b-2 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'patterns'
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  <FileJson size={14} />
                  <span>Custom Layouts</span>
                </button>
                 <button
                  type="button"
                  onClick={() => {
                    setActiveTab('diagnostics');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider font-mono border-b-2 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'diagnostics'
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  <Terminal size={14} />
                  <span>Diagnostics</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dev-notes');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider font-mono border-b-2 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'dev-notes'
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  <FileText size={14} />
                  <span>Dev Notes</span>
                </button>
              </div>

              {/* Conditional Tab Rendering */}
              {activeTab === 'settings' && (
                <SystemSettingsTab setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
              )}
              {activeTab === 'users' && (
                <UserManagementTab setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
              )}
              {activeTab === 'models' && (
                <ModelLibraryTab setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
              )}
              {activeTab === 'patterns' && (
                <CustomPatternsTab setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
              )}
              {activeTab === 'diagnostics' && (
                <DiagnosticsPanel setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
              )}
              {activeTab === 'dev-notes' && (
                <DevNotesPanel setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
              )}
            </>
          )}
        </div>
      </div>
  );
};
