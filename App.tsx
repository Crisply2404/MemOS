import { Brain, Layers, LayoutDashboard, Microscope, Radar, Settings, Shield, Terminal } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AuditPanel } from './components/AuditPanel';
import { Dashboard } from './components/Dashboard';
import { MemoryPipeline } from './components/MemoryPipeline';
import { RagDebugger } from './components/RagDebugger';
import { SemanticRadar } from './components/SemanticRadar'; // New Import
import { ChatMessage, MemoryNode, RetrievalContext, SystemStats, ViewMode } from './types';
import { devSeed, ingest, query as queryApi, resetSession } from './utils/api';
import { generateMockMemories } from './utils/mockData';

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/20' 
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.RADAR); // Set RADAR as default
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentContext, setCurrentContext] = useState<RetrievalContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalMemories: 14052,
    activeContexts: 3,
    tokenSavings: 845200,
    compressionRatio: 0.82
  });

  const [namespace, setNamespace] = useState(() => {
    const existing = localStorage.getItem('memos_namespace');
    return (existing && existing.trim().length > 0) ? existing : 'Project_X';
  });
  const [sessionId, setSessionId] = useState(() => {
    const existing = localStorage.getItem('memos_session_id');
    if (existing) return existing;
    const created = `web-${crypto.randomUUID()}`;
    localStorage.setItem('memos_session_id', created);
    return created;
  });

  const handleSetNamespace = (nextNamespace: string) => {
    const trimmed = nextNamespace.trim();
    if (!trimmed) return;

    localStorage.setItem('memos_namespace', trimmed);
    setNamespace(trimmed);

    // Switching tenant/workspace context rotates session to avoid cross-contamination.
    const created = `web-${crypto.randomUUID()}`;
    localStorage.setItem('memos_session_id', created);
    setSessionId(created);
    setChatMessages([]);
    setCurrentContext(null);
    setApiError(null);
  };

  const handleSeedDemo = async () => {
    setIsProcessing(true);
    setApiError(null);
    try {
      await devSeed({ namespace, session_id: sessionId, reset: true });

      const systemMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Seeded demo memories into L2 (Postgres). Ask a question to trigger retrieval + condensation.',
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, systemMsg]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to seed demo data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSession = () => {
    const created = `web-${crypto.randomUUID()}`;
    localStorage.setItem('memos_session_id', created);
    setSessionId(created);
    setChatMessages([]);
    setCurrentContext(null);
    setApiError(null);
  };

  const handleResetSession = async () => {
    setIsProcessing(true);
    setApiError(null);
    try {
      await resetSession({
        namespace,
        session_id: sessionId,
        confirm: true,
        dry_run: false,
        clear_audit: false
      });

      const systemMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Session reset: cleared Redis (L1) + Postgres (memories/condensations/audit) for this session.',
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, systemMsg]);
      setCurrentContext(null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to reset session');
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize Data
  useEffect(() => {
    setMemories(generateMockMemories(150));
  }, []);

  const handleSendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsProcessing(true);
    setApiError(null);

    try {
      await ingest({
        namespace,
        session_id: sessionId,
        role: 'user',
        text,
        metadata: {
          source: 'web',
          ui: 'RagDebugger'
        }
      });

      const response = await queryApi({
        namespace,
        session_id: sessionId,
        query: text,
        top_k: 6
      });

      const originalText = response.raw_chunks.map((chunk) => `(${chunk.tier}) ${chunk.text}`).join('\n');
      const context: RetrievalContext = {
        id: response.id,
        sourceTier: response.source_tier as MemoryTier,
        similarity: response.similarity,
        originalText,
        condensedText: response.condensed_summary,
        tokenUsageOriginal: response.token_usage_original,
        tokenUsageCondensed: response.token_usage_condensed
      };

      setCurrentContext(context);

      const newMemory: MemoryNode = {
        id: `new-${Date.now()}`,
        content: text,
        tier: context.sourceTier,
        importanceScore: 1,
        embedding: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
        timestamp: Date.now(),
        namespace
      };
      setMemories(prev => [...prev, newMemory]);

      setSystemStats(prev => ({
        ...prev,
        totalMemories: prev.totalMemories + 1,
        tokenSavings: prev.tokenSavings + (context.tokenUsageOriginal - context.tokenUsageCondensed)
      }));

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: context.condensedText,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unknown API error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-mem-dark text-gray-200 overflow-hidden font-sans selection:bg-brand-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-mem-border bg-[#0B0C15] flex flex-col z-20">
        <div className="p-6 border-b border-mem-border">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            MemOS
          </div>
          <div className="mt-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest bg-white/5 inline-block px-2 py-0.5 rounded">
            v2.4.0-stable
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="System Overview" 
            active={view === ViewMode.DASHBOARD} 
            onClick={() => setView(ViewMode.DASHBOARD)} 
          />
          <SidebarItem 
            icon={Layers}
            label="Memory Pipeline"
            active={view === ViewMode.PIPELINE} 
            onClick={() => setView(ViewMode.PIPELINE)} 
          />
          <SidebarItem 
            icon={Radar} // New Icon
            label="Semantic Radar" // New Label
            active={view === ViewMode.RADAR} 
            onClick={() => setView(ViewMode.RADAR)} 
          />
          <SidebarItem 
            icon={Microscope} 
            label="RAG Debugger" 
            active={view === ViewMode.RAG_DEBUG} 
            onClick={() => setView(ViewMode.RAG_DEBUG)} 
          />
          <div className="pt-4 pb-2">
             <div className="text-xs font-semibold text-gray-600 px-4 uppercase tracking-wider mb-2">Governance</div>
             <SidebarItem 
              icon={Shield} 
              label="Policy & TTL" 
              active={false} 
              onClick={() => {}} 
            />
             <SidebarItem 
              icon={Terminal} 
              label="Audit Logs" 
              active={view === ViewMode.AUDIT} 
              onClick={() => setView(ViewMode.AUDIT)} 
            />
          </div>
        </nav>

        <div className="p-4 border-t border-mem-border bg-white/5">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
               W
             </div>
             <div className="overflow-hidden">
               <div className="text-sm font-medium text-white truncate">Worker: Condensation</div>
               <div className="text-xs text-emerald-400 truncate flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 Processing Job #42
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-mem-border bg-mem-panel/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <h2 className="text-lg font-semibold text-white">
            {view === ViewMode.DASHBOARD && 'Operational Dashboard'}
            {view === ViewMode.PIPELINE && 'Ingestion & Processing Pipeline'}
            {view === ViewMode.RADAR && 'Semantic Relevance Radar'}
            {view === ViewMode.RAG_DEBUG && 'Context Retrieval & Optimization'}
            {view === ViewMode.AUDIT && 'Audit & Explainability'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded border border-mem-border">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-mono text-gray-400">MEMORY_CONTROLLER: ACTIVE</span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-dots-pattern relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-mem-dark pointer-events-none" />
          
          <div className="max-w-7xl mx-auto h-full relative z-0">
            {view === ViewMode.DASHBOARD && (
              <Dashboard stats={systemStats} />
            )}
            
            {view === ViewMode.PIPELINE && (
              <div className="h-[calc(100vh-8rem)]">
                 <MemoryPipeline namespace={namespace} sessionId={sessionId} />
              </div>
            )}

            {view === ViewMode.RADAR && (
              <div className="h-[calc(100vh-8rem)]">
                 <SemanticRadar />
              </div>
            )}
            
            {view === ViewMode.RAG_DEBUG && (
              <RagDebugger 
                onSendMessage={handleSendMessage}
                messages={chatMessages}
                retrievalContext={currentContext}
                isProcessing={isProcessing}
                apiError={apiError}
                namespace={namespace}
                onSeedDemo={handleSeedDemo}
                onNewSession={handleNewSession}
                onResetSession={handleResetSession}
                onSetNamespace={handleSetNamespace}
                sessionId={sessionId}
              />
            )}

            {view === ViewMode.AUDIT && (
              <AuditPanel namespace={namespace} sessionId={sessionId} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;