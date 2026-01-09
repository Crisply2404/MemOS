import React, { useMemo } from 'react';
import { MemoryNode } from '../types';

interface MemoryHeatmapProps {
  memories: MemoryNode[];
}

export const MemoryHeatmap: React.FC<MemoryHeatmapProps> = ({ memories }) => {
  // Simulate a grid of memory blocks based on timestamp (x) and importance (y/opacity)
  
  const blocks = useMemo(() => {
    // Sort by timestamp
    const sorted = [...memories].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.slice(0, 84); // Show last 84 memories
  }, [memories]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-mono text-gray-400">MEMORY DECAY TOPOLOGY</h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Recent</span>
          <div className="w-20 h-1 bg-gradient-to-r from-brand-accent to-gray-800 rounded"></div>
          <span>Forgotten</span>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-12 gap-1.5 auto-rows-min overflow-y-auto pr-2 custom-scrollbar">
        {blocks.map((mem) => {
          // Calculate visual properties
          // Importance dictates opacity/brightness
          const opacity = 0.2 + (mem.importanceScore * 0.8);
          
          let bgColor = 'bg-brand-primary';
          if (mem.importanceScore > 0.8) bgColor = 'bg-brand-accent'; // High importance
          else if (mem.importanceScore < 0.3) bgColor = 'bg-gray-600'; // Decaying
          
          return (
            <div 
              key={mem.id}
              className={`aspect-square rounded-sm relative group cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10 hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] ${bgColor}`}
              style={{ opacity }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-mem-dark border border-mem-border p-2 rounded text-xs z-50 pointer-events-none shadow-xl">
                <div className="font-bold text-white mb-1 truncate">{mem.namespace}</div>
                <div className="text-gray-400 truncate mb-1">"{mem.content.substring(0, 30)}..."</div>
                <div className="flex justify-between mt-2 border-t border-gray-700 pt-1">
                  <span className="text-brand-primary">Imp: {(mem.importanceScore * 100).toFixed(0)}%</span>
                  <span className="text-gray-500">{new Date(mem.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          );
        })}
        {/* Fillers for visual density */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-sm bg-gray-800/20 border border-dashed border-gray-800/50" />
        ))}
      </div>
    </div>
  );
};