'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { clearAllCache, clearAuthCache, clearApiCache } from '@/utils/cache-utils';
import { apiClient } from '@/lib/api-client';

export default function TestCachePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [cacheInfo, setCacheInfo] = useState<string[]>([]);

  // 检查localStorage中的缓存项
  const checkLocalStorageCache = () => {
    if (typeof window === 'undefined') return;

    const items: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        items.push(`${key}: ${value?.substring(0, 100)}...`);
      }
    }
    setCacheInfo(items);
  };

  // 添加测试数据到localStorage
  const addTestData = () => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('test-auth-data', JSON.stringify({ userId: '123', token: 'test-token' }));
    localStorage.setItem(
      'test-account-book-data',
      JSON.stringify({ bookId: '456', name: 'Test Book' }),
    );
    localStorage.setItem('test-budget-data', JSON.stringify({ budgetId: '789', amount: 1000 }));
    localStorage.setItem(
      'test-transaction-data',
      JSON.stringify({ transactionId: '101', amount: 50 }),
    );
    localStorage.setItem('test-other-data', JSON.stringify({ someKey: 'someValue' }));

    checkLocalStorageCache();
  };

  // 测试API缓存
  const testApiCache = async () => {
    try {
      // 发起一些API请求来创建缓存
      await apiClient.get('/account-books');
      await apiClient.get('/categories');
      console.log('API缓存已创建');
    } catch (error) {
      console.error('创建API缓存失败:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">缓存清理测试页面</h1>

      {/* 用户信息 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">当前用户信息</h2>
        <p>认证状态: {isAuthenticated ? '已登录' : '未登录'}</p>
        <p>用户: {user ? user.name : '无'}</p>
        <p>邮箱: {user ? user.email : '无'}</p>
      </div>

      {/* 缓存操作按钮 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">缓存操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={checkLocalStorageCache}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            检查缓存
          </button>

          <button
            onClick={addTestData}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            添加测试数据
          </button>

          <button
            onClick={testApiCache}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            创建API缓存
          </button>

          <button
            onClick={clearApiCache}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            清除API缓存
          </button>

          <button
            onClick={clearAuthCache}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            清除认证缓存
          </button>

          <button
            onClick={clearAllCache}
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            清除所有缓存
          </button>

          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            登出（完整清理）
          </button>

          <button
            onClick={() => window.location.reload()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            刷新页面
          </button>
        </div>
      </div>

      {/* 缓存信息显示 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">localStorage 缓存内容</h2>
        <div className="max-h-96 overflow-y-auto">
          {cacheInfo.length === 0 ? (
            <p className="text-gray-500">点击"检查缓存"按钮查看缓存内容</p>
          ) : (
            <div className="space-y-2">
              {cacheInfo.map((item, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded text-sm font-mono">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">测试说明</h3>
        <ul className="text-yellow-700 space-y-1 text-sm">
          <li>1. 点击"添加测试数据"创建一些测试缓存项</li>
          <li>2. 点击"创建API缓存"发起API请求创建API缓存</li>
          <li>3. 点击"检查缓存"查看当前localStorage中的所有项</li>
          <li>4. 测试不同的清理功能，观察缓存是否被正确清除</li>
          <li>5. 点击"登出"测试完整的登出清理流程</li>
          <li>6. 在不同账号间切换，验证缓存隔离是否正常</li>
        </ul>
      </div>
    </div>
  );
}
