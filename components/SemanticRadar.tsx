import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Database, Filter, Globe, MessageSquare, Radar, Search, Target } from 'lucide-react';
import { query as queryApi } from '../utils/api';
import { Badge } from './ui/Card';

interface RadarBlip {
  id: string;
  content: string;
  source: 'history' | 'docs' | 'web';
  rawScore: number; // Vector Similarity (0-1)
  rerankScore: number; // Cross-Encoder Score (0-1)
  angle: number; // 0-360 degrees
}

function hashAngle(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % 360;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function extractRerankScore(meta: Record<string, unknown> | undefined, fallback: number): number {
  const v = meta?.rerank_score;
  return typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : fallback;
}

export const SemanticRadar: React.FC<{ namespace: string; sessionId: string }> = ({ namespace, sessionId }) => {
  const [query, setQuery] = useState('');
  const [isRerankEnabled, setIsRerankEnabled] = useState(false);
  const [activeBlip, setActiveBlip] = useState<RadarBlip | null>(null);
  const [scanAngle, setScanAngle] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blips, setBlips] = useState<RadarBlip[]>([]);

  // Radar Animation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setScanAngle(prev => (prev + 2) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const canQuery = useMemo(
    () => query.trim().length > 0 && namespace.trim().length > 0 && sessionId.trim().length > 0,
    [query, namespace, sessionId]
  );

  const runQuery = async () => {
    if (!canQuery) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await queryApi({
        namespace,
        session_id: sessionId,
        query: query.trim(),
        top_k: 12,
      });

      const next: RadarBlip[] = (res.raw_chunks || []).map((c) => ({
        id: c.id,
        content: c.text,
        source: 'history',
        rawScore: clamp01(c.score),
        rerankScore: extractRerankScore(c.metadata || {}, clamp01(c.score)),
        angle: hashAngle(c.id),
      }));

      setBlips(next);
      setActiveBlip(next.length > 0 ? next[0] : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to query');
    } finally {
      setIsLoading(false);
    }
  };

  const getRadius = (score: number) => {
    // Score 1.0 -> Radius 0% (Center)
    // Score 0.0 -> Radius 100% (Edge)
    // We clamp minimum radius slightly so it doesn't sit exactly on center point
    return Math.max(5, (1 - score) * 100); 
  };

  const getBlipPosition = (blip: RadarBlip) => {
    const score = isRerankEnabled ? blip.rerankScore : blip.rawScore;
    const radiusPercent = getRadius(score);
    const radiusPx = (radiusPercent / 100) * 250; // 250 is half the radar width (500px)
    
    // Convert polar to cartesian
    // Subtract 90 degrees to make 0 be top (12 o'clock)
    const rad = (blip.angle - 90) * (Math.PI / 180); 
    const x = 250 + radiusPx * Math.cos(rad);
    const y = 250 + radiusPx * Math.sin(rad);
    
    return { x, y, score };
  };

  const getZoneColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500 shadow-[0_0_10px_#10b981]';
    if (score >= 0.6) return 'bg-yellow-500 shadow-[0_0_10px_#eab308]';
    return 'bg-red-500/50';
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      
      {/* Left Panel: Controls & Analysis */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="bg-mem-panel border border-mem-border rounded-xl p-6">
           <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
             <Radar className="text-brand-primary" />
             Semantic Radar
           </h2>
           <p className="text-gray-400 text-sm mb-6">
             Visualizing RAG vector retrieval precision vs. Semantic Reranking.
           </p>

           {/* Query Simulation */}
           <div className="space-y-2 mb-6">
             <label className="text-xs font-mono text-gray-500 uppercase">Query</label>
             <div className="flex gap-2">
               <input
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="输入一个问题，查询本 session 的记忆候选…"
                 className="flex-1 bg-black/30 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 font-mono"
               />
               <button
                 onClick={() => void runQuery()}
                 disabled={!canQuery || isLoading}
                 className="bg-brand-primary/20 text-brand-primary p-2 rounded hover:bg-brand-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
                 title={!canQuery ? '需要 query + namespace + sessionId' : 'Run query'}
               >
                 <Search size={18} />
               </button>
             </div>
             <div className="text-[11px] text-gray-500 font-mono">
               ns={namespace} {' | '} session={sessionId}
             </div>
           </div>

           {/* Optimization Toggle */}
           <div className="bg-white/5 rounded-lg p-4 border border-mem-border">
             <div className="flex justify-between items-center mb-2">
               <span className="font-semibold text-gray-200">Reranker（deterministic heuristic）</span>
               <button 
                 onClick={() => setIsRerankEnabled(!isRerankEnabled)}
                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isRerankEnabled ? 'bg-brand-primary' : 'bg-gray-700'}`}
               >
                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRerankEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
               </button>
             </div>
              <p className="text-xs text-gray-400">
                {isRerankEnabled 
                  ? "Status: ACTIVE. Using vector score + token overlap for a stable rerank score (no LLM)."
                  : "Status: OFFLINE. Showing raw vector similarity scores only."}
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200">
                {error}
              </div>
            )}
         </div>

        {/* Legend / Stats */}
        <div className="flex-1 bg-mem-panel border border-mem-border rounded-xl p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Sector Sources</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-500/10 rounded text-blue-400"><MessageSquare size={16} /></div>
               <div>
                 <div className="text-sm font-bold text-gray-200">0°-120° Conversation History</div>
                 <div className="text-xs text-gray-500">L1/L2 Memory</div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="p-2 bg-purple-500/10 rounded text-purple-400"><Database size={16} /></div>
               <div>
                 <div className="text-sm font-bold text-gray-200">120°-240° Documentation</div>
                 <div className="text-xs text-gray-500">L3 Knowledge Graph</div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-500/10 rounded text-orange-400"><Globe size={16} /></div>
               <div>
                 <div className="text-sm font-bold text-gray-200">240°-360° Web/External</div>
                 <div className="text-xs text-gray-500">Google Search Grounding</div>
               </div>
            </div>
          </div>

          {activeBlip && (
            <div className="mt-8 pt-6 border-t border-mem-border animate-in slide-in-from-bottom-2">
               <div className="text-xs font-mono text-gray-500 mb-2">TARGET LOCKED: {activeBlip.id}</div>
               <div className="p-3 bg-black/40 border border-gray-700 rounded mb-2">
                 <p className="text-sm text-gray-200 font-medium">{activeBlip.content}</p>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 p-2 rounded">
                    <div className="text-[10px] text-gray-500">Vector Score</div>
                    <div className="text-lg font-mono font-bold text-white">{activeBlip.rawScore.toFixed(2)}</div>
                  </div>
                  <div className={`p-2 rounded border ${isRerankEnabled ? 'bg-brand-primary/20 border-brand-primary/50' : 'bg-gray-800 border-transparent'}`}>
                    <div className="text-[10px] text-gray-500">Relevance Score</div>
                    <div className={`text-lg font-mono font-bold ${isRerankEnabled ? 'text-brand-primary' : 'text-gray-600'}`}>
                      {isRerankEnabled ? activeBlip.rerankScore.toFixed(2) : "---"}
                    </div>
                  </div>
               </div>
               {isRerankEnabled && (activeBlip.rawScore - activeBlip.rerankScore > 0.3) && (
                 <div className="mt-3 flex items-center gap-2 text-xs text-brand-primary bg-brand-primary/10 p-2 rounded">
                   <Filter size={14} />
                   <span>Noise Filtered: Vector hallucination detected.</span>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Radar Display */}
      <div className="flex-1 bg-[#05060a] rounded-xl border border-mem-border relative overflow-hidden flex items-center justify-center">
        
        {/* Radar Background & Grid */}
        <div className="relative w-[500px] h-[500px]">
          {/* Sectors Dividers */}
          <div className="absolute top-0 left-1/2 h-full w-px bg-mem-border/30 -translate-x-1/2 rotate-0" /> {/* Vertical */}
          <div className="absolute top-0 left-1/2 h-full w-px bg-mem-border/30 -translate-x-1/2 rotate-[120deg]" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-mem-border/30 -translate-x-1/2 rotate-[240deg]" />

          {/* Concentric Circles (Thresholds) */}
          {/* Outer Ring (0.0 - 0.5) - Red/Noise */}
          <div className="absolute inset-0 rounded-full border border-mem-border/50 bg-red-900/5"></div>
          
          {/* Mid Ring (0.6) - Yellow/Usable */}
          <div className="absolute inset-[20%] rounded-full border border-yellow-900/30 bg-[#05060a]"></div>
          <div className="absolute inset-[20%] rounded-full border border-dashed border-yellow-500/20"></div>
          <div className="absolute top-[20%] left-1/2 text-[10px] text-yellow-700 -translate-x-1/2 -translate-y-1/2 font-mono">Sim &gt; 0.6</div>

          {/* Inner Ring (0.8) - Green/Precise */}
          <div className="absolute inset-[40%] rounded-full border border-emerald-900/30 bg-emerald-900/5 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"></div>
          <div className="absolute inset-[40%] rounded-full border border-emerald-500/30"></div>
          <div className="absolute top-[40%] left-1/2 text-[10px] text-emerald-600 -translate-x-1/2 -translate-y-1/2 font-mono">Sim &gt; 0.8</div>

          {/* Center (User) */}
          <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_white] z-20 flex items-center justify-center">
            <Target size={10} className="text-black" />
          </div>

          {/* Scanning Line */}
          <div 
            className="absolute top-1/2 left-1/2 w-[250px] h-[1px] bg-gradient-to-r from-transparent to-brand-primary origin-left z-10"
            style={{ transform: `rotate(${scanAngle}deg)` }}
          >
            <div className="absolute right-0 top-1/2 w-[100px] h-[40px] bg-gradient-to-t from-transparent via-brand-primary/20 to-transparent blur-md -translate-y-1/2 translate-x-10 rotate-90" />
          </div>

           {/* Data Blips */}
           {blips.map((blip) => {
              const pos = getBlipPosition(blip);
              const isFiltered = isRerankEnabled && blip.rerankScore < 0.6;
              
              return (
               <div
                 key={blip.id}
                 className={`absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-1000 ease-out z-20 hover:z-30 hover:scale-150 ${getZoneColor(pos.score)}`}
                 style={{ 
                   left: pos.x, 
                   top: pos.y,
                   opacity: isFiltered ? 0.3 : 1
                 }}
                 onMouseEnter={() => setActiveBlip(blip)}
                 // onMouseLeave={() => setActiveBlip(null)}
               >
                  {/* ID Label */}
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono opacity-0 hover:opacity-100 whitespace-nowrap pointer-events-none">
                     #{blip.id.slice(-6)}
                  </span>
                </div>
              );
           })}
        </div>

        {/* Axis Labels */}
        <div className="absolute bottom-4 right-4 text-xs text-gray-500 font-mono text-right">
           <div>RADAR_MODE: {isRerankEnabled ? 'SEMANTIC_RERANK' : 'VECTOR_ANN'}</div>
           <div>RANGE: 0.0 - 1.0</div>
        </div>
      </div>
    </div>
  );
};
