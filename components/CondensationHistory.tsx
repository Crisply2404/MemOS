import { RefreshCw } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { opsCondensations, OpsCondensation } from '../utils/api';
import { Badge } from './ui/Card';
import { MemoryCardView } from './MemoryCardView';

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

export function CondensationHistory(props: {
  namespace: string;
  sessionId: string;
}): React.ReactElement {
  const { namespace, sessionId } = props;

  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OpsCondensation[]>([]);

  const queryParams = useMemo(() => {
    return {
      namespace,
      session_id: sessionId,
      limit,
    };
  }, [namespace, sessionId, limit]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await opsCondensations(queryParams);
      setItems(res.condensations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load condensations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  return (
    <div className="bg-black/10 border border-mem-border rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Summary History (Replay)</div>
          <div className="text-xs text-gray-500 font-mono truncate">
            ns={namespace} {' | '} session={sessionId}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Debug/replay view: persisted summaries for this session (version + trigger + inputs). Not the main user flow.
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-2 py-1 rounded border border-mem-border bg-black/30 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span className="text-xs">Refresh</span>
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="text-xs text-gray-400">
          Limit{' '}
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            className="ml-2 w-16 bg-black/30 border border-mem-border rounded px-2 py-0.5 text-gray-200 font-mono"
          />
        </label>
        <div className="text-xs text-gray-500 font-mono">{items.length} items</div>
      </div>

      {error && <div className="mt-2 text-xs text-red-300">{error}</div>}

      {items.length === 0 ? (
        <div className="mt-2 text-xs text-gray-500">
          No summaries yet. Start the worker (`scripts/dev_worker.ps1`) and run a query to enqueue a job.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((c) => {
            const saved = Math.max(0, c.token_original - c.token_condensed);
            return (
              <details key={c.id} className="bg-black/20 border border-mem-border rounded-lg p-2">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-200 font-mono truncate">
                      {c.version} {' | '} {formatTs(c.created_at)}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono truncate">
                      id={c.id.slice(-8)} {' | '} src_ids={c.source_memory_ids.length} {' | '} reason=
                      {c.trigger_reason || '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="green">-{saved} tok</Badge>
                    <Badge color="purple">{Math.round((1 - c.token_condensed / c.token_original) * 100)}%</Badge>
                  </div>
                </summary>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div className="text-[11px] text-gray-400 font-mono">
                    trigger_details: {shortJson(c.trigger_details)}
                  </div>
                  <div className="bg-black/30 border border-mem-border rounded p-2">
                    <MemoryCardView text={c.condensed_text} />
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
