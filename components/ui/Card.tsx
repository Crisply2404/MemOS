import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-mem-panel border border-mem-border rounded-xl overflow-hidden shadow-lg ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-mem-border flex justify-between items-center bg-white/5">
          {title && <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export const Badge: React.FC<{ children: ReactNode; color?: 'blue' | 'purple' | 'green' | 'red'; title?: string }> = ({ children, color = 'blue', title }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span title={title} className={`px-2 py-0.5 rounded text-xs font-mono border ${colors[color]}`}>
      {children}
    </span>
  );
};
