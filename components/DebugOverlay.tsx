
import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../services/logService';
import { LogEntry, LogLevel } from '../types';
import { X, Trash2, Download, Terminal, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';

interface DebugOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      return logger.subscribe(setLogs);
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || 
                          log.source.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-surface/95 backdrop-blur-2xl border-l border-border z-[100] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-2 text-foreground">
          <Terminal size={18} className="text-primary" />
          <h2 className="font-bold text-sm uppercase tracking-widest">System Logs</h2>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {filteredLogs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => logger.export()} className="p-2 hover:bg-primary/10 rounded-lg text-muted hover:text-foreground transition-colors" title="Export Logs">
            <Download size={16} />
          </button>
          <button onClick={() => logger.clear()} className="p-2 hover:bg-primary/10 rounded-lg text-muted hover:text-red-500 transition-colors" title="Clear Logs">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-lg text-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-border space-y-3 bg-primary/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
          <input 
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                filter === l ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted hover:border-primary'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 font-mono text-[11px] space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted italic">
            <Terminal size={32} className="mb-2 opacity-20" />
            <p>No log entries found</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`p-2 rounded border border-transparent transition-colors ${
                log.level === 'error' ? 'bg-red-500/5 hover:border-red-500/20' : 
                log.level === 'warn' ? 'bg-yellow-500/5 hover:border-yellow-500/20' : 
                'hover:bg-primary/5'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-muted shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`uppercase font-bold shrink-0 w-12 ${
                  log.level === 'error' ? 'text-red-500' : 
                  log.level === 'warn' ? 'text-yellow-600' : 
                  log.level === 'info' ? 'text-blue-500' : 'text-muted'
                }`}>
                  [{log.level}]
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground font-bold mr-2 opacity-80">[{log.source}]</span>
                  <span className="text-foreground opacity-70 break-words">{log.message}</span>
                  
                  {log.data && (
                    <button 
                      onClick={() => toggleExpand(log.id)}
                      className="ml-2 text-muted hover:text-primary transition-colors"
                    >
                      {expandedLogs.has(log.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  )}
                </div>
              </div>
              
              {expandedLogs.has(log.id) && log.data && (
                <pre className="mt-2 p-2 bg-background/50 rounded border border-border overflow-x-auto text-muted text-[10px]">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugOverlay;
