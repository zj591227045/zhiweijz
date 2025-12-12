/**
 * Logger 使用示例和迁移指南
 * 
 * 这个文件展示如何从 console.log 迁移到统一的 logger 系统
 */

import { createLogger, logger, LogLevel } from './logger';

// ===== 基础使用示例 =====

// 1. 使用全局 logger
logger.debug('这是调试信息，只在开发环境显示');
logger.info('这是普通信息');
logger.warn('这是警告信息');
logger.error('这是错误信息');

// 2. 创建模块专用 logger
const dashboardLogger = createLogger('Dashboard');
const apiLogger = createLogger('API');
const authLogger = createLogger('Auth');

// 模块 logger 会自动添加前缀
dashboardLogger.debug('用户进入仪表盘页面');
apiLogger.info('API 请求成功', { url: '/api/transactions', status: 200 });
authLogger.error('登录失败', { reason: 'invalid_credentials' });

// ===== 迁移示例 =====

// 原来的代码：
// dashboardLog.debug('🏠 [Dashboard] 用户已登录，开始获取账本列表');
// dashboardLog.debug('🏠 [Dashboard] 账本变化检测:', { isAuthenticated, currentAccountBook });
// dashboardLog.error('🏠 [Dashboard] 获取记账详情失败:', error);

// 迁移后的代码：
const dashboardLog = createLogger('Dashboard');
dashboardLog.debug('用户已登录，开始获取账本列表');
dashboardLog.debug('账本变化检测', { isAuthenticated: true, currentAccountBook: 'book1' });
dashboardLog.error('获取记账详情失败', error);

// ===== 高级用法 =====

// 1. 动态调整日志级别（开发时有用）
if (typeof window !== 'undefined') {
  // 在浏览器控制台中可以这样调整：
  // logger.setLevel(LogLevel.INFO);  // 只显示 INFO 及以上级别
  // logger.setLevel(LogLevel.NONE);  // 完全禁用日志
}

// 2. 条件日志（避免不必要的计算）
function expensiveOperation() {
  return { complexData: 'result' };
}

// 好的做法：只在需要时计算
if (process.env.NODE_ENV === 'development') {
  dashboardLog.debug('复杂操作结果', expensiveOperation());
}

// 或者使用函数形式（logger 内部会检查级别）
dashboardLog.debug('复杂操作结果', () => expensiveOperation());

// ===== 特殊场景处理 =====

// 1. 支付相关日志（敏感信息）
const paymentLogger = createLogger('Payment');
paymentLogger.info('支付流程开始', { orderId: 'xxx', amount: 100 }); // 生产环境不会显示
paymentLogger.error('支付失败', { orderId: 'xxx', error: 'network_error' }); // 生产环境会显示

// 2. API 调试日志
const apiDebugLogger = createLogger('API-Debug');
apiDebugLogger.debug('请求详情', { 
  url: '/api/transactions', 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: { amount: 100, category: 'food' }
});

// 3. 移动端特定日志
const mobileLogger = createLogger('Mobile');
mobileLogger.debug('硬件后退按钮触发');
mobileLogger.debug('手势监听器调用', { direction: 'left' });

// ===== 性能考虑 =====

// 在生产环境中，debug 和 info 级别的日志不会执行，
// 所以不用担心性能问题：

// 这样写是安全的，即使 complexCalculation() 很耗时
dashboardLog.debug('计算结果', complexCalculation());

function complexCalculation() {
  // 复杂计算...
  return { result: 'data' };
}

export {
  dashboardLogger,
  apiLogger,
  authLogger,
  paymentLogger,
  apiDebugLogger,
  mobileLogger
};