/**
 * 移动端支付Hook
 * 提供App内购买和订阅功能的React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  mobilePaymentService,
  MembershipLevel
} from '../services/mobile-payment.service';
import {
  ENTITLEMENTS,
  getSubscriptionProducts
} from '../config/app-store-products';
import { Capacitor } from '@capacitor/core';

interface PurchasesOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: PurchasesPackage[];
}

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: PurchasesStoreProduct;
  offeringIdentifier: string;
}

interface PurchasesStoreProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

interface CustomerInfo {
  originalAppUserId: string;
  allPurchaseDates: { [key: string]: string };
  activeSubscriptions: string[];
  allExpirationDates: { [key: string]: string };
  entitlements: {
    active: { [key: string]: any };
    all: { [key: string]: any };
  };
}

interface UseMobilePaymentReturn {
  // 状态
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  offerings: PurchasesOffering[];
  customerInfo: CustomerInfo | null;
  membershipLevel: MembershipLevel;

  // 权益检查
  isDonationMember: boolean;
  isDonationOne: boolean;
  isDonationTwo: boolean;
  isDonationThree: boolean;
  hasMonthlyPoints: boolean;
  hasAdvancedAnalytics: boolean;
  hasCloudSync: boolean;
  hasCharityAttribution: boolean;
  hasPrioritySupport: boolean;

  // 方法
  initialize: (apiKey: string, userId?: string) => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<void>;
  purchasePackage: (packageObj: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  setUserId: (userId: string) => Promise<void>;
  logOut: () => Promise<void>;

  // 便捷方法
  purchaseDonationOneMonthly: () => Promise<void>;
  purchaseDonationOneYearly: () => Promise<void>;
  purchaseDonationTwoMonthly: () => Promise<void>;
  purchaseDonationTwoYearly: () => Promise<void>;
  purchaseDonationThreeMonthly: () => Promise<void>;
  purchaseDonationThreeYearly: () => Promise<void>;
}

export function useMobilePayment(): UseMobilePaymentReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [membershipLevel, setMembershipLevel] = useState<MembershipLevel>(MembershipLevel.FREE);

  // 检查是否在移动端环境（包括模拟器）
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const isMobile = isNative || platform === 'ios' || platform === 'android';

  // 调试信息（仅在客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔄 [useMobilePayment] 环境检测:', {
        platform,
        isNative,
        isMobile,
        capacitorAvailable: !!(window as any).Capacitor
      });
    }
  }, [platform, isNative, isMobile]);

  /**
   * 安全的错误处理函数
   */
  const handleSafeError = useCallback((error: any, context: string): string => {
    // 处理空错误对象
    if (!error) {
      return `${context}: 未知错误`;
    }

    if (error instanceof Error) {
      return `${context}: ${error.message || '未知错误'}`;
    }

    if (typeof error === 'string') {
      return `${context}: ${error}`;
    }

    if (typeof error === 'object') {
      // 检查是否是空对象
      if (Object.keys(error).length === 0) {
        console.warn(`🔄 [useMobilePayment] ${context} 收到空错误对象，使用默认错误信息`);
        return `${context}: 系统内部错误`;
      }

      try {
        return `${context}: ${JSON.stringify(error)}`;
      } catch {
        return `${context}: 无法解析的错误对象`;
      }
    }

    return `${context}: 未知类型错误`;
  }, []);

  /**
   * 初始化RevenueCat
   */
  const initialize = useCallback(async (apiKey: string, userId?: string) => {
    if (!isMobile) {
      console.log('🔄 [useMobilePayment] 非移动端环境，跳过初始化');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await mobilePaymentService.initialize(apiKey, userId);
      setIsInitialized(true);
      
      // 初始化后立即加载产品和客户信息
      await Promise.all([
        loadOfferings(),
        refreshCustomerInfo()
      ]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败';
      setError(errorMessage);
      console.error('🔄 [useMobilePayment] 初始化失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  /**
   * 加载产品套餐
   */
  const loadOfferings = useCallback(async () => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const offeringsData = await mobilePaymentService.getOfferings();
      setOfferings(offeringsData);
    } catch (err) {
      // 使用安全的错误处理函数
      let errorMessage = handleSafeError(err, '加载产品失败');

      // 检查是否是RevenueCat配置问题
      if (err instanceof Error && err.message) {
        if (err.message.includes('offerings') ||
            err.message.includes('configuration') ||
            err.message.includes('Error 23')) {
          console.warn('🔄 [useMobilePayment] RevenueCat Dashboard配置问题，但支付系统仍可使用:', err);
          errorMessage = 'RevenueCat Dashboard需要配置产品，请联系开发者';
        }
      }

      setError(errorMessage);
      console.error('🔄 [useMobilePayment]', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isMobile, handleSafeError]);

  /**
   * 购买产品
   */
  const purchaseProduct = useCallback(async (productId: string) => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      throw new Error('移动端支付服务未就绪');
    }

    setIsLoading(true);
    setError(null);

    try {
      await mobilePaymentService.purchaseProduct(productId);
      await refreshCustomerInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '购买失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  /**
   * 购买套餐
   */
  const purchasePackage = useCallback(async (packageObj: PurchasesPackage) => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      throw new Error('移动端支付服务未就绪');
    }

    setIsLoading(true);
    setError(null);

    try {
      await mobilePaymentService.purchasePackage(packageObj);
      await refreshCustomerInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '购买失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  /**
   * 恢复购买
   */
  const restorePurchases = useCallback(async () => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      throw new Error('移动端支付服务未就绪');
    }

    setIsLoading(true);
    setError(null);

    try {
      const customerInfo = await mobilePaymentService.restorePurchases();
      setCustomerInfo(customerInfo);
      
      // 更新会员级别
      const level = await mobilePaymentService.getMembershipLevel();
      setMembershipLevel(level);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复购买失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  /**
   * 刷新客户信息
   */
  const refreshCustomerInfo = useCallback(async () => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      return;
    }

    try {
      // 获取客户信息
      const customerInfo = await mobilePaymentService.refreshCustomerInfo();
      setCustomerInfo(customerInfo);

      try {
        // 更新会员级别（单独try-catch，防止影响页面渲染）
        const level = await mobilePaymentService.getMembershipLevel();
        setMembershipLevel(level);
        console.log('🔄 [useMobilePayment] 会员级别更新成功:', level);
      } catch (levelErr) {
        // 使用安全的错误处理
        const errorMessage = handleSafeError(levelErr, '获取会员级别失败');
        console.error('🔄 [useMobilePayment]', errorMessage);

        // 默认设置为FREE级别，确保UI能正常显示
        setMembershipLevel(MembershipLevel.FREE);
      }
    } catch (err) {
      const errorMessage = handleSafeError(err, '刷新客户信息失败');
      console.error('🔄 [useMobilePayment]', errorMessage);
      // 不设置错误状态，避免阻止页面渲染
    }
  }, [isMobile, handleSafeError]);

  /**
   * 设置用户ID
   */
  const setUserId = useCallback(async (userId: string) => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await mobilePaymentService.setUserId(userId);
      await refreshCustomerInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '设置用户ID失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isMobile, refreshCustomerInfo]);

  /**
   * 登出用户
   */
  const logOut = useCallback(async () => {
    if (!isMobile || !mobilePaymentService.isReady()) {
      return;
    }

    try {
      await mobilePaymentService.logOut();
      setCustomerInfo(null);
      setMembershipLevel(MembershipLevel.FREE);
    } catch (err) {
      console.error('🔄 [useMobilePayment] 登出失败:', err);
    }
  }, [isMobile]);

  // 便捷购买方法 - 使用配置文件中的产品ID
  const purchaseDonationOneMonthly = useCallback(() => {
    const product = getSubscriptionProducts().find(p =>
      p.membershipTier === MembershipLevel.DONATION_ONE && p.duration === 'P1M'
    );
    return product ? purchaseProduct(product.id) : Promise.reject('产品未找到');
  }, [purchaseProduct]);

  const purchaseDonationOneYearly = useCallback(() => {
    const product = getSubscriptionProducts().find(p =>
      p.membershipTier === MembershipLevel.DONATION_ONE && p.duration === 'P1Y'
    );
    return product ? purchaseProduct(product.id) : Promise.reject('产品未找到');
  }, [purchaseProduct]);

  const purchaseDonationTwoMonthly = useCallback(() => {
    const product = getSubscriptionProducts().find(p =>
      p.membershipTier === MembershipLevel.DONATION_TWO && p.duration === 'P1M'
    );
    return product ? purchaseProduct(product.id) : Promise.reject('产品未找到');
  }, [purchaseProduct]);

  const purchaseDonationTwoYearly = useCallback(() => {
    const product = getSubscriptionProducts().find(p =>
      p.membershipTier === MembershipLevel.DONATION_TWO && p.duration === 'P1Y'
    );
    return product ? purchaseProduct(product.id) : Promise.reject('产品未找到');
  }, [purchaseProduct]);

  const purchaseDonationThreeMonthly = useCallback(() => {
    const product = getSubscriptionProducts().find(p =>
      p.membershipTier === MembershipLevel.DONATION_THREE && p.duration === 'P1M'
    );
    return product ? purchaseProduct(product.id) : Promise.reject('产品未找到');
  }, [purchaseProduct]);

  const purchaseDonationThreeYearly = useCallback(() => {
    const product = getSubscriptionProducts().find(p =>
      p.membershipTier === MembershipLevel.DONATION_THREE && p.duration === 'P1Y'
    );
    return product ? purchaseProduct(product.id) : Promise.reject('产品未找到');
  }, [purchaseProduct]);

  // 权益检查
  const isDonationMember = [MembershipLevel.DONATION_ONE, MembershipLevel.DONATION_TWO, MembershipLevel.DONATION_THREE].includes(membershipLevel);
  const isDonationOne = membershipLevel === MembershipLevel.DONATION_ONE;
  const isDonationTwo = membershipLevel === MembershipLevel.DONATION_TWO;
  const isDonationThree = membershipLevel === MembershipLevel.DONATION_THREE;

  // 安全的权益检查，使用正确的RevenueCat权益路径 (entitlements.all)
  const hasMonthlyPoints = (customerInfo?.entitlements?.all?.[ENTITLEMENTS.MONTHLY_POINTS_1000]?.isActive ||
                          customerInfo?.entitlements?.all?.[ENTITLEMENTS.MONTHLY_POINTS_1500]?.isActive) || false;
  const hasAdvancedAnalytics = customerInfo?.entitlements?.all?.[ENTITLEMENTS.ADVANCED_ANALYTICS]?.isActive || false;
  const hasCloudSync = customerInfo?.entitlements?.all?.[ENTITLEMENTS.CLOUD_SYNC]?.isActive || false;
  const hasCharityAttribution = customerInfo?.entitlements?.all?.[ENTITLEMENTS.CHARITY_ATTRIBUTION]?.isActive || false;
  const hasPrioritySupport = customerInfo?.entitlements?.all?.[ENTITLEMENTS.PRIORITY_SUPPORT]?.isActive || false;

  // 自动初始化支付系统
  useEffect(() => {
    const initializePaymentSystem = async () => {
      if (!isMobile) {
        console.log('🔄 [useMobilePayment] 非移动端环境，设置默认状态');
        setIsInitialized(false);
        setIsLoading(false);
        setError('当前环境不支持移动端支付功能');
        return;
      }

      // 检查是否已经初始化
      if (isInitialized) {
        console.log('🔄 [useMobilePayment] 已经初始化，跳过');
        return;
      }

      // 检查API密钥
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
      if (!apiKey) {
        console.error('🔄 [useMobilePayment] RevenueCat API密钥未配置');
        setError('RevenueCat API密钥未配置');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔄 [useMobilePayment] 开始自动初始化支付系统');
        setIsLoading(true);

        // 等待Capacitor完全加载
        if (window.Capacitor) {
          console.log('🔄 [useMobilePayment] 等待Capacitor插件加载...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await initialize(apiKey);
        console.log('🔄 [useMobilePayment] 支付系统初始化成功');
      } catch (error) {
        // 使用安全的错误处理函数
        const errorMessage = handleSafeError(error, '支付系统初始化失败');
        console.error('🔄 [useMobilePayment]', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    // 延迟初始化，确保页面完全加载
    const timer = setTimeout(initializePaymentSystem, 100);
    return () => clearTimeout(timer);
  }, [isMobile, isInitialized, initialize, handleSafeError]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理逻辑（如果需要）
    };
  }, []);

  return {
    // 状态
    isInitialized,
    isLoading,
    error,
    offerings,
    customerInfo,
    membershipLevel,

    // 权益检查
    isDonationMember,
    isDonationOne,
    isDonationTwo,
    isDonationThree,
    hasMonthlyPoints,
    hasAdvancedAnalytics,
    hasCloudSync,
    hasCharityAttribution,
    hasPrioritySupport,

    // 方法
    initialize,
    loadOfferings,
    purchaseProduct,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    setUserId,
    logOut,

    // 便捷方法
    purchaseDonationOneMonthly,
    purchaseDonationOneYearly,
    purchaseDonationTwoMonthly,
    purchaseDonationTwoYearly,
    purchaseDonationThreeMonthly,
    purchaseDonationThreeYearly,
  };
}
