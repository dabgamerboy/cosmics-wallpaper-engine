
import { LogEntry, LogLevel } from '../types';

type LogListener = (logs: LogEntry[]) => void;

class LogService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private readonly MAX_LOGS = 1000;

  private createEntry(level: LogLevel, source: string, message: string, data?: any): LogEntry {
    return {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      level,
      source,
      message,
      data
    };
  }

  private addLog(entry: LogEntry) {
    this.logs = [entry, ...this.logs].slice(0, this.MAX_LOGS);
    this.notify();
    
    // Also log to console for development
    const styles = {
      info: 'color: #6366f1',
      warn: 'color: #fbbf24',
      error: 'color: #ef4444; font-weight: bold',
      debug: 'color: #94a3b8'
    };
    console.log(`%c[${entry.source}] ${entry.message}`, styles[entry.level], entry.data || '');
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.logs));
  }

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener(this.logs);
    return () => this.listeners.delete(listener);
  }

  info(source: string, message: string, data?: any) {
    this.addLog(this.createEntry('info', source, message, data));
  }

  warn(source: string, message: string, data?: any) {
    this.addLog(this.createEntry('warn', source, message, data));
  }

  error(source: string, message: string, data?: any) {
    this.addLog(this.createEntry('error', source, message, data));
  }

  debug(source: string, message: string, data?: any) {
    this.addLog(this.createEntry('debug', source, message, data));
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  export() {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cosmic-debug-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const logger = new LogService();
