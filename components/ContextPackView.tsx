import React from 'react';
import { MemoryCardView } from './MemoryCardView';
import { Badge } from './ui/Card';

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function ContextPackView(props: {
  pack: Record<string, unknown>;
}): React.ReactElement {
  const pack = props.pack || {};
  const procedural = asObject(pack.procedural);
  const prompt = asObject(procedural.prompt);
  const tools = asArray(procedural.tools);

  const working = asObject(pack.working_memory);
  const l1Window = asArray(working.l1_window);
  const sessionSummary = asString(working.session_summary);
  const sessionSummaryId = asString(working.session_summary_id);

  const retrieval = asObject(pack.retrieval);
  const rawChunks = asArray(retrieval.raw_chunks);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="purple" title={asString(pack.schema) || ''}>Context Pack</Badge>
        {asString(pack.query_text) ? <Badge color="blue">query</Badge> : null}
        {sessionSummaryId ? <Badge color="green">summary:{sessionSummaryId.slice(-8)}</Badge> : null}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-black/20 border border-mem-border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Working Memory (Session Summary)</div>
          <MemoryCardView text={sessionSummary || '(no summary yet)'} />
        </div>

        <details className="bg-black/10 border border-mem-border rounded-lg p-3">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-gray-400">
            Inputs & Debug
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div className="bg-black/20 border border-mem-border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Procedural Memory</div>
              <div className="text-xs text-gray-200 font-mono">
                prompt: {asString(prompt.name) || 'default'} {asString(prompt.description) ? `— ${asString(prompt.description)}` : ''}
              </div>
              <div className="mt-2 text-xs text-gray-400 font-mono">tools: {tools.length}</div>
              {tools.length > 0 ? (
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {tools.slice(0, 8).map((t, idx) => {
                    const toolObj = asObject(t);
                    return (
                      <div key={idx} className="text-xs text-gray-300 font-mono truncate">
                        - {asString(toolObj.name) || 'tool'} ({asString(toolObj.endpoint)})
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="bg-black/20 border border-mem-border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Working Window (L1)</div>
              {l1Window.length > 0 ? (
                <div className="space-y-1 text-xs text-gray-300 font-mono">
                  {l1Window.slice(0, 10).map((m, idx) => {
                    const msg = asObject(m);
                    return (
                      <div key={idx} className="truncate">
                        [{asString(msg.role)}] {asString(msg.text)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-mono">(empty)</div>
              )}
            </div>

            <div className="bg-black/20 border border-mem-border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Semantic Retrieval (L2)</div>
              <div className="text-xs text-gray-400 font-mono">chunks: {rawChunks.length}</div>
              {rawChunks.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {rawChunks.slice(0, 8).map((c, idx) => {
                    const chunk = asObject(c);
                    const score = asNumber(chunk.score);
                    return (
                      <div key={idx} className="text-xs text-gray-300 font-mono truncate">
                        - {asString(chunk.id).slice(-8)} {score !== null ? `score=${score.toFixed(3)}` : ''} {asString(chunk.tier)}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
