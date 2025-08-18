/**
 * 支付配置 - Web应用本地版本
 * 从支付模块复制的配置，避免跨模块导入问题
 */

// 产品类型枚举
export const ProductType = {
  SUBSCRIPTION: 'subscription',
  NON_CONSUMABLE: 'non_consumable',
} as const;

export type ProductTypeValue = typeof ProductType[keyof typeof ProductType];

// 订阅周期枚举
export const SubscriptionPeriod = {
  MONTHLY: 'P1M',
  YEARLY: 'P1Y',
} as const;

export type SubscriptionPeriodValue = typeof SubscriptionPeriod[keyof typeof SubscriptionPeriod];

// 会员级别枚举
export const MembershipLevel = {
  FREE: 'free',
  DONATION_ONE: 'donation_one',
  DONATION_TWO: 'donation_two',
  DONATION_THREE: 'donation_three',
} as const;

export type MembershipLevelValue = typeof MembershipLevel[keyof typeof MembershipLevel];

// 会员等级枚举
export const MembershipTier = {
  DONATION_ONE: 'donation_one',
  DONATION_TWO: 'donation_two',
  DONATION_THREE: 'donation_three',
} as const;

export type MembershipTierValue = typeof MembershipTier[keyof typeof MembershipTier];

// 权益标识符
export const ENTITLEMENTS = {
  // 会员级别权益
  DONATION_ONE_FEATURES: 'donation_one_features',
  DONATION_TWO_FEATURES: 'donation_two_features',
  DONATION_THREE_FEATURES: 'donation_three_features',
  
  // 具体功能权益
  MONTHLY_POINTS_1000: 'monthly_points_1000',
  MONTHLY_POINTS_1500: 'monthly_points_1500',
  CHARITY_ATTRIBUTION: 'charity_attribution',
  PRIORITY_SUPPORT: 'priority_support',
  
  // 基础功能权益（所有用户可用，无需在RevenueCat中配置）
  AI_SMART_ACCOUNTING: 'ai_smart_accounting',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AD_FREE: 'ad_free',
  DATA_EXPORT: 'data_export',
  CLOUD_SYNC: 'cloud_sync'
} as const;

// App Store产品接口
export interface AppStoreProduct {
  id: string;
  name: string;
  description: string;
  type: ProductTypeValue;
  membershipTier: MembershipTierValue;
  duration?: SubscriptionPeriodValue;
  displayPrice: string;
  originalPrice?: string;
  discountPercentage?: number;
  isPopular?: boolean;
  entitlements: string[];
  metadata?: Record<string, any>;
}

// App Store产品配置
export const APP_STORE_PRODUCTS: AppStoreProduct[] = [
  // 捐赠会员（壹）月付
  {
    id: 'cn.jacksonz.zhiweijz.donation.one.monthly',
    name: '捐赠会员（壹）',
    description: '支持应用发展，获得更多记账点数',
    type: ProductType.SUBSCRIPTION,
    membershipTier: MembershipTier.DONATION_ONE,
    duration: SubscriptionPeriod.MONTHLY,
    displayPrice: '¥5',
    entitlements: [
      ENTITLEMENTS.DONATION_ONE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1000
    ],
  },
  
  // 捐赠会员（贰）月付
  {
    id: 'cn.jacksonz.zhiweijz.donation.two.monthly',
    name: '捐赠会员（贰）',
    description: '支持公益事业，获得署名权',
    type: ProductType.SUBSCRIPTION,
    membershipTier: MembershipTier.DONATION_TWO,
    duration: SubscriptionPeriod.MONTHLY,
    displayPrice: '¥10',
    isPopular: true,
    entitlements: [
      ENTITLEMENTS.DONATION_TWO_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1000,
      ENTITLEMENTS.CHARITY_ATTRIBUTION
    ],
  },
  
  // 捐赠会员（叁）月付
  {
    id: 'cn.jacksonz.zhiweijz.donation.three.monthly',
    name: '捐赠会员（叁）',
    description: '全面支持，享受优先客服',
    type: ProductType.SUBSCRIPTION,
    membershipTier: MembershipTier.DONATION_THREE,
    duration: SubscriptionPeriod.MONTHLY,
    displayPrice: '¥15',
    entitlements: [
      ENTITLEMENTS.DONATION_THREE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1000,
      ENTITLEMENTS.CHARITY_ATTRIBUTION,
      ENTITLEMENTS.PRIORITY_SUPPORT
    ],
  },
  
  // 年费捐赠会员（壹）
  {
    id: 'cn.jacksonz.zhiweijz.donation.one.yearly',
    name: '年费捐赠会员（壹）',
    description: '年付更优惠，获得更多记账点数',
    type: ProductType.SUBSCRIPTION,
    membershipTier: MembershipTier.DONATION_ONE,
    duration: SubscriptionPeriod.YEARLY,
    displayPrice: '¥55',
    originalPrice: '¥60',
    discountPercentage: 8,
    entitlements: [
      ENTITLEMENTS.DONATION_ONE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1500
    ],
  },
  
  // 年费捐赠会员（贰）
  {
    id: 'cn.jacksonz.zhiweijz.donation.two.yearly',
    name: '年费捐赠会员（贰）',
    description: '年付支持公益，获得署名权',
    type: ProductType.SUBSCRIPTION,
    membershipTier: MembershipTier.DONATION_TWO,
    duration: SubscriptionPeriod.YEARLY,
    displayPrice: '¥110',
    originalPrice: '¥120',
    discountPercentage: 8,
    entitlements: [
      ENTITLEMENTS.DONATION_TWO_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1500,
      ENTITLEMENTS.CHARITY_ATTRIBUTION
    ],
  },
  
  // 年费捐赠会员（叁）
  {
    id: 'cn.jacksonz.zhiweijz.donation.three.yearly',
    name: '年费捐赠会员（叁）',
    description: '年付全面支持，享受优先客服',
    type: ProductType.SUBSCRIPTION,
    membershipTier: MembershipTier.DONATION_THREE,
    duration: SubscriptionPeriod.YEARLY,
    displayPrice: '¥165',
    originalPrice: '¥180',
    discountPercentage: 8,
    entitlements: [
      ENTITLEMENTS.DONATION_THREE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1500,
      ENTITLEMENTS.CHARITY_ATTRIBUTION,
      ENTITLEMENTS.PRIORITY_SUPPORT
    ],
  },
];

// RevenueCat配置（仅iOS使用）
export const REVENUECAT_CONFIG = {
  // iOS API密钥
  iosApiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || '',

  // 向后兼容的通用API密钥（与iOS密钥相同）
  apiKey: process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ||
           process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || '',

  enableDebugLogs: process.env.NODE_ENV === 'development',
  shouldShowInAppMessagesAutomatically: true,

  // 获取当前平台的API密钥
  getCurrentPlatformApiKey(): string {
    // 仅支持iOS，Android使用单独的第三方支付
    if (typeof window !== 'undefined') {
      // 检测是否为iOS环境
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS && this.iosApiKey) {
        return this.iosApiKey;
      }

      // Android环境不使用RevenueCat
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        console.warn('Android平台使用单独的第三方支付，不使用RevenueCat');
        return '';
      }
    }

    // 回退到通用API密钥（主要用于iOS）
    return this.apiKey;
  }
};

// 工具函数
export function getActiveProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS;
}

export function getProductById(id: string): AppStoreProduct | undefined {
  return APP_STORE_PRODUCTS.find(product => product.id === id);
}

export function getProductsByTier(tier: MembershipTierValue): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => product.membershipTier === tier);
}

export function getSubscriptionProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => product.type === ProductType.SUBSCRIPTION);
}

export function getProductsSorted(): AppStoreProduct[] {
  return [...APP_STORE_PRODUCTS].sort((a, b) => {
    // 按价格排序
    const priceA = parseInt(a.displayPrice.replace(/[^\d]/g, ''));
    const priceB = parseInt(b.displayPrice.replace(/[^\d]/g, ''));
    return priceA - priceB;
  });
}

export function getPopularProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => product.isPopular);
}

export function hasEntitlement(entitlements: string[], targetEntitlement: string): boolean {
  return entitlements.includes(targetEntitlement);
}

export function validateProductConfig(): boolean {
  // 验证产品配置的完整性
  return APP_STORE_PRODUCTS.every(product => 
    product.id && 
    product.name && 
    product.type && 
    product.membershipTier &&
    product.displayPrice &&
    Array.isArray(product.entitlements)
  );
}

// 获取支付系统状态
export function getPaymentSystemStatus() {
  return {
    hasApiKey: !!REVENUECAT_CONFIG.apiKey,
    productsCount: APP_STORE_PRODUCTS.length,
    isValid: validateProductConfig(),
  };
}
