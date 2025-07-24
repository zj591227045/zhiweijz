/**
 * 支付Hook - Web应用本地版本
 * 简化版本，主要用于Web端测试和展示
 */

import { useState, useEffect } from 'react';
import { MembershipLevel, ENTITLEMENTS, type MembershipLevelValue } from '../lib/payment-config';

// 模拟的客户信息接口
interface MockCustomerInfo {
  entitlements: {
    active: Record<string, { isActive: boolean }>;
  };
  activeSubscriptions: string[];
  originalPurchaseDate: string | null;
}

// Hook返回类型
interface UsePaymentReturn {
  // 基本状态
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 会员状态
  membershipLevel: MembershipLevelValue;
  
  // 会员级别检查
  isDonationMember: boolean;
  isDonationTwo: boolean;
  isDonationThree: boolean;
  
  // 权益检查
  hasMonthlyPoints1000: boolean;
  hasMonthlyPoints1500: boolean;
  hasCharityAttribution: boolean;
  hasPrioritySupport: boolean;
  hasAiSmartAccounting: boolean;
  hasAdvancedAnalytics: boolean;
  
  // 操作方法
  initialize: (apiKey: string) => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<void>;
}

export function usePayment(): UsePaymentReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<MockCustomerInfo | null>(null);

  // 初始化函数
  const initialize = async (apiKey: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 模拟初始化过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟获取客户信息
      const mockCustomerInfo: MockCustomerInfo = {
        entitlements: {
          active: {}
        },
        activeSubscriptions: [],
        originalPurchaseDate: null
      };
      
      setCustomerInfo(mockCustomerInfo);
      setIsInitialized(true);
      
      console.log('🎉 [Payment] 支付系统初始化成功 (模拟模式)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败';
      setError(errorMessage);
      console.error('❌ [Payment] 支付系统初始化失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新客户信息
  const refreshCustomerInfo = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 模拟刷新过程
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔄 [Payment] 客户信息刷新成功 (模拟模式)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刷新失败';
      setError(errorMessage);
      console.error('❌ [Payment] 刷新客户信息失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 恢复购买
  const restorePurchases = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 模拟恢复过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔄 [Payment] 购买恢复成功 (模拟模式)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复购买失败';
      setError(errorMessage);
      console.error('❌ [Payment] 恢复购买失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 购买产品
  const purchaseProduct = async (productId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 模拟购买过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟购买成功，更新客户信息
      if (customerInfo) {
        const updatedCustomerInfo = {
          ...customerInfo,
          entitlements: {
            active: {
              ...customerInfo.entitlements.active,
              [ENTITLEMENTS.DONATION_ONE_FEATURES]: { isActive: true },
              [ENTITLEMENTS.MONTHLY_POINTS_1000]: { isActive: true }
            }
          },
          activeSubscriptions: [productId]
        };
        setCustomerInfo(updatedCustomerInfo);
      }
      
      console.log('🎉 [Payment] 购买成功 (模拟模式):', productId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '购买失败';
      setError(errorMessage);
      console.error('❌ [Payment] 购买失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 计算会员级别
  const membershipLevel = (() => {
    if (!customerInfo) return MembershipLevel.FREE;
    
    const { active } = customerInfo.entitlements;
    
    if (active[ENTITLEMENTS.DONATION_THREE_FEATURES]?.isActive) {
      return MembershipLevel.DONATION_THREE;
    }
    if (active[ENTITLEMENTS.DONATION_TWO_FEATURES]?.isActive) {
      return MembershipLevel.DONATION_TWO;
    }
    if (active[ENTITLEMENTS.DONATION_ONE_FEATURES]?.isActive) {
      return MembershipLevel.DONATION_ONE;
    }
    
    return MembershipLevel.FREE;
  })();

  // 会员级别检查
  const isDonationMember = membershipLevel !== MembershipLevel.FREE;
  const isDonationTwo = membershipLevel === MembershipLevel.DONATION_TWO || membershipLevel === MembershipLevel.DONATION_THREE;
  const isDonationThree = membershipLevel === MembershipLevel.DONATION_THREE;

  // 权益检查
  const hasMonthlyPoints1000 = customerInfo?.entitlements.active[ENTITLEMENTS.MONTHLY_POINTS_1000]?.isActive || false;
  const hasMonthlyPoints1500 = customerInfo?.entitlements.active[ENTITLEMENTS.MONTHLY_POINTS_1500]?.isActive || false;
  const hasCharityAttribution = customerInfo?.entitlements.active[ENTITLEMENTS.CHARITY_ATTRIBUTION]?.isActive || false;
  const hasPrioritySupport = customerInfo?.entitlements.active[ENTITLEMENTS.PRIORITY_SUPPORT]?.isActive || false;
  
  // 基础功能权益（所有用户都有）
  const hasAiSmartAccounting = true;
  const hasAdvancedAnalytics = true;

  // 自动初始化
  useEffect(() => {
    if (!isInitialized && process.env.NEXT_PUBLIC_REVENUECAT_API_KEY) {
      initialize(process.env.NEXT_PUBLIC_REVENUECAT_API_KEY);
    }
  }, [isInitialized]);

  return {
    // 基本状态
    isInitialized,
    isLoading,
    error,
    
    // 会员状态
    membershipLevel,
    
    // 会员级别检查
    isDonationMember,
    isDonationTwo,
    isDonationThree,
    
    // 权益检查
    hasMonthlyPoints1000,
    hasMonthlyPoints1500,
    hasCharityAttribution,
    hasPrioritySupport,
    hasAiSmartAccounting,
    hasAdvancedAnalytics,
    
    // 操作方法
    initialize,
    refreshCustomerInfo,
    restorePurchases,
    purchaseProduct,
  };
}
