'use client';

import { useEffect, useState } from 'react';
import { useFileStorageStatus } from '@/store/file-storage-store';
import { userService } from '@/lib/api/user-service';

export default function StorageTestPage() {
  const { status, isLoading, error, isAvailable, refresh } = useFileStorageStatus();
  const [manualTestResult, setManualTestResult] = useState<any>(null);
  const [isManualTesting, setIsManualTesting] = useState(false);

  const handleManualTest = async () => {
    setIsManualTesting(true);
    setManualTestResult(null);

    try {
      console.log('手动测试文件存储状态...');
      const result = await userService.getFileStorageStatus();
      console.log('手动测试结果:', result);
      setManualTestResult(result);
    } catch (error) {
      console.error('手动测试失败:', error);
      setManualTestResult({ error: error.message });
    } finally {
      setIsManualTesting(false);
    }
  };

  return (
    <div
      style={{
        padding: '40px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#1a1a1a',
        }}
      >
        🗄️ 文件存储状态测试
      </h1>

      <p
        style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '40px',
          lineHeight: '1.5',
        }}
      >
        测试文件存储服务的状态检测功能
      </p>

      <div
        style={{
          display: 'grid',
          gap: '20px',
        }}
      >
        {/* Store状态 */}
        <div
          style={{
            padding: '20px',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            backgroundColor: '#f8f9fa',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1a1a1a',
            }}
          >
            Store状态
          </h2>

          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p>
              <strong>加载中:</strong> {isLoading ? '是' : '否'}
            </p>
            <p>
              <strong>可用性:</strong> {isAvailable ? '✅ 可用' : '❌ 不可用'}
            </p>
            <p>
              <strong>错误:</strong> {error || '无'}
            </p>

            {status && (
              <div style={{ marginTop: '12px' }}>
                <p>
                  <strong>详细状态:</strong>
                </p>
                <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>启用: {status.enabled ? '✅' : '❌'}</li>
                  <li>配置: {status.configured ? '✅' : '❌'}</li>
                  <li>健康: {status.healthy ? '✅' : '❌'}</li>
                  <li>消息: {status.message}</li>
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? '刷新中...' : '刷新状态'}
          </button>
        </div>

        {/* 手动测试 */}
        <div
          style={{
            padding: '20px',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1a1a1a',
            }}
          >
            手动API测试
          </h2>

          <button
            onClick={handleManualTest}
            disabled={isManualTesting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isManualTesting ? 'not-allowed' : 'pointer',
              opacity: isManualTesting ? 0.6 : 1,
              marginBottom: '16px',
            }}
          >
            {isManualTesting ? '测试中...' : '手动测试API'}
          </button>

          {manualTestResult && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            >
              <strong>手动测试结果:</strong>
              <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(manualTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* 调试信息 */}
        <div
          style={{
            padding: '20px',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            backgroundColor: '#fff3cd',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1a1a1a',
            }}
          >
            调试信息
          </h2>

          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p>
              <strong>API端点:</strong> /api/file-storage/status
            </p>
            <p>
              <strong>当前时间:</strong> {new Date().toLocaleString()}
            </p>
            <p>
              <strong>用户代理:</strong>{' '}
              {typeof window !== 'undefined' ? navigator.userAgent : '服务端渲染'}
            </p>
          </div>

          <div style={{ marginTop: '16px' }}>
            <p>
              <strong>预期行为:</strong>
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>Store应该自动获取文件存储状态</li>
              <li>如果S3配置正确，应该显示"可用"</li>
              <li>如果配置有问题，应该显示具体错误信息</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
