import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, FileText, Zap, Box, Tag, Layers, RefreshCw, Archive, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MemoryTier } from '../types';
import { Badge } from './ui/Card';

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

const RAW_SAMPLES = [
  "Check the production logs for the payment gateway. We noticed a latency spike around 2 AM UTC specifically for the EU cluster.",
  "I need the updated API documentation for the user authentication endpoints, specifically the JWT refresh token rotation policy.",
  "Can you remind me who the project lead for the 'Orion' initiative is? I believe it might be Sarah, but check the org chart.",
  "Extract all the email addresses from this JSON payload and format them as a CSV list for the marketing campaign export.",
  "What is the current status of the Q3 infrastructure migration ticket? Has the database sharding been completed?",
  "Please summarize the meeting notes from yesterday's standup regarding the frontend performance regression."
];

const ENTITIES_MAP: Record<string, string[]> = {
  "payment": ["Payment Gateway", "Latency", "EU Cluster"],
  "authentication": ["API Docs", "JWT", "Security"],
  "Orion": ["Project Orion", "Sarah", "Org Chart"],
  "JSON": ["Data Extraction", "CSV", "Marketing"],
  "infrastructure": ["Q3 Migration", "DB Sharding", "Ops"],
  "frontend": ["Performance", "Regression", "Standup"]
};

export const MemoryPipeline: React.FC = () => {
  const [ingestionQueue, setIngestionQueue] = useState<LogItem[]>([]);
  const [processingItem, setProcessingItem] = useState<LogItem | null>(null);
  const [processingStage, setProcessingStage] = useState<'idle' | 'summarizing' | 'extracting'>('idle');
  const [vaultItems, setVaultItems] = useState<ProcessedItem[]>([]);
  
  // Auto-ingest simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (ingestionQueue.length < 5) {
        const text = RAW_SAMPLES[Math.floor(Math.random() * RAW_SAMPLES.length)];
        const newItem: LogItem = {
          id: `log-${Date.now()}`,
          text,
          tokens: Math.floor(text.length / 4),
          timestamp: Date.now(),
          status: 'pending'
        };
        setIngestionQueue(prev => [newItem, ...prev]);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [ingestionQueue.length]);

  // Worker Processor Logic
  useEffect(() => {
    if (!processingItem && ingestionQueue.length > 0) {
      // Pick next item
      const itemToProcess = ingestionQueue[ingestionQueue.length - 1]; // Process oldest (FIFO)
      
      // Remove from queue
      setIngestionQueue(prev => prev.slice(0, -1));
      
      // Start Processing
      setProcessingItem(itemToProcess);
      setProcessingStage('summarizing');

      // Stage 1: Summarize (1.5s)
      setTimeout(() => {
        setProcessingStage('extracting');
        
        // Stage 2: Extract Entities (1.5s)
        setTimeout(() => {
          // Finish
          const entities = Object.entries(ENTITIES_MAP).find(([k]) => itemToProcess.text.includes(k))?.[1] || ["General"];
          const summary = `Summary: ${itemToProcess.text.split(' ').slice(0, 8).join(' ')}...`;
          
          const finishedItem: ProcessedItem = {
            id: `vault-${Date.now()}`,
            originalId: itemToProcess.id,
            summary,
            entities,
            tier: MemoryTier.L2_SEMANTIC,
            savedTokens: Math.floor(itemToProcess.tokens * 0.7),
            timestamp: Date.now()
          };

          setVaultItems(prev => [finishedItem, ...prev].slice(0, 10));
          setProcessingItem(null);
          setProcessingStage('idle');
        }, 1500);
      }, 1500);
    }
  }, [processingItem, ingestionQueue]);

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