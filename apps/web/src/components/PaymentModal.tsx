/**
 * 支付模态框组件
 * 使用 zhiweijz-payment-premium 模块的支付功能
 */

import React, { useState, useEffect } from 'react';
import { 
  useMobilePayment, 
  MembershipLevel, 
  getSubscriptionProducts, 
  MembershipTier 
} from '../lib/payment';
import { Capacitor } from '@capacitor/core';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (membershipLevel: MembershipLevel) => void;
  initialTab?: 'monthly' | 'yearly';
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialTab = 'monthly' 
}: PaymentModalProps) {
  const {
    isInitialized,
    isLoading,
    error,
    membershipLevel,
    isDonationMember,
    isDonationTwo,
    isDonationThree,
    purchaseProduct,
    restorePurchases
  } = useMobilePayment();

  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>(initialTab);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 检查是否在移动端
  const isMobile = Capacitor.isNativePlatform();

  // 获取产品列表
  const subscriptionProducts = getSubscriptionProducts();
  const monthlyProducts = subscriptionProducts.filter(p => p.duration === 'P1M');
  const yearlyProducts = subscriptionProducts.filter(p => p.duration === 'P1Y');

  // 处理购买
  const handlePurchase = async (productId: string) => {
    if (!isMobile) {
      alert('App内购买仅在移动端应用中可用');
      return;
    }

    if (!isInitialized) {
      alert('支付系统未初始化，请稍后重试');
      return;
    }

    setIsProcessing(true);
    setSelectedPlan(productId);

    try {
      await purchaseProduct(productId);
      
      // 调用成功回调
      if (onSuccess) {
        const product = subscriptionProducts.find(p => p.id === productId);
        const newLevel = product?.membershipTier || MembershipLevel.FREE;
        onSuccess(newLevel as MembershipLevel);
      }
      
      onClose();
      alert('购买成功！会员权益已激活。');
      
    } catch (error) {
      console.error('购买失败:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('取消')) {
          return;
        }
        alert(`购买失败: ${error.message}`);
      } else {
        alert('购买失败，请稍后重试');
      }
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  // 处理恢复购买
  const handleRestorePurchases = async () => {
    if (!isMobile) {
      alert('恢复购买仅在移动端应用中可用');
      return;
    }

    if (!isInitialized) {
      alert('支付系统未初始化，请稍后重试');
      return;
    }

    setIsProcessing(true);

    try {
      await restorePurchases();
      alert('购买记录已恢复！');
      onClose();
    } catch (error) {
      console.error('恢复购买失败:', error);
      alert('恢复购买失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 如果不在移动端，显示提示
  if (!isMobile) {
    return (
      <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">App内购买</h2>
          <p className="text-gray-600 mb-4">
            App内购买功能仅在移动端应用中可用。请在iOS或Android应用中进行购买。
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            确定
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  const currentProducts = activeTab === 'monthly' ? monthlyProducts : yearlyProducts;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
      <div
        className="fixed bg-white rounded-lg overflow-hidden"
        style={{
          left: '16px',
          right: '16px',
          top: '80px', // 为iOS顶部导航栏留出更多空间
          bottom: '80px', // 为底部留出更多空间
          maxHeight: 'calc(100vh - 160px)', // 确保不超出屏幕
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">升级会员</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {/* 内容区域 */}
        <div
          className="flex-1 overflow-y-auto p-4"
          style={{
            maxHeight: 'calc(100vh - 240px)', // 减去头部和底部的高度
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* 当前会员状态 */}
          {isDonationMember && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-green-600 font-medium">
                  当前会员: {
                    membershipLevel === MembershipLevel.DONATION_THREE ? '捐赠会员（叁）' :
                    membershipLevel === MembershipLevel.DONATION_TWO ? '捐赠会员（贰）' :
                    membershipLevel === MembershipLevel.DONATION_ONE ? '捐赠会员（壹）' : '免费用户'
                  }
                </span>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* 标签页 */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'monthly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              }`}
              disabled={isProcessing}
            >
              月付
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'yearly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              }`}
              disabled={isProcessing}
            >
              年付 (更优惠)
            </button>
          </div>

          {/* 价格方案 */}
          <div className="space-y-4">
            {currentProducts.map((product) => (
              <div
                key={product.id}
                className={`border rounded-lg p-4 ${
                  product.isPopular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {product.isPopular && (
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full inline-block mb-2">
                    推荐
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-600">{product.displayPrice}</span>
                      {product.originalPrice && (
                        <span className="text-gray-400 line-through">{product.originalPrice}</span>
                      )}
                      <span className="text-gray-600">/{activeTab === 'monthly' ? '月' : '年'}</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {/* 基础功能（所有用户都有） */}
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="text-blue-500 mr-2">✓</span>
                    AI智能记账
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="text-blue-500 mr-2">✓</span>
                    高级统计分析
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="text-blue-500 mr-2">✓</span>
                    去除广告
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="text-blue-500 mr-2">✓</span>
                    数据导出功能
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="text-blue-500 mr-2">✓</span>
                    云端同步
                  </li>

                  {/* 会员专属功能 */}
                  {product.membershipTier === MembershipTier.DONATION_ONE ? (
                    <>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        {product.duration === 'P1M' ? '1000点/月会员记账点' : '1500点/月会员记账点'}
                      </li>
                    </>
                  ) : product.membershipTier === MembershipTier.DONATION_TWO ? (
                    <>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        {product.duration === 'P1M' ? '1000点/月会员记账点' : '1500点/月会员记账点'}
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        50%费用（税后）用于公益事业
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        获取公益署名权
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        {product.duration === 'P1M' ? '1000点/月会员记账点' : '1500点/月会员记账点'}
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        50%费用（税后）用于公益事业
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        获取公益署名权
                      </li>
                      <li className="flex items-center text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        优先客服支持
                      </li>
                    </>
                  )}
                </ul>

                <button
                  onClick={() => handlePurchase(product.id)}
                  disabled={isProcessing || !isInitialized}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    product.isPopular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${
                    (isProcessing && selectedPlan === product.id) || !isInitialized
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {isProcessing && selectedPlan === product.id ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">⏳</span>
                      处理中...
                    </span>
                  ) : (
                    '立即购买'
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* 恢复购买按钮 */}
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={handleRestorePurchases}
              disabled={isProcessing || !isInitialized}
              className="w-full py-2 px-4 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              恢复购买
            </button>
          </div>

          {/* 说明文字 */}
          <div className="mt-4 text-xs text-gray-500 text-center pb-8">
            <p>• 购买后立即生效，可在设置中管理订阅</p>
            <p>• 支持家庭共享，可与家人共享会员权益</p>
            <p>• 如有问题，请联系客服</p>
          </div>
        </div>
      </div>
    </div>
  );
}
