/**
 * Logger 系统测试
 * 
 * 用于验证 logger 功能是否正常工作
 */

import { createLogger, LogLevel } from './logger';
import { loggerConfig } from './logger-config';

// 创建测试 logger
const testLog = createLogger('Test');

/**
 * 运行 logger 测试
 */
export function runLoggerTest(): void {
}

// 在开发环境下自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟执行，确保页面加载完成
  setTimeout(() => {
    runLoggerTest();
  }, 1000);
}