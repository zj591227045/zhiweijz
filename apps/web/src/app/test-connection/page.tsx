'use client';

import { useState } from 'react';
import { useServerConfigStore } from '@/store/server-config-store';

export default function TestConnectionPage() {
  const [testUrl, setTestUrl] = useState('http://10.255.0.97');
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { testConnection } = useServerConfigStore();

  const handleTest = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      console.log('🧪 开始测试连接:', testUrl);
      const result = await testConnection(testUrl);
      
      if (result) {
        setTestResult('✅ 连接测试成功！');
      } else {
        setTestResult('❌ 连接测试失败');
      }
    } catch (error) {
      console.error('连接测试错误:', error);
      setTestResult(`❌ 连接测试异常: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectFetch = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      console.log('🧪 直接测试fetch:', `${testUrl}/api/health`);
      
      const response = await fetch(`${testUrl}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ 直接fetch成功: ${JSON.stringify(data, null, 2)}`);
      } else {
        setTestResult(`❌ 直接fetch失败: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('直接fetch错误:', error);
      setTestResult(`❌ 直接fetch异常: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">连接测试页面</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            测试服务器地址:
          </label>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            placeholder="http://10.255.0.97"
          />
        </div>
        
        <div className="space-x-4">
          <button
            onClick={handleTest}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '测试中...' : '使用Store测试连接'}
          </button>
          
          <button
            onClick={handleDirectFetch}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '测试中...' : '直接测试fetch'}
          </button>
        </div>
        
        {testResult && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <h3 className="font-medium mb-2">测试结果:</h3>
            <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
          <h3 className="font-medium mb-2">调试信息:</h3>
          <p className="text-sm">
            请打开浏览器开发者工具的控制台查看详细的调试日志。
          </p>
          <p className="text-sm mt-2">
            如果仍然出现CORS错误，请检查：
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>服务器是否正在运行</li>
            <li>服务器地址是否正确</li>
            <li>网络连接是否正常</li>
            <li>服务器的CORS配置是否正确</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 