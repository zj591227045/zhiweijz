'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * URL配置调试组件
 * 用于显示和测试当前的API URL配置
 */
export function UrlConfigDebug() {
  const [config, setConfig] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    // 获取当前配置
    const currentConfig = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NEXT_PUBLIC_BUILD_NUMBER: process.env.NEXT_PUBLIC_BUILD_NUMBER,
      windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
    };
    setConfig(currentConfig);
  }, []);

  const getApiBaseUrl = (): string => {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // 开发环境检测
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.endsWith('.local') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return '';
      }

      return window.location.origin;
    }

    return '';
  };

  const detectEnvironment = (): string => {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return '手动配置';
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '开发环境 (localhost)';
      } else if (hostname.endsWith('.local')) {
        return '开发环境 (本地域名)';
      } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        return '开发环境 (内网IP)';
      } else {
        return '生产环境 (自动检测)';
      }
    }

    return '服务端渲染';
  };

  const testApiEndpoint = async (endpoint: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const fullUrl = `${baseUrl}${endpoint}`;
      
      console.log(`测试API端点: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: endpoint.includes('/check') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: endpoint.includes('/check') ? JSON.stringify({
          platform: 'web',
          currentVersion: '0.5.1',
          currentBuildNumber: 501
        }) : undefined
      });

      const result = {
        url: fullUrl,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
        } catch (e) {
          result.data = 'Non-JSON response';
        }
      }

      setTestResults(prev => ({
        ...prev,
        [endpoint]: result
      }));

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          url: `${getApiBaseUrl()}${endpoint}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  const endpoints = [
    '/api/version/check',
    '/api/version/latest/web',
    '/api/version/latest/ios',
    '/api/version/latest/android'
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔧 URL配置调试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Node环境:</strong>
                <Badge variant={config.NODE_ENV === 'development' ? 'secondary' : 'default'}>
                  {config.NODE_ENV}
                </Badge>
              </div>
              <div>
                <strong>检测环境:</strong>
                <Badge variant="outline">
                  {detectEnvironment()}
                </Badge>
              </div>
              <div className="md:col-span-2">
                <strong>当前域名:</strong> {config.windowOrigin}
              </div>
            </div>
            
            <div>
              <strong>配置的API基础URL:</strong> 
              <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                {config.NEXT_PUBLIC_API_BASE_URL || '(空 - 使用相对路径)'}
              </code>
            </div>
            
            <div>
              <strong>实际使用的API基础URL:</strong> 
              <code className="ml-2 px-2 py-1 bg-blue-100 rounded">
                {getApiBaseUrl() || '(相对路径)'}
              </code>
            </div>
            
            <div>
              <strong>应用版本:</strong> {config.NEXT_PUBLIC_APP_VERSION} ({config.NEXT_PUBLIC_BUILD_NUMBER})
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧪 API端点测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {endpoints.map(endpoint => (
                <Button
                  key={endpoint}
                  variant="outline"
                  size="sm"
                  onClick={() => testApiEndpoint(endpoint)}
                >
                  测试 {endpoint}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {Object.entries(testResults).map(([endpoint, result]: [string, any]) => (
                <div key={endpoint} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <strong>{endpoint}</strong>
                    {result.ok ? (
                      <Badge variant="default">✅ 成功</Badge>
                    ) : result.error ? (
                      <Badge variant="destructive">❌ 错误</Badge>
                    ) : (
                      <Badge variant="secondary">⚠️ {result.status}</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div><strong>URL:</strong> <code>{result.url}</code></div>
                    {result.status && (
                      <div><strong>状态:</strong> {result.status} {result.statusText}</div>
                    )}
                    {result.error && (
                      <div className="text-red-600"><strong>错误:</strong> {result.error}</div>
                    )}
                    {result.data && (
                      <details>
                        <summary className="cursor-pointer font-medium">响应数据</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
