import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { logger } from '../../../utils/logger';
import { Plus, RefreshCw, Loader2, Trash2, X, ShieldAlert, Mail, Copy, Check, Search } from 'lucide-react';

interface Profile {
  id: string;
  created_at: string;
  role: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  total_projects?: number;
  lifetime_credits_used?: number;
  cycle_credits_used?: number;
  last_active_at?: string | null;
}

interface UserManagementTabProps {
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { user } = useAuthStore();

  // User Management State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [sendingResetForId, setSendingResetForId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  // Add User State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('free');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProfiles = async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch profiles with CRM metrics via RPC
      const { data: dbProfiles, error: dbError } = await supabase.rpc('get_admin_user_metrics');

      if (dbError) {
        throw dbError;
      }
      
      const sortedProfiles = (dbProfiles || []).sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const baseProfiles: Profile[] = sortedProfiles.map((p: any) => ({
        id: p.id,
        created_at: p.created_at,
        role: p.role,
        email: p.email || undefined,
        username: undefined,
        first_name: p.first_name,
        last_name: p.last_name,
        total_projects: p.total_projects || 0,
        lifetime_credits_used: p.lifetime_credits_used || 0,
        cycle_credits_used: p.cycle_credits_used || 0,
        last_active_at: p.last_active_at || null,
      }));

      // 2. Safely call the edge function 'admin-user-manager' to fetch user auth data (emails)
      try {
        const { data: adminData, error: adminError } = await supabase.functions.invoke('admin-user-manager', {
          body: { action: 'list' }
        });

        if (!adminError && adminData?.users) {
          const authUsers = adminData.users;
          const merged = baseProfiles.map((profile) => {
            const authUser = authUsers.find((u: any) => u.id === profile.id);
            return {
              ...profile,
              email: authUser?.email || profile.email || undefined,
              username: authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || undefined,
              first_name: profile.first_name || authUser?.user_metadata?.first_name || undefined,
              last_name: profile.last_name || authUser?.user_metadata?.last_name || undefined,
            };
          });
          setProfiles(merged);
          return;
        } else {
          console.warn('[UserManagement] Could not load auth list, falling back to db profiles:', adminError || adminData?.error);
        }
      } catch (e) {
        console.warn('[UserManagement] Exception fetching auth user emails, falling back:', e);
      }

      setProfiles(baseProfiles);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setErrorMsg(`Failed to load user profiles: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSendResetEmail = async (profileId: string, email: string) => {
    if (!email) {
      setErrorMsg("Target email not found for this profile.");
      return;
    }
    setSendingResetForId(profileId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-manager', {
        body: {
          action: 'sendResetEmail',
          email: email
        }
      });

      if (error) {
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      logger.info('Admin triggered password reset email', { targetUserEmail: email });
      setSuccessMsg(`Administrative password reset triggered. Recovery email dispatched to ${email}.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      setErrorMsg(`Failed to send password reset: ${err.message || err}`);
    } finally {
      setSendingResetForId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Update local state to reflect the change immediately
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );

      setSuccessMsg(`Successfully updated user ${userId.substring(0, 8)} to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error updating profile role:', err);
      setErrorMsg(`Failed to update user role: ${err.message || err}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSavingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-manager', {
        body: {
          action: 'create',
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        }
      });

      if (error) {
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccessMsg(`User ${newUserEmail} successfully created.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reset & Close
      setIsAddUserModalOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('free');

      // Refresh the profiles list
      await fetchProfiles();
    } catch (err: any) {
      console.error('Error creating user via Edge Function:', err);
      setErrorMsg(`Failed to create user: ${err.message || err}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-manager', {
        body: {
          action: 'delete',
          userId: userToDelete.id
        }
      });

      if (error) {
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      logger.warn('Admin deleted user account', { targetUserId: userToDelete.id });
      setSuccessMsg(`User successfully deleted.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Remove from local list immediately
      setProfiles((prev) => prev.filter((p) => p.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Error deleting user via Edge Function:', err);
      logger.error('Admin user deletion failed', { targetUserId: userToDelete.id, error: err.message || String(err) });
      setErrorMsg(`Failed to delete user: ${err.message || err}`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const firstName = (profile.first_name || '').toLowerCase();
    const lastName = (profile.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = (profile.email || '').toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
            User Access & Memberships
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Displaying profiles directly registered in the custom application database. Admins may change privileges dynamically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow w-56 shadow-sm font-medium"
            />
          </div>
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            type="button"
            className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition cursor-pointer font-mono uppercase shadow-sm"
          >
            <Plus size={12} />
            <span>Add User</span>
          </button>
          <button 
            onClick={fetchProfiles}
            disabled={loadingUsers}
            type="button"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs py-1.5 px-3 rounded-lg transition cursor-pointer font-mono uppercase"
          >
            <RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/20 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-955/30 text-[10px] font-black uppercase tracking-wider font-mono text-slate-450 dark:text-slate-500">
                <th className="px-5 py-3.5">User Profile & Metadata</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5">Last Active</th>
                <th className="px-5 py-3.5">Cycle Credits</th>
                <th className="px-5 py-3.5">Lifetime Credits</th>
                <th className="px-5 py-3.5">Projects</th>
                <th className="px-5 py-3.5">Current Role</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
              {loadingUsers && filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Loading profiles database records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No profile accounts found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => {
                  const isSelf = profile.id === user?.id;
                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/5 transition">
                      <td className="px-5 py-4 font-sans text-slate-600 dark:text-slate-450">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {(profile.first_name || profile.last_name) 
                                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
                                : 'Unknown Name'}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                Self
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {profile.email || 'No Email'}
                            </span>
                            {profile.email && (
                              <button
                                onClick={() => {
                                  if (profile.email) {
                                    navigator.clipboard.writeText(profile.email);
                                    setCopiedEmailId(profile.id);
                                    setTimeout(() => setCopiedEmailId(null), 2000);
                                  }
                                }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title="Copy Email"
                              >
                                {copiedEmailId === profile.id ? (
                                  <Check size={14} className="text-emerald-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {profile.last_active_at ? new Date(profile.last_active_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }) : 'Never'}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono">
                        {profile.cycle_credits_used ?? 0}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono">
                        {profile.lifetime_credits_used ?? 0}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono">
                        {profile.total_projects ?? 0}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest font-mono ${
                          profile.role === 'admin'
                            ? 'bg-rose-500/15 text-rose-600'
                            : profile.role === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {profile.role || 'free'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {updatingUserId === profile.id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          )}
                          <select
                            value={profile.role || 'free'}
                            disabled={updatingUserId !== null}
                            onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-black outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition cursor-pointer disabled:opacity-50"
                          >
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                            <option value="admin">Admin</option>
                          </select>
                          {profile.email && (
                            <button
                              type="button"
                              title="Send password reset email"
                              disabled={sendingResetForId !== null || updatingUserId !== null}
                              onClick={() => handleSendResetEmail(profile.id, profile.email!)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {sendingResetForId === profile.id ? (
                                <Loader2 size={15} className="animate-spin text-indigo-600" />
                              ) : (
                                <Mail size={15} />
                              )}
                            </button>
                          )}
                          {!isSelf ? (
                            <button
                              type="button"
                              title="Delete user profile"
                              disabled={updatingUserId !== null || sendingResetForId !== null}
                              onClick={() => setUserToDelete(profile)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Cannot delete your own account"
                              className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsAddUserModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-slate-900 dark:text-white z-[130]">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-indigo-650 dark:text-indigo-400">
                Add New User Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest font-mono">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest font-mono">
                  Initial Membership Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-medium cursor-pointer"
                >
                  <option value="free">Free (Default)</option>
                  <option value="paid">Paid</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 h-[36px]"
                >
                  {isSavingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setUserToDelete(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-slate-900 dark:text-white z-[130]">
            <div className="flex items-center gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                <ShieldAlert size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-rose-655 dark:text-rose-400">
                Delete User Profile
              </h3>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                Are you sure you want to delete this user profile?
              </p>
              <div className="bg-slate-50 dark:bg-slate-955/50 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 text-[11px] font-mono space-y-1 text-slate-500 dark:text-slate-400">
                <div><strong className="text-slate-700 dark:text-slate-300">ID:</strong> {userToDelete.id}</div>
                <div><strong className="text-slate-700 dark:text-slate-300">Created:</strong> {userToDelete.created_at ? new Date(userToDelete.created_at).toLocaleString() : 'N/A'}</div>
                <div><strong className="text-slate-700 dark:text-slate-300">Role:</strong> <span className="uppercase text-[9px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">{userToDelete.role || 'free'}</span></div>
              </div>
              <p className="text-[10.5px] text-rose-500 font-bold leading-relaxed">
                Warning: This action is permanent, completely deletes their authorization record and access credentials, and cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleDeleteUser}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 h-[36px]"
              >
                {isDeletingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete User</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
