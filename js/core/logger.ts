// js/core/logger.ts
// Centralized logging system with development/production support

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];
  private isDev = (window as any).__DEV__ || false;
  private maxLogs = 100;

  constructor() {
    // Check for dev mode
    const devMode = localStorage.getItem('dev-mode');
    this.isDev = devMode === 'true';
  }

  setDevMode(enabled: boolean): void {
    this.isDev = enabled;
    localStorage.setItem('dev-mode', enabled ? 'true' : 'false');
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console based on level and dev mode
    switch (level) {
      case 'debug':
        if (this.isDev) console.log(`[DEBUG] ${message}`, data);
        break;
      case 'info':
        if (this.isDev) console.info(`[INFO] ${message}`, data);
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`, data);
        break;
      case 'error':
        console.error(`[ERROR] ${message}`, data);
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    const errorData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    this.log('error', message, errorData);
  }

  getLogs(filter?: LogLevel): LogEntry[] {
    if (!filter) return this.logs;
    return this.logs.filter(entry => entry.level === filter);
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = new Logger();

// Expose for dev tools
(window as any).logger = logger;
