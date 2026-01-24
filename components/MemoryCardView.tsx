import React from 'react';
import { Badge } from './ui/Card';

type MemoryCard = {
  schema: 'memos.memory_card.v1' | 'memos.memory_card.v2';
  facts?: string[];
  preferences?: string[];
  constraints?: string[];
  decisions?: string[];
  risks?: string[];
  actions?: string[];
  pitfalls?: string[];
  commands?: string[];
  raw_excerpt?: string;
};

function tryParseMemoryCard(text: string): MemoryCard | null {
  const t = (text || '').trim();
  if (!t) return null;

  const parseOnce = (value: string): unknown | null => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const obj1 = t[0] === '{' || t[0] === '"' ? parseOnce(t) : null;
  const obj2 =
    typeof obj1 === 'string' && obj1.trim().startsWith('{') ? parseOnce(obj1.trim()) : obj1;
  try {
    const obj = obj2 as any;
    if (obj && (obj.schema === 'memos.memory_card.v1' || obj.schema === 'memos.memory_card.v2')) return obj as MemoryCard;
  } catch {
    // Not JSON.
  }
  return null;
}

export function MemoryCardView(props: {
  text: string;
  showRawByDefault?: boolean;
  showSchemaBadge?: boolean;
  showBuckets?: boolean;
  showRawExcerpt?: boolean;
  showRawJson?: boolean;
}): React.ReactElement {
  const card = tryParseMemoryCard(props.text);
  const [openBucket, setOpenBucket] = React.useState<
    'facts' | 'preferences' | 'constraints' | 'decisions' | null
  >(null);

  if (!card) {
    return (
      <div className="text-xs text-gray-200 font-mono whitespace-pre-wrap break-words">
        {props.text}
      </div>
    );
  }

  const showSchemaBadge = props.showSchemaBadge ?? false;
  const showBuckets = props.showBuckets ?? false;
  const showRawExcerpt = props.showRawExcerpt ?? true;
  const showRawJson = props.showRawJson ?? true;

  const risks = (card.risks && card.risks.length > 0) ? card.risks : (card.pitfalls || []);
  const actions = (card.actions && card.actions.length > 0) ? card.actions : (card.commands || []);

  const bucket = (name: string, list: string[] | undefined) => (
    <span
      className={`px-2 py-1 rounded border border-gray-700 bg-black/30 text-[11px] font-mono ${
        list && list.length > 0 ? 'text-emerald-200' : 'text-gray-500'
      }`}
    >
      {name}
    </span>
  );

  const renderList = (items: string[] | undefined, maxItems: number) => {
    const list = (items || []).filter(Boolean);
    if (list.length === 0) return <div className="text-gray-500 font-sans text-xs">(none)</div>;
    return (
      <div className="space-y-1 text-gray-200 font-sans text-xs leading-relaxed">
        {list.slice(0, maxItems).map((p, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-gray-500">-</span>
            <span className="whitespace-pre-wrap break-words">{p}</span>
          </div>
        ))}
      </div>
    );
  };

  const buckets: Array<{
    key: 'facts' | 'preferences' | 'constraints' | 'decisions';
    label: string;
    items: string[] | undefined;
  }> = [
    { key: 'facts', label: 'Facts', items: card.facts },
    { key: 'decisions', label: 'Decisions', items: card.decisions },
    { key: 'constraints', label: 'Constraints', items: card.constraints },
    { key: 'preferences', label: 'Preferences', items: card.preferences },
  ];

  const openBucketMeta = openBucket
    ? buckets.find((b) => b.key === openBucket) || null
    : null;

  return (
    <div className="space-y-3">
      {(showSchemaBadge || showBuckets) ? (
        <div className="flex flex-wrap items-center gap-2">
          {showSchemaBadge ? <Badge color="purple">{card.schema}</Badge> : null}
          {showBuckets ? (
            <>
              {bucket('facts', card.facts)}
              {bucket('preferences', card.preferences)}
              {bucket('constraints', card.constraints)}
              {bucket('decisions', card.decisions)}
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-black/20 border border-mem-border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Core Buckets</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {buckets.map((b) => {
              const count = (b.items || []).filter(Boolean).length;
              const enabled = count > 0;
              const active = openBucket === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  className={`bg-black/10 border rounded-lg p-3 text-left transition-colors ${
                    enabled ? 'hover:bg-white/5' : 'opacity-60 cursor-not-allowed'
                  } ${active ? 'border-brand-accent/40 bg-brand-accent/5' : 'border-mem-border'}`}
                  onClick={() => {
                    if (!enabled) return;
                    setOpenBucket((prev) => (prev === b.key ? null : b.key));
                  }}
                  disabled={!enabled}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">{b.label}</div>
                    <div className="text-[10px] font-mono text-gray-500">{count}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    {enabled ? (active ? 'Click to collapse' : 'Click to expand') : '(empty)'}
                  </div>
                </button>
              );
            })}
          </div>

          {openBucketMeta ? (
            <div className="mt-3 bg-black/10 border border-mem-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400">{openBucketMeta.label}</div>
                  <div className="text-[11px] font-mono text-gray-500">
                    {openBucketMeta.items?.length || 0} items
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border border-gray-700 bg-black/30 text-xs text-gray-200 hover:bg-white/10"
                  onClick={() => setOpenBucket(null)}
                >
                  Collapse
                </button>
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {renderList(openBucketMeta.items, 1000)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-black/20 border border-mem-border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Risks</div>
          {(risks && risks.length > 0) ? (
            <div className="space-y-1 text-gray-200 font-sans text-xs leading-relaxed">
              {risks.slice(0, 8).map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-red-300">-</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 font-sans text-xs">(none detected)</div>
          )}
        </div>

        <div className="bg-black/20 border border-mem-border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Actions</div>
          {(actions && actions.length > 0) ? (
            <pre className="whitespace-pre-wrap break-words text-xs text-gray-200 font-mono leading-relaxed">
{actions.slice(0, 12).join('\n')}
            </pre>
          ) : (
            <div className="text-gray-500 font-sans text-xs">(none detected)</div>
          )}
        </div>

        {showRawExcerpt && card.raw_excerpt ? (
          <details className="bg-black/10 border border-mem-border rounded-lg p-3" open={props.showRawByDefault}>
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-gray-400">Raw excerpt</summary>
            <div className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-300 font-mono leading-relaxed">
              {card.raw_excerpt}
            </div>
          </details>
        ) : null}

        {showRawJson ? (
          <details className="bg-black/10 border border-mem-border rounded-lg p-3" open={props.showRawByDefault}>
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-gray-400">Raw JSON</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-300 font-mono leading-relaxed">
{props.text}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
