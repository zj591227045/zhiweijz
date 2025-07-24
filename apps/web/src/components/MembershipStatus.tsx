/**
 * 会员状态显示组件
 * 显示用户当前的会员状态和权益信息
 */

import React, { useState, useEffect } from 'react';
import { useMobilePayment } from '../hooks/useMobilePayment';
import { MembershipLevel } from '../services/mobile-payment.service';
import { ENTITLEMENTS } from '../config/app-store-products';
import { Capacitor } from '@capacitor/core';

interface MembershipStatusProps {
  onUpgradeClick?: () => void;
  showUpgradeButton?: boolean;
  compact?: boolean;
}

export function MembershipStatus({ 
  onUpgradeClick, 
  showUpgradeButton = true,
  compact = false 
}: MembershipStatusProps) {
  const {
    isInitialized,
    membershipLevel,
    customerInfo,
    isPremium,
    isPro,
    hasUnlimitedRecords,
    hasAdvancedAnalytics,
    hasCloudSync,
    refreshCustomerInfo
  } = useMobilePayment();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = Capacitor.isNativePlatform();

  // 刷新会员状态
  const handleRefresh = async () => {
    if (!isMobile || !isInitialized) return;
    
    setIsRefreshing(true);
    try {
      await refreshCustomerInfo();
    } catch (error) {
      console.error('刷新会员状态失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 获取会员级别显示信息
  const getMembershipInfo = () => {
    switch (membershipLevel) {
      case MembershipLevel.PRO:
        return {
          name: 'Pro 会员',
          color: 'bg-gradient-to-r from-purple-500 to-pink-500',
          textColor: 'text-white',
          icon: '👑',
          description: '享受所有高级功能'
        };
      case MembershipLevel.PREMIUM:
        return {
          name: 'Premium 会员',
          color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          textColor: 'text-white',
          icon: '⭐',
          description: '解锁高级功能'
        };
      default:
        return {
          name: '免费用户',
          color: 'bg-gray-100',
          textColor: 'text-gray-700',
          icon: '👤',
          description: '升级解锁更多功能'
        };
    }
  };

  // 获取权益列表
  const getEntitlements = () => {
    const entitlements = [];
    
    if (hasUnlimitedRecords) {
      entitlements.push({ name: '无限记账记录', active: true });
    }
    
    if (hasAdvancedAnalytics) {
      entitlements.push({ name: '高级数据分析', active: true });
    }
    
    if (hasCloudSync) {
      entitlements.push({ name: '云端同步', active: true });
    }

    // 添加Pro专属功能
    if (isPro) {
      entitlements.push(
        { name: 'AI智能分析', active: true },
        { name: '投资追踪', active: true },
        { name: '多账户管理', active: true },
        { name: '优先客服', active: true }
      );
    }

    // 如果是免费用户，显示可升级的功能
    if (membershipLevel === MembershipLevel.FREE) {
      entitlements.push(
        { name: '无限记账记录', active: false },
        { name: '高级数据分析', active: false },
        { name: '云端同步', active: false },
        { name: '去除广告', active: false }
      );
    }

    return entitlements;
  };

  // 获取订阅到期信息
  const getExpirationInfo = () => {
    if (!customerInfo || !customerInfo.allExpirationDates) {
      return null;
    }

    const expirationDates = Object.values(customerInfo.allExpirationDates);
    if (expirationDates.length === 0) {
      return null;
    }

    // 获取最晚的过期时间
    const latestExpiration = new Date(Math.max(
      ...expirationDates.map(date => new Date(date).getTime())
    ));

    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (latestExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      date: latestExpiration,
      daysUntilExpiration,
      isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0,
      isExpired: daysUntilExpiration <= 0
    };
  };

  const membershipInfo = getMembershipInfo();
  const entitlements = getEntitlements();
  const expirationInfo = getExpirationInfo();

  // 紧凑模式
  if (compact) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${membershipInfo.color} ${membershipInfo.textColor}`}>
        <span className="mr-1">{membershipInfo.icon}</span>
        <span className="font-medium">{membershipInfo.name}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-full ${membershipInfo.color} flex items-center justify-center text-xl`}>
            {membershipInfo.icon}
          </div>
          <div className="ml-3">
            <h3 className="font-bold text-lg">{membershipInfo.name}</h3>
            <p className="text-gray-600 text-sm">{membershipInfo.description}</p>
          </div>
        </div>
        
        {/* 刷新按钮 */}
        {isMobile && isInitialized && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="刷新会员状态"
          >
            <span className={`text-lg ${isRefreshing ? 'animate-spin' : ''}`}>
              🔄
            </span>
          </button>
        )}
      </div>

      {/* 到期信息 */}
      {expirationInfo && (isPremium || isPro) && (
        <div className="mb-4">
          {expirationInfo.isExpired ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium">
                ⚠️ 会员已过期
              </p>
              <p className="text-red-500 text-xs mt-1">
                过期时间: {expirationInfo.date.toLocaleDateString()}
              </p>
            </div>
          ) : expirationInfo.isExpiringSoon ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-600 text-sm font-medium">
                ⏰ 会员即将到期
              </p>
              <p className="text-yellow-500 text-xs mt-1">
                还有 {expirationInfo.daysUntilExpiration} 天到期
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-600 text-sm font-medium">
                ✅ 会员有效
              </p>
              <p className="text-green-500 text-xs mt-1">
                到期时间: {expirationInfo.date.toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 权益列表 */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">功能权益</h4>
        <div className="space-y-2">
          {entitlements.map((entitlement, index) => (
            <div key={index} className="flex items-center">
              <span className={`mr-2 ${entitlement.active ? 'text-green-500' : 'text-gray-400'}`}>
                {entitlement.active ? '✓' : '○'}
              </span>
              <span className={`text-sm ${entitlement.active ? 'text-gray-900' : 'text-gray-500'}`}>
                {entitlement.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 升级按钮 */}
      {showUpgradeButton && membershipLevel !== MembershipLevel.PRO && (
        <div className="pt-3 border-t">
          <button
            onClick={onUpgradeClick}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            {membershipLevel === MembershipLevel.FREE ? '升级会员' : '升级到Pro'}
          </button>
        </div>
      )}

      {/* 非移动端提示 */}
      {!isMobile && showUpgradeButton && (
        <div className="pt-3 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-600 text-sm">
              💡 请在移动端应用中升级会员
            </p>
          </div>
        </div>
      )}

      {/* 调试信息（仅开发环境） */}
      {process.env.NODE_ENV === 'development' && customerInfo && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-gray-500">调试信息</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify({
              membershipLevel,
              activeSubscriptions: customerInfo.activeSubscriptions,
              activeEntitlements: Object.keys(customerInfo.entitlements.active),
              isInitialized,
              isMobile
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
