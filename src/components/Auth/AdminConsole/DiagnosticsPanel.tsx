import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { logger } from '../../../utils/logger';
import { Terminal, RefreshCw, Download, Eye, EyeOff, Database, Send } from 'lucide-react';

export interface LogEntry {
  id: string | number;
  created_at: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  user_id: string | null;
  metadata: any;
}

interface DiagnosticsPanelProps {
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  setErrorMsg,
  setSuccessMsg,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDevLogs, setShowDevLogs] = useState<boolean>(false);

  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Initial Fetch of the latest 100 rows
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      if (data) {
        // Reverse array so oldest is at the top, and newest is at the bottom
        const chronologicalLogs = [...data].reverse();
        setLogs(chronologicalLogs);
      }
    } catch (err: any) {
      console.error('Failed to fetch system logs:', err);
      setErrorMsg(err.message || 'Failed to load system logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('system_logs_live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs',
        },
        (payload) => {
          const newLog = payload.new as LogEntry;
          setLogs((prevLogs) => {
            const updatedLogs = [...prevLogs, newLog];
            // Memory guard: slice off the oldest item if length exceeds 100
            if (updatedLogs.length > 100) {
              return updatedLogs.slice(updatedLogs.length - 100);
            }
            return updatedLogs;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter logs based on Dev vs Prod state
  const filteredLogs = logs.filter((log) => {
    if (!showDevLogs) {
      const env = log.metadata?.environment;
      if (env === 'development') {
        return false;
      }
    }
    return true;
  });

  // Auto-scrolling to bottom whenever logs update or filter changes
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs]);

  // CSV Export Utility
  const handleDownloadCSV = () => {
    try {
      const headers = ['ID', 'Timestamp', 'Level', 'User ID', 'Message', 'Metadata'];
      const csvRows = [headers.join(',')];

      filteredLogs.forEach((log) => {
        const id = String(log.id).replace(/"/g, '""');
        const timestamp = String(log.created_at).replace(/"/g, '""');
        const level = String(log.level).replace(/"/g, '""');
        const userId = String(log.user_id || '').replace(/"/g, '""');
        const message = String(log.message || '').replace(/"/g, '""');
        const metadata = JSON.stringify(log.metadata || {}).replace(/"/g, '""');

        const row = [
          `"${id}"`,
          `"${timestamp}"`,
          `"${level}"`,
          `"${userId}"`,
          `"${message}"`,
          `"${metadata}"`,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `WildVision_Logs_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMsg('CSV log export started successfully.');
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      setErrorMsg('Failed to export CSV logs.');
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const ms = String(d.getMilliseconds()).padStart(3, '0');
      return `${hh}:${mm}:${ss}.${ms}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Terminal size={16} className="text-rose-500" />
          <span>System Live Logs (Max 100)</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Send Test Log button */}
          <button
            type="button"
            onClick={() => {
              logger.info('Manual test log triggered from Diagnostics panel');
              setSuccessMsg?.('Manual test log triggered successfully!');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
          >
            <Send size={14} />
            <span>Send Test Log</span>
          </button>

          {/* Dev logs filter button */}
          <button
            type="button"
            onClick={() => setShowDevLogs(!showDevLogs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              showDevLogs
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border-rose-200 dark:border-rose-900/50'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            {showDevLogs ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Show Dev Logs</span>
          </button>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="bg-slate-950 text-slate-300 rounded-xl border border-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
        {/* Terminal Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-900/50 text-slate-500 font-mono text-[10px] select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-slate-400">admin@wildvision:~/system-logs</span>
          </div>
          <div className="flex items-center gap-1">
            <Database size={10} />
            <span>Streaming Active ({filteredLogs.length} shown)</span>
          </div>
        </div>

        {/* Terminal Content container */}
        <div className="p-4 font-mono text-[11px] overflow-y-auto h-[600px] leading-relaxed select-text scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {isLoading && filteredLogs.length === 0 ? (
            <div className="text-slate-500 animate-pulse py-12 text-center flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-rose-500" size={18} />
              <span>Establishing secure bridge to log tables...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-slate-500 py-12 text-center">
              No matching system logs found. Toggle 'Show Dev Logs' or run an event to trigger logs.
            </div>
          ) : (
            <div className="flex flex-col space-y-1.5">
              {filteredLogs.map((log, index) => {
                let badgeColor = 'text-cyan-400';
                if (log.level === 'WARN') badgeColor = 'text-amber-400';
                if (log.level === 'ERROR') badgeColor = 'text-rose-500';

                return (
                  <div key={log.id || index} className="group border-b border-slate-900/40 pb-1.5 last:border-0">
                    <div className="flex flex-wrap items-start gap-1.5">
                      <span className="text-slate-500 select-none">
                        [{formatTimestamp(log.created_at)}]
                      </span>
                      <span className={`${badgeColor} font-bold select-none`}>
                        [{log.level}]
                      </span>
                      <span className="text-slate-200 break-all">
                        {log.message}
                      </span>
                      {log.user_id && (
                        <span className="text-slate-600 text-[10px] select-none">
                          (UID: {log.user_id.slice(0, 8)}...)
                        </span>
                      )}
                    </div>

                    {/* Metadata collapsible viewer */}
                    {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-1 ml-4 text-slate-500 cursor-pointer select-none">
                        <summary className="hover:text-slate-400 text-[10px] outline-none">
                          view metadata ({Object.keys(log.metadata).filter(k => k !== 'environment').length} fields)
                        </summary>
                        <pre className="mt-1.5 p-2 bg-slate-900/60 rounded border border-slate-800/40 text-[10px] text-indigo-300 overflow-x-auto max-w-full select-text leading-tight">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
              {/* Target for smooth scrolling */}
              <div ref={terminalBottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
