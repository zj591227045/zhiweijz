'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import ApiConfigDebug from '@/components/debug/api-config-debug';

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApiCall = async () => {
    setLoading(true);
    try {
      console.log('🧪 开始测试API调用...');
      
      // 测试获取账本列表
      const response = await apiClient.get('/account-books');
      console.log('✅ API调用成功:', response);
      setResult(response);
    } catch (error) {
      console.error('❌ API调用失败:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testTransactions = async () => {
    setLoading(true);
    try {
      console.log('🧪 开始测试交易API调用...');
      
      // 测试获取交易列表
      const response = await apiClient.get('/transactions?limit=5');
      console.log('✅ 交易API调用成功:', response);
      setResult(response);
    } catch (error) {
      console.error('❌ 交易API调用失败:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">API客户端测试</h1>
      
      {/* API配置调试信息 */}
      <div className="mb-8">
        <ApiConfigDebug />
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={testApiCall}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试账本API'}
          </button>
          
          <button
            onClick={testTransactions}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试交易API'}
          </button>
        </div>
        
        {result && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">API响应结果:</h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
