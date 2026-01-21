import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Zap, Tag, Layers, RefreshCw, Archive, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MemoryTier } from '../types';
import { Badge } from './ui/Card';
import { opsPipeline } from '../utils/api';

interface LogItem {
  id: string;
  text: string;
  tokens: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'processed';
}

interface ProcessedItem {
  id: string;
  originalId: string;
  summary: string;
  entities: string[];
  tier: MemoryTier;
  savedTokens: number;
  timestamp: number;
}

function safeParseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export const MemoryPipeline: React.FC = () => {
  const [pipelineQueueCount, setPipelineQueueCount] = useState<number>(0);
  const [vaultItems, setVaultItems] = useState<ProcessedItem[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeNamespace, setActiveNamespace] = useState<string>('Project_X');
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const processingItem: LogItem | null = useMemo(() => {
    if (pipelineQueueCount <= 0) return null;
    return {
      id: `job-${pipelineQueueCount}`,
      text: 'Condensation queue is processing recent sessions…',
      tokens: 0,
      timestamp: Date.now(),
      status: 'processing'
    };
  }, [pipelineQueueCount]);

  const processingStage: 'idle' | 'summarizing' | 'extracting' = useMemo(() => {
    if (!processingItem) return 'idle';
    return 'summarizing';
  }, [processingItem]);

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      try {
        const data = await opsPipeline();
        if (canceled) return;

        const condensationQueue = data.queues.find(q => q.name === 'condensation');
        setPipelineQueueCount(condensationQueue?.count ?? 0);

        const mapped: ProcessedItem[] = data.recent_condensations
          .filter((row) => {
            if (activeNamespace && row.namespace !== activeNamespace) return false;
            if (activeSessionId && row.session_id !== activeSessionId) return false;
            return true;
          })
          .slice(0, 10)
          .map((row) => {
          const original = row.token_original;
          const condensed = row.token_condensed;
          const saved = Math.max(0, original - condensed);

          return {
            id: row.id,
            originalId: row.session_id,
            summary: `Condensed session ${row.session_id} (${row.namespace})` ,
            entities: [row.namespace],
            tier: MemoryTier.L2_SEMANTIC,
            savedTokens: saved,
            timestamp: safeParseTimestamp(row.created_at)
          };
        });

        setVaultItems(mapped);
        setLastUpdatedAt(Date.now());
        setApiError(null);
      } catch (err) {
        if (canceled) return;
        setApiError(err instanceof Error ? err.message : 'Failed to load pipeline data');
      }
    };

    load();
    const interval = setInterval(load, 2000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [activeNamespace, activeSessionId]);

  const ingestionQueue: LogItem[] = useMemo(() => {
    const pending = Math.min(pipelineQueueCount, 5);
    return Array.from({ length: pending }).map((_, idx) => ({
      id: `pending-${idx + 1}`,
      text: 'Pending condensation job (from /v1/query enqueue)',
      tokens: 0,
      timestamp: Date.now() - idx * 1000,
      status: 'pending'
    }));
  }, [pipelineQueueCount]);

  return (
    <div className="h-full flex flex-col gap-6 p-2">
      {/* Pipeline Header */}
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Layers className="text-brand-primary" />
             The Memory Pipeline
           </h2>
           <p className="text-gray-400 text-xs mt-1">Real-time ingestion, compression, and entity graphing governance.</p>
        </div>
        <div className="flex gap-4 text-xs font-mono">
           <div className="flex items-center gap-2 text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Ingestion Active
           </div>
           <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Vault Online
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
        <div className="text-[10px] text-gray-500 font-mono">
          Showing Structured Vault for current context (filtering recent condensations)
        </div>
        <div className="flex flex-col sm:flex-row gap-2 text-xs">
          <label className="flex items-center gap-2 bg-black/20 border border-white/10 rounded px-2 py-1">
            <span className="text-gray-400 font-mono text-[10px]">NAMESPACE</span>
            <input
              className="bg-transparent outline-none text-gray-200 font-mono text-[12px] w-40"
              value={activeNamespace}
              onChange={(e) => setActiveNamespace(e.target.value)}
              placeholder="Project_X"
            />
          </label>
          <label className="flex items-center gap-2 bg-black/20 border border-white/10 rounded px-2 py-1">
            <span className="text-gray-400 font-mono text-[10px]">SESSION</span>
            <input
              className="bg-transparent outline-none text-gray-200 font-mono text-[12px] w-64"
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              placeholder="(blank = any session)"
            />
          </label>
          <button
            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-gray-300 font-mono text-[11px] hover:bg-black/30"
            onClick={() => {
              setActiveNamespace('');
              setActiveSessionId('');
            }}
            type="button"
            title="Show recent condensations across all contexts"
          >
            Clear filter
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs font-mono text-red-300">
          Pipeline API error: {apiError}
        </div>
      )}

      {lastUpdatedAt && (
        <div className="text-[10px] text-gray-500 font-mono">
          Last updated: {new Date(lastUpdatedAt).toLocaleTimeString()}
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* COLUMN A: INGESTION STREAM */}
        <div className="bg-mem-panel/50 border border-red-500/20 rounded-xl flex flex-col overflow-hidden relative">
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex justify-between items-center">
            <h3 className="font-bold text-red-100 flex items-center gap-2">
              <AlertCircle size={16} /> Ingestion Stream
            </h3>
            <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-red-300">
               {ingestionQueue.length} Pending
            </span>
          </div>
          
          {/* Waterfall Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative custom-scrollbar">
            {ingestionQueue.length === 0 && (
               <div className="text-center text-gray-600 mt-20 text-sm animate-pulse">Waiting for incoming stream...</div>
            )}
            {ingestionQueue.map((log) => (
              <div key={log.id} className="bg-[#0B0C15] border-l-2 border-red-500 p-3 rounded shadow-lg animate-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono text-gray-500">LOG-ID: {log.id.slice(-6)}</span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                    {log.tokens} TOKENS
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed font-mono">
                  {log.text}
                </p>
                <div className="mt-2 flex justify-end">
                   <span className="text-[10px] text-red-500/80 animate-pulse">PENDING PROCESSING</span>
                </div>
              </div>
            ))}
            
            {/* Visual gradient at bottom to show flow */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-mem-panel to-transparent pointer-events-none" />
          </div>
        </div>

        {/* COLUMN B: REFINERY WORKER */}
        <div className="bg-mem-panel/30 border border-brand-primary/20 rounded-xl flex flex-col relative overflow-hidden">
           {/* Connecting Arrows */}
           <div className="absolute top-1/2 -left-4 z-10 text-gray-600 hidden lg:block">
              <ArrowRight size={24} className="animate-pulse" />
           </div>
           <div className="absolute top-1/2 -right-4 z-10 text-gray-600 hidden lg:block">
              <ArrowRight size={24} className="animate-pulse" />
           </div>

           <div className="p-4 bg-brand-primary/10 border-b border-brand-primary/20 text-center">
             <h3 className="font-bold text-brand-primary flex items-center justify-center gap-2">
               <RefreshCw size={16} className={processingItem ? "animate-spin" : ""} /> Refinery Worker
             </h3>
           </div>

           <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              {/* Background Gears Visual */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                 <RefreshCw size={200} />
              </div>

              {processingItem ? (
                <div className="w-full relative z-10">
                   {/* Current Item Card */}
                   <div className="bg-mem-dark border border-brand-primary/50 rounded-lg p-4 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                      <div className="flex justify-between text-xs text-gray-400 mb-4 font-mono">
                         <span>Processing: {processingItem.id.slice(-6)}</span>
                         <span>{processingStage === 'summarizing' ? 'STEP 1/2' : 'STEP 2/2'}</span>
                      </div>
                      
                      {/* Animation Container */}
                      <div className="space-y-6">
                        {/* Summarization Visual */}
                        <div>
                           <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Context Condensation</span>
                              <span className={processingStage === 'summarizing' ? "text-brand-primary font-bold" : "text-green-500"}>
                                {processingStage === 'summarizing' ? 'Compressing...' : 'Done'}
                              </span>
                           </div>
                           <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full bg-brand-primary transition-all duration-1000 ease-out ${processingStage === 'summarizing' ? 'w-1/2 animate-pulse' : 'w-full bg-green-500'}`} />
                           </div>
                           <p className={`text-xs mt-2 font-mono transition-all duration-500 ${processingStage === 'summarizing' ? 'text-gray-500' : 'text-gray-300'}`}>
                              {processingStage === 'summarizing' 
                                ? processingItem.text 
                                : `Summary: ${processingItem.text.split(' ').slice(0, 8).join(' ')}...`
                              }
                           </p>
                        </div>

                        {/* Entity Extraction Visual */}
                        <div className={`transition-opacity duration-500 ${processingStage === 'extracting' ? 'opacity-100' : 'opacity-30'}`}>
                           <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Entity Graphing</span>
                              <span className="text-brand-secondary">
                                {processingStage === 'extracting' ? 'Extracting Nodes...' : 'Waiting'}
                              </span>
                           </div>
                           <div className="flex gap-2 mt-2 flex-wrap">
                              {processingStage === 'extracting' && (
                                <>
                                  <div className="bg-brand-secondary/20 text-brand-secondary text-xs px-2 py-1 rounded border border-brand-secondary/30 animate-bounce">
                                     <Tag size={10} className="inline mr-1"/> Extraction
                                  </div>
                                  <div className="bg-pink-500/20 text-pink-400 text-xs px-2 py-1 rounded border border-pink-500/30 animate-bounce delay-100">
                                     <Tag size={10} className="inline mr-1"/> Named Entity
                                  </div>
                                </>
                              )}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="text-center text-gray-600">
                   <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-700 mx-auto mb-4 flex items-center justify-center">
                     <Zap className="text-gray-700" />
                   </div>
                   <p className="text-sm">Worker Idle</p>
                   <p className="text-xs">Waiting for stream...</p>
                </div>
              )}
           </div>
        </div>

        {/* COLUMN C: STRUCTURED VAULT */}
        <div className="bg-mem-panel/50 border border-emerald-500/20 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex justify-between items-center">
            <h3 className="font-bold text-emerald-100 flex items-center gap-2">
              <Archive size={16} /> Structured Vault
            </h3>
            <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-emerald-300">
               {vaultItems.length} Stored
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {vaultItems.map((item) => (
              <div key={item.id} className="bg-[#0B0C15] border-l-2 border-emerald-500 p-3 rounded shadow-lg animate-in slide-in-from-left-4 duration-300">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <Badge color="green">L2 STORE</Badge>
                      <Badge color="purple">Optimized</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                       <Zap size={10} />
                       -{item.savedTokens} TOKENS
                    </div>
                 </div>
                 
                 <p className="text-xs text-gray-300 font-medium mb-2">{item.summary}</p>
                 
                 <div className="flex flex-wrap gap-1.5">
                    {item.entities.map((ent, i) => (
                       <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                          #{ent}
                       </span>
                    ))}
                 </div>
                 
                 <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span>ID: {item.id.slice(-8)}</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Synced</span>
                 </div>
              </div>
            ))}
            {vaultItems.length === 0 && (
               <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                  Vault is empty. Waiting for processed batches.
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};