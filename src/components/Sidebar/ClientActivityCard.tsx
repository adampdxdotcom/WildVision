import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  Activity,
  RefreshCw,
  Layout,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import {
  fetchProjectViewAnalytics,
  formatRelativeTime,
  ProjectViewAnalytics,
} from '../../utils/telemetry';

export const ClientActivityCard: React.FC = () => {
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const [analytics, setAnalytics] = useState<ProjectViewAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const loadAnalytics = useCallback(async () => {
    if (!currentProjectId) {
      setAnalytics(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchProjectViewAnalytics(currentProjectId);
      setAnalytics(data);
    } catch (err) {
      console.warn('[ClientActivity] Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="border-t border-slate-100 pt-3 space-y-3 text-xs text-slate-650">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Client Activity
          </span>
        </div>
        {currentProjectId && (
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            title="Refresh analytics"
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        )}
      </div>

      {/* Unsaved / Local Project State */}
      {!currentProjectId ? (
        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded text-[11px] text-slate-500 leading-relaxed font-medium">
          Save project to cloud to track client view activity.
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Interactive CAD View Card */}
            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-md space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Layout className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600 truncate">
                  CAD Layout
                </span>
              </div>
              <div className="text-base font-extrabold text-slate-850 leading-tight">
                {analytics ? `${analytics.total_cad_views} ${analytics.total_cad_views === 1 ? 'view' : 'views'}` : '0 views'}
              </div>
              <div className="text-[9.5px] text-slate-400 font-medium truncate flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span>{formatRelativeTime(analytics?.last_cad_view ?? null)}</span>
              </div>
            </div>

            {/* AI Presentation Card */}
            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-md space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600 truncate">
                  AI Presentation
                </span>
              </div>
              <div className="text-base font-extrabold text-slate-850 leading-tight">
                {analytics ? `${analytics.total_ai_views} ${analytics.total_ai_views === 1 ? 'view' : 'views'}` : '0 views'}
              </div>
              <div className="text-[9.5px] text-slate-400 font-medium truncate flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span>{formatRelativeTime(analytics?.last_ai_view ?? null)}</span>
              </div>
            </div>
          </div>

          {/* Collapsible View History */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition cursor-pointer py-1"
            >
              <span>View History</span>
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHistory && (
              <div className="mt-1 space-y-1.5 max-h-44 overflow-y-auto pr-0.5 animate-fade-in">
                {analytics?.recent_history && analytics.recent_history.length > 0 ? (
                  analytics.recent_history.slice(0, 10).map((event, idx) => {
                    const isCad = event.view_type === 'cad_viewer';
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-50/90 border border-slate-200/50 rounded text-[10.5px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isCad ? (
                            <Layout className="w-3 h-3 text-indigo-600 shrink-0" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-700 truncate">
                            {isCad ? 'Interactive CAD' : 'AI Presentation'}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-medium text-slate-400 shrink-0 ml-2">
                          {formatRelativeTime(event.viewed_at)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 text-center text-[10px] text-slate-400 italic bg-slate-50/50 rounded">
                    No view events recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
