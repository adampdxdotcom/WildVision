import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { logger } from '../../utils/logger';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { X, Calendar, Folder, CloudAlert, RefreshCw, FolderSearch, Trash2, ArrowUpFromLine, Laptop, LogIn, Users, Share2 } from 'lucide-react';

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoginClick: () => void;
  isImportMode?: boolean;
  onImportPayload?: (payload: any, sourceType: 'cloud' | 'local', sourceId?: string | null) => void;
}

interface Project {
  id: string;
  name: string;
  updated_at: string;
  state_payload: any;
  user_id: string;
  profiles?: any;
  project_shares?: any[];
}

export const LoadModal: React.FC<LoadModalProps> = ({
  isOpen,
  onClose,
  fileInputRef,
  handleFileChange,
  onLoginClick,
  isImportMode = false,
  onImportPayload,
}) => {
  const { user } = useAuthStore();
  const { loadProjectState, currentProjectId, linkProject, setIntegrationData } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  
  const localImportInputRef = useRef<HTMLInputElement>(null);

  const handleLocalImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string || '').trim();
        const data = JSON.parse(text);
        if (onImportPayload) {
          onImportPayload(data, 'local', null);
        }
        onClose();
      } catch (err) {
        setError('Failed to parse import JSON payload.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Sync projects list when modal becomes open
  const fetchCloudProjects = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('projects')
        .select('*, profiles(email, first_name, last_name), project_shares(*)')
        .order('updated_at', { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setProjects(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve Cloud files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchCloudProjects();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Local File Drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (isImportMode && onImportPayload) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = (event.target?.result as string || '').trim();
          const data = JSON.parse(text);
          onImportPayload(data, 'local', null);
          onClose();
        } catch (err) {
          setError('Failed to parse import JSON payload.');
        }
      };
      reader.readAsText(file);
    } else if (file && fileInputRef.current) {
      // Programmatic injection to leverage robust useProjectIO loading logic
      const container = new DataTransfer();
      container.items.add(file);
      fileInputRef.current.files = container.files;
      const changeEvent = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(changeEvent);
      onClose(); // Automatically close load dialog
    }
  };

  const handleBrowseFilesClick = () => {
    if (isImportMode) {
      localImportInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleLoadCloudProject = (project: Project) => {
    try {
      if (isImportMode && onImportPayload) {
        onImportPayload(project.state_payload, 'cloud', project.id);
        onClose();
      } else {
        
        let explicitPermission = undefined;
        if (user && project.user_id !== user.id && project.project_shares) {
          const myShare = project.project_shares.find((s: any) => s.user_id === user.id);
          if (myShare) {
            explicitPermission = myShare.permission_tier;
          }
        }
        
        let payload = project.state_payload;
        if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
        }

        if (payload && typeof payload === 'object') {
          payload.before_splat_url = (project as any).before_splat_url || null;
          payload.after_splat_url = (project as any).after_splat_url || null;
        }

        loadProjectState(payload, project.id, project.name, (project as any).user_id, explicitPermission);
        
        if (payload?.linkedSubfloorProjectId !== undefined) {
          linkProject(payload.linkedSubfloorProjectId);
        } else {
          linkProject(null);
        }

        if (payload?.integrationData) {
          setIntegrationData(payload.integrationData);
        }

        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to apply saved state');
      logger.error('Failed to load project state', { projectId: project.id, error: err });
    }
  };

  const handleDeleteCloudProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    
    const isShared = project.project_shares && project.project_shares.length > 0;
    const warningMessage = isShared 
      ? 'This project is currently shared with collaborators. Deleting it will permanently revoke their access and destroy the file for everyone. Are you sure?'
      : 'Delete this saved layout permanently from the Cloud?';
      
    // Safety check - we shouldn't really alert but confirm is fine for now
    if (!window.confirm(warningMessage)) return;

    const projectId = project.id;
    setDeletingId(projectId);
    setError(null);
    const backupList = [...projects];
    
    // Optimistic UI clear
    setProjects(projects.filter(p => p.id !== projectId));

    try {
      const { error: deleteErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteErr) {
        setError(deleteErr.message);
        // Rollback state list
        setProjects(backupList);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to clear project row.');
      setProjects(backupList);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-[800px] border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-650 p-2 rounded-xl">
              {isImportMode ? <ArrowUpFromLine size={20} strokeWidth={2.5} /> : <Folder size={20} strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-100 tracking-tight">
                {isImportMode ? 'Import Overlay Template' : 'Project Directory'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isImportMode ? 'Load a structure into the current canvas' : 'Open files from local sandbox or cloud database'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg flex items-start gap-2 shrink-0">
            <CloudAlert size={16} className="mt-0.5 shrink-0" />
            <span className="text-xs font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Content body split */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6 p-6 overflow-hidden">
          
          {/* Left panel: Local drag & drop */}
          <div className="flex flex-col h-full min-h-0 border-r border-slate-100 dark:border-slate-800/60 pr-6">
            <div>
              <h3 className="text-xs font-black text-indigo-650 uppercase tracking-widest font-mono">
                Local Storage
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Restore previously downloaded offline payloads securely.
              </p>
            </div>

            <div 
              className={`flex-1 min-h-0 mt-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer select-none
                ${isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[1.02]' 
                  : 'border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-indigo-350 dark:hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseFilesClick}
            >
              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4 text-indigo-500">
                <Laptop size={28} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-slate-850 dark:text-slate-100">
                Drag & Drop project file
              </p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-1.5 leading-relaxed">
                Accepts standard offline <strong className="font-bold text-slate-505">.json</strong> templates. Double-click to browse files.
              </p>
            </div>

            {/* Hidden Input reference element */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                handleFileChange(e);
                onClose(); // Automatically close LoadModal after choosing file successfully
              }}
              style={{ display: 'none' }}
              accept=".json"
            />
            {/* Hidden Input for Staging Studio Import */}
            {isImportMode && (
              <input
                type="file"
                ref={localImportInputRef}
                onChange={handleLocalImportChange}
                style={{ display: 'none' }}
                accept=".json"
              />
            )}
          </div>

          {/* Right panel: Cloud backups listing */}
          <div className="flex flex-col h-full min-h-0 pl-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-indigo-650 uppercase tracking-widest font-mono">
                  Cloud Live History
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Toggle any previously structured tile layouts directly from safety databases.
                </p>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={fetchCloudProjects}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  title="Reload Cloud history sync list"
                >
                  <RefreshCw size={13} className={loading && projects.length > 0 ? 'animate-spin text-indigo-650' : ''} />
                </button>
              )}
            </div>

            {/* Content Cards viewport */}
            <div className="flex-1 overflow-y-auto mt-4 min-h-0 border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10 rounded-xl p-3">
              {!user ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <FolderSearch className="w-10 h-10 text-slate-350 dark:text-slate-750 mb-3" />
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">Synchronized Vault Locked</p>
                  <p className="text-[10px] text-slate-405 leading-relaxed max-w-xs mt-1.5">
                    Connect an account or register securely in seconds to save files dynamically to database storage.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onLoginClick();
                    }}
                    className="mt-3.5 flex items-center justify-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-3.5 rounded shadow-xs cursor-pointer transition select-none h-[28px]"
                  >
                    <LogIn size={12} />
                    <span>Log In</span>
                  </button>
                </div>
              ) : loading && projects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-indigo-650 animate-spin mb-2" />
                  <p className="text-[10px] text-slate-400 font-medium">Fetching sync lists...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                  <FolderSearch className="w-10 h-10 text-slate-300 dark:text-slate-750 mb-3" />
                  <p className="text-xs font-bold text-slate-550 dark:text-slate-450">No Cloud Backups Saved</p>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed mt-1">
                    Hit "Save" while logged in to sync tile estimates directly to cloud. Your layout parameters will auto-serialize here!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {projects.filter(p => p.user_id === user?.id).length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">My Projects</div>
                      {projects.filter(p => p.user_id === user?.id).map((project) => {
                        const isActive = project.id === currentProjectId;
                        const isShared = project.project_shares && project.project_shares.length > 0;
                        return (
                          <div
                            key={project.id}
                            onClick={() => handleLoadCloudProject(project)}
                            className={`group relative text-left p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-xs select-none ${
                              isActive
                                ? 'bg-indigo-100/30 dark:bg-indigo-950/20 border-indigo-350 ring-2 ring-indigo-500/5'
                                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 hover:border-slate-250 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1 bg-transparent">
                              <span 
                                className="font-bold text-xs text-slate-850 dark:text-slate-100 truncate flex-1 min-w-0"
                                title={project.name}
                              >
                                {project.name}
                              </span>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isShared && (
                                  <span className="text-emerald-600 dark:text-emerald-500" title="Shared with collaborators">
                                    <Users size={14} />
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[8px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 px-1 py-0.5 rounded leading-none">
                                    Active
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCloudProject(e, project)}
                                  disabled={deletingId === project.id}
                                  className="p-0.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50 transition cursor-pointer"
                                  title="Delete Cloud Backup"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {project.state_payload?.pattern && (
                              <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                                {project.state_payload.pattern} · {project.state_payload.shape}
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-[9px] text-slate-400 border-t border-slate-50 dark:border-slate-800/50 pt-1.5 select-none font-medium mt-1">
                              <Calendar size={10} className="text-slate-300" />
                              <span>{formatDate(project.updated_at)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {projects.filter(p => p.user_id !== user?.id).length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2 px-1 flex items-center gap-1.5">
                        <Users size={12} />
                        Shared with Me
                      </div>
                      {projects.filter(p => p.user_id !== user?.id).map((project) => {
                        const isActive = project.id === currentProjectId;
                        
                        // Parse profile info if available
                        const ownerProfile = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
                        const ownerEmail = ownerProfile?.email || 'Unknown User';
                        const ownerName = ownerProfile?.first_name 
                          ? `${ownerProfile.first_name} ${ownerProfile.last_name || ''}`.trim() 
                          : ownerEmail;

                        return (
                          <div
                            key={project.id}
                            onClick={() => handleLoadCloudProject(project)}
                            className={`group relative text-left p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-xs select-none ${
                              isActive
                                ? 'bg-indigo-100/30 dark:bg-indigo-950/20 border-indigo-350 ring-2 ring-indigo-500/5'
                                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 hover:border-slate-250 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1 bg-transparent">
                              <span 
                                className="font-bold text-xs text-slate-850 dark:text-slate-100 truncate flex-1 min-w-0"
                                title={project.name}
                              >
                                {project.name}
                                <span className="block text-[9px] font-normal text-slate-500 mt-0.5">
                                  Owner: {ownerName}
                                </span>
                              </span>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isActive && (
                                  <span className="text-[8px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 px-1 py-0.5 rounded leading-none">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>

                            {project.state_payload?.pattern && (
                              <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                                {project.state_payload.pattern} · {project.state_payload.shape}
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-[9px] text-slate-400 border-t border-slate-50 dark:border-slate-800/50 pt-1.5 select-none font-medium mt-1">
                              <Calendar size={10} className="text-slate-300" />
                              <span>{formatDate(project.updated_at)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer info stats */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 select-none shrink-0 leading-none">
          {user ? (
            <span>Connected: <strong className="font-bold text-slate-500">{user.email}</strong></span>
          ) : (
            <span>Standalone Local Sandbox mode active</span>
          )}
          <span>System Backup: <span className="text-emerald-500 font-black">Active</span></span>
        </div>
      </div>
    </div>
  );
};
