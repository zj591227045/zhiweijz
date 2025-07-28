'use client';

import React, { useState } from 'react';
import { versionApi } from '@/lib/api/version';
import { getCurrentPlatform, getBuildType, getAppPackageName, isDebugBuild } from '@/utils/version-utils';

interface VersionTestResult {
  platform: string;
  buildType: string;
  packageName: string | null;
  isDebug: boolean;
  apiEndpoint: string;
  response?: any;
  error?: string;
}

export default function VersionUpdateTest() {
  const [testResult, setTestResult] = useState<VersionTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // 获取当前环境信息
      const platform = getCurrentPlatform();
      const buildType = await getBuildType();
      const packageName = await getAppPackageName();
      const isDebug = await isDebugBuild();

      // 构建API端点
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const debugBaseUrl = process.env.NEXT_PUBLIC_DEBUG_API_BASE_URL || baseUrl;
      const apiEndpoint = isDebug 
        ? `${debugBaseUrl}/api/version/check/debug`
        : `${baseUrl}/api/version/check`;

      const result: VersionTestResult = {
        platform,
        buildType,
        packageName,
        isDebug,
        apiEndpoint,
      };

      // 测试版本检查API
      try {
        const response = await versionApi.checkVersion({
          platform: platform as any,
          currentVersion: '1.0.0',
          currentBuildNumber: 1,
          buildType: buildType as any,
          packageName: packageName || undefined,
        });

        result.response = response;
      } catch (error) {
        result.error = error instanceof Error ? error.message : '未知错误';
      }

      setTestResult(result);
    } catch (error) {
      setTestResult({
        platform: 'unknown',
        buildType: 'unknown',
        packageName: null,
        isDebug: false,
        apiEndpoint: 'unknown',
        error: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">版本更新功能测试</h2>
      
      <div className="mb-4">
        <button
          onClick={runTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '测试中...' : '开始测试'}
        </button>
      </div>

      {testResult && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">环境信息</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">平台:</span> {testResult.platform}
              </div>
              <div>
                <span className="font-medium">构建类型:</span> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  testResult.buildType === 'debug' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {testResult.buildType}
                </span>
              </div>
              <div>
                <span className="font-medium">包名:</span> {testResult.packageName || '未获取到'}
              </div>
              <div>
                <span className="font-medium">调试版本:</span> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  testResult.isDebug 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {testResult.isDebug ? '是' : '否'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">API配置</h3>
            <div className="text-sm">
              <div className="mb-2">
                <span className="font-medium">API端点:</span>
                <code className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                  {testResult.apiEndpoint}
                </code>
              </div>
              <div className="text-xs text-gray-600">
                {testResult.isDebug ? '使用调试版本API端点' : '使用生产版本API端点'}
              </div>
            </div>
          </div>

          {testResult.response && (
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold mb-2 text-green-800">API响应成功</h3>
              <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(testResult.response, null, 2)}
              </pre>
            </div>
          )}

          {testResult.error && (
            <div className="bg-red-50 p-4 rounded">
              <h3 className="font-semibold mb-2 text-red-800">API响应错误</h3>
              <div className="text-sm text-red-700">{testResult.error}</div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2 text-blue-800">环境变量检查</h3>
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">NEXT_PUBLIC_BUILD_TYPE:</span> 
                <code className="ml-2">{process.env.NEXT_PUBLIC_BUILD_TYPE || '未设置'}</code>
              </div>
              <div>
                <span className="font-medium">NEXT_PUBLIC_IS_DEBUG_BUILD:</span> 
                <code className="ml-2">{process.env.NEXT_PUBLIC_IS_DEBUG_BUILD || '未设置'}</code>
              </div>
              <div>
                <span className="font-medium">NEXT_PUBLIC_API_BASE_URL:</span> 
                <code className="ml-2">{process.env.NEXT_PUBLIC_API_BASE_URL || '未设置'}</code>
              </div>
              <div>
                <span className="font-medium">NEXT_PUBLIC_DEBUG_API_BASE_URL:</span> 
                <code className="ml-2">{process.env.NEXT_PUBLIC_DEBUG_API_BASE_URL || '未设置'}</code>
              </div>
              <div>
                <span className="font-medium">NODE_ENV:</span> 
                <code className="ml-2">{process.env.NODE_ENV}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-semibold mb-2">测试说明:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>调试版本应该使用 <code>/api/version/check/debug</code> 端点</li>
          <li>生产版本应该使用 <code>/api/version/check</code> 端点</li>
          <li>包名应该正确反映版本类型（调试版本包含 .debug 后缀）</li>
          <li>环境变量应该正确设置构建类型</li>
        </ul>
      </div>
    </div>
  );
}
