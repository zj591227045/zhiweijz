'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  TrophyIcon,
  StarIcon,
  ExclamationTriangleIcon,
  BellIcon,
  CheckCircleIcon,
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
import { MobilePaymentModal } from '../../../components/MobilePaymentModal';
import { SubscriptionUpgradeCard } from '../../../components/SubscriptionUpgradeCard';
import { MobilePaymentService } from '../../../services/mobile-payment.service';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSubscriptionInfo, setShowSubscriptionInfo] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 处理模态框背景滚动锁定
  useEffect(() => {
    if (showSubscriptionInfo) {
      // 锁定背景滚动
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // 恢复背景滚动
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // 清理函数
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showSubscriptionInfo]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // 如果是移动端，先尝试同步RevenueCat状态
        if (typeof window !== 'undefined' && window.Capacitor) {
          try {
            console.log('🔄 移动端环境，先同步RevenueCat状态...');
            const mobilePaymentService = MobilePaymentService.getInstance();
            await mobilePaymentService.refreshCustomerInfo();
            console.log('✅ RevenueCat状态同步完成');

            // 等待一段时间确保后端同步完成
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.warn('⚠️ RevenueCat同步失败，继续加载页面:', error);
          }
        }

        await fetchMembershipInfo();
        await fetchBadges();
        await fetchNotifications();
        // 获取准确的记账点余额
        if (pointsEnabled) {
          await fetchAccountingBalance();
        }
      } catch (error) {
        console.error('会员中心数据初始化失败:', error);
        setInitError('数据加载失败，请刷新页面重试');
      }
    };

    initializeData();
  }, [pointsEnabled]);

  useEffect(() => {
    if (error) {
      setTimeout(() => clearError(), 5000);
    }
  }, [error]);

  // 手动刷新会员状态
  const handleRefreshMembership = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 手动刷新会员状态...');

      // 如果是移动端，尝试刷新RevenueCat状态
      if (typeof window !== 'undefined' && window.Capacitor) {
        try {
          const mobilePaymentService = MobilePaymentService.getInstance();
          await mobilePaymentService.refreshCustomerInfo();
          console.log('✅ RevenueCat状态已刷新');

          // 等待一段时间确保后端同步完成
          console.log('⏳ 等待后端同步完成...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn('⚠️ RevenueCat刷新失败:', error);
        }
      }

      // 刷新会员信息
      await fetchMembershipInfo();

      // 如果启用了积分系统，也刷新积分余额
      if (pointsEnabled) {
        await fetchAccountingBalance();
      }

      console.log('✅ 会员状态刷新完成');
    } catch (error) {
      console.error('❌ 刷新会员状态失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">会员系统未启用</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">当前版本未启用会员系统功能</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const getMemberTypeIcon = (type: string) => {
    switch (type) {
      case 'DONATION_ONE':
        return <TrophySolidIcon className="h-6 w-6 text-blue-500" />;
      case 'DONATION_TWO':
        return <TrophySolidIcon className="h-6 w-6 text-green-500" />;
      case 'DONATION_THREE':
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
      {/* 错误提示 */}
      {(error || initError) && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 dark:text-red-500" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error || initError}</p>
              {initError && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300"
                >
                  刷新页面
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 页面标题 */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">管理您的会员权益、徽章收藏和通知设置</p>
      </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* 会员状态卡片 */}
            {membership && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">{getMemberTypeIcon(membership.memberType)}</div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {membershipApi.getMemberTypeLabel(membership.memberType)}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        加入时间：{new Date(membership.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* 刷新按钮 */}
                    <button
                      onClick={handleRefreshMembership}
                      disabled={refreshing}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                      title="刷新会员状态"
                    >
                      <svg
                        className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>

                    <div className="text-right">
                    {membership.endDate ? (
                      membershipApi.isExpired(membership.endDate) ? (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">会员状态</p>
                          <p className="text-lg font-semibold text-red-600 dark:text-red-400">已过期</p>
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            过期时间: {new Date(membership.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">到期时间</p>
                          <p
                            className={`text-lg font-semibold ${
                              isExpiringSoon() ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {new Date(membership.endDate).toLocaleDateString()}
                          </p>
                          {isExpiringSoon() && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              还有 {getDaysUntilExpiry()} 天到期
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">会员状态</p>
                        <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">永久有效</p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>

                {/* 会员记账点信息 */}
                {pointsEnabled && ['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE', 'DONOR'].includes(membership.memberType) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center">
                          <GiftIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">会员记账点</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                              {accountingBalance ? accountingBalance.memberBalance : 0}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              每月{membership.monthlyPoints}点，用于AI功能
                            </p>
                            {accountingLoading && (
                              <p className="text-xs text-blue-700 dark:text-blue-300">更新中...</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center">
                          <SparklesIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">赠送记账点</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                              {accountingBalance ? accountingBalance.giftBalance : 0}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              签到获得，每日最多5点
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 订阅升级卡片 - 独立容器 */}
            {membership && (
              <div className="mb-6">
                <SubscriptionUpgradeCard
                  currentMemberType={membership.memberType}
                  onUpgradeClick={() => setShowPaymentModal(true)}
                  onInfoClick={() => setShowSubscriptionInfo(true)}
                />
              </div>
            )}

            {/* 选项卡导航 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 dark:border-gray-700">
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
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5" />
                          <span>{tab.name}</span>
                          {tab.badge && tab.badge > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 dark:bg-red-600 rounded-full">
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">当前会员权益</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">会员记账点</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE', 'DONOR'].includes(membership?.memberType || '')
                              ? `每月${membership?.monthlyPoints || 1000}点，用于AI功能消费`
                              : '暂无记账点权益'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">专属徽章</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE', 'DONOR'].includes(membership?.memberType || '')
                              ? '捐赠会员专属徽章'
                              : '普通会员徽章'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">公益事业署名</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {['DONATION_TWO', 'DONATION_THREE'].includes(membership?.memberType || '')
                              ? '支持公益项目署名权利'
                              : '暂无此权益'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">优先客服</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {membership?.memberType === 'DONATION_THREE'
                              ? '享受优先客服通道'
                              : '标准客服支持'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {membership?.renewalHistory && membership.renewalHistory.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">续费历史</h3>
                        <div className="space-y-3">
                          {membership.renewalHistory.slice(0, 5).map((renewal) => (
                            <div
                              key={renewal.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {renewal.renewalType === 'UPGRADE' ? '升级' : '续费'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(renewal.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                  {new Date(renewal.startDate).toLocaleDateString()} -{' '}
                                  {new Date(renewal.endDate).toLocaleDateString()}
                                </p>
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    renewal.status === 'COMPLETED'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">我的徽章</h3>
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
                          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">暂无徽章</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">继续使用应用来获得更多徽章</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">全部徽章</h3>
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
                          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">暂无徽章</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">徽章系统即将上线</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 通知选项卡 */}
                {activeTab === 'notifications' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">通知消息</h3>
                    {notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`
                              p-4 rounded-lg border cursor-pointer transition-all duration-200
                              ${
                                notification.isRead
                                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                  : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                              }
                            `}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {notification.title}
                                  </h4>
                                  {!notification.isRead && (
                                    <span className="inline-flex h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.content}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BellIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">暂无通知</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">您的所有通知将在这里显示</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      {/* 支付模态框 */}
      {showPaymentModal && (
        <MobilePaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchMembershipInfo(); // 刷新会员信息
          }}
        />
      )}

      {/* 订阅服务说明模态框 */}
      {showSubscriptionInfo && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[999999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSubscriptionInfo(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 滚动容器 */}
            <div className="max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">订阅服务说明</h3>
                <button
                  onClick={() => setShowSubscriptionInfo(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">关闭</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* 会员类型对比 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">会员类型对比</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">权益项目</th>
                          <th className="px-1 sm:px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">普通</th>
                          <th className="px-1 sm:px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">捐赠（壹）</th>
                          <th className="px-1 sm:px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">捐赠（贰）</th>
                          <th className="px-1 sm:px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">捐赠（叁）</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">基础功能</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">AI智能记账</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                        </tr>
                        <tr>
                          <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">月度积分</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-gray-400 dark:text-gray-500 text-xs">0</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-blue-600 dark:text-blue-400 text-xs">1000/1500*</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-blue-600 dark:text-blue-400 text-xs">1000/1500*</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-blue-600 dark:text-blue-400 text-xs">1000/1500*</td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">公益署名</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-gray-400 dark:text-gray-500">✗</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-gray-400 dark:text-gray-500">✗</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                        </tr>
                        <tr>
                          <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">优先客服</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-gray-400 dark:text-gray-500">✗</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-gray-400 dark:text-gray-500">✗</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-gray-400 dark:text-gray-500">✗</td>
                          <td className="px-1 sm:px-2 py-3 text-center text-green-600 dark:text-green-400">✓</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">* 年付用户获得1500积分，月付用户获得1000积分</p>
                  </div>
                </div>

                {/* 订阅价格 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">订阅价格</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">捐赠会员（壹）</h5>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">月付：¥5/月</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">年付：¥55/年 <span className="text-green-600 dark:text-green-400">(省¥5)</span></p>
                      </div>
                    </div>
                    <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20">
                      <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">捐赠会员（贰）</h5>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">月付：¥10/月</p>
                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">年付：¥110/年 <span className="text-green-600 dark:text-green-400">(省¥10)</span></p>
                      </div>
                    </div>
                    <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20">
                      <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2 text-sm sm:text-base">捐赠会员（叁）</h5>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">月付：¥15/月</p>
                        <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">年付：¥165/年 <span className="text-green-600 dark:text-green-400">(省¥15)</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 订阅说明 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">订阅说明</h4>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <p>订阅会自动续费，您可以随时在设置中取消</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <p>年付订阅享受优惠价格和更多积分奖励</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <p>所有订阅收入将用于应用开发和公益事业</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <p>支持iOS App Store和Android多种支付方式</p>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowSubscriptionInfo(false);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors min-h-[44px]"
                  >
                    立即订阅
                  </button>
                  <button
                    onClick={() => setShowSubscriptionInfo(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]"
                  >
                    稍后再说
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageContainer>
  );
}
