'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccountingPointsManagement } from '@/store/admin/useAccountingPointsManagement';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GiftIcon,
  StarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function AccountingPointsPage() {
  const router = useRouter();
  const { config, loading: configLoading } = useSystemConfig();
  
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  // 如果记账点系统未启用，重定向到仪表盘
  useEffect(() => {
    if (!configLoading && !config.accountingPointsEnabled) {
      router.replace('/admin');
    }
  }, [config.accountingPointsEnabled, configLoading, router]);

  const { isAuthenticated, token } = useAdminAuth();
  const {
    users,
    overallStats,
    userTransactions,
    pointsConfig,
    pagination,
    isLoading,
    isLoadingStats,
    isLoadingTransactions,
    fetchUsersStats,
    fetchOverallStats,
    fetchUserTransactions,
    fetchPointsConfig,
    addPointsToUser,
    batchAddPoints,
    clearUserTransactions
  } = useAccountingPointsManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'totalBalance' | 'giftBalance' | 'memberBalance' | 'createdAt'>('totalBalance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAddPointsModal, setShowAddPointsModal] = useState(false);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addPointsForm, setAddPointsForm] = useState({
    points: 0,
    description: '管理员手动添加'
  });

  // 只在认证完成且有token时且功能启用时才执行API请求
  useEffect(() => {
    if (isAuthenticated && token && config.accountingPointsEnabled && !configLoading) {
      console.log('🔍 [AccountingPointsPage] 加载记账点管理数据');
      
      fetchUsersStats({
        page: 1,
        limit: 10,
        searchTerm,
        sortBy,
        sortOrder
      });
      
      fetchOverallStats();
      fetchPointsConfig();
    }
  }, [isAuthenticated, token, config.accountingPointsEnabled, configLoading, searchTerm, sortBy, sortOrder]);

  // 如果记账点系统未启用，显示加载状态
  if (configLoading || !config.accountingPointsEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查系统配置中...</p>
        </div>
      </div>
    );
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!isAuthenticated || !token) return;
    
    fetchUsersStats({
      page: 1,
      limit: 20,
      search: term.trim() || undefined,
      sortBy,
      sortOrder
    });
  };

  const handlePageChange = (page: number) => {
    if (!isAuthenticated || !token) return;
    
    fetchUsersStats({
      page,
      limit: 20,
      search: searchTerm.trim() || undefined,
      sortBy,
      sortOrder
    });
  };

  const handleSortChange = (field: typeof sortBy, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleShowUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserDetailModal(true);
    fetchUserTransactions(userId);
  };

  const handleAddPoints = async () => {
    if (!selectedUserId || addPointsForm.points <= 0) return;
    
    await addPointsToUser(selectedUserId, addPointsForm.points, addPointsForm.description);
    setShowAddPointsModal(false);
    setAddPointsForm({ points: 0, description: '管理员手动添加' });
    setSelectedUserId(null);
  };

  const handleBatchAddPoints = async () => {
    if (selectedUsers.length === 0 || addPointsForm.points <= 0) return;
    
    await batchAddPoints(selectedUsers, addPointsForm.points, addPointsForm.description);
    setShowBatchAddModal(false);
    setAddPointsForm({ points: 0, description: '管理员批量添加' });
    setSelectedUsers([]);
  };

  // 如果未认证，显示加载状态
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载记账点管理...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">记账点管理</h1>
        <p className="text-gray-600 mt-2">管理用户记账点，查看消费统计和记账记录</p>
      </div>

      {/* 总体统计卡片 */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总记账点</p>
                <p className="text-2xl font-semibold text-gray-900">{overallStats.totalBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <GiftIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">赠送记账点</p>
                <p className="text-2xl font-semibold text-gray-900">{overallStats.totalGiftBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <StarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">会员记账点</p>
                <p className="text-2xl font-semibold text-gray-900">{overallStats.totalMemberBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今日新增</p>
                <p className="text-2xl font-semibold text-gray-900">{overallStats.todayAddition.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今日消费</p>
                <p className="text-2xl font-semibold text-gray-900">{overallStats.todayConsumption.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 sm:ml-4 flex space-x-3">
              {selectedUsers.length > 0 && (
                <button
                  onClick={() => setShowBatchAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  批量添加记账点
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('totalBalance', sortOrder === 'desc' ? 'asc' : 'desc')}>
                  总记账点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('giftBalance', sortOrder === 'desc' ? 'asc' : 'desc')}>
                  赠送记账点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('memberBalance', sortOrder === 'desc' ? 'asc' : 'desc')}>
                  会员记账点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后更新
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-500">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {user.totalBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      {user.giftBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600">
                      {user.memberBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.lastUpdated).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleShowUserDetail(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setShowAddPointsModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        添加点数
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示第 {((pagination.page - 1) * pagination.limit) + 1} 到 {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条记录
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 添加记账点模态框 */}
      {showAddPointsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">添加记账点</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">记账点数量</label>
                  <input
                    type="number"
                    min="1"
                    value={addPointsForm.points}
                    onChange={(e) => setAddPointsForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">备注说明</label>
                  <input
                    type="text"
                    value={addPointsForm.description}
                    onChange={(e) => setAddPointsForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddPointsModal(false);
                    setAddPointsForm({ points: 0, description: '管理员手动添加' });
                    setSelectedUserId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddPoints}
                  disabled={addPointsForm.points <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量添加记账点模态框 */}
      {showBatchAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                批量添加记账点 ({selectedUsers.length} 个用户)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">记账点数量</label>
                  <input
                    type="number"
                    min="1"
                    value={addPointsForm.points}
                    onChange={(e) => setAddPointsForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">备注说明</label>
                  <input
                    type="text"
                    value={addPointsForm.description}
                    onChange={(e) => setAddPointsForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowBatchAddModal(false);
                    setAddPointsForm({ points: 0, description: '管理员批量添加' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchAddPoints}
                  disabled={addPointsForm.points <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  批量添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 用户详情模态框 */}
      {showUserDetailModal && selectedUserId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">用户记账记录</h3>
                <button
                  onClick={() => {
                    setShowUserDetailModal(false);
                    setSelectedUserId(null);
                    clearUserTransactions();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {isLoadingTransactions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">加载记账记录...</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          类型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          点数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          余额类型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          说明
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            暂无记账记录
                          </td>
                        </tr>
                      ) : (
                        userTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {transaction.type}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.operation === 'add' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.operation === 'add' ? '增加' : '扣除'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              <span className={transaction.operation === 'add' ? 'text-green-600' : 'text-red-600'}>
                                {transaction.operation === 'add' ? '+' : '-'}{transaction.points}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {transaction.balanceType === 'gift' ? '赠送点' : '会员点'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {transaction.description || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}