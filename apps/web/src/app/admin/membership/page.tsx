'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import {
  UsersIcon,
  TrophyIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

interface MembershipStats {
  totalMembers: number;
  regularMembers: number;
  donorMembers: number;
  lifetimeMembers: number;
  activeMembers: number;
  expiringInWeek: number;
}

interface Membership {
  id: string;
  userId: string;
  memberType: 'REGULAR' | 'DONOR' | 'LIFETIME';
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  autoRenewal: boolean;
  monthlyPoints: number;
  usedPoints: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    createdAt: string;
  };
  badges: Array<{
    badge: {
      id: string;
      name: string;
      icon: string;
      color: string;
      rarity: string;
    };
  }>;
}

export default function MembershipManagement() {
  const router = useRouter();
  const { config, loading: configLoading } = useSystemConfig();

  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/membership/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取会员列表
  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { memberType: filterType }),
      });

      const response = await fetch(`/api/admin/membership/list?${params}`);
      const data = await response.json();
      if (data.success) {
        setMemberships(data.data.memberships);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('获取会员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 所有useEffect hooks
  useEffect(() => {
    if (!configLoading && !config.membershipEnabled) {
      router.replace('/admin');
    }
  }, [config.membershipEnabled, configLoading, router]);

  useEffect(() => {
    if (config.membershipEnabled && !configLoading) {
      fetchStats();
    }
  }, [config.membershipEnabled, configLoading]);

  useEffect(() => {
    if (config.membershipEnabled && !configLoading) {
      fetchMemberships();
    }
  }, [currentPage, searchTerm, filterType, config.membershipEnabled, configLoading]);

  // 如果会员系统未启用或正在加载，显示加载状态
  if (configLoading || !config.membershipEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查系统配置中...</p>
        </div>
      </div>
    );
  }

  // 手动添加会员
  const handleAddMembership = async (
    email: string,
    memberType: string,
    duration: number,
    reason: string,
  ) => {
    try {
      const response = await fetch('/api/admin/membership/add-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          memberType,
          duration,
          reason,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchMemberships();
        fetchStats();
        setShowAddMemberModal(false);
      } else {
        alert(data.message || '添加失败');
      }
    } catch (error) {
      console.error('添加会员失败:', error);
      alert('添加失败');
    }
  };

  // 升级会员
  const handleUpgradeMember = async (userId: string, memberType: string, duration: number) => {
    try {
      const response = await fetch(`/api/admin/membership/upgrade/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberType,
          duration,
          reason: '管理员手动升级',
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('会员升级成功');
        fetchMemberships();
        setShowUpgradeModal(false);
      } else {
        alert(data.message || '升级失败');
      }
    } catch (error) {
      console.error('升级会员失败:', error);
      alert('升级失败');
    }
  };

  // 批量检查会员状态
  const handleBatchCheck = async () => {
    try {
      const response = await fetch('/api/admin/membership/check-all-status', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchStats();
        fetchMemberships();
      }
    } catch (error) {
      console.error('批量检查失败:', error);
    }
  };

  const getMemberTypeLabel = (type: string) => {
    switch (type) {
      case 'REGULAR':
        return '普通会员';
      case 'DONOR':
        return '捐赠会员';
      case 'LIFETIME':
        return '永久会员';
      default:
        return type;
    }
  };

  const getMemberTypeColor = (type: string) => {
    switch (type) {
      case 'REGULAR':
        return 'bg-gray-100 text-gray-800';
      case 'DONOR':
        return 'bg-yellow-100 text-yellow-800';
      case 'LIFETIME':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">会员管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          管理增值会员信息、升级权限和查看统计数据（不显示普通会员）
        </p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">总会员数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">普通会员</p>
                <p className="text-2xl font-bold text-gray-900">{stats.regularMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">捐赠会员</p>
                <p className="text-2xl font-bold text-gray-900">{stats.donorMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">永久会员</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lifetimeMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartPieIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">活跃会员</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">7天内到期</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiringInWeek}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            {/* 搜索框 */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="搜索用户名或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 会员类型筛选 */}
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">所有增值会员</option>
              <option value="DONOR">捐赠会员</option>
              <option value="LIFETIME">永久会员</option>
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              添加会员
            </button>
            <button
              onClick={handleBatchCheck}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              批量检查状态
            </button>
          </div>
        </div>
      </div>

      {/* 会员列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会员类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    开始时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    到期时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    积分情况
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : memberships.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  memberships.map((membership) => (
                    <tr key={membership.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full"
                              src={
                                membership.user.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(membership.user.name)}&background=random`
                              }
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {membership.user.name}
                            </div>
                            <div className="text-sm text-gray-500">{membership.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMemberTypeColor(membership.memberType)}`}
                        >
                          {getMemberTypeLabel(membership.memberType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(membership.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {membership.endDate
                          ? new Date(membership.endDate).toLocaleDateString()
                          : '永久'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {membership.monthlyPoints > 0 ? (
                          <div>
                            <div>月度: {membership.monthlyPoints}</div>
                            <div className="text-xs text-gray-500">
                              已用: {membership.usedPoints}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">无积分</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            membership.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {membership.isActive ? '活跃' : '已到期'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(membership.userId);
                              setShowUpgradeModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            升级
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    第 <span className="font-medium">{currentPage}</span> 页，共{' '}
                    <span className="font-medium">{totalPages}</span> 页
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 升级会员模态框 */}
      {showUpgradeModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowUpgradeModal(false)}
            ></div>

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <TrophyIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">升级会员</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">会员类型</label>
                        <select
                          id="memberType"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="DONOR">捐赠会员</option>
                          <option value="LIFETIME">永久会员</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          时长（月）
                        </label>
                        <input
                          type="number"
                          id="duration"
                          defaultValue={12}
                          min={1}
                          max={120}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                  onClick={() => {
                    const memberType = (document.getElementById('memberType') as HTMLSelectElement)
                      .value;
                    const duration = parseInt(
                      (document.getElementById('duration') as HTMLInputElement).value,
                    );
                    handleUpgradeMember(selectedUser, memberType, duration);
                  }}
                >
                  确认升级
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加会员模态框 */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAddMemberModal(false)}
            ></div>

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <PlusIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">添加会员</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          用户邮箱或用户名
                        </label>
                        <input
                          type="text"
                          id="userEmail"
                          placeholder="请输入用户邮箱或用户名"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">会员类型</label>
                        <select
                          id="addMemberType"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="DONOR">捐赠会员</option>
                          <option value="LIFETIME">永久会员</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          时长（月）
                        </label>
                        <input
                          type="number"
                          id="addDuration"
                          defaultValue={12}
                          min={1}
                          max={120}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">永久会员无需设置时长</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">备注原因</label>
                        <input
                          type="text"
                          id="addReason"
                          placeholder="可选，添加会员的原因"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                  onClick={() => {
                    const email = (document.getElementById('userEmail') as HTMLInputElement).value;
                    const memberType = (
                      document.getElementById('addMemberType') as HTMLSelectElement
                    ).value;
                    const duration = parseInt(
                      (document.getElementById('addDuration') as HTMLInputElement).value,
                    );
                    const reason = (document.getElementById('addReason') as HTMLInputElement).value;

                    if (!email.trim()) {
                      alert('请输入用户邮箱或用户名');
                      return;
                    }

                    handleAddMembership(email.trim(), memberType, duration, reason);
                  }}
                >
                  确认添加
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowAddMemberModal(false)}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
