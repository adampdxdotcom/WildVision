import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ArrowLeft, User, Lock, Info, Coins, AlertCircle, X, Download, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { logger } from '../../utils/logger';
import { TOS_PLACEHOLDER_TEXT, PRIVACY_PLACEHOLDER_TEXT } from '../Auth/AuthModal';
import { useDataExport } from '../../hooks/useDataExport';


export const AccountPanel: React.FC = () => {
  const {
    setIsAccountSettingsOpen,
    isAutoSaveEnabled,
    setIsAutoSaveEnabled,
  } = useAppStore();

  const { user, openAuthModal, role, signOut, showToast, avatar_url, first_name, last_name, updateProfileNames } = useAuthStore();
  const activeAiModel = useAppStore(state => state.activeAiModel);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Legal Modal States
  const [isTermsOpen, setIsTermsOpen] = React.useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);

  // Data Export Hook
  const { executeExport, isExporting, progressMessage } = useDataExport();

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [editFirstName, setEditFirstName] = React.useState('');
  const [editLastName, setEditLastName] = React.useState('');

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      updateProfileNames(editFirstName.trim(), editLastName.trim());
      showToast("Profile updated successfully!", "success");
      logger.info('User updated profile names');
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error("Error saving profile name:", err);
      logger.error('Action failed', { error: err.message || String(err) });
      showToast(err?.message || "Failed to update profile name. Please try again.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Sync profile edits with store when loaded
  React.useEffect(() => {
    setEditFirstName(first_name || '');
    setEditLastName(last_name || '');
  }, [first_name, last_name]);

  // Reset imageError when user or avatar_url changes
  React.useEffect(() => {
    setImageError(false);
  }, [user?.id, avatar_url]);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      logger.warn('User initiated self-deletion');
      const { data, error } = await supabase.functions.invoke('admin-user-manager', {
        body: {
          action: 'delete',
          userId: user.id
        }
      });

      if (error) {
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      // Success
      setIsConfirmModalOpen(false);
      setIsAccountSettingsOpen(false);
      await signOut();
      showToast("Your account has been successfully deleted.", "success");
    } catch (err: any) {
      console.error('Delete account error:', err);
      logger.error('Action failed', { error: err.message || String(err) });
      showToast(err?.message || "Failed to delete account. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const [totalImages, setTotalImages] = React.useState<number>(0);
  const [totalCreditsUsed, setTotalCreditsUsed] = React.useState<number>(0);
  const [totalPromptTokens, setTotalPromptTokens] = React.useState<number>(0);
  const [totalOutputTokens, setTotalOutputTokens] = React.useState<number>(0);
  const [totalSpend, setTotalSpend] = React.useState<number>(0);

  const billingCycleStartDate = React.useMemo(() => {
    const now = new Date();
    const current20th = new Date(now.getFullYear(), now.getMonth(), 20, 0, 0, 0);
    let billingStart = current20th;
    if (now < current20th) {
      const prevDate = new Date(current20th);
      prevDate.setMonth(prevDate.getMonth() - 1);
      billingStart = prevDate;
    }
    return billingStart;
  }, []);

  const billingCycleDateStr = React.useMemo(() => {
    return billingCycleStartDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }, [billingCycleStartDate]);

  React.useEffect(() => {
    if (!user?.id) return;

    const fetchUsageStats = async () => {
      try {
        const isoString = billingCycleStartDate.toISOString();
        const { data, error } = await supabase
          .from('ai_renders')
          .select('prompt_tokens, output_tokens, output_images, model_used')
          .eq('user_id', user.id)
          .gte('created_at', isoString);

        if (error) {
          console.warn('Could not retrieve direct billing usage stats (unconfigured or database offline):', error.message || error);
          return;
        }

        if (data) {
          let sumPrompt = 0;
          let sumOutput = 0;
          let sumSpend = 0;
          let sumCredits = 0;

          data.forEach((row: any) => {
            sumPrompt += row.prompt_tokens || 0;
            sumOutput += row.output_tokens || 0;

            const inputCost = ((row.prompt_tokens || 0) / 1000) * (activeAiModel?.cost_input_usd || 0);
            const output1kCost = ((row.output_tokens || 0) / 1000) * (activeAiModel?.cost_1k_out_usd || 0);
            // Assuming output_images represents 4k outputs, or just add them as placeholders for spending calculation.
            const output4kCost = (row.output_images || 0) * (activeAiModel?.cost_4k_out_usd || 0);
            
            const rowCost = inputCost + output1kCost + output4kCost;
            sumSpend += rowCost;

            // Treat standard historical renders as 1 credit
            sumCredits += row.output_images || 1;
          });

          setTotalPromptTokens(sumPrompt);
          setTotalOutputTokens(sumOutput);
          setTotalImages(data.length);
          setTotalSpend(sumSpend);
          setTotalCreditsUsed(sumCredits);
        }
      } catch (err) {
        console.warn('Exception in direct billing query (possibly unconfigured):', err);
      }
    };

    fetchUsageStats();


  }, [user?.id, billingCycleStartDate]);

  const creditLimit = React.useMemo(() => {
    if (role === 'admin' || role === 'beta' || role === 'Beta Partner') return 1000;
    if (role === 'paid' || role === 'premium') return 200;
    return 25; // free/guest default
  }, [role]);

  const progressPercent = Math.min(100, (totalCreditsUsed / creditLimit) * 100);



  return (
    <div className="flex flex-col h-full overflow-hidden bg-white rounded border border-slate-200 p-5 shadow-xs space-y-5 animate-fade-in text-slate-700">
      {/* Header section with back button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-150 shrink-0">
        <button
          type="button"
          onClick={() => setIsAccountSettingsOpen(false)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-650 transition text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Editing</span>
        </button>
        <span className="text-[10px] uppercase font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-wide">
          User Settings
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
        {/* Guest vs Registered views */}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="border border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col items-center text-center gap-3">
              <div className="flex gap-1 items-center text-slate-400">
                <User className="w-8 h-8 text-slate-400" />
                <Lock className="w-4 h-4 -ml-2.5 mt-4 bg-slate-50/50 rounded-full" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Account Required</h3>
              <p className="text-xs text-slate-500 leading-normal max-w-[200px]">
                Create an account to track your usage and view generation stats.
              </p>
              <button
                type="button"
                onClick={() => openAuthModal("Log in to view your account details.")}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 font-sans px-5 py-2 rounded-lg transition-colors cursor-pointer mt-1"
              >
                Log In / Sign Up
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {/* User Profile Card */}
            <div className="bg-gradient-to-br from-indigo-50/20 to-slate-50/50 border border-slate-150 rounded-2xl p-4 shadow-xs flex items-center gap-4 animate-fade-in text-left">
              <div className="relative shrink-0">
                {avatar_url && !imageError ? (
                  <img
                    src={avatar_url}
                    alt="User Avatar"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md ring-4 ring-indigo-50/70"
                  />
                ) : (
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 border-2 border-white text-indigo-650 font-black text-lg shadow-md ring-4 ring-indigo-50/70 shrink-0">
                    {user?.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-wider">
                  User Account
                </div>
                <h4 className="text-xs font-black text-slate-800 truncate" title={user?.email || ''}>
                  {user?.email}
                </h4>
                {!isEditingProfile ? (
                  <div className="space-y-1">
                    {(first_name || last_name) ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 truncate">
                          {`${first_name || ''} ${last_name || ''}`.trim()}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(true)}
                          className="text-slate-400 hover:text-indigo-650 transition p-0.5 rounded-sm hover:bg-slate-100/80 cursor-pointer shrink-0"
                          title="Edit Name"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Add Name</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">First Name</label>
                        <input
                          type="text"
                          value={editFirstName}
                          disabled={isSavingProfile}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="w-full px-2 py-1 border rounded-md text-[11px] font-semibold focus:outline-none focus:ring-1 bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-100 disabled:opacity-50 disabled:bg-slate-50"
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Last Name</label>
                        <input
                          type="text"
                          value={editLastName}
                          disabled={isSavingProfile}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="w-full px-2 py-1 border rounded-md text-[11px] font-semibold focus:outline-none focus:ring-1 bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-100 disabled:opacity-50 disabled:bg-slate-50"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        disabled={isSavingProfile}
                        onClick={() => {
                          setEditFirstName(first_name || '');
                          setEditLastName(last_name || '');
                          setIsEditingProfile(false);
                        }}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingProfile}
                        onClick={handleSaveProfile}
                        className="flex items-center gap-1 text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingProfile && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        )}
                        <span>{isSavingProfile ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-0.5 items-center">
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full font-mono">
                    {role || 'Free'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full font-mono">
                    Beta Partner
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-1.5 text-left font-sans animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Info className="w-4 h-4 text-indigo-550 shrink-0" />
                <span>Account & Usage Overview</span>
              </div>
              <p className="text-[11px] text-indigo-900/80 font-medium leading-relaxed font-sans">
                Below is your active account information and your utilization statistics for the current billing cycle.
              </p>
            </div>

            {/* Auto-Save Toggle */}
            <div id="account-settings-auto-save" className="border border-slate-150 rounded-xl p-4 bg-white shadow-xs space-y-3 font-sans animate-fade-in text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-800">Cloud Auto-Save</h3>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-[180px]">
                    Automatically sync layout changes to the cloud. Turn off to safely experiment.
                  </p>
                </div>
                <button
                  type="button"
                  id="auto-save-toggle-btn"
                  onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoSaveEnabled ? 'bg-indigo-650' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isAutoSaveEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-xs space-y-4 font-sans animate-fade-in">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Account Details</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-left">
                  <span className="text-slate-400 font-sans">Account Email</span>
                  <span className="text-slate-700 font-semibold font-sans truncate max-w-[165px]" title={user?.email || ''}>
                    {user?.email || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-left">
                  <span className="text-slate-400 font-sans">Active Plan</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full font-sans">
                    Beta Tester (Unlimited)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-left pt-1">
                  <span className="text-slate-400 font-sans flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Estimated API Spend</span>
                  </span>
                  <span className="font-extrabold text-emerald-600 font-sans text-xs">
                    ${totalSpend.toFixed(2)}
                  </span>
                </div>

                 <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex flex-col gap-0.5 text-xs text-left">
                    <span className="text-slate-400 font-sans">Monthly Credit Tracker</span>
                    <span className="text-slate-750 font-bold font-sans text-xs mt-1">
                      Credits Used: <strong className="text-indigo-600 font-extrabold">{totalCreditsUsed}</strong> / {role === 'admin' || role === 'beta' ? 'Unlimited' : creditLimit}
                    </span>
                    <span className="text-slate-500 font-sans text-[10.5px] mt-0.5">
                      Credits Remaining: <strong className="text-emerald-600 font-extrabold">{role === 'admin' || role === 'beta' ? 'Unlimited' : Math.max(0, creditLimit - totalCreditsUsed)}</strong>
                    </span>
                  </div>
                  
                  {/* Visual Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0 credits</span>
                      <span>Limit: {role === 'admin' || role === 'beta' ? 'Unlimited (1K threshold)' : `${creditLimit} credits`}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 space-y-1 text-[10px] font-sans text-slate-500">
                    <div className="flex justify-between">
                      <span>Total Prompt Tokens:</span>
                      <span className="font-bold text-slate-700">{(totalPromptTokens || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Output Tokens:</span>
                      <span className="font-bold text-slate-700">{(totalOutputTokens || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Credits Consumed:</span>
                      <span className="font-bold text-slate-700">{(totalCreditsUsed || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 border-t border-slate-150 pt-1 mt-1 leading-normal text-left">
                      {activeAiModel ? (
                        <>
                          Model: {(activeAiModel as any).name || activeAiModel.api_slug} ({activeAiModel.api_slug})<br />
                          Pricing: ${(activeAiModel.cost_input_usd * 1000).toFixed(2)} / 1M input tokens + ${(activeAiModel.cost_1k_out_usd * 1000).toFixed(2)} / 1M output tokens + ${activeAiModel.cost_4k_out_usd} / output image
                        </>
                      ) : (
                        <span>Loading pricing details...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Export Section */}
              <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-xs space-y-3 font-sans animate-fade-in text-left">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-800">Data Export</h3>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Download a ZIP archive containing all of your custom 2D JSON layouts and photorealistic images/renders.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={executeExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-1.5 border border-indigo-200 hover:border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 hover:text-indigo-850 text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Download My Data'}</span>
                </button>

                {isExporting && progressMessage && (
                  <div className="text-[10px] text-indigo-600 font-semibold animate-pulse text-center pt-1">
                    {progressMessage}
                  </div>
                )}
              </div>

              {/* Danger Zone (Account Management) Section */}
              {role !== 'admin' && (
                <div className="border border-red-150 rounded-xl p-4 bg-red-50/20 shadow-xs space-y-3 font-sans animate-fade-in text-left">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-red-800">Danger Zone</h3>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Permanently delete your account and all associated layouts, renders, and profile data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100/85 text-red-700 hover:text-red-800 text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              )}

              {/* Legal Links */}
              <div className="flex items-center justify-center gap-4 pt-4 pb-2 border-t border-slate-150/60 dark:border-slate-800/60 text-[11px] font-semibold text-slate-400">
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(true)}
                  className="hover:text-indigo-650 dark:hover:text-indigo-400 hover:underline cursor-pointer transition-colors"
                >
                  Terms of Service
                </button>
                <span className="text-slate-300 select-none">|</span>
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="hover:text-indigo-650 dark:hover:text-indigo-400 hover:underline cursor-pointer transition-colors"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsConfirmModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-slate-900 dark:text-white z-[130] animate-fade-in">
            <div className="flex items-center gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                <AlertCircle size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-rose-655 dark:text-rose-400">
                Confirm Account Deletion
              </h3>
            </div>

            <div className="space-y-3 text-left">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                Are you sure you want to delete your account?
              </p>
              <p className="text-[10.5px] text-rose-500 font-bold leading-relaxed">
                Warning: This action will permanently erase your layouts, renders, and profile data, and cannot be undone.
              </p>

              {/* Data Export Escape Hatch Warning Banner */}
              <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 bg-amber-50/30 dark:bg-amber-950/10 space-y-2 font-sans">
                <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold leading-relaxed">
                  <strong>Wait! Have you downloaded your data?</strong> Deleting your account permanently destroys all of your custom layouts, specifications, and AI renders. This cannot be undone.
                </p>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => {
                    console.log("Downloading data from account deletion escape hatch...");
                    executeExport();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10.5px] font-bold py-1.5 px-2.5 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Download className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Download My Data Archive'}</span>
                </button>

                {isExporting && progressMessage && (
                  <div className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse text-center pt-0.5">
                    {progressMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting || isExporting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || isExporting}
                onClick={handleDeleteAccount}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : isExporting ? (
                  <span>Exporting...</span>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsTermsOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[80vh] text-slate-900 dark:text-white z-[160] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-indigo-650 dark:text-indigo-400">
                Terms of Service
              </h3>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold whitespace-pre-wrap text-left">
              {TOS_PLACEHOLDER_TEXT}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsPrivacyOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[80vh] text-slate-900 dark:text-white z-[160] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-indigo-650 dark:text-indigo-400">
                Privacy Policy
              </h3>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold whitespace-pre-wrap text-left">
              {PRIVACY_PLACEHOLDER_TEXT}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
