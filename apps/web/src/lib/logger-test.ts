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
  console.log('=== Logger 系统测试开始 ===');
  
  // 测试基本日志输出
  testLog.debug('这是 DEBUG 级别日志');
  testLog.info('这是 INFO 级别日志');
  testLog.warn('这是 WARN 级别日志');
  testLog.error('这是 ERROR 级别日志');
  
  // 测试带参数的日志
  testLog.debug('带参数的日志', { userId: 123, action: 'login' });
  
  // 测试配置功能
  console.log('当前全局日志级别:', LogLevel[loggerConfig.getGlobalLevel()]);
  
  // 测试级别调整
  const originalLevel = loggerConfig.getGlobalLevel();
  
  console.log('设置日志级别为 INFO...');
  loggerConfig.setGlobalLevel(LogLevel.INFO);
  
  testLog.debug('这条 DEBUG 日志应该不会显示');
  testLog.info('这条 INFO 日志应该会显示');
  
  // 恢复原始级别
  loggerConfig.setGlobalLevel(originalLevel);
  
  console.log('=== Logger 系统测试完成 ===');
}

// 在开发环境下自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟执行，确保页面加载完成
  setTimeout(() => {
    runLoggerTest();
  }, 1000);
}