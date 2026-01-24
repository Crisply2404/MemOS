import { ArrowRight, BrainCircuit, Database, RotateCcw, Send, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ChatMessage, RetrievalContext } from '../types';
import { ContextPackView } from './ContextPackView';
import { Badge } from './ui/Card';

interface RagDebuggerProps {
  onSendMessage: (text: string) => void | Promise<void>;
  messages: ChatMessage[];
  retrievalContext: RetrievalContext | null;
  isProcessing: boolean;
  apiError?: string | null;
  namespace?: string;
  sessionId?: string;
  onSeedDemo?: () => void | Promise<void>;
  onNewSession?: () => void;
  onResetSession?: () => void | Promise<void>;
  onSetNamespace?: (nextNamespace: string) => void;
}

export const RagDebugger: React.FC<RagDebuggerProps> = ({ 
  onSendMessage, 
  messages, 
  retrievalContext,
  isProcessing,
  apiError,
  namespace,
  sessionId,
  onSeedDemo,
  onNewSession,
  onResetSession,
  onSetNamespace
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showNamespaceEditor, setShowNamespaceEditor] = useState(false);
  const [namespaceDraft, setNamespaceDraft] = useState(namespace || 'Project_X');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNamespaceDraft(namespace || 'Project_X');
  }, [namespace]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleResetClick = async () => {
    if (!onResetSession) return;

    // Simple, explicit confirmation to avoid accidental data loss.
    const ok = window.confirm('Reset this session? This clears Redis (L1) + Postgres (memories/condensations/audit) for this session only.');
    if (!ok) return;

    setShowMenu(false);
    await onResetSession();
  };

  const handleOpenNamespaceEditor = () => {
    setShowMenu(false);
    setShowNamespaceEditor(true);
  };

  const handleApplyNamespace = () => {
    if (!onSetNamespace) return;
    onSetNamespace(namespaceDraft);
    setShowNamespaceEditor(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[600px]">
      {/* Left: Chat Interface */}
      <div className="flex flex-col bg-mem-panel rounded-xl border border-mem-border overflow-hidden h-full">
        <div className="p-4 border-b border-mem-border flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
            <h3 className="font-semibold text-gray-200">Live Agent Interaction</h3>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {/* Put identifiers in a single truncating row so they don't wrap into a second line. */}
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div
                className="min-w-0 max-w-[52%] h-7 px-2 rounded text-xs font-mono border bg-blue-500/10 text-blue-400 border-blue-500/20 inline-flex items-center gap-1 overflow-hidden leading-none"
                title={namespace || 'Project_X'}
              >
                <span className="uppercase tracking-wider text-[10px] text-blue-300/80">namespace:</span>{' '}
                <span className="min-w-0 flex-1">
                  <span
                    className="block w-full whitespace-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {namespace || 'Project_X'}
                  </span>
                </span>
              </div>

              <div
                className="min-w-0 max-w-[48%] h-7 px-2 rounded text-xs font-mono border bg-purple-500/10 text-purple-400 border-purple-500/20 inline-flex items-center gap-1 overflow-hidden leading-none"
                title={sessionId || ''}
              >
                <span className="uppercase tracking-wider text-[10px] text-purple-300/80">session:</span>{' '}
                <span className="min-w-0 flex-1">
                  <span
                    className="block w-full whitespace-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {sessionId || ''}
                  </span>
                </span>
              </div>
            </div>

            {/* Industry pattern: keep header clean; move session tooling into a single menu. */}
            {(onSeedDemo || onNewSession || onResetSession || onSetNamespace) && (
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMenu((v) => !v)}
                  disabled={isProcessing}
                  className="text-xs font-mono px-2 py-1 rounded border border-gray-700 bg-black/30 text-gray-300 hover:bg-white/5 disabled:opacity-50"
                  aria-haspopup="menu"
                  aria-expanded={showMenu}
                >
                  Options ▾
                </button>

                {showMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-lg border border-gray-800 bg-[#0B0C15] shadow-xl overflow-hidden"
                  >
                    {onSetNamespace && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleOpenNamespaceEditor}
                        disabled={isProcessing}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-gray-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        Set Namespace…
                      </button>
                    )}
                    {onSeedDemo && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowMenu(false);
                          onSeedDemo();
                        }}
                        disabled={isProcessing}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-gray-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        Seed Demo Data
                      </button>
                    )}
                    {onNewSession && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowMenu(false);
                          onNewSession();
                        }}
                        disabled={isProcessing}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-gray-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        New Session
                      </button>
                    )}
                    {onResetSession && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleResetClick}
                        disabled={isProcessing}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-red-200 hover:bg-red-900/10 disabled:opacity-50 flex items-center gap-2"
                        title="Clear L1 (Redis) + L2 (Postgres) for this session"
                      >
                        <RotateCcw size={14} className="text-red-300" />
                        Reset Session
                      </button>
                    )}
                  </div>
                )}

                {showNamespaceEditor && (
                  <div className="absolute right-0 mt-2 w-[340px] rounded-lg border border-gray-800 bg-[#0B0C15] shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-400 font-mono">
                      Switch Namespace
                    </div>
                    <div className="p-3 space-y-3">
                      <input
                        value={namespaceDraft}
                        onChange={(e) => setNamespaceDraft(e.target.value)}
                        placeholder="e.g. Project_X / Demo / Interview"
                        className="w-full bg-mem-dark border border-mem-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                        disabled={isProcessing}
                      />
                      <div className="text-[11px] text-gray-400 font-mono">
                        Switching namespace will start a new session.
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNamespaceEditor(false)}
                          disabled={isProcessing}
                          className="text-xs font-mono px-2 py-1 rounded border border-gray-700 bg-black/30 text-gray-300 hover:bg-white/5 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyNamespace}
                          disabled={isProcessing || !namespaceDraft.trim()}
                          className="text-xs font-mono px-2 py-1 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/20 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {apiError && (
          <div className="px-4 py-2 border-b border-mem-border bg-red-500/10 text-red-300 text-xs font-mono">
            {apiError}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Initialize conversation to trigger memory retrieval...</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-mem-border bg-black/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about project status, user preferences..."
              className="flex-1 bg-mem-dark border border-mem-border rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
              disabled={isProcessing}
            />
            <button 
              type="submit" 
              disabled={isProcessing}
              className="bg-brand-primary hover:bg-brand-primary/80 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Right: Context inspection */}
      <div className="flex flex-col gap-4 h-full">
        {/* Retrieval Status */}
        <div className="bg-mem-panel rounded-xl border border-mem-border p-4">
           <div className="flex items-center justify-between mb-2">
             <h3 className="font-semibold text-gray-200 flex items-center gap-2">
               <Database size={16} className="text-brand-secondary" />
               Context Retrieval
             </h3>
             {isProcessing && <span className="text-xs text-brand-accent animate-pulse">Processing L1/L2/L3...</span>}
           </div>
           
           {!retrievalContext ? (
             <div className="h-32 flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">
               Waiting for query...
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Source Tier</div>
                  <div className="font-mono text-brand-secondary text-sm">{retrievalContext.sourceTier}</div>
                </div>
                <div className="bg-black/20 p-3 rounded border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Similarity Score</div>
                  <div className="font-mono text-brand-accent text-sm">{(retrievalContext.similarity * 100).toFixed(1)}%</div>
                </div>
             </div>
           )}
        </div>

        {/* Comparison: Raw vs Condensed */}
        <div className="flex-1 bg-mem-panel rounded-xl border border-mem-border overflow-hidden flex flex-col">
           <div className="p-3 bg-white/5 border-b border-mem-border flex justify-between items-center">
             <span className="text-sm font-semibold text-gray-300">Context Optimization Engine</span>
              {retrievalContext ? (() => {
                const original = retrievalContext.tokenUsageOriginal || 0;
                const condensed = retrievalContext.tokenUsageCondensed || 0;
                if (original <= 0) return <Badge color="green">Saved 0% Tokens</Badge>;
                const diff = original - condensed;
                if (diff >= 0) {
                  const pct = Math.max(0, Math.round((diff / original) * 100));
                  return <Badge color="green">Saved {pct}% Tokens</Badge>;
                }
                return <Badge color="red">Overhead +{Math.abs(diff)} Tokens</Badge>;
              })() : null}
            </div>
           
           <div className="flex-1 grid grid-cols-2 divide-x divide-mem-border overflow-hidden">
              {/* Raw Column */}
              <div className="flex flex-col overflow-hidden">
                <div className="p-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 font-mono flex justify-between">
                  <span>RAW CHUNKS</span>
                  <span>{retrievalContext?.tokenUsageOriginal || 0} Tokens</span>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar text-xs text-gray-400 font-mono leading-relaxed">
                  {retrievalContext?.originalText || "No context loaded."}
                </div>
              </div>

              {/* Condensed Column */}
              <div className="flex flex-col overflow-hidden relative">
                <div className="absolute top-1/2 -left-3 z-10 bg-mem-panel rounded-full p-1 border border-mem-border">
                  <ArrowRight size={14} className="text-gray-500" />
                </div>
                <div className="p-2 bg-brand-accent/10 border-b border-brand-accent/20 text-xs text-brand-accent font-mono flex justify-between">
                  <span>WORKING MEMORY (SUMMARY)</span>
                  <span>{retrievalContext?.tokenUsageCondensed || 0} Tokens</span>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar text-xs text-gray-200 font-mono leading-relaxed bg-brand-accent/5">
                  {retrievalContext?.contextPack && Object.keys(retrievalContext.contextPack).length > 0 ? (
                    <>
                       <div className="flex items-center gap-2 mb-2 text-brand-accent">
                         <Zap size={12} />
                         <span className="text-[10px] uppercase tracking-wider">
                           Context pack (procedural + episodic + semantic)
                         </span>
                       </div>

                       <ContextPackView pack={retrievalContext.contextPack} />
                     </>
                   ) : "Waiting for working memory..."}
                 </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};
