/**
 * 日志配置清理工具
 * 用于清理旧的日志配置，应用新的默认设置
 */

import { loggerConfig } from './logger-config';

/**
 * 清理并重置日志配置
 * 这会清除localStorage中的旧配置，应用新的默认设置
 */
export function cleanupLoggerConfig(): void {
  if (typeof window === 'undefined') return;

  try {
    // 清除旧的配置
    localStorage.removeItem('logger_settings');
    
    // 重置配置（这会应用新的默认设置）
    loggerConfig.reset();
    
    console.log('✅ 日志配置已清理并重置为新的默认设置');
    console.log('📝 新的默认日志级别: INFO（减少调试噪音）');
    console.log('🔧 如需调试，可使用: setLogLevel("DEBUG")');
  } catch (error) {
    console.warn('清理日志配置时出错:', error);
  }
}

// 开发环境下自动执行一次清理（仅在首次加载时）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const hasCleanedKey = 'logger_config_cleaned_v3';
  
  if (!localStorage.getItem(hasCleanedKey)) {
    cleanupLoggerConfig();
    localStorage.setItem(hasCleanedKey, 'true');
    
    // 清理旧版本的标记
    localStorage.removeItem('logger_config_cleaned_v2');
    localStorage.removeItem('logger_config_cleaned_v1');
  }
}