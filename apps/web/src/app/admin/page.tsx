'use client';

import { useEffect } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { useAdminDashboard } from '@/store/admin/useAdminDashboard';
import { useAdminAuth } from '@/store/admin/useAdminAuth';

export default function AdminDashboardPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600">管理后台仅在Web端可用</p>
        </div>
      </div>
    );
  }

  // Web端完整功能
  const { isAuthenticated, token } = useAdminAuth();
  const { fetchOverview, fetchUserStats, fetchTransactionStats, fetchSystemResources } = useAdminDashboard();

  useEffect(() => {
    // 只在认证完成且有token时才执行API请求
    if (isAuthenticated && token) {
      console.log('🔍 [AdminDashboard] Fetching dashboard data, authenticated:', isAuthenticated, 'hasToken:', !!token);
      
      // 页面加载时获取所有仪表盘数据
      const fetchAllData = async () => {
        try {
          await Promise.all([
            fetchOverview(),
            fetchUserStats('7d'),
            fetchTransactionStats('7d'),
            fetchSystemResources(),
          ]);
        } catch (error) {
          console.error('获取仪表盘数据失败:', error);
        }
      };

      fetchAllData();
    }
  }, [isAuthenticated, token, fetchOverview, fetchUserStats, fetchTransactionStats, fetchSystemResources]);

  // 如果未认证，显示加载状态
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载管理仪表盘...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理仪表盘</h1>
        <p className="text-gray-600 mt-2">系统运行状态和数据统计概览</p>
      </div>
      
      <AdminDashboard />
    </div>
  );
} 