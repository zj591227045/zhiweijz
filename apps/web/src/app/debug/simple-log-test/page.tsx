'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleLogTestPage() {
  const [config, setConfig] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 延迟更新配置，等待日志管理器初始化完成
    setTimeout(updateConfig, 200);
  }, []);

  const updateConfig = () => {
    if (typeof window !== 'undefined' && window.getLogConfig) {
      const currentConfig = window.getLogConfig();
      setConfig(currentConfig);
    }
  };

  const testLogs = () => {
    console.log('🔍 [测试] 这是一条debug/log日志');
    console.info('ℹ️ [测试] 这是一条info日志');
    console.warn('⚠️ [测试] 这是一条warn日志');
    console.error('❌ [测试] 这是一条error日志');
    console.debug('🐛 [测试] 这是一条debug日志');
  };

  const handleEnableLogs = (level?: string) => {
    if (typeof window !== 'undefined' && window.enableLogs) {
      window.enableLogs(level as any);
      setTimeout(() => {
        updateConfig();
        window.location.reload();
      }, 100);
    }
  };

  const handleDisableLogs = () => {
    if (typeof window !== 'undefined' && window.disableLogs) {
      window.disableLogs();
      setTimeout(() => {
        updateConfig();
        window.location.reload();
      }, 100);
    }
  };

  const handleClearConfig = () => {
    if (typeof window !== 'undefined' && window.clearLogConfig) {
      window.clearLogConfig();
      setTimeout(() => {
        updateConfig();
        window.location.reload();
      }, 100);
    }
  };

  if (!mounted) {
    return <div>正在加载...</div>;
  }

  const isLogManagerAvailable = typeof window !== 'undefined' && window.getLogConfig && window.enableLogs;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">简化版日志管理器测试</h1>
          <p className="text-gray-600 mt-2">
            基于localStorage配置，默认禁用所有日志
          </p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          {!isLogManagerAvailable ? (
            <div className="text-red-500">
              ❌ 日志管理器不可用。请检查是否已正确初始化。
            </div>
          ) : (
            <>
              {/* 当前配置显示 */}
              <div className="space-y-4 mb-6">
                <h3 className="text-xl font-semibold">当前配置</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>启用状态:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${config?.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {config?.enabled ? '已启用' : '已禁用'}
                      </span>
                    </div>
                    <div>
                      <strong>日志级别:</strong>
                      <span className="ml-2 px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                        {config?.level || 'debug'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 控制按钮 */}
              <div className="space-y-4 mb-6">
                <h3 className="text-xl font-semibold">控制操作</h3>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEnableLogs()}
                    className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    启用所有日志
                  </button>
                  
                  <button
                    onClick={handleDisableLogs}
                    className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    禁用所有日志
                  </button>
                  
                  <button
                    onClick={handleClearConfig}
                    className="px-4 py-2 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    清除配置
                  </button>
                  
                  <button
                    onClick={testLogs}
                    className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    测试所有日志
                  </button>

                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.testLogs) {
                        window.testLogs();
                      }
                    }}
                    className="px-4 py-2 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
                  >
                    测试过滤功能
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">启用特定级别:</h4>
                  <div className="flex flex-wrap gap-2">
                    {['debug', 'info', 'warn', 'error'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleEnableLogs(level)}
                        className="px-3 py-2 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      >
                        启用 {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 控制台命令说明 */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">控制台命令</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono space-y-1">
                  <div>enableLogs() - 启用所有日志</div>
                  <div>enableLogs('warn') - 启用warn级别及以上</div>
                  <div>disableLogs() - 禁用所有日志</div>
                  <div>getLogConfig() - 查看当前配置</div>
                  <div>clearLogConfig() - 清除配置</div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">使用说明</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong>默认行为</strong>: 所有日志都被禁用</p>
            <p><strong>启用日志</strong>: 在控制台输入 <code className="bg-gray-100 px-1 rounded">enableLogs()</code></p>
            <p><strong>禁用日志</strong>: 在控制台输入 <code className="bg-gray-100 px-1 rounded">disableLogs()</code></p>
            <p><strong>配置持久化</strong>: 设置会保存到localStorage，刷新页面后保持</p>
            <p><strong>生产环境</strong>: 默认禁用，需要手动启用进行临时调试</p>
          </div>
        </div>
      </div>
    </div>
  );
}
