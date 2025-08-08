'use client';

import { useState, useEffect } from 'react';
import { useAdminDashboard } from '@/store/admin/useAdminDashboard';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';
import { StatsCard } from './StatsCard';
import { ChartCard } from './ChartCard';
import { SystemResourcesCard } from './SystemResourcesCard';
import { PerformanceHistoryCard } from './PerformanceHistoryCard';
import { DailyActiveStatsCard } from './DailyActiveStatsCard';
import {
  UsersIcon,
  CreditCardIcon,
  UserPlusIcon,
  PlusIcon,
  BookOpenIcon,
  UserGroupIcon,
  TrophyIcon,
  StarIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const PERIOD_OPTIONS = [
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' },
];

export function AdminDashboard() {
  const { config } = useSystemConfig();
  const {
    overview,
    userStats,
    transactionStats,
    systemResources,
    dailyActiveStats,
    uniqueActiveStats,
    isLoading,
    fetchUserStats,
    fetchTransactionStats,
    fetchDailyActiveStats,
    fetchUniqueActiveStats,
  } = useAdminDashboard();

  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedDays, setSelectedDays] = useState(7);
  const [membershipStats, setMembershipStats] = useState<any>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);

  // 获取会员统计数据
  const fetchMembershipStats = async () => {
    // 只有在会员系统启用时才获取数据
    if (!config.membershipEnabled) {
      return;
    }

    try {
      setMembershipLoading(true);
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.MEMBERSHIP_STATS);
      const data = await response.json();
      if (data.success) {
        setMembershipStats(data.data);
      }
    } catch (error) {
      console.error('获取会员统计失败:', error);
    } finally {
      setMembershipLoading(false);
    }
  };

  // 初始化时获取日活跃统计、去重统计和会员统计
  useEffect(() => {
    fetchDailyActiveStats(selectedDays);
    fetchUniqueActiveStats(selectedDays);
    if (config.membershipEnabled) {
      fetchMembershipStats();
    }
  }, [fetchDailyActiveStats, fetchUniqueActiveStats, config.membershipEnabled]);

  const handlePeriodChange = async (period: string) => {
    setSelectedPeriod(period);
    await Promise.all([fetchUserStats(period), fetchTransactionStats(period)]);
  };

  const handleDaysChange = async (days: number) => {
    setSelectedDays(days);
    await Promise.all([
      fetchDailyActiveStats(days),
      fetchUniqueActiveStats(days)
    ]);
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 概览统计卡片数据
  const overviewStats = overview
    ? [
        {
          title: '总用户数',
          value: formatNumber(overview.totalUsers),
          icon: UsersIcon,
          color: 'blue',
          change: overview.todayUsers > 0 ? `今日新增 ${overview.todayUsers}` : '今日无新增',
          changeType: 'positive' as const,
        },
        {
          title: '总记账记录',
          value: formatNumber(overview.totalTransactions),
          icon: CreditCardIcon,
          color: 'green',
          change:
            overview.todayTransactions > 0
              ? `今日新增 ${overview.todayTransactions}`
              : '今日无新增',
          changeType: 'positive' as const,
        },
        {
          title: '账本数量',
          value: formatNumber(overview.totalAccountBooks),
          icon: BookOpenIcon,
          color: 'purple',
          change: '累计创建',
          changeType: 'neutral' as const,
        },
        {
          title: '活跃家庭',
          value: formatNumber(overview.activeFamilies),
          icon: UserGroupIcon,
          color: 'orange',
          change: '有成员的家庭',
          changeType: 'neutral' as const,
        },
      ]
    : [];

  // 会员统计卡片数据
  const membershipStatsCards = membershipStats
    ? [
        {
          title: '总会员数',
          value: formatNumber(membershipStats.totalMembers),
          icon: UsersIcon,
          color: 'blue',
          change: '所有注册用户',
          changeType: 'neutral' as const,
        },
        {
          title: '普通会员',
          value: formatNumber(membershipStats.regularMembers),
          icon: UserPlusIcon,
          color: 'gray',
          change: '默认状态用户',
          changeType: 'neutral' as const,
        },
        {
          title: '捐赠会员（壹）',
          value: formatNumber(membershipStats.donationOneMembers),
          icon: TrophyIcon,
          color: 'yellow',
          change: '基础捐赠会员',
          changeType: 'positive' as const,
        },
        {
          title: '捐赠会员（贰）',
          value: formatNumber(membershipStats.donationTwoMembers),
          icon: TrophyIcon,
          color: 'orange',
          change: '中级捐赠会员',
          changeType: 'positive' as const,
        },
        {
          title: '捐赠会员（叁）',
          value: formatNumber(membershipStats.donationThreeMembers),
          icon: TrophyIcon,
          color: 'red',
          change: '高级捐赠会员',
          changeType: 'positive' as const,
        },
        {
          title: '永久会员',
          value: formatNumber(membershipStats.lifetimeMembers),
          icon: TrophyIcon,
          color: 'purple',
          change: '终身会员',
          changeType: 'positive' as const,
        },
        {
          title: '活跃会员',
          value: formatNumber(membershipStats.activeMembers),
          icon: ChartPieIcon,
          color: 'green',
          change: '当前活跃付费会员',
          changeType: 'positive' as const,
        },
        {
          title: '即将到期',
          value: formatNumber(membershipStats.expiringInWeek),
          icon: ExclamationTriangleIcon,
          color: 'amber',
          change: '7天内到期',
          changeType: 'warning' as const,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* 时间周期选择器 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">数据概览</h2>
        <div className="flex space-x-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            change={stat.change}
            changeType={stat.changeType}
            isLoading={isLoading.overview}
          />
        ))}
      </div>

      {/* 会员统计卡片 - 只在会员系统启用时显示 */}
      {config.membershipEnabled && membershipStats && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">会员统计</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            {membershipStatsCards.map((stat, index) => (
              <StatsCard
                key={`membership-${index}`}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                change={stat.change}
                changeType={stat.changeType}
                isLoading={membershipLoading}
              />
            ))}
          </div>
        </>
      )}

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户注册趋势 */}
        <ChartCard
          title="用户注册趋势"
          data={userStats?.dailyRegistrations || []}
          isLoading={isLoading.userStats}
          type="line"
          dataKey="count"
          xAxisKey="date"
          color="#3B82F6"
        />

        {/* 记账数量趋势 */}
        <ChartCard
          title="记账数量趋势"
          data={transactionStats?.dailyTransactions || []}
          isLoading={isLoading.transactionStats}
          type="bar"
          dataKey="count"
          xAxisKey="date"
          color="#10B981"
        />
      </div>

      {/* 日活跃用户统计 */}
      <DailyActiveStatsCard
        data={dailyActiveStats}
        uniqueStats={uniqueActiveStats}
        isLoading={isLoading.dailyActiveStats}
        isLoadingUnique={isLoading.uniqueActiveStats}
        onPeriodChange={handleDaysChange}
        selectedDays={selectedDays}
      />

      {/* 分类统计和系统资源 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分类统计 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">热门分类</h3>
          {isLoading.transactionStats ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {transactionStats?.categoryStats.slice(0, 5).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <span className="text-gray-500">{category.transactionCount}笔</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (category.transactionCount /
                              (transactionStats?.categoryStats[0]?.transactionCount || 1)) *
                              100,
                            100,
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )) || <p className="text-gray-500 text-center py-4">暂无数据</p>}
            </div>
          )}
        </div>

        {/* 系统资源 */}
        <SystemResourcesCard data={systemResources} isLoading={isLoading.systemResources} />
      </div>

      {/* 系统性能历史图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceHistoryCard
          metricType="disk"
          title="磁盘使用率"
          color="#EF4444"
          unit="%"
          isLoading={isLoading.systemResources}
        />
        <PerformanceHistoryCard
          metricType="cpu"
          title="CPU使用率"
          color="#F59E0B"
          unit="%"
          isLoading={isLoading.systemResources}
        />
        <PerformanceHistoryCard
          metricType="memory"
          title="内存使用率"
          color="#10B981"
          unit="%"
          isLoading={isLoading.systemResources}
        />
      </div>
    </div>
  );
}
