'use client';

import { useEffect } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { useAdminDashboard } from '@/store/admin/useAdminDashboard';

export default function AdminDashboardPage() {
  const { fetchOverview, fetchUserStats, fetchTransactionStats, fetchSystemResources } = useAdminDashboard();

  useEffect(() => {
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
  }, [fetchOverview, fetchUserStats, fetchTransactionStats, fetchSystemResources]);

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