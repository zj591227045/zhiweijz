/**
 * 统一日志管理器
 * 
 * 设计原则：
 * 1. 简单直接 - 不过度设计
 * 2. 零配置 - 自动检测环境
 * 3. 向后兼容 - 可以逐步替换 console.log
 * 4. 性能优先 - 生产环境零开销
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4, // 完全禁用
}

interface LoggerInternalConfig {
  enableColors: boolean;
  enableTimestamp: boolean;
  prefix?: string;
  moduleName?: string;
}

class Logger {
  private config: LoggerInternalConfig;
  private isDevelopment: boolean;

  constructor(moduleName?: string) {
    // 自动检测环境
    this.isDevelopment = process.env.NODE_ENV === 'development' || 
                        typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname.includes('192.168') ||
                         window.location.hostname === '127.0.0.1');

    // 默认配置
    this.config = {
      enableColors: this.isDevelopment,
      enableTimestamp: this.isDevelopment,
      moduleName,
    };
  }

  /**
   * 设置前缀（用于模块标识）
   */
  setPrefix(prefix: string): Logger {
    const newLogger = new Logger(this.config.moduleName);
    newLogger.config = { ...this.config, prefix };
    return newLogger;
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    // 延迟导入避免循环依赖
    const { loggerConfig } = require('./logger-config');
    
    // 获取当前有效的日志级别
    const effectiveLevel = this.config.moduleName 
      ? loggerConfig.getModuleLevel(this.config.moduleName)
      : loggerConfig.getGlobalLevel();
    
    // 生产环境检查
    if (!this.isDevelopment && !loggerConfig.isEnabledInProduction()) {
      return level >= LogLevel.ERROR; // 生产环境只显示错误
    }
    
    return level >= effectiveLevel;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    let formattedMessage = message;

    // 添加时间戳
    if (this.config.enableTimestamp) {
      const timestamp = new Date().toLocaleTimeString();
      formattedMessage = `[${timestamp}] ${formattedMessage}`;
    }

    // 添加前缀
    if (this.config.prefix) {
      formattedMessage = `${this.config.prefix} ${formattedMessage}`;
    }

    // 添加级别标识
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelName = levelNames[level] || 'LOG';
    
    if (this.config.enableColors && typeof window !== 'undefined') {
      // 浏览器环境使用颜色
      const colors = {
        [LogLevel.DEBUG]: 'color: #888',
        [LogLevel.INFO]: 'color: #2196F3',
        [LogLevel.WARN]: 'color: #FF9800',
        [LogLevel.ERROR]: 'color: #F44336',
      };
      
      return [`%c[${levelName}] ${formattedMessage}`, colors[level], ...args];
    } else {
      return [`[${levelName}] ${formattedMessage}`, ...args];
    }
  }

  /**
   * Debug 级别日志 - 仅开发环境显示
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const [formattedMessage, ...formattedArgs] = this.formatMessage(LogLevel.DEBUG, message, ...args);
    console.log(formattedMessage, ...formattedArgs);
  }

  /**
   * Info 级别日志
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const [formattedMessage, ...formattedArgs] = this.formatMessage(LogLevel.INFO, message, ...args);
    console.info(formattedMessage, ...formattedArgs);
  }

  /**
   * Warning 级别日志
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const [formattedMessage, ...formattedArgs] = this.formatMessage(LogLevel.WARN, message, ...args);
    console.warn(formattedMessage, ...formattedArgs);
  }

  /**
   * Error 级别日志
   */
  error(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const [formattedMessage, ...formattedArgs] = this.formatMessage(LogLevel.ERROR, message, ...args);
    console.error(formattedMessage, ...formattedArgs);
  }

  /**
   * 兼容原有 console.log 的方法
   */
  log(message: string, ...args: any[]): void {
    this.debug(message, ...args);
  }
}

// 创建全局实例
export const logger = new Logger();

// 创建模块专用 logger 的工厂函数
export function createLogger(moduleName: string): Logger {
  const moduleLogger = new Logger(moduleName);
  return moduleLogger.setPrefix(`[${moduleName}]`);
}

// 开发环境下暴露到全局，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).logger = logger;
  (window as any).LogLevel = LogLevel;
}