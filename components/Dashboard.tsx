import React from 'react';
import { SystemStats } from '../types';
import { Activity, Database, Layers, Brain, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  stats: SystemStats;
}

const mockChartData = [
  { name: '00:00', load: 40, savings: 24 },
  { name: '04:00', load: 30, savings: 13 },
  { name: '08:00', load: 20, savings: 58 },
  { name: '12:00', load: 27, savings: 39 },
  { name: '16:00', load: 18, savings: 48 },
  { name: '20:00', load: 23, savings: 38 },
  { name: '24:00', load: 34, savings: 43 },
];

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-mem-panel border border-mem-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Memories</div>
            <div className="text-2xl font-bold font-mono text-white">{stats.totalMemories.toLocaleString()}</div>
          </div>
          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
            <Database size={24} />
          </div>
        </div>
        
        <div className="bg-mem-panel border border-mem-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Active Contexts</div>
            <div className="text-2xl font-bold font-mono text-white">{stats.activeContexts}</div>
          </div>
          <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400">
            <Layers size={24} />
          </div>
        </div>

        <div className="bg-mem-panel border border-mem-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Token Savings</div>
            <div className="text-2xl font-bold font-mono text-brand-accent">
              {stats.tokenSavings.toLocaleString()}
              <span className="text-xs text-gray-500 ml-1">tok</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            <Zap size={24} />
          </div>
        </div>

        <div className="bg-mem-panel border border-mem-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Compression Ratio</div>
            <div className="text-2xl font-bold font-mono text-white">{(stats.compressionRatio * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400">
            <Brain size={24} />
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-mem-panel border border-mem-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand-primary" />
            System Throughput & Token Optimization
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 12}} />
                <YAxis stroke="#6b7280" tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0C15', borderColor: '#2A2D3E', color: '#fff' }}
                />
                <Area type="monotone" dataKey="load" stroke="#6366f1" fillOpacity={1} fill="url(#colorLoad)" name="Memory Ingestion" />
                <Area type="monotone" dataKey="savings" stroke="#10b981" fillOpacity={1} fill="url(#colorSavings)" name="Token Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Health Status */}
        <div className="bg-mem-panel border border-mem-border rounded-xl p-6">
           <h3 className="text-lg font-semibold text-gray-200 mb-6">Storage Tier Health</h3>
           
           <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">L1 Scratchpad (Redis)</span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Usage: 12% (124MB)</span>
                  <span>Latency: 2ms</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">L2 Semantic (Vector)</span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Usage: 45% (4.2GB)</span>
                  <span>Latency: 85ms</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">L3 Entity Graph (Neo4j)</span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-pink-500 h-2 rounded-full" style={{ width: '28%' }}></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Nodes: 12,403</span>
                  <span>Edges: 45,201</span>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};