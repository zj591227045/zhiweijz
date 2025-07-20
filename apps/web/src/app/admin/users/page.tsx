'use client';

// 强制动态渲染，避免静态生成时的模块解析问题
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { UserManagement } from '@/components/admin/UserManagement';
import { useUserManagement } from '@/store/admin/useUserManagement';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import MobileNotSupported from '@/components/admin/MobileNotSupported';

export default function UsersPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  // Web端完整功能
  const { isAuthenticated, token } = useAdminAuth();
  const {
    users,
    isLoading,
    pagination,
    registrationEnabled,
    fetchUsers,
    searchUsers,
    deleteUser,
    toggleUserStatus,
    batchOperation,
    getRegistrationStatus,
    toggleRegistration,
  } = useUserManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'email'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 只在认证完成且有token时才执行API请求
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log(
        '🔍 [UsersPage] Fetching users and registration status, authenticated:',
        isAuthenticated,
        'hasToken:',
        !!token,
      );

      // 获取用户列表
      fetchUsers({
        page: 1,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: sortBy,
        order: sortOrder,
      });

      // 获取注册状态
      getRegistrationStatus();
    }
  }, [isAuthenticated, token, statusFilter, sortBy, sortOrder, fetchUsers, getRegistrationStatus]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!isAuthenticated || !token) return;

    if (term.trim()) {
      searchUsers(term.trim());
    } else {
      fetchUsers({
        page: 1,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: sortBy,
        order: sortOrder,
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (!isAuthenticated || !token) return;

    fetchUsers({
      page,
      limit: 20,
      search: searchTerm.trim() || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sort: sortBy,
      order: sortOrder,
    });
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
  };

  const handleSortChange = (field: 'createdAt' | 'name' | 'email', order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleToggleRegistration = async (enabled: boolean) => {
    return await toggleRegistration(enabled);
  };

  // 如果未认证，显示加载状态
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载用户管理...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
        <p className="text-gray-600 mt-2">管理系统用户，包括查看、编辑、删除用户信息</p>
      </div>

      <UserManagement
        users={users}
        isLoading={isLoading}
        pagination={pagination}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        registrationEnabled={registrationEnabled}
        onSearch={handleSearch}
        onPageChange={handlePageChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSortChange={handleSortChange}
        onDeleteUser={deleteUser}
        onToggleUserStatus={toggleUserStatus}
        onBatchOperation={batchOperation}
        onToggleRegistration={handleToggleRegistration}
      />
    </div>
  );
}
