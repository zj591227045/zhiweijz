'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrophyIcon,
  StarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  CogIcon,
  GiftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  TrophyIcon as TrophySolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import useMembershipStore from '../../../store/membership-store';
import membershipApi from '../../../lib/api/membership-service';
import { BadgeDisplay } from '../../../components/ui/badge-display';
import { PageContainer } from '../../../components/layout/page-container';
import { useAccountingPointsStore } from '../../../store/accounting-points-store';

export default function MembershipCenter() {
  const router = useRouter();
  const {
    membership,
    badges,
    notifications,
    loading,
    error,
    systemEnabled,
    pointsEnabled,
    fetchMembershipInfo,
    fetchBadges,
    fetchNotifications,
    selectBadge,
    markNotificationAsRead,
    clearError,
  } = useMembershipStore();

  const {
    balance: accountingBalance,
    fetchBalance: fetchAccountingBalance,
    loading: accountingLoading,
  } = useAccountingPointsStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembershipInfo();
    fetchBadges();
    fetchNotifications();
    // 获取准确的记账点余额
    if (pointsEnabled) {
      fetchAccountingBalance();
    }
  }, [pointsEnabled]);

  useEffect(() => {
    if (error) {
      setTimeout(() => clearError(), 5000);
    }
  }, [error]);

  // 返回到设置页面
  const handleBackToSettings = () => {
    router.push('/settings');
  };

  if (!systemEnabled) {
    return (
      <PageContainer
        title="会员中心"
        showBackButton={true}
        onBackClick={handleBackToSettings}
        activeNavItem="profile"
        showBottomNav={false}
      >
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">会员系统未启用</h3>
            <p className="mt-1 text-sm text-gray-500">当前版本未启用会员系统功能</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const getMemberTypeIcon = (type: string) => {
    switch (type) {
      case 'DONOR':
        return <TrophySolidIcon className="h-6 w-6 text-yellow-500" />;
      case 'LIFETIME':
        return <StarSolidIcon className="h-6 w-6 text-purple-500" />;
      default:
        return <TrophyIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getDaysUntilExpiry = () => {
    if (!membership?.endDate) return null;
    return membershipApi.getDaysUntilExpiry(membership.endDate);
  };

  const isExpiringSoon = () => {
    return membershipApi.isExpiringsoon(membership?.endDate || null);
  };

  const handleBadgeSelect = async (badgeId: string) => {
    if (selectedBadgeId === badgeId) {
      setSelectedBadgeId(null);
    } else {
      setSelectedBadgeId(badgeId);
      await selectBadge(badgeId);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const tabs = [
    { id: 'overview', name: '概览', icon: TrophyIcon },
    { id: 'badges', name: '徽章收藏', icon: StarIcon },
    { id: 'notifications', name: '通知', icon: BellIcon, badge: unreadNotificationsCount },
  ];

  return (
    <PageContainer
      title="会员中心"
      showBackButton={true}
      onBackClick={handleBackToSettings}
      activeNavItem="profile"
      showBottomNav={false}
    >
      <div className="px-4 py-4">
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 页面标题 */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">管理您的会员权益、徽章收藏和通知设置</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* 会员状态卡片 */}
            {membership && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">{getMemberTypeIcon(membership.memberType)}</div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {membershipApi.getMemberTypeLabel(membership.memberType)}
                      </h2>
                      <p className="text-sm text-gray-500">
                        加入时间：{new Date(membership.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {membership.endDate ? (
                      <div>
                        <p className="text-sm text-gray-500">到期时间</p>
                        <p
                          className={`text-lg font-semibold ${
                            isExpiringSoon() ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {new Date(membership.endDate).toLocaleDateString()}
                        </p>
                        {isExpiringSoon() && (
                          <p className="text-xs text-red-500 mt-1">
                            还有 {getDaysUntilExpiry()} 天到期
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500">会员状态</p>
                        <p className="text-lg font-semibold text-purple-600">永久有效</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 会员记账点信息 */}
                {pointsEnabled && membership.memberType === 'DONOR' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    {/* 总记账点概览 */}
                    {accountingBalance && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-900 mb-1">
                            {accountingBalance.totalBalance}
                          </div>
                          <div className="text-sm text-blue-700">总可用记账点</div>
                          <div className="flex justify-center gap-4 mt-2 text-xs text-blue-600">
                            <span>会员记账点：{accountingBalance.memberBalance}</span>
                            <span>赠送记账点：{accountingBalance.giftBalance}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <GiftIcon className="h-8 w-8 text-blue-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-900">月度记账点</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {membership.monthlyPoints}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <SparklesIcon className="h-8 w-8 text-green-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-900">可用记账点</p>
                            <p className="text-2xl font-bold text-green-900">
                              {accountingBalance
                                ? accountingBalance.memberBalance
                                : membership.monthlyPoints - membership.usedPoints}
                            </p>
                            {accountingLoading && (
                              <p className="text-xs text-green-700">更新中...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 选项卡导航 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          relative py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200
                          ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5" />
                          <span>{tab.name}</span>
                          {tab.badge && tab.badge > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                              {tab.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-4">
                {/* 概览选项卡 */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">会员权益</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900">每月会员记账点</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {membership?.memberType === 'DONOR'
                              ? '1000点记账点，用于AI功能'
                              : '暂无记账点权益'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900">专属徽章</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {membership?.memberType === 'DONOR'
                              ? '捐赠会员专属徽章'
                              : '普通会员徽章'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900">公益事业署名</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {membership?.memberType === 'DONOR'
                              ? '支持公益项目署名权利'
                              : '暂无此权益'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900">优先客服</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {membership?.memberType === 'DONOR'
                              ? '享受优先客服通道'
                              : '标准客服支持'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {membership?.renewalHistory && membership.renewalHistory.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">续费历史</h3>
                        <div className="space-y-3">
                          {membership.renewalHistory.slice(0, 5).map((renewal) => (
                            <div
                              key={renewal.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {renewal.renewalType === 'UPGRADE' ? '升级' : '续费'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(renewal.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-900">
                                  {new Date(renewal.startDate).toLocaleDateString()} -{' '}
                                  {new Date(renewal.endDate).toLocaleDateString()}
                                </p>
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    renewal.status === 'COMPLETED'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {renewal.status === 'COMPLETED' ? '已完成' : renewal.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 徽章收藏选项卡 */}
                {activeTab === 'badges' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">我的徽章</h3>
                      {membership?.badges && membership.badges.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {membership.badges.map((userBadge) => (
                            <BadgeDisplay
                              key={userBadge.id}
                              badge={userBadge.badge}
                              userBadge={userBadge}
                              size="medium"
                              showRarity={true}
                              showTooltip={true}
                              isSelected={userBadge.isDisplayed}
                              onClick={() => handleBadgeSelect(userBadge.badgeId)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无徽章</h3>
                          <p className="mt-1 text-sm text-gray-500">继续使用应用来获得更多徽章</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">全部徽章</h3>
                      {badges.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {badges.map((badge) => {
                            const userBadge = membership?.badges.find(
                              (ub) => ub.badgeId === badge.id,
                            );
                            return (
                              <BadgeDisplay
                                key={badge.id}
                                badge={badge}
                                userBadge={userBadge}
                                size="medium"
                                showRarity={true}
                                showTooltip={true}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无徽章</h3>
                          <p className="mt-1 text-sm text-gray-500">徽章系统即将上线</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 通知选项卡 */}
                {activeTab === 'notifications' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">通知消息</h3>
                    {notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`
                              p-4 rounded-lg border cursor-pointer transition-all duration-200
                              ${
                                notification.isRead
                                  ? 'border-gray-200 bg-white'
                                  : 'border-blue-200 bg-blue-50'
                              }
                            `}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </h4>
                                  {!notification.isRead && (
                                    <span className="inline-flex h-2 w-2 bg-blue-500 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">暂无通知</h3>
                        <p className="mt-1 text-sm text-gray-500">您的所有通知将在这里显示</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
