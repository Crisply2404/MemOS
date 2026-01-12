import React, { useState, useEffect } from 'react';
import { Send, Database, Zap, ArrowRight, BrainCircuit, RefreshCw } from 'lucide-react';
import { RetrievalContext, MemoryTier, ChatMessage } from '../types';
import { Badge } from './ui/Card';

interface RagDebuggerProps {
  onSendMessage: (text: string) => void | Promise<void>;
  messages: ChatMessage[];
  retrievalContext: RetrievalContext | null;
  isProcessing: boolean;
  apiError?: string | null;
  namespace?: string;
}

export const RagDebugger: React.FC<RagDebuggerProps> = ({ 
  onSendMessage, 
  messages, 
  retrievalContext,
  isProcessing,
  apiError,
  namespace
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[600px]">
      {/* Left: Chat Interface */}
      <div className="flex flex-col bg-mem-panel rounded-xl border border-mem-border overflow-hidden h-full">
        <div className="p-4 border-b border-mem-border flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
            <h3 className="font-semibold text-gray-200">Live Agent Interaction</h3>
          </div>
          <Badge color="blue">Namespace: {namespace || 'Project_X'}</Badge>
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

      {/* Right: RAG 透视 (Perspective) */}
      <div className="flex flex-col gap-4 h-full">
        {/* Retrieval Status */}
        <div className="bg-mem-panel rounded-xl border border-mem-border p-4">
           <div className="flex items-center justify-between mb-2">
             <h3 className="font-semibold text-gray-200 flex items-center gap-2">
               <Database size={16} className="text-brand-secondary" />
               RAG Retrieval Context
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
             {retrievalContext && (
               <Badge color="green">Saved {Math.round((1 - retrievalContext.tokenUsageCondensed / retrievalContext.tokenUsageOriginal) * 100)}% Tokens</Badge>
             )}
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
                  <span>CONDENSED SUMMARY</span>
                  <span>{retrievalContext?.tokenUsageCondensed || 0} Tokens</span>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar text-xs text-gray-200 font-mono leading-relaxed bg-brand-accent/5">
                  {retrievalContext?.condensedText ? (
                    <>
                       <div className="flex items-center gap-2 mb-2 text-brand-accent">
                         <Zap size={12} />
                         <span className="text-[10px] uppercase tracking-wider">Generated by Worker</span>
                       </div>
                       {retrievalContext.condensedText}
                    </>
                  ) : "Waiting for optimization..."}
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};