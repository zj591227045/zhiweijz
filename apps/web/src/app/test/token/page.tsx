'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { tokenTestHelper } from '@/utils/token-test-helper';
import { tokenManager } from '@/lib/token-manager';
import { useAuthStore } from '@/store/auth-store';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export default function TokenTestPage() {
  const { isAuthenticated } = useAuthStore();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [monitoring, setMonitoring] = useState(false);

  // 更新token状态
  const updateTokenStatus = async () => {
    try {
      const status = await tokenManager.getCurrentStatus();
      setTokenStatus(status);
    } catch (error) {
      console.error('获取token状态失败:', error);
    }
  };

  // 页面加载时获取token状态
  useEffect(() => {
    if (isAuthenticated) {
      updateTokenStatus();
    }
  }, [isAuthenticated]);

  // 运行单个测试
  const runSingleTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsRunning(true);
    try {
      const result = await testFn();
      const testResult: TestResult = {
        test: testName,
        success: result.success,
        message: result.message,
        timestamp: new Date()
      };
      setTestResults(prev => [...prev, testResult]);
      await updateTokenStatus();
    } catch (error) {
      const testResult: TestResult = {
        test: testName,
        success: false,
        message: `测试异常: ${error.message}`,
        timestamp: new Date()
      };
      setTestResults(prev => [...prev, testResult]);
    } finally {
      setIsRunning(false);
    }
  };

  // 清除测试结果
  const clearResults = () => {
    setTestResults([]);
    tokenTestHelper.clearResults();
  };

  // 开始/停止监控
  const toggleMonitoring = () => {
    if (monitoring) {
      setMonitoring(false);
      // 这里应该停止监控
    } else {
      setMonitoring(true);
      tokenTestHelper.startTokenMonitoring();
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer title="Token测试" showBackButton>
        <div className="test-page">
          <div className="error-message">
            <i className="fas fa-lock"></i>
            <span>请先登录以进行token测试</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Token测试" showBackButton>
      <div className="test-page">
        {/* Token状态显示 */}
        <div className="status-section">
          <h3>当前Token状态</h3>
          {tokenStatus ? (
            <div className="status-info">
              <div className="status-item">
                <span>需要刷新:</span>
                <span className={tokenStatus.needsRefresh ? 'status-warning' : 'status-ok'}>
                  {tokenStatus.needsRefresh ? '是' : '否'}
                </span>
              </div>
              <div className="status-item">
                <span>剩余时间:</span>
                <span>{Math.floor(tokenStatus.remainingTime / 60)}分钟</span>
              </div>
            </div>
          ) : (
            <div className="status-loading">加载中...</div>
          )}
          <button 
            className="test-button secondary"
            onClick={updateTokenStatus}
            disabled={isRunning}
          >
            刷新状态
          </button>
        </div>

        {/* 测试按钮 */}
        <div className="test-section">
          <h3>测试功能</h3>
          <div className="test-buttons">
            <button
              className="test-button"
              onClick={() => runSingleTest('Token状态检查', () => tokenTestHelper.testCurrentTokenStatus())}
              disabled={isRunning}
            >
              检查Token状态
            </button>
            
            <button
              className="test-button"
              onClick={() => runSingleTest('Token刷新', () => tokenTestHelper.testTokenRefresh())}
              disabled={isRunning}
            >
              手动刷新Token
            </button>
            
            <button
              className="test-button"
              onClick={() => runSingleTest('API调用', () => tokenTestHelper.testApiCall())}
              disabled={isRunning}
            >
              测试API调用
            </button>
            
            <button
              className="test-button"
              onClick={() => tokenTestHelper.runFullTestSuite()}
              disabled={isRunning}
            >
              运行完整测试
            </button>
          </div>
        </div>

        {/* 监控控制 */}
        <div className="monitor-section">
          <h3>监控控制</h3>
          <button
            className={`test-button ${monitoring ? 'danger' : 'primary'}`}
            onClick={toggleMonitoring}
          >
            {monitoring ? '停止监控' : '开始监控'}
          </button>
        </div>

        {/* 测试结果 */}
        <div className="results-section">
          <div className="results-header">
            <h3>测试结果</h3>
            <button
              className="test-button secondary small"
              onClick={clearResults}
            >
              清除结果
            </button>
          </div>
          
          <div className="results-list">
            {testResults.length === 0 ? (
              <div className="no-results">暂无测试结果</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                  <div className="result-header">
                    <span className="result-icon">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <span className="result-test">{result.test}</span>
                    <span className="result-time">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="result-message">{result.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <style jsx>{`
          .test-page {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }

          .status-section,
          .test-section,
          .monitor-section,
          .results-section {
            margin-bottom: 30px;
            padding: 20px;
            background: var(--card-background);
            border-radius: 8px;
            border: 1px solid var(--border-color);
          }

          h3 {
            margin: 0 0 15px 0;
            color: var(--text-primary);
          }

          .status-info {
            margin-bottom: 15px;
          }

          .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
          }

          .status-ok {
            color: var(--success-color);
          }

          .status-warning {
            color: var(--warning-color);
          }

          .test-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
          }

          .test-button {
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            background: var(--primary-color);
            color: white;
          }

          .test-button:hover:not(:disabled) {
            opacity: 0.9;
          }

          .test-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .test-button.secondary {
            background: var(--secondary-color);
          }

          .test-button.danger {
            background: var(--error-color);
          }

          .test-button.small {
            padding: 8px 16px;
            font-size: 12px;
          }

          .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .results-list {
            max-height: 400px;
            overflow-y: auto;
          }

          .result-item {
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            border-left: 4px solid;
          }

          .result-item.success {
            background: var(--success-background);
            border-left-color: var(--success-color);
          }

          .result-item.error {
            background: var(--error-background);
            border-left-color: var(--error-color);
          }

          .result-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 5px;
          }

          .result-test {
            font-weight: 500;
            flex: 1;
          }

          .result-time {
            font-size: 12px;
            opacity: 0.7;
          }

          .result-message {
            font-size: 13px;
            opacity: 0.8;
          }

          .no-results {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
          }

          .error-message {
            text-align: center;
            padding: 40px;
            color: var(--error-color);
          }
        `}</style>
      </div>
    </PageContainer>
  );
}
