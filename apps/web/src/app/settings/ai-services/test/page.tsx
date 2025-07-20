'use client';

import { useState } from 'react';
import { systemConfigApi } from '@/lib/api/system-config';
import { aiService } from '@/lib/api/ai-service';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';

export default function AIServicesTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (name: string, result: any, error?: any) => {
    const testResult = {
      name,
      timestamp: new Date().toISOString(),
      success: !error,
      result: error ? null : result,
      error: error ? error.message || error : null,
    };
    setTestResults((prev) => [testResult, ...prev]);
  };

  const testGlobalAIConfig = async () => {
    try {
      const result = await systemConfigApi.getGlobalAIConfig();
      addTestResult('获取全局AI配置', result);
      toast.success('获取全局AI配置成功');
    } catch (error) {
      addTestResult('获取全局AI配置', null, error);
      toast.error('获取全局AI配置失败');
    }
  };

  const testAIServiceStatus = async () => {
    try {
      const result = await systemConfigApi.getAIServiceStatus();
      addTestResult('获取AI服务状态', result);
      toast.success('获取AI服务状态成功');
    } catch (error) {
      addTestResult('获取AI服务状态', null, error);
      toast.error('获取AI服务状态失败');
    }
  };

  const testTodayTokenUsage = async () => {
    try {
      const result = await systemConfigApi.getTodayTokenUsage();
      addTestResult('获取今日TOKEN使用量', result);
      toast.success('获取今日TOKEN使用量成功');
    } catch (error) {
      addTestResult('获取今日TOKEN使用量', null, error);
      toast.error('获取今日TOKEN使用量失败');
    }
  };

  const testLLMSettingsList = async () => {
    try {
      const result = await aiService.getLLMSettingsList();
      addTestResult('获取LLM设置列表', result);
      toast.success('获取LLM设置列表成功');
    } catch (error) {
      addTestResult('获取LLM设置列表', null, error);
      toast.error('获取LLM设置列表失败');
    }
  };

  const testUpdateGlobalConfig = async () => {
    try {
      const result = await systemConfigApi.updateGlobalAIConfig({
        enabled: true,
        dailyTokenLimit: 60000,
      });
      addTestResult('更新全局AI配置', result);
      toast.success('更新全局AI配置成功');
    } catch (error) {
      addTestResult('更新全局AI配置', null, error);
      toast.error('更新全局AI配置失败');
    }
  };

  const testSwitchServiceType = async () => {
    try {
      const result = await systemConfigApi.switchAIServiceType('official');
      addTestResult('切换AI服务类型', result);
      toast.success('切换AI服务类型成功');
    } catch (error) {
      addTestResult('切换AI服务类型', null, error);
      toast.error('切换AI服务类型失败');
    }
  };

  const testConnectionTest = async () => {
    try {
      const result = await systemConfigApi.testAIServiceConnection('official');
      addTestResult('测试AI服务连接', result);
      toast.success('测试AI服务连接成功');
    } catch (error) {
      addTestResult('测试AI服务连接', null, error);
      toast.error('测试AI服务连接失败');
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    const tests = [
      testGlobalAIConfig,
      testAIServiceStatus,
      testTodayTokenUsage,
      testLLMSettingsList,
      testUpdateGlobalConfig,
      testSwitchServiceType,
      testConnectionTest,
    ];

    for (const test of tests) {
      await test();
      // 添加延迟避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsLoading(false);
    toast.success('所有测试完成');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <PageContainer title="AI服务API测试" showBackButton={true} activeNavItem="profile">
      <div style={{ padding: '16px' }}>
        {/* 测试按钮 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={testGlobalAIConfig}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试全局AI配置
          </button>

          <button
            onClick={testAIServiceStatus}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试AI服务状态
          </button>

          <button
            onClick={testTodayTokenUsage}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试TOKEN使用量
          </button>

          <button
            onClick={testLLMSettingsList}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试LLM设置列表
          </button>

          <button
            onClick={testUpdateGlobalConfig}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试更新配置
          </button>

          <button
            onClick={testSwitchServiceType}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试服务切换
          </button>

          <button
            onClick={testConnectionTest}
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            测试连接测试
          </button>
        </div>

        {/* 批量操作按钮 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={runAllTests}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? '测试中...' : '运行所有测试'}
          </button>

          <button
            onClick={clearResults}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            清除结果
          </button>
        </div>

        {/* 测试结果 */}
        <div
          style={{
            backgroundColor: 'var(--card-background)',
            borderRadius: '12px',
            padding: '16px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}
          >
            测试结果 ({testResults.length})
          </h3>

          {testResults.length === 0 ? (
            <p
              style={{
                color: 'var(--text-secondary)',
                textAlign: 'center',
                padding: '40px',
              }}
            >
              暂无测试结果
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {testResults.map((result, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: result.success
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${
                      result.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <i
                      className={`fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}`}
                      style={{
                        color: result.success ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                        marginRight: '8px',
                      }}
                    ></i>
                    <strong
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                      }}
                    >
                      {result.name}
                    </strong>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {result.error && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'rgb(239, 68, 68)',
                        marginBottom: '8px',
                      }}
                    >
                      错误: {result.error}
                    </div>
                  )}

                  {result.result && (
                    <pre
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        padding: '8px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '200px',
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
