'use client';

import { useState, useEffect } from 'react';
import { UserManagement } from '@/components/admin/UserManagement';
import { useUserManagement } from '@/store/admin/useUserManagement';

export default function UsersPage() {
  const { 
    users, 
    isLoading, 
    pagination,
    fetchUsers,
    searchUsers,
    deleteUser,
    toggleUserStatus,
    batchOperation
  } = useUserManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'email'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchUsers({
      page: 1,
      limit: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sort: sortBy,
      order: sortOrder
    });
  }, [statusFilter, sortBy, sortOrder]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      searchUsers(term.trim());
    } else {
      fetchUsers({
        page: 1,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: sortBy,
        order: sortOrder
      });
    }
  };

  const handlePageChange = (page: number) => {
    fetchUsers({
      page,
      limit: 20,
      search: searchTerm.trim() || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sort: sortBy,
      order: sortOrder
    });
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
  };

  const handleSortChange = (field: 'createdAt' | 'name' | 'email', order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

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
        onSearch={handleSearch}
        onPageChange={handlePageChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSortChange={handleSortChange}
        onDeleteUser={deleteUser}
        onToggleUserStatus={toggleUserStatus}
        onBatchOperation={batchOperation}
      />
    </div>
  );
} 