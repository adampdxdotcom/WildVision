import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { X, Search, Shield, UserX, UserPlus, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShareRecord {
  id: string;
  project_id: string;
  user_id: string;
  permission_tier: 'read' | 'write';
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { currentProjectId, currentProjectPermission } = useAppStore();
  const isOwner = currentProjectPermission === 'owner';

  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTier, setInviteTier] = useState<'read' | 'write'>('read');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });

  useEffect(() => {
    if (isOpen && currentProjectId) {
      fetchShares();
    }
  }, [isOpen, currentProjectId]);

  const fetchShares = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('project_shares')
        .select('*, profiles(*)')
        .eq('project_id', currentProjectId);

      if (fetchErr) {
        console.error("Fetch Shares Error:", fetchErr);
        throw fetchErr;
      }
      setShares((data as unknown as ShareRecord[]) || []);
    } catch (err: any) {
      console.error("Fetch Shares Error:", err);
      setError(err.message || 'Failed to fetch shares');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !currentProjectId) return;
    
    setInviteStatus({ type: 'loading', message: 'Looking up user...' });
    
    try {
      // Find user by email
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('email', inviteEmail)
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!profileData) {
        setInviteStatus({ type: 'error', message: 'No active WildVision registration found for this email.' });
        return;
      }

      // Check if already shared
      if (shares.some(s => s.user_id === profileData.id)) {
        setInviteStatus({ type: 'error', message: 'User is already a collaborator.' });
        return;
      }
      
      if (profileData.id === user?.id) {
         setInviteStatus({ type: 'error', message: 'You are the owner.' });
         return;
      }

      const { data: newShare, error: insertErr } = await supabase
        .from('project_shares')
        .insert({
          project_id: currentProjectId,
          user_id: profileData.id,
          permission_tier: inviteTier
        })
        .select(`
          id,
          project_id,
          user_id,
          permission_tier,
          profiles (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (insertErr) throw insertErr;

      setShares([...shares, newShare as unknown as ShareRecord]);
      setInviteStatus({ type: 'success', message: 'Collaborator added successfully.' });
      setInviteEmail('');
    } catch (err: any) {
      setInviteStatus({ type: 'error', message: err.message || 'Failed to invite user.' });
    }
  };

  const updateShare = async (shareId: string, newTier: 'read' | 'write') => {
    if (!isOwner) return;
    try {
      const { error: updateErr } = await supabase
        .from('project_shares')
        .update({ permission_tier: newTier })
        .eq('id', shareId);
        
      if (updateErr) throw updateErr;
      
      setShares(shares.map(s => s.id === shareId ? { ...s, permission_tier: newTier } : s));
    } catch (err: any) {
      // could show toast here
      alert('Failed to update permission: ' + err.message);
    }
  };

  const removeShare = async (collaboratorId: string) => {
    if (!isOwner || !currentProjectId) return;
    try {
      const { error: delErr } = await supabase
        .from('project_shares')
        .delete()
        .eq('project_id', currentProjectId)
        .eq('user_id', collaboratorId);
            
      if (delErr) throw delErr;
        
      setShares(shares.filter(s => s.user_id !== collaboratorId));
    } catch (err: any) {
      alert('Failed to remove collaborator: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Share Project</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Manage access and collaborators</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Read Only Notice */}
          {!isOwner && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">View-Only Access</h4>
                <p className="text-xs text-amber-700 mt-1 font-medium">You are viewing the collaborators for this project. Only the project owner can invite or remove users.</p>
              </div>
            </div>
          )}

          {/* Invite Section (Owner Only) */}
          {isOwner && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Invite Collaborator</h3>
              <form onSubmit={handleInvite} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email address..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <select
                  value={inviteTier}
                  onChange={(e) => setInviteTier(e.target.value as 'read' | 'write')}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="read">Can view</option>
                  <option value="write">Can edit</option>
                </select>
                <button
                  type="submit"
                  disabled={inviteStatus.type === 'loading' || !inviteEmail.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              </form>
              
              {inviteStatus.message && (
                <div className={`text-xs font-semibold px-1 flex items-center gap-1 ${
                  inviteStatus.type === 'success' ? 'text-emerald-600' :
                  inviteStatus.type === 'error' ? 'text-rose-600' :
                  'text-slate-500'
                }`}>
                  {inviteStatus.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {inviteStatus.type === 'error' && <UserX className="w-3.5 h-3.5" />}
                  {inviteStatus.message}
                </div>
              )}
            </div>
          )}

          {/* Collaborators List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Active Collaborators</h3>
            
            {loading ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500 animate-pulse">
                Loading collaborators...
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 text-rose-600 text-sm font-semibold rounded-lg border border-rose-100">
                {error}
              </div>
            ) : shares.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm font-semibold text-slate-500">No collaborators yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {share.profiles?.avatar_url ? (
                        <img src={share.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {share.profiles?.first_name?.charAt(0) || share.profiles?.email?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {share.profiles?.first_name} {share.profiles?.last_name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 truncate">
                          {share.profiles?.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 pl-3">
                      {isOwner ? (
                        <>
                          <select
                            value={share.permission_tier}
                            onChange={(e) => updateShare(share.id, e.target.value as 'read' | 'write')}
                            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 cursor-pointer text-slate-700"
                          >
                            <option value="read">Can view</option>
                            <option value="write">Can edit</option>
                          </select>
                          <button
                            onClick={() => removeShare(share.user_id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Remove collaborator"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {share.permission_tier === 'write' ? 'Can edit' : 'Can view'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
