import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { X, Sparkles, Check, Shield, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export const UpgradeModal: React.FC = () => {
  const { user, role, initializeAuth } = useAuthStore();
  const { isUpgradeModalOpen, setIsUpgradeModalOpen } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isUpgradeModalOpen) return null;

  const handleUpgrade = async () => {
    if (!user) {
      setError('Please log in or sign up first to unlock premium saves.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Functional upgrade: directly update user's profile role column to 'paid' in Supabase
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: 'paid' })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      setSuccess(true);
      // Re-trigger auth initialization to sync state instantly
      await initializeAuth();
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error('Error upgrading account:', err);
      setError(err?.message || 'Failed to update account tier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsUpgradeModalOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all duration-300">
        {/* Top Decorative Banner */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={() => setIsUpgradeModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X size={18} />
        </button>

        <div className="p-6 text-center">
          {/* Icon Header */}
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <Sparkles size={24} className="animate-pulse" />
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Unlock Premium Plan
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            You've reached the storage limit for Free tier accounts. Upgrade to unlock unlimited projects and advanced photorealistic rendering.
          </p>

          {/* Value Propositions */}
          <div className="my-6 space-y-3 text-left bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-800/80 rounded-xl">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">
              Premium Benefits
            </h4>
            <div className="flex items-start gap-2.5 text-xs">
              <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                <strong>Unlimited Cloud Projects:</strong> Store as many room design options and tile configurations as you need.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                <strong>Photorealistic AI Rendering:</strong> Direct access to the photorealistic AI engine to preview actual tiles on walls.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                <strong>Priority Pipeline Speed:</strong> Get instant, fast-lane AI image synthesis responses.
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-xs font-semibold leading-relaxed text-left flex gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/15 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30 rounded-lg text-xs font-bold leading-relaxed text-left flex gap-2 items-center">
              <Check size={16} className="text-emerald-500" />
              <span>Congratulations! Your account is now on the Paid Plan.</span>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={loading || success}
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md cursor-pointer transition select-none disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Subscription...</span>
                </>
              ) : success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Success! Enjoy Premium</span>
                </>
              ) : (
                <>
                  <span>Upgrade to Paid Tier ($19/mo)</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition select-none"
            >
              Keep Free Tier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
