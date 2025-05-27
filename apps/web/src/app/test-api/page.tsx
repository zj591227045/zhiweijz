"use client";

import { useState } from "react";
import { apiClient } from "@/api/api-client";

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAccountBooksApi = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("开始测试账本API...");
      
      const response = await apiClient.get('/account-books');
      console.log("API响应:", response);
      console.log("响应数据:", response.data);
      console.log("响应数据类型:", typeof response.data);
      console.log("是否为分页格式:", response.data && typeof response.data === 'object' && Array.isArray(response.data.data));
      
      setResult({
        status: response.status,
        headers: response.headers,
        data: response.data,
        dataType: typeof response.data,
        isPaginated: response.data && typeof response.data === 'object' && Array.isArray(response.data.data)
      });
    } catch (err: any) {
      console.error("API错误:", err);
      setError(err.message || "API调用失败");
      setResult({
        error: err.response?.data || err.message,
        status: err.response?.status,
        config: err.config
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuth = () => {
    const token = localStorage.getItem('auth-token');
    const user = localStorage.getItem('user');
    console.log("认证信息:", { token: token?.substring(0, 20) + "...", user });
    setResult({ 
      token: token?.substring(0, 20) + "...", 
      user: JSON.parse(user || "null"),
      hasToken: !!token,
      tokenLength: token?.length || 0
    });
  };

  const testDirectFetch = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("开始测试直接fetch...");
      
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/account-books', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log("Fetch响应:", { status: response.status, data });
      
      setResult({
        method: 'fetch',
        status: response.status,
        ok: response.ok,
        data: data
      });
    } catch (err: any) {
      console.error("Fetch错误:", err);
      setError(err.message || "Fetch调用失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">API测试页面</h1>
      
      <div className="space-y-4">
        <button
          onClick={testAuth}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          测试认证状态
        </button>
        
        <button
          onClick={testAccountBooksApi}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "测试中..." : "测试账本API (axios)"}
        </button>
        
        <button
          onClick={testDirectFetch}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? "测试中..." : "测试账本API (fetch)"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          错误: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-100 border rounded">
          <h3 className="font-bold mb-2">结果:</h3>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
