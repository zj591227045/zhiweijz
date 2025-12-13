/**
 * Logger 配置管理
 * 
 * 提供运行时日志级别控制和配置持久化
 */

import { LogLevel } from './logger';

interface LoggerSettings {
  globalLevel: LogLevel;
  moduleSettings: Record<string, LogLevel>;
  enabledInProduction: boolean;
}

class LoggerConfig {
  private static instance: LoggerConfig;
  private settings: LoggerSettings;
  private readonly STORAGE_KEY = 'logger_settings';

  private constructor() {
    this.settings = this.loadSettings();
    
    // 在开发环境下暴露到全局对象，方便调试
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).loggerConfig = this;
    }
  }

  static getInstance(): LoggerConfig {
    if (!LoggerConfig.instance) {
      LoggerConfig.instance = new LoggerConfig();
    }
    return LoggerConfig.instance;
  }

  /**
   * 从 localStorage 加载设置
   */
  private loadSettings(): LoggerSettings {
    const defaultSettings: LoggerSettings = {
      globalLevel: process.env.NODE_ENV === 'development' ? LogLevel.WARN : LogLevel.ERROR,
      moduleSettings: {
        // 高频组件使用更高的日志级别，减少噪音
        'SystemConfig': LogLevel.ERROR,
        'Image': LogLevel.ERROR,
        'ImageCache': LogLevel.ERROR,
        'API': LogLevel.ERROR,
        'Dashboard': LogLevel.ERROR,
        'AccountBook': LogLevel.ERROR,
        'Auth': LogLevel.ERROR,
        'Test': LogLevel.ERROR,
        // 保留一些重要的INFO级别日志
        'TokenManager': LogLevel.INFO,
        'Navigation': LogLevel.ERROR,
        'Modal': LogLevel.ERROR,
        'Onboarding': LogLevel.ERROR,
        'Platform': LogLevel.ERROR,
        'Gesture': LogLevel.ERROR,
        'Haptic': LogLevel.ERROR,
        'Capacitor': LogLevel.ERROR,
      },
      enabledInProduction: false,
    };

    if (typeof window === 'undefined') {
      return defaultSettings;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('加载 logger 配置失败:', error);
    }

    return defaultSettings;
  }

  /**
   * 保存设置到 localStorage
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('保存 logger 配置失败:', error);
    }
  }

  /**
   * 获取全局日志级别
   */
  getGlobalLevel(): LogLevel {
    // 检查 URL 参数
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const debugParam = urlParams.get('debug');
      
      if (debugParam === 'true' || debugParam === '1') {
        return LogLevel.DEBUG;
      }
      
      const logLevel = urlParams.get('logLevel');
      if (logLevel && LogLevel[logLevel as keyof typeof LogLevel] !== undefined) {
        return LogLevel[logLevel as keyof typeof LogLevel];
      }
    }

    return this.settings.globalLevel;
  }

  /**
   * 设置全局日志级别
   */
  setGlobalLevel(level: LogLevel): void {
    this.settings.globalLevel = level;
    this.saveSettings();
  }

  /**
   * 获取特定模块的日志级别
   */
  getModuleLevel(moduleName: string): LogLevel {
    return this.settings.moduleSettings[moduleName] ?? this.getGlobalLevel();
  }

  /**
   * 设置特定模块的日志级别
   */
  setModuleLevel(moduleName: string, level: LogLevel): void {
    this.settings.moduleSettings[moduleName] = level;
    this.saveSettings();
  }

  /**
   * 清除特定模块的日志级别设置（回退到全局设置）
   */
  clearModuleLevel(moduleName: string): void {
    delete this.settings.moduleSettings[moduleName];
    this.saveSettings();
  }

  /**
   * 检查是否在生产环境启用日志
   */
  isEnabledInProduction(): boolean {
    return this.settings.enabledInProduction;
  }

  /**
   * 设置是否在生产环境启用日志
   */
  setEnabledInProduction(enabled: boolean): void {
    this.settings.enabledInProduction = enabled;
    this.saveSettings();
  }

  /**
   * 获取所有设置
   */
  getAllSettings(): LoggerSettings {
    return { ...this.settings };
  }

  /**
   * 重置所有设置
   */
  reset(): void {
    this.settings = {
      globalLevel: process.env.NODE_ENV === 'development' ? LogLevel.WARN : LogLevel.ERROR,
      moduleSettings: {
        // 高频组件使用更高的日志级别，减少噪音
        'SystemConfig': LogLevel.ERROR,
        'Image': LogLevel.ERROR,
        'ImageCache': LogLevel.ERROR,
        'API': LogLevel.ERROR,
        'Dashboard': LogLevel.ERROR,
        'AccountBook': LogLevel.ERROR,
        'Auth': LogLevel.ERROR,
        'Test': LogLevel.ERROR,
        // 保留一些重要的INFO级别日志
        'TokenManager': LogLevel.INFO,
        'Navigation': LogLevel.ERROR,
        'Modal': LogLevel.ERROR,
        'Onboarding': LogLevel.ERROR,
        'Platform': LogLevel.ERROR,
        'Gesture': LogLevel.ERROR,
        'Haptic': LogLevel.ERROR,
        'Capacitor': LogLevel.ERROR,
      },
      enabledInProduction: false,
    };
    this.saveSettings();
  }

  /**
   * 导出设置（用于备份）
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 导入设置（用于恢复）
   */
  importSettings(settingsJson: string): boolean {
    try {
      const settings = JSON.parse(settingsJson);
      this.settings = { ...this.settings, ...settings };
      this.saveSettings();
      return true;
    } catch (error) {
      console.error('导入 logger 设置失败:', error);
      return false;
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      currentSettings: this.settings,
      environment: process.env.NODE_ENV,
      globalLevel: this.getGlobalLevel(),
      availableLevels: Object.keys(LogLevel).filter(key => isNaN(Number(key))),
    };
  }
}

// 导出单例实例
export const loggerConfig = LoggerConfig.getInstance();

// 开发环境下的便捷函数
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 暴露便捷的全局函数
  (window as any).setLogLevel = (level: LogLevel | string) => {
    const logLevel = typeof level === 'string' ? LogLevel[level as keyof typeof LogLevel] : level;
    if (logLevel !== undefined) {
      loggerConfig.setGlobalLevel(logLevel);
      console.log(`日志级别已设置为: ${LogLevel[logLevel]}`);
    } else {
      console.error('无效的日志级别:', level);
      console.log('可用级别:', Object.keys(LogLevel).filter(key => isNaN(Number(key))));
    }
  };

  (window as any).setModuleLogLevel = (moduleName: string, level: LogLevel | string) => {
    const logLevel = typeof level === 'string' ? LogLevel[level as keyof typeof LogLevel] : level;
    if (logLevel !== undefined) {
      loggerConfig.setModuleLevel(moduleName, logLevel);
      console.log(`模块 ${moduleName} 日志级别已设置为: ${LogLevel[logLevel]}`);
    } else {
      console.error('无效的日志级别:', level);
    }
  };

  (window as any).getLoggerDebugInfo = () => {
    console.table(loggerConfig.getDebugInfo());
  };
}