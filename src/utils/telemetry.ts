import { supabase } from './supabaseClient';

/**
 * Retrieves an existing visitor session hash from sessionStorage,
 * or generates and stores a new random hash/UUID if missing.
 */
export function getVisitorSessionHash(): string {
  try {
    const existing = sessionStorage.getItem('wv_session_hash');
    if (existing) return existing;

    const newHash = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    sessionStorage.setItem('wv_session_hash', newHash);
    return newHash;
  } catch (err) {
    return 'sess_' + Math.random().toString(36).substring(2);
  }
}

/**
 * Sends a silent, fire-and-forget telemetry RPC to Supabase logging a project view.
 */
export async function logProjectView(
  shareToken: string,
  viewType: 'cad_viewer' | 'ai_presentation'
): Promise<void> {
  if (!shareToken) return;
  try {
    const sessionHash = getVisitorSessionHash();
    await supabase.rpc('log_project_view', {
      p_share_token: shareToken,
      p_view_type: viewType,
      p_session_hash: sessionHash,
    });
  } catch (err) {
    // Silently catch network or RPC errors without displaying toasts
    console.error(`[Telemetry] Silent error logging project view (${viewType}):`, err);
  }
}

export interface ProjectViewEvent {
  view_type: string;
  viewed_at: string;
  session_hash?: string;
}

export interface ProjectViewAnalytics {
  total_cad_views: number;
  total_ai_views: number;
  last_cad_view: string | null;
  last_ai_view: string | null;
  recent_history?: ProjectViewEvent[];
}

/**
 * Fetches analytics for a project from Supabase.
 */
export async function fetchProjectViewAnalytics(projectId: string): Promise<ProjectViewAnalytics | null> {
  if (!projectId) return null;
  try {
    const { data, error } = await supabase.rpc('get_project_view_analytics', {
      p_project_id: projectId,
    });
    if (error) {
      console.warn('[Telemetry] Error fetching project view analytics:', error);
      return null;
    }
    if (!data) return null;
    const res = Array.isArray(data) ? data[0] : data;
    return {
      total_cad_views: Number(res?.total_cad_views ?? 0),
      total_ai_views: Number(res?.total_ai_views ?? 0),
      last_cad_view: res?.last_cad_view ? String(res.last_cad_view) : null,
      last_ai_view: res?.last_ai_view ? String(res.last_ai_view) : null,
      recent_history: Array.isArray(res?.recent_history) ? res.recent_history : [],
    };
  } catch (err) {
    console.warn('[Telemetry] Exception fetching project view analytics:', err);
    return null;
  }
}

/**
 * Formats an ISO date string into a clean relative time string (e.g., "2 hours ago").
 */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never viewed';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Never viewed';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) {
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `Yesterday at ${timeStr}`;
    }
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Never viewed';
  }
}
