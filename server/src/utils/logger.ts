/**
 * 简单、纯粹的日志工具
 * 
 * 设计哲学：
 * 1. 不依赖任何第三方库
 * 2. 零配置开销
 * 3. 通过环境变量控制行为
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel;

  private constructor() {
    // 通过环境变量控制日志级别
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.minLevel = LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return `${prefix} ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}`;
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', ...args));
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', ...args));
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', ...args));
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', ...args));
    }
  }
}

// 导出单例实例
export const logger = Logger.getInstance();
