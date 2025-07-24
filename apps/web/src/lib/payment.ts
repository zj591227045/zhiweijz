/**
 * 支付功能统一导出模块 - Web应用版本
 * 提供支付相关的所有功能和配置
 */

// 导入本地配置和Hook
export {
  ProductType,
  SubscriptionPeriod,
  MembershipLevel,
  MembershipTier,
  ENTITLEMENTS,
  REVENUECAT_CONFIG,
  APP_STORE_PRODUCTS,
  getActiveProducts,
  getProductById,
  getProductsByTier,
  getSubscriptionProducts,
  getProductsSorted,
  getPopularProducts,
  hasEntitlement,
  validateProductConfig,
  getPaymentSystemStatus
} from './payment-config';

export { usePayment as useMobilePayment } from '../hooks/usePayment';

// 导入类型定义
export type {
  AppStoreProduct,
  ProductTypeValue,
  SubscriptionPeriodValue,
  MembershipLevelValue,
  MembershipTierValue
} from './payment-config';

// 模拟的支付服务（用于Web端测试）
export const mobilePaymentService = {
  isReady: () => true,
  initialize: async (apiKey: string) => {
    console.log('🎉 [MobilePaymentService] 初始化成功 (模拟模式)');
  },
  setUserId: async (userId: string) => {
    console.log('👤 [MobilePaymentService] 设置用户ID:', userId);
  },
  logOut: async () => {
    console.log('👋 [MobilePaymentService] 用户登出');
  }
};

// 模拟的支付API服务
export const PaymentApiService = {
  async getCustomerInfo(userId: string) {
    console.log('📊 [PaymentApiService] 获取客户信息 (模拟模式):', userId);
    return {
      userId,
      membershipLevel: MembershipLevel.FREE,
      entitlements: [],
      subscriptions: []
    };
  }
};
