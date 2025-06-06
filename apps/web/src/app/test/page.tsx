'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { apiClient } from '@/lib/api-client';

export default function TestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const { isAuthenticated, user, token } = useAuthStore();
  const { accountBooks, currentAccountBook, fetchAccountBooks, isLoading, error } =
    useAccountBookStore();

  const addResult = (message: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLogin = async () => {
    try {
      addResult('开始测试登录...');
      const response = await apiClient.post('/auth/login', {
        email: 'zhangjie@jacksonz.cn',
        password: 'Zj233401!',
      });

      addResult(`登录成功: ${JSON.stringify(response.data)}`);

      // 手动保存到localStorage
      localStorage.setItem('auth-token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      addResult('Token已保存到localStorage');
    } catch (error: any) {
      addResult(`登录失败: ${error.message}`);
    }
  };

  const testAccountBooks = async () => {
    try {
      addResult('开始测试账本API...');
      const response = await apiClient.get('/account-books');
      addResult(`账本API响应: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      addResult(`账本API失败: ${error.message}`);
    }
  };

  const testStoreAccountBooks = async () => {
    try {
      addResult('开始测试Store账本获取...');
      await fetchAccountBooks();
      addResult('Store账本获取完成');
    } catch (error: any) {
      addResult(`Store账本获取失败: ${error.message}`);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    addResult('认证状态已清除');
    window.location.reload();
  };

  useEffect(() => {
    addResult('页面加载完成');
    addResult(`认证状态: ${isAuthenticated}`);
    addResult(`用户: ${user ? JSON.stringify(user) : 'null'}`);
    addResult(`Token: ${token ? token.substring(0, 50) + '...' : 'null'}`);
  }, [isAuthenticated, user, token]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">前端调试测试页面</h1>

      {/* 当前状态 */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="text-lg font-semibold mb-2">当前状态</h2>
        <p>认证状态: {isAuthenticated ? '已登录' : '未登录'}</p>
        <p>用户: {user ? user.name : '无'}</p>
        <p>账本数量: {accountBooks.length}</p>
        <p>当前账本: {currentAccountBook ? currentAccountBook.name : '无'}</p>
        <p>加载状态: {isLoading ? '加载中' : '空闲'}</p>
        <p>错误: {error || '无'}</p>
      </div>

      {/* 测试按钮 */}
      <div className="mb-6 space-x-4">
        <button
          onClick={testLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          测试登录
        </button>
        <button
          onClick={testAccountBooks}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          测试账本API
        </button>
        <button
          onClick={testStoreAccountBooks}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          测试Store账本
        </button>
        <button
          onClick={clearAuth}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          清除认证
        </button>
      </div>

      {/* 账本列表 */}
      {accountBooks.length > 0 && (
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-2">账本列表</h2>
          {accountBooks.map((book) => (
            <div key={book.id} className="p-2 border-b">
              <p>
                <strong>{book.name}</strong> ({book.type})
              </p>
              <p>ID: {book.id}</p>
              <p>默认: {book.isDefault ? '是' : '否'}</p>
            </div>
          ))}
        </div>
      )}

      {/* 测试结果 */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="text-lg font-semibold mb-2">测试结果</h2>
        <div className="max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index} className="text-sm font-mono mb-1">
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
