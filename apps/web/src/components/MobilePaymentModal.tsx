/**
 * 移动端支付模态框组件
 * 用于展示和处理App内购买和订阅
 */

import React, { useState, useEffect } from 'react';
import { useMobilePayment } from '../hooks/useMobilePayment';
import { MembershipLevel } from '../services/mobile-payment.service';
import {
  getSubscriptionProducts,
  getProductsByTier,
  MembershipTier
} from '../config/app-store-products';
import { Capacitor } from '@capacitor/core';

interface MobilePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (membershipLevel: MembershipLevel) => void;
  initialTab?: 'monthly' | 'yearly';
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  productId: string;
}

export function MobilePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'monthly'
}: MobilePaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>(initialTab);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // 安全地获取useMobilePayment数据
  let paymentData;
  let hookError: string | null = null;

  try {
    paymentData = useMobilePayment();
  } catch (error) {
    // 安全的错误处理，防止空错误对象导致无限循环
    let errorMsg = '支付系统不可用';

    if (!error) {
      errorMsg = '支付系统初始化时发生未知错误';
    } else if (error instanceof Error) {
      errorMsg = error.message || '支付系统初始化失败';
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else if (typeof error === 'object') {
      // 检查是否是空对象
      if (Object.keys(error).length === 0) {
        console.warn('💰 [MobilePaymentModal] 收到空错误对象，使用默认错误信息');
        errorMsg = '支付系统内部错误';
      } else {
        try {
          errorMsg = JSON.stringify(error);
        } catch {
          errorMsg = '支付系统配置错误';
        }
      }
    }

    console.error('💰 [MobilePaymentModal] useMobilePayment hook失败:', errorMsg);
    hookError = errorMsg;
    setRenderError(errorMsg);

    paymentData = {
      isInitialized: false,
      isLoading: false,
      error: errorMsg,
      offerings: [],
      membershipLevel: null,
      isDonationMember: false,
      isDonationOne: false,
      isDonationTwo: false,
      isDonationThree: false,
      purchaseProduct: async () => { throw new Error('支付系统不可用'); },
      restorePurchases: async () => { throw new Error('支付系统不可用'); },
      refreshCustomerInfo: async () => { throw new Error('支付系统不可用'); }
    };
  }

  const {
    isInitialized,
    isLoading,
    error,
    offerings,
    membershipLevel,
    isDonationMember,
    isDonationOne,
    isDonationTwo,
    isDonationThree,
    purchaseProduct,
    restorePurchases,
    refreshCustomerInfo
  } = paymentData;

  // 检查是否在移动端
  const isMobile = Capacitor.isNativePlatform();

  // 从RevenueCat Offerings获取价格方案
  const getPricingPlans = (): Record<'monthly' | 'yearly', PricingPlan[]> => {
    try {
      console.log('💰 [MobilePaymentModal] 开始获取价格方案');
      console.log('💰 [MobilePaymentModal] RevenueCat Offerings:', offerings);

      // 如果没有初始化或没有offerings数据，使用本地配置作为后备
      if (!isInitialized || !offerings || offerings.length === 0) {
        console.log('💰 [MobilePaymentModal] RevenueCat未初始化或无Offerings，使用本地配置');
        return getLocalPricingPlans();
      }

      // 使用RevenueCat的真实Offerings数据
      const monthlyPlans: PricingPlan[] = [];
      const yearlyPlans: PricingPlan[] = [];

      offerings.forEach(offering => {
        console.log('💰 [MobilePaymentModal] 处理Offering:', offering.identifier);

        if (offering.availablePackages) {
          offering.availablePackages.forEach(pkg => {
            console.log('💰 [MobilePaymentModal] 处理Package:', pkg.identifier, pkg.product);

            try {
              const product = pkg.product;
              if (!product) return;

              // 判断是月付还是年付
              const isYearly = product.subscriptionPeriod?.includes('P1Y') ||
                              product.identifier?.includes('yearly') ||
                              pkg.identifier?.includes('yearly') ||
                              pkg.identifier?.includes('Annual') ||
                              pkg.identifier?.includes('$rc_annual');

              // 根据Package ID确定产品名称和特性
              let productName = product.title || pkg.identifier;
              let isPopular = false;

              // 根据您提供的Package配置映射产品名称
              if (pkg.identifier === '$rc_monthly') {
                productName = '捐赠会员（壹）';
              } else if (pkg.identifier === 'Monthly2') {
                productName = '捐赠会员（贰）';
                isPopular = true; // 通常贰级会员比较受欢迎
              } else if (pkg.identifier === 'Monthly3') {
                productName = '捐赠会员（叁）';
              } else if (pkg.identifier === '$rc_annual') {
                productName = '年费捐赠会员（壹）';
              } else if (pkg.identifier === 'Annual2') {
                productName = '年费捐赠会员（贰）';
                isPopular = true;
              } else if (pkg.identifier === 'Annual3') {
                productName = '年费捐赠会员（叁）';
              }

              const plan: PricingPlan = {
                id: pkg.identifier,
                name: productName,
                price: product.priceString || '¥0',
                originalPrice: undefined, // RevenueCat会处理原价显示
                period: isYearly ? '每年' : '每月',
                features: getFeaturesByPackageId(pkg.identifier, isYearly),
                isPopular: isPopular,
                productId: product.identifier
              };

              if (isYearly) {
                yearlyPlans.push(plan);
              } else {
                monthlyPlans.push(plan);
              }

              console.log('💰 [MobilePaymentModal] 转换后的计划:', plan);
            } catch (convertError) {
              console.error('💰 [MobilePaymentModal] 转换Package失败:', convertError, 'Package:', pkg);
            }
          });
        }
      });

      const result = {
        monthly: monthlyPlans,
        yearly: yearlyPlans
      };

      console.log('💰 [MobilePaymentModal] 最终价格方案:', result);
      return result;
    } catch (error) {
      console.error('💰 [MobilePaymentModal] 获取价格方案失败:', error);

      // 发生错误时使用本地配置作为后备
      return getLocalPricingPlans();
    }
  };

  // 本地配置作为后备方案
  const getLocalPricingPlans = (): Record<'monthly' | 'yearly', PricingPlan[]> => {
    try {
      const subscriptionProducts = getSubscriptionProducts();
      console.log('💰 [MobilePaymentModal] 使用本地配置，产品数量:', subscriptionProducts.length);

      const monthlyProducts = subscriptionProducts.filter(p => p.duration === 'P1M');
      const yearlyProducts = subscriptionProducts.filter(p => p.duration === 'P1Y');

      const convertToPricingPlan = (product: any): PricingPlan => ({
        id: product.id,
        name: product.name,
        price: product.displayPrice,
        originalPrice: product.originalPrice || undefined,
        period: product.duration === 'P1M' ? '每月' : '每年',
        features: getFeaturesByTier(product.membershipTier, product.duration === 'P1Y'),
        isPopular: product.isPopular || false,
        productId: product.id
      });

      return {
        monthly: monthlyProducts.map(convertToPricingPlan),
        yearly: yearlyProducts.map(convertToPricingPlan)
      };
    } catch (error) {
      console.error('💰 [MobilePaymentModal] 本地配置也失败:', error);
      return { monthly: [], yearly: [] };
    }
  };

  // 根据Package标识符获取功能列表
  const getFeaturesByPackageId = (packageId: string, isYearly: boolean = false): string[] => {
    try {
      console.log('💰 [MobilePaymentModal] 根据Package获取功能列表:', { packageId, isYearly });

      const baseFeatures = [
        'AI智能记账',
        '高级统计分析',
        '去除广告',
        '数据导出功能',
        '云端同步'
      ];

      // 根据订阅周期确定记账点数量
      const monthlyPoints = isYearly ? '1500点/月会员记账点' : '1000点/月会员记账点';

      let features: string[] = [];

      // 根据Package ID判断会员级别
      if (packageId.includes('$rc_monthly') || packageId.includes('Monthly') || packageId.includes('one')) {
        // 捐赠会员（壹）
        features = [
          ...baseFeatures,
          monthlyPoints
        ];
      } else if (packageId.includes('Monthly2') || packageId.includes('Annual2') || packageId.includes('two')) {
        // 捐赠会员（贰）
        features = [
          ...baseFeatures,
          monthlyPoints,
          '50%费用（税后）用于公益事业',
          '获取公益署名权'
        ];
      } else if (packageId.includes('Monthly3') || packageId.includes('Annual3') || packageId.includes('three')) {
        // 捐赠会员（叁）
        features = [
          ...baseFeatures,
          monthlyPoints,
          '50%费用（税后）用于公益事业',
          '获取公益署名权',
          '优先客服支持'
        ];
      } else {
        // 默认功能
        features = [...baseFeatures, monthlyPoints];
      }

      console.log('💰 [MobilePaymentModal] 生成的功能列表:', features);
      return features;
    } catch (error) {
      console.error('💰 [MobilePaymentModal] 获取功能列表失败:', error);

      // 返回基础功能作为后备
      return [
        'AI智能记账',
        '高级统计分析',
        '去除广告',
        '数据导出功能',
        '云端同步',
        '1000点/月会员记账点'
      ];
    }
  };

  // 根据会员级别和订阅周期获取功能列表（保持向后兼容）
  const getFeaturesByTier = (tier: MembershipTier, isYearly: boolean = false): string[] => {
    try {
      console.log('💰 [MobilePaymentModal] 获取功能列表:', { tier, isYearly });

      const baseFeatures = [
        'AI智能记账',
        '高级统计分析',
        '去除广告',
        '数据导出功能',
        '云端同步'
      ];

      // 根据订阅周期确定记账点数量
      const monthlyPoints = isYearly ? '1500点/月会员记账点' : '1000点/月会员记账点';

      let features: string[] = [];

      switch (tier) {
        case MembershipTier.DONATION_ONE:
          features = [
            ...baseFeatures,
            monthlyPoints
          ];
          break;
        case MembershipTier.DONATION_TWO:
          features = [
            ...baseFeatures,
            monthlyPoints,
            '50%费用（税后）用于公益事业',
            '获取公益署名权'
          ];
          break;
        case MembershipTier.DONATION_THREE:
          features = [
            ...baseFeatures,
            monthlyPoints,
            '50%费用（税后）用于公益事业',
            '获取公益署名权',
            '优先客服支持'
          ];
          break;
        default:
          features = baseFeatures;
          break;
      }

      console.log('💰 [MobilePaymentModal] 生成的功能列表:', features);
      return features;
    } catch (error) {
      console.error('💰 [MobilePaymentModal] 获取功能列表失败:', error);

      // 返回基础功能作为后备
      return [
        'AI智能记账',
        '高级统计分析',
        '去除广告',
        '数据导出功能',
        '云端同步'
      ];
    }
  };

  // 获取默认功能列表（用于RevenueCat Offerings）
  const getDefaultFeatures = (isYearly: boolean = false): string[] => {
    const baseFeatures = [
      'AI智能记账',
      '高级统计分析',
      '去除广告',
      '数据导出功能',
      '云端同步'
    ];

    const monthlyPoints = isYearly ? '1500点/月会员记账点' : '1000点/月会员记账点';

    return [...baseFeatures, monthlyPoints];
  };

  // 处理购买
  const handlePurchase = async (plan: PricingPlan) => {
    if (!isMobile) {
      alert('App内购买仅在移动端应用中可用');
      return;
    }

    if (!isInitialized) {
      alert('支付系统未初始化，请稍后重试');
      return;
    }

    setIsProcessing(true);
    setSelectedPlan(plan.id);

    try {
      console.log('💰 [MobilePaymentModal] 开始购买:', { planId: plan.id, productId: plan.productId });

      // 如果使用RevenueCat Offerings，应该使用Package ID进行购买
      let purchaseId = plan.productId;

      // 检查是否是RevenueCat Package ID
      if (plan.id.includes('$rc_') || plan.id.includes('Monthly') || plan.id.includes('Annual')) {
        // 使用Package ID购买
        purchaseId = plan.id;
        console.log('💰 [MobilePaymentModal] 使用Package ID购买:', purchaseId);
      } else {
        // 使用Product ID购买
        console.log('💰 [MobilePaymentModal] 使用Product ID购买:', purchaseId);
      }

      await purchaseProduct(purchaseId);

      // 购买成功后刷新客户信息
      await refreshCustomerInfo();

      // 等待一段时间让后端同步完成，然后再调用成功回调
      console.log('💰 [MobilePaymentModal] 等待后端同步完成...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

      // 调用成功回调
      if (onSuccess) {
        let newLevel = MembershipLevel.FREE;

        // 根据Package ID或Product ID确定会员级别
        if (plan.id.includes('$rc_monthly') || plan.id.includes('$rc_annual') ||
            plan.id.includes('donation.one') || plan.name.includes('壹')) {
          newLevel = MembershipLevel.DONATION_ONE;
        } else if (plan.id.includes('Monthly2') || plan.id.includes('Annual2') ||
                   plan.id.includes('donation.two') || plan.name.includes('贰')) {
          newLevel = MembershipLevel.DONATION_TWO;
        } else if (plan.id.includes('Monthly3') || plan.id.includes('Annual3') ||
                   plan.id.includes('donation.three') || plan.name.includes('叁')) {
          newLevel = MembershipLevel.DONATION_THREE;
        }

        console.log('💰 [MobilePaymentModal] 购买成功，会员级别:', newLevel);
        onSuccess(newLevel);
      }

      onClose();

      // 显示成功消息
      alert('购买成功！会员权益已激活。');
      
    } catch (error) {
      console.error('购买失败:', error);

      // 安全的错误处理
      let errorMessage = '购买失败，请重试';

      if (error instanceof Error) {
        if (error.message.includes('取消')) {
          // 用户取消购买，不显示错误
          return;
        }
        errorMessage = `购买失败: ${error.message}`;
      } else if (error && typeof error === 'object') {
        // 处理空对象或其他对象类型的错误
        if (Object.keys(error).length === 0) {
          errorMessage = '购买失败: 支付系统错误，请稍后重试';
        } else {
          errorMessage = `购买失败: ${JSON.stringify(error)}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = `购买失败: ${error}`;
      }

      setModalError(errorMessage);
      alert(errorMessage);
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

  // 如果有渲染错误，显示错误界面
  if (renderError) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
        <div className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 text-red-600">支付系统错误</h2>
          <p className="text-gray-600 mb-4">{renderError}</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  let pricingPlansData;
  let currentPlans;

  try {
    pricingPlansData = getPricingPlans();
    currentPlans = pricingPlansData[activeTab] || [];
  } catch (planError) {
    console.error('💰 [MobilePaymentModal] 获取价格计划失败:', planError);
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
        <div className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 text-red-600">价格信息加载失败</h2>
          <p className="text-gray-600 mb-4">无法加载产品价格信息，请稍后重试。</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  // 调试信息
  console.log('💰 [MobilePaymentModal] 渲染状态:', {
    isOpen,
    activeTab,
    currentPlansCount: currentPlans.length,
    isInitialized,
    error,
    isMobile
  });

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
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 产品加载失败提示 */}
          {currentPlans.length === 0 && !error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-600">
                暂无可用的订阅产品，请稍后重试或联系客服
              </p>
            </div>
          )}

          {/* 当前会员状态 */}
          {isDonationMember && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-green-600 font-medium">
                  当前会员: {
                    isDonationThree ? '捐赠会员（叁）' :
                    isDonationTwo ? '捐赠会员（贰）' :
                    isDonationOne ? '捐赠会员（壹）' : '捐赠会员'
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
            {currentPlans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 ${
                  plan.isPopular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {plan.isPopular && (
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full inline-block mb-2">
                    推荐
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-600">{plan.price}</span>
                      {plan.originalPrice && (
                        <span className="text-gray-400 line-through">{plan.originalPrice}</span>
                      )}
                      <span className="text-gray-600">/{plan.period}</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(plan)}
                  disabled={isProcessing || !isInitialized}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.isPopular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${
                    (isProcessing && selectedPlan === plan.id) || !isInitialized
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {isProcessing && selectedPlan === plan.id ? (
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
