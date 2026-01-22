import { AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { opsAudit, OpsAuditEvent } from '../utils/api';

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function shortJson(value: unknown, maxLen = 240): string {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  } catch {
    return String(value);
  }
}

export function AuditPanel(props: {
  namespace: string;
  sessionId: string;
}): React.ReactElement {
  const { namespace, sessionId } = props;

  const [limit, setLimit] = useState(20);
  const [scope, setScope] = useState<'session' | 'namespace' | 'all'>('session');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<OpsAuditEvent[]>([]);

  const queryParams = useMemo(() => {
    return {
      namespace: scope === 'all' ? undefined : namespace,
      session_id: scope === 'session' ? sessionId : undefined,
      limit,
    };
  }, [namespace, sessionId, scope, limit]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await opsAudit(queryParams);
      setEvents(res.events || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Audit Logs</h3>
          <p className="text-sm text-gray-400 mt-1 font-mono">
            scope={scope} {' | '} ns={namespace} {' | '} session={sessionId}
          </p>
        </div>

        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-mem-border bg-black/30 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-mem-panel border border-mem-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-300">
            <Filter size={16} />
            <span className="text-sm">Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-mem-border overflow-hidden bg-black/20">
              <button
                type="button"
                onClick={() => setScope('session')}
                className={`px-3 py-1.5 text-xs font-mono transition-colors ${scope === 'session' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
              >
                Session
              </button>
              <button
                type="button"
                onClick={() => setScope('namespace')}
                className={`px-3 py-1.5 text-xs font-mono transition-colors border-l border-mem-border ${scope === 'namespace' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
              >
                Namespace
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 text-xs font-mono transition-colors border-l border-mem-border ${scope === 'all' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                title="Show audit events across all namespaces"
              >
                All
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <span>Limit</span>
              <input
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 20)))}
                className="w-20 bg-black/30 border border-mem-border rounded px-2 py-1 text-gray-200"
              />
            </label>
          </div>
        </div>

        {scope === 'session' && (
          <div className="mt-3 text-[11px] text-gray-500 font-mono">
            Tip: Switching namespace starts a new session, so this view may look empty. Use "Namespace" or "All" scope to see history.
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">
            <AlertTriangle size={18} className="mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Failed to load audit</div>
              <div className="mt-1 font-mono text-xs opacity-90">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-mem-border">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Namespace</th>
                <th className="py-2 pr-3">Session</th>
                <th className="py-2 pr-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No events.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="border-b border-mem-border/50 text-gray-200">
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-gray-400">
                      {formatTs(ev.created_at)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-mem-border text-xs font-mono">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-gray-400">
                      {ev.namespace}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-gray-400">
                      {ev.session_id}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-300">
                      {shortJson(ev.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="mt-3 text-xs font-mono text-gray-500">Loading…</div>
        )}
      </div>
    </div>
  );
}
