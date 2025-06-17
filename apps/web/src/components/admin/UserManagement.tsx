'use client';

import { useState, useCallback } from 'react';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CogIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { UserModal } from './UserModal';
import { ConfirmModal } from './ConfirmModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AvatarDisplay } from '@/components/ui/avatar-display';

interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  transactionCount: number;
  accountBookCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserManagementProps {
  users: User[];
  isLoading: boolean;
  pagination: Pagination | null;
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sortBy: 'createdAt' | 'name' | 'email';
  sortOrder: 'asc' | 'desc';
  registrationEnabled: boolean;
  onSearch: (term: string) => void;
  onPageChange: (page: number) => void;
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
  onSortChange: (field: 'createdAt' | 'name' | 'email', order: 'asc' | 'desc') => void;
  onDeleteUser: (id: string) => Promise<boolean>;
  onToggleUserStatus: (id: string) => Promise<boolean>;
  onBatchOperation: (userIds: string[], operation: 'activate' | 'deactivate' | 'delete') => Promise<boolean>;
  onToggleRegistration: (enabled: boolean) => Promise<boolean>;
}

export function UserManagement({
  users,
  isLoading,
  pagination,
  searchTerm,
  statusFilter,
  sortBy,
  sortOrder,
  registrationEnabled,
  onSearch,
  onPageChange,
  onStatusFilterChange,
  onSortChange,
  onDeleteUser,
  onToggleUserStatus,
  onBatchOperation,
  onToggleRegistration
}: UserManagementProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'toggle' | 'batch' | 'toggleRegistration';
    user?: User;
    batchOperation?: 'activate' | 'deactivate' | 'delete';
    registrationEnabled?: boolean;
  } | null>(null);

  // 全选/取消全选
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  }, [users]);

  // 选择单个用户
  const handleSelectUser = useCallback((userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  }, [selectedUsers]);

  // 打开创建用户弹窗
  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  // 打开编辑用户弹窗
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  // 处理删除用户
  const handleDeleteUser = (user: User) => {
    setConfirmAction({ type: 'delete', user });
    setShowConfirmModal(true);
  };

  // 处理切换用户状态
  const handleToggleUserStatus = (user: User) => {
    setConfirmAction({ type: 'toggle', user });
    setShowConfirmModal(true);
  };

  // 处理重置密码
  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setShowResetPasswordModal(true);
  };

  // 处理批量操作
  const handleBatchOperation = (operation: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.size === 0) return;
    
    setConfirmAction({ type: 'batch', batchOperation: operation });
    setShowConfirmModal(true);
  };

  // 处理注册开关切换
  const handleToggleRegistration = () => {
    setConfirmAction({ 
      type: 'toggleRegistration', 
      registrationEnabled: !registrationEnabled 
    });
    setShowConfirmModal(true);
  };

  // 执行确认操作
  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    
    try {
      switch (confirmAction.type) {
        case 'delete':
          if (confirmAction.user) {
            await onDeleteUser(confirmAction.user.id);
          }
          break;
        case 'toggle':
          if (confirmAction.user) {
            await onToggleUserStatus(confirmAction.user.id);
          }
          break;
        case 'batch':
          if (confirmAction.batchOperation) {
            const success = await onBatchOperation(
              Array.from(selectedUsers), 
              confirmAction.batchOperation
            );
            if (success) {
              setSelectedUsers(new Set());
            }
          }
          break;
        case 'toggleRegistration':
          if (typeof confirmAction.registrationEnabled === 'boolean') {
            await onToggleRegistration(confirmAction.registrationEnabled);
          }
          break;
      }
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  // 排序处理
  const handleSort = (field: 'createdAt' | 'name' | 'email') => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'desc');
    }
  };

  // 渲染排序图标
  const renderSortIcon = (field: 'createdAt' | 'name' | 'email') => {
    if (sortBy !== field) {
      return <ArrowUpIcon className="w-4 h-4 opacity-30" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUpIcon className="w-4 h-4" />
      : <ArrowDownIcon className="w-4 h-4" />;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取确认弹窗的内容
  const getConfirmModalContent = () => {
    if (!confirmAction) return { title: '', message: '', confirmText: '', confirmStyle: '' };
    
    switch (confirmAction.type) {
      case 'delete':
        return {
          title: '确认删除用户',
          message: `确定要删除用户 "${confirmAction.user?.name}" 吗？此操作不可撤销。`,
          confirmText: '删除',
          confirmStyle: 'bg-red-600 hover:bg-red-700'
        };
      case 'toggle':
        const isActivating = !confirmAction.user?.isActive;
        return {
          title: `确认${isActivating ? '启用' : '禁用'}用户`,
          message: `确定要${isActivating ? '启用' : '禁用'}用户 "${confirmAction.user?.name}" 吗？`,
          confirmText: isActivating ? '启用' : '禁用',
          confirmStyle: isActivating ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'batch':
        const operationText = confirmAction.batchOperation === 'activate' ? '启用' : 
                             confirmAction.batchOperation === 'deactivate' ? '禁用' : '删除';
        return {
          title: `确认批量${operationText}`,
          message: `确定要${operationText} ${selectedUsers.size} 个用户吗？${confirmAction.batchOperation === 'delete' ? '此操作不可撤销。' : ''}`,
          confirmText: operationText,
          confirmStyle: confirmAction.batchOperation === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                       confirmAction.batchOperation === 'activate' ? 'bg-green-600 hover:bg-green-700' :
                       'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'toggleRegistration':
        const enabling = confirmAction.registrationEnabled;
        return {
          title: `确认${enabling ? '开放' : '关闭'}用户注册`,
          message: enabling 
            ? '确定要开放用户注册吗？开放后，任何人都可以注册新账号。'
            : '确定要关闭用户注册吗？关闭后，新用户将无法自行注册，只能由管理员创建账号。',
          confirmText: enabling ? '开放注册' : '关闭注册',
          confirmStyle: enabling ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
        };
      default:
        return { title: '', message: '', confirmText: '', confirmStyle: '' };
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统设置卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CogIcon className="w-6 h-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">系统设置</h3>
              <p className="text-sm text-gray-600">管理用户注册和系统配置</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">开放用户注册</span>
              <button
                onClick={handleToggleRegistration}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  registrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${
                registrationEnabled ? 'text-green-600' : 'text-red-600'
              }`}>
                {registrationEnabled ? '已开放' : '已关闭'}
              </span>
            </div>
          </div>
        </div>
        {!registrationEnabled && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>注意：</strong>用户注册已关闭，新用户无法自行注册。如需添加新用户，请使用"创建用户"功能。
            </p>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 筛选和操作 */}
          <div className="flex items-center gap-3">
            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="active">已启用</option>
              <option value="inactive">已禁用</option>
            </select>

            {/* 批量操作 */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  已选 {selectedUsers.size} 项
                </span>
                <button
                  onClick={() => handleBatchOperation('activate')}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  批量启用
                </button>
                <button
                  onClick={() => handleBatchOperation('deactivate')}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                >
                  批量禁用
                </button>
                <button
                  onClick={() => handleBatchOperation('delete')}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  批量删除
                </button>
              </div>
            )}

            {/* 创建用户按钮 */}
            <button
              onClick={handleCreateUser}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              创建用户
            </button>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUsers.size === users.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    用户信息
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    邮箱
                    {renderSortIcon('email')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数据统计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    注册时间
                    {renderSortIcon('createdAt')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AvatarDisplay
                          avatar={user.avatar}
                          username={user.name}
                          size="medium"
                          alt={user.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        {user.bio && (
                          <div className="text-sm text-gray-500 truncate max-w-48">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>交易: {user.transactionCount.toLocaleString()} 笔</div>
                      <div>账本: {user.accountBookCount} 个</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? '已启用' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>{formatDate(user.createdAt)}</div>
                      {user.lastLoginAt && (
                        <div className="text-xs text-gray-500">
                          最后登录: {formatDate(user.lastLoginAt)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑用户"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-orange-600 hover:text-orange-900"
                        title="重置密码"
                      >
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`${
                          user.isActive 
                            ? 'text-yellow-600 hover:text-yellow-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={user.isActive ? '禁用用户' : '启用用户'}
                      >
                        {user.isActive ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                        title="删除用户"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 
                条，共 {pagination.total} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
                >
                  上一页
                </button>
                
                {/* 页码 */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.page - 2) + i;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        pageNum === pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到用户</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? '尝试修改搜索条件' : '开始创建第一个用户'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={handleCreateUser}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  创建用户
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 用户编辑弹窗 */}
      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          user={editingUser}
          onSave={() => {
            setShowUserModal(false);
            // 刷新用户列表的逻辑由父组件处理
          }}
        />
      )}

      {/* 确认弹窗 */}
      {showConfirmModal && confirmAction && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={executeConfirmAction}
          title={getConfirmModalContent().title}
          message={getConfirmModalContent().message}
          confirmText={getConfirmModalContent().confirmText}
          confirmButtonClass={getConfirmModalContent().confirmStyle}
        />
      )}

      {/* 密码重置弹窗 */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setResetPasswordUser(null);
        }}
        user={resetPasswordUser}
      />
    </div>
  );
} 