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
}): React.ReactElement {
  const card = tryParseMemoryCard(props.text);

  if (!card) {
    return (
      <div className="text-xs text-gray-200 font-mono whitespace-pre-wrap break-words">
        {props.text}
      </div>
    );
  }

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="purple">{card.schema}</Badge>
        {bucket('facts', card.facts)}
        {bucket('preferences', card.preferences)}
        {bucket('constraints', card.constraints)}
        {bucket('decisions', card.decisions)}
      </div>

      <div className="grid grid-cols-1 gap-3">
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

        {card.raw_excerpt ? (
          <details className="bg-black/10 border border-mem-border rounded-lg p-3" open={props.showRawByDefault}>
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-gray-400">Raw excerpt</summary>
            <div className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-300 font-mono leading-relaxed">
              {card.raw_excerpt}
            </div>
          </details>
        ) : null}

        <details className="bg-black/10 border border-mem-border rounded-lg p-3" open={props.showRawByDefault}>
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-gray-400">Raw JSON</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-300 font-mono leading-relaxed">
{props.text}
          </pre>
        </details>
      </div>
    </div>
  );
}
