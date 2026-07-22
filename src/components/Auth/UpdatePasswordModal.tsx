import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, KeyRound } from 'lucide-react';

export const UpdatePasswordModal = () => {
  const { isPasswordResetRequired, setPasswordResetRequired, signOut, openAuthModal } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSessionError, setIsSessionError] = useState(false);

  // Real-time validation criteria
  const isMinLength = password.length >= 8;
  const isMatch = password === confirmPassword && password.length > 0;
  const isValid = isMinLength && isMatch;

  // Prevent background scrolling when modal is active
  useEffect(() => {
    if (isPasswordResetRequired) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPasswordResetRequired]);

  // Clean form when reset state changes
  useEffect(() => {
    if (!isPasswordResetRequired) {
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(false);
      setIsSessionError(false);
    }
  }, [isPasswordResetRequired]);

  const handleReturnToLogin = async () => {
    try {
      setPasswordResetRequired(false);
      await signOut();
      openAuthModal();
    } catch (err) {
      console.error('[UpdatePasswordModal] Error returning to login:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setIsSessionError(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        const errorMsg = updateError.message || '';
        const isSessionStale = 
          errorMsg.toLowerCase().includes('jwt') ||
          errorMsg.toLowerCase().includes('expired') ||
          errorMsg.toLowerCase().includes('stale') ||
          errorMsg.toLowerCase().includes('session') ||
          errorMsg.toLowerCase().includes('not logged in') ||
          errorMsg.toLowerCase().includes('invalid');

        if (isSessionStale) {
          setIsSessionError(true);
          setError('Session expired or invalid. Please request a new recovery link.');
          console.warn('[UpdatePasswordModal] Authentication session is stale/expired:', errorMsg);
        } else {
          setError(errorMsg || 'Failed to update password. Please try again.');
        }
      } else {
        setSuccess(true);
        // Automatically hide the modal after a short delay so the user can see success
        setTimeout(() => {
          setPasswordResetRequired(false);
        }, 2500);
      }
    } catch (err: any) {
      const errorMsg = err?.message || '';
      const isSessionStale = 
        errorMsg.toLowerCase().includes('jwt') ||
        errorMsg.toLowerCase().includes('expired') ||
        errorMsg.toLowerCase().includes('stale') ||
        errorMsg.toLowerCase().includes('session') ||
        errorMsg.toLowerCase().includes('not logged in') ||
        errorMsg.toLowerCase().includes('invalid');

      if (isSessionStale) {
        setIsSessionError(true);
        setError('Session expired or invalid. Please request a new recovery link.');
      } else {
        setError(errorMsg || 'An unexpected error occurred. Please try again.');
      }
      console.error('[UpdatePasswordModal] Error updating password:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isPasswordResetRequired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop: solid and semi-opaque to prevent bypasses */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs cursor-default"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 overflow-hidden"
          >
            {success ? (
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Check size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Password Updated Successfully
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Your new password has been established. You are now being securely redirected to your workspace.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Success Session Initiated
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mb-2">
                    <KeyRound size={24} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Reset Your Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    You have successfully verified your identity. Please create a strong, new password to secure your account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex gap-2.5 items-start p-3.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-xs font-semibold leading-relaxed">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* New Password field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={loading}
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-10 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        disabled={loading}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-10 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Real-time checklist */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-150 dark:border-slate-850 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Password Requirements
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        {isMinLength ? (
                          <Check className="text-emerald-500 shrink-0" size={14} />
                        ) : (
                          <X className="text-slate-300 dark:text-slate-700 shrink-0" size={14} />
                        )}
                        <span className={isMinLength ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                          At least 8 characters long
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {isMatch ? (
                          <Check className="text-emerald-500 shrink-0" size={14} />
                        ) : (
                          <X className="text-slate-300 dark:text-slate-700 shrink-0" size={14} />
                        )}
                        <span className={isMatch ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                          Passwords must match exactly
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={!isValid || loading}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition select-none h-[44px]"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Update Password'
                      )}
                    </button>

                    {isSessionError && (
                      <button
                        type="button"
                        onClick={handleReturnToLogin}
                        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm py-2.5 px-4 rounded-lg transition cursor-pointer border border-slate-200 dark:border-slate-750"
                      >
                        Return to Login Screen
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
