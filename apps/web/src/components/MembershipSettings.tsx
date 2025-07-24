/**
 * 会员设置组件
 * 用于设置页面的会员管理功能
 */

import React, { useState } from 'react';
import { useMobilePayment } from '../hooks/useMobilePayment';
import { MembershipStatus } from './MembershipStatus';
import { MobilePaymentModal } from './MobilePaymentModal';
import { MembershipLevel } from '../services/mobile-payment.service';
import { Capacitor } from '@capacitor/core';

interface MembershipSettingsProps {
  className?: string;
}

export function MembershipSettings({ className = '' }: MembershipSettingsProps) {
  const {
    isInitialized,
    isLoading,
    error,
    membershipLevel,
    customerInfo,
    isPremium,
    isPro,
    restorePurchases
  } = useMobilePayment();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const isMobile = Capacitor.isNativePlatform();

  // 处理恢复购买
  const handleRestorePurchases = async () => {
    if (!isMobile || !isInitialized) {
      setRestoreMessage('恢复购买仅在移动端应用中可用');
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    try {
      await restorePurchases();
      setRestoreMessage('购买记录恢复成功！');
    } catch (error) {
      console.error('恢复购买失败:', error);
      setRestoreMessage('恢复购买失败，请稍后重试');
    } finally {
      setIsRestoring(false);
    }
  };

  // 处理升级成功
  const handleUpgradeSuccess = (newLevel: MembershipLevel) => {
    console.log('升级成功:', newLevel);
    // 可以在这里添加成功提示或其他逻辑
  };

  // 获取订阅管理链接
  const getSubscriptionManagementUrl = () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return 'https://apps.apple.com/account/subscriptions';
    } else if (platform === 'android') {
      return 'https://play.google.com/store/account/subscriptions';
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 会员状态卡片 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">会员状态</h2>
        <MembershipStatus
          onUpgradeClick={() => setShowPaymentModal(true)}
          showUpgradeButton={true}
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-1">支付系统错误</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 会员管理操作 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">会员管理</h3>
        <div className="space-y-3">
          
          {/* 恢复购买 */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">恢复购买</h4>
                <p className="text-gray-600 text-sm">
                  如果您之前购买过会员，可以恢复购买记录
                </p>
              </div>
              <button
                onClick={handleRestorePurchases}
                disabled={isRestoring || !isInitialized || !isMobile}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRestoring ? '恢复中...' : '恢复购买'}
              </button>
            </div>
            
            {restoreMessage && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                restoreMessage.includes('成功') 
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
              }`}>
                {restoreMessage}
              </div>
            )}
          </div>

          {/* 订阅管理 */}
          {(isPremium || isPro) && getSubscriptionManagementUrl() && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">管理订阅</h4>
                  <p className="text-gray-600 text-sm">
                    在应用商店中管理您的订阅设置
                  </p>
                </div>
                <a
                  href={getSubscriptionManagementUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  管理订阅
                </a>
              </div>
            </div>
          )}

          {/* 购买历史 */}
          {customerInfo && customerInfo.allPurchaseDates && 
           Object.keys(customerInfo.allPurchaseDates).length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3">购买历史</h4>
              <div className="space-y-2">
                {Object.entries(customerInfo.allPurchaseDates).map(([productId, date]) => (
                  <div key={productId} className="flex justify-between text-sm">
                    <span className="text-gray-600">{productId}</span>
                    <span className="text-gray-500">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 联系客服 */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">联系客服</h4>
                <p className="text-gray-600 text-sm">
                  遇到问题？联系我们的客服团队
                </p>
              </div>
              <button
                onClick={() => {
                  // 这里可以打开客服聊天或跳转到客服页面
                  alert('客服功能开发中...');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                联系客服
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 会员权益说明 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">会员权益</h3>
        <div className="bg-white border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Premium 权益 */}
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">Premium 会员</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 无限记账记录</li>
                <li>• 高级图表分析</li>
                <li>• 数据导出功能</li>
                <li>• 云端同步</li>
                <li>• 去除广告</li>
                <li>• 自定义分类</li>
              </ul>
            </div>

            {/* Pro 权益 */}
            <div className="space-y-2">
              <h4 className="font-medium text-purple-600">Pro 会员</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 包含Premium所有功能</li>
                <li>• AI智能分析</li>
                <li>• 预算建议</li>
                <li>• 投资追踪</li>
                <li>• 多账户管理</li>
                <li>• 优先客服支持</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 支付模态框 */}
      <MobilePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handleUpgradeSuccess}
      />

      {/* 非移动端提示 */}
      {!isMobile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">移动端专享</h4>
          <p className="text-blue-600 text-sm">
            App内购买功能仅在iOS和Android移动端应用中可用。
            请下载我们的移动端应用来享受完整的会员服务。
          </p>
        </div>
      )}

      {/* 系统状态（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 border rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            系统状态 (开发模式)
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>平台:</span>
              <span>{Capacitor.getPlatform()}</span>
            </div>
            <div className="flex justify-between">
              <span>是否移动端:</span>
              <span>{isMobile ? '是' : '否'}</span>
            </div>
            <div className="flex justify-between">
              <span>支付系统初始化:</span>
              <span className={isInitialized ? 'text-green-600' : 'text-red-600'}>
                {isInitialized ? '已初始化' : '未初始化'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>当前会员级别:</span>
              <span>{membershipLevel}</span>
            </div>
            <div className="flex justify-between">
              <span>加载状态:</span>
              <span>{isLoading ? '加载中' : '空闲'}</span>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
