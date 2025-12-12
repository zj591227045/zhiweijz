'use client';

import { useState } from 'react';
import { createLogger, LogLevel } from '@/lib/logger';
import { loggerConfig } from '@/lib/logger-config';

// 创建演示用的 logger
const demoLog = createLogger('LoggerDemo');
const apiLog = createLogger('API');
const authLog = createLogger('Auth');

export default function LoggerDemoPage() {
  const [currentLevel, setCurrentLevel] = useState(loggerConfig.getGlobalLevel());

  const handleLevelChange = (level: LogLevel) => {
    loggerConfig.setGlobalLevel(level);
    setCurrentLevel(level);
    demoLog.info(`日志级别已设置为: ${LogLevel[level]}`);
  };

  const testLogs = () => {
    demoLog.debug('这是 DEBUG 级别的日志 - 详细的调试信息');
    demoLog.info('这是 INFO 级别的日志 - 一般业务信息');
    demoLog.warn('这是 WARN 级别的日志 - 警告信息');
    demoLog.error('这是 ERROR 级别的日志 - 错误信息');
    
    // 测试不同模块的日志
    apiLog.debug('API 请求开始', { url: '/api/users', method: 'GET' });
    apiLog.info('API 请求成功', { status: 200, data: { count: 10 } });
    
    authLog.debug('用户登录尝试', { username: 'demo@example.com' });
    authLog.error('登录失败', { reason: 'invalid_password' });
  };

  const testModuleLevel = () => {
    // 设置特定模块的日志级别
    loggerConfig.setModuleLevel('API', LogLevel.ERROR);
    demoLog.info('已将 API 模块日志级别设置为 ERROR');
    
    // 测试模块级别控制
    apiLog.debug('这条 API DEBUG 日志不应该显示');
    apiLog.info('这条 API INFO 日志不应该显示');
    apiLog.error('这条 API ERROR 日志应该显示');
    
    // 恢复模块级别
    loggerConfig.clearModuleLevel('API');
    demoLog.info('已恢复 API 模块日志级别');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Logger 系统演示</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">日志级别控制</h2>
        <p className="text-gray-600 mb-4">
          当前级别: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{LogLevel[currentLevel]}</span>
        </p>
        
        <div className="flex gap-2 mb-4">
          {Object.entries(LogLevel)
            .filter(([key]) => isNaN(Number(key)))
            .map(([name, value]) => (
              <button
                key={name}
                onClick={() => handleLevelChange(value as LogLevel)}
                className={`px-4 py-2 rounded ${
                  currentLevel === value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {name}
              </button>
            ))}
        </div>
        
        <p className="text-sm text-gray-500">
          选择不同的日志级别，然后点击下面的按钮测试日志输出。打开浏览器控制台查看效果。
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">基础日志测试</h2>
        <button
          onClick={testLogs}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
        >
          测试所有日志级别
        </button>
        <p className="text-sm text-gray-500 mt-2">
          会输出 DEBUG、INFO、WARN、ERROR 四个级别的日志，以及不同模块的日志
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">模块级别控制测试</h2>
        <button
          onClick={testModuleLevel}
          className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600"
        >
          测试模块级别控制
        </button>
        <p className="text-sm text-gray-500 mt-2">
          演示如何为特定模块设置不同的日志级别
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">使用说明</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong>DEBUG:</strong> 详细的调试信息，仅开发环境显示
          </div>
          <div>
            <strong>INFO:</strong> 一般的业务流程信息
          </div>
          <div>
            <strong>WARN:</strong> 警告信息，不影响功能但需要注意
          </div>
          <div>
            <strong>ERROR:</strong> 错误信息，影响功能正常运行（生产环境也会显示）
          </div>
          <div>
            <strong>NONE:</strong> 完全禁用所有日志输出
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">开发环境快捷操作</h3>
          <p className="text-blue-700 text-sm">
            在浏览器控制台中可以使用以下命令：
          </p>
          <ul className="text-blue-700 text-sm mt-2 space-y-1">
            <li><code>setLogLevel('DEBUG')</code> - 设置全局日志级别</li>
            <li><code>setModuleLogLevel('API', 'ERROR')</code> - 设置模块日志级别</li>
            <li><code>getLoggerDebugInfo()</code> - 查看当前配置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}