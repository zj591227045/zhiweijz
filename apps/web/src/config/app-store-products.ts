/**
 * App Store Connect 产品配置
 * 
 * 重要说明：
 * 1. 这些产品ID必须与App Store Connect中创建的产品ID完全一致
 * 2. 在App Store Connect中创建产品后，需要更新这里的配置
 * 3. 测试时使用沙盒环境，发布时使用生产环境
 */

// 产品类型枚举
export enum ProductType {
  SUBSCRIPTION = 'subscription',
  NON_CONSUMABLE = 'non_consumable',
  CONSUMABLE = 'consumable'
}

// 订阅周期枚举
export enum SubscriptionPeriod {
  WEEKLY = 'P1W',
  MONTHLY = 'P1M',
  QUARTERLY = 'P3M',
  YEARLY = 'P1Y'
}

// 会员级别枚举
export enum MembershipTier {
  FREE = 'free',
  DONATION_ONE = 'donation_one',
  DONATION_TWO = 'donation_two',
  DONATION_THREE = 'donation_three'
}

// 产品配置接口
export interface AppStoreProduct {
  // 基本信息
  id: string;                    // App Store Connect中的产品ID
  name: string;                  // 产品名称
  description: string;           // 产品描述
  type: ProductType;             // 产品类型
  
  // 价格信息（仅用于显示，实际价格由App Store决定）
  displayPrice: string;          // 显示价格
  currency: string;              // 货币代码
  
  // 会员信息
  membershipTier: MembershipTier; // 对应的会员级别
  duration?: SubscriptionPeriod;  // 订阅周期（仅订阅产品）
  
  // 功能权益
  entitlements: string[];        // 包含的权益标识符
  
  // 营销信息
  isPopular?: boolean;           // 是否为推荐产品
  discountPercentage?: number;   // 折扣百分比（年付相对月付）
  originalPrice?: string;        // 原价（用于显示折扣）
  
  // 元数据
  sortOrder: number;             // 排序顺序
  isActive: boolean;             // 是否激活
}

// RevenueCat权益标识符
// 这些需要在RevenueCat Dashboard中配置
export const ENTITLEMENTS = {
  // 基础权益
  DONATION_ONE_FEATURES: 'donation_one_features',
  DONATION_TWO_FEATURES: 'donation_two_features',
  DONATION_THREE_FEATURES: 'donation_three_features',

  // 具体功能权益
  MONTHLY_POINTS_1000: 'monthly_points_1000',      // 1000点/月
  MONTHLY_POINTS_1500: 'monthly_points_1500',      // 1500点/月（年费）
  CHARITY_ATTRIBUTION: 'charity_attribution',       // 公益署名权
  PRIORITY_SUPPORT: 'priority_support',             // 优先客服支持
  AI_SMART_ACCOUNTING: 'ai_smart_accounting',       // AI智能记账
  ADVANCED_ANALYTICS: 'advanced_analytics',         // 高级统计分析
  AD_FREE: 'ad_free',                               // 去除广告
  DATA_EXPORT: 'data_export',                       // 数据导出
  CLOUD_SYNC: 'cloud_sync'                          // 云端同步
} as const;

// App Store Connect 产品配置
// 注意：这些产品ID需要在App Store Connect中创建
export const APP_STORE_PRODUCTS: AppStoreProduct[] = [
  // 捐赠会员（壹）月付
  {
    id: 'cn.jacksonz.zhiweijz.donation.one.monthly',
    name: '捐赠会员（壹）',
    description: '1000点/月会员记账点，支持应用发展',
    type: ProductType.SUBSCRIPTION,
    displayPrice: '¥5',
    currency: 'CNY',
    membershipTier: MembershipTier.DONATION_ONE,
    duration: SubscriptionPeriod.MONTHLY,
    entitlements: [
      ENTITLEMENTS.DONATION_ONE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1000,
      ENTITLEMENTS.AI_SMART_ACCOUNTING,
      ENTITLEMENTS.ADVANCED_ANALYTICS,
      ENTITLEMENTS.AD_FREE,
      ENTITLEMENTS.DATA_EXPORT,
      ENTITLEMENTS.CLOUD_SYNC
    ],
    sortOrder: 1,
    isActive: true
  },

  // 捐赠会员（贰）月付
  {
    id: 'cn.jacksonz.zhiweijz.donation.two.monthly',
    name: '捐赠会员（贰）',
    description: '1000点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权',
    type: ProductType.SUBSCRIPTION,
    displayPrice: '¥10',
    currency: 'CNY',
    membershipTier: MembershipTier.DONATION_TWO,
    duration: SubscriptionPeriod.MONTHLY,
    entitlements: [
      ENTITLEMENTS.DONATION_TWO_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1000,
      ENTITLEMENTS.CHARITY_ATTRIBUTION,
      ENTITLEMENTS.AI_SMART_ACCOUNTING,
      ENTITLEMENTS.ADVANCED_ANALYTICS,
      ENTITLEMENTS.AD_FREE,
      ENTITLEMENTS.DATA_EXPORT,
      ENTITLEMENTS.CLOUD_SYNC
    ],
    isPopular: true,
    sortOrder: 2,
    isActive: true
  },

  // 捐赠会员（叁）月付
  {
    id: 'cn.jacksonz.zhiweijz.donation.three.monthly',
    name: '捐赠会员（叁）',
    description: '1000点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，优先客服支持',
    type: ProductType.SUBSCRIPTION,
    displayPrice: '¥15',
    currency: 'CNY',
    membershipTier: MembershipTier.DONATION_THREE,
    duration: SubscriptionPeriod.MONTHLY,
    entitlements: [
      ENTITLEMENTS.DONATION_THREE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1000,
      ENTITLEMENTS.CHARITY_ATTRIBUTION,
      ENTITLEMENTS.PRIORITY_SUPPORT,
      ENTITLEMENTS.AI_SMART_ACCOUNTING,
      ENTITLEMENTS.ADVANCED_ANALYTICS,
      ENTITLEMENTS.AD_FREE,
      ENTITLEMENTS.DATA_EXPORT,
      ENTITLEMENTS.CLOUD_SYNC
    ],
    sortOrder: 3,
    isActive: true
  },

  // 年费捐赠会员（壹）
  {
    id: 'cn.jacksonz.zhiweijz.donation.one.yearly',
    name: '年费捐赠会员（壹）',
    description: '1500点/月会员记账点，年付更优惠',
    type: ProductType.SUBSCRIPTION,
    displayPrice: '¥55',
    originalPrice: '¥60',
    currency: 'CNY',
    membershipTier: MembershipTier.DONATION_ONE,
    duration: SubscriptionPeriod.YEARLY,
    entitlements: [
      ENTITLEMENTS.DONATION_ONE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1500,
      ENTITLEMENTS.AI_SMART_ACCOUNTING,
      ENTITLEMENTS.ADVANCED_ANALYTICS,
      ENTITLEMENTS.AD_FREE,
      ENTITLEMENTS.DATA_EXPORT,
      ENTITLEMENTS.CLOUD_SYNC
    ],
    discountPercentage: 8,
    sortOrder: 4,
    isActive: true
  },

  // 年费捐赠会员（贰）
  {
    id: 'cn.jacksonz.zhiweijz.donation.two.yearly',
    name: '年费捐赠会员（贰）',
    description: '1500点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，年付更优惠',
    type: ProductType.SUBSCRIPTION,
    displayPrice: '¥110',
    originalPrice: '¥120',
    currency: 'CNY',
    membershipTier: MembershipTier.DONATION_TWO,
    duration: SubscriptionPeriod.YEARLY,
    entitlements: [
      ENTITLEMENTS.DONATION_TWO_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1500,
      ENTITLEMENTS.CHARITY_ATTRIBUTION,
      ENTITLEMENTS.AI_SMART_ACCOUNTING,
      ENTITLEMENTS.ADVANCED_ANALYTICS,
      ENTITLEMENTS.AD_FREE,
      ENTITLEMENTS.DATA_EXPORT,
      ENTITLEMENTS.CLOUD_SYNC
    ],
    discountPercentage: 8,
    sortOrder: 5,
    isActive: true
  },

  // 年费捐赠会员（叁）
  {
    id: 'cn.jacksonz.zhiweijz.donation.three.yearly',
    name: '年费捐赠会员（叁）',
    description: '1500点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，优先客服支持，年付更优惠',
    type: ProductType.SUBSCRIPTION,
    displayPrice: '¥165',
    originalPrice: '¥180',
    currency: 'CNY',
    membershipTier: MembershipTier.DONATION_THREE,
    duration: SubscriptionPeriod.YEARLY,
    entitlements: [
      ENTITLEMENTS.DONATION_THREE_FEATURES,
      ENTITLEMENTS.MONTHLY_POINTS_1500,
      ENTITLEMENTS.CHARITY_ATTRIBUTION,
      ENTITLEMENTS.PRIORITY_SUPPORT,
      ENTITLEMENTS.AI_SMART_ACCOUNTING,
      ENTITLEMENTS.ADVANCED_ANALYTICS,
      ENTITLEMENTS.AD_FREE,
      ENTITLEMENTS.DATA_EXPORT,
      ENTITLEMENTS.CLOUD_SYNC
    ],
    discountPercentage: 8,
    sortOrder: 6,
    isActive: true
  }
];

// 工具函数

/**
 * 根据产品ID获取产品配置
 */
export function getProductById(productId: string): AppStoreProduct | undefined {
  return APP_STORE_PRODUCTS.find(product => product.id === productId);
}

/**
 * 获取激活的产品列表
 */
export function getActiveProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => product.isActive);
}

/**
 * 根据会员级别获取产品列表
 */
export function getProductsByTier(tier: MembershipTier): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => 
    product.membershipTier === tier && product.isActive
  );
}

/**
 * 获取订阅产品列表
 */
export function getSubscriptionProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => 
    product.type === ProductType.SUBSCRIPTION && product.isActive
  );
}

/**
 * 获取一次性购买产品列表
 */
export function getNonConsumableProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => 
    product.type === ProductType.NON_CONSUMABLE && product.isActive
  );
}

/**
 * 根据排序顺序获取产品列表
 */
export function getProductsSorted(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS
    .filter(product => product.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 检查产品是否包含特定权益
 */
export function hasEntitlement(product: AppStoreProduct, entitlement: string): boolean {
  return product.entitlements.includes(entitlement);
}

/**
 * 获取推荐产品
 */
export function getPopularProducts(): AppStoreProduct[] {
  return APP_STORE_PRODUCTS.filter(product => 
    product.isPopular && product.isActive
  );
}

// RevenueCat配置
export const REVENUECAT_CONFIG = {
  // API密钥（从环境变量获取）
  apiKey: process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || '',
  
  // 环境配置
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  
  // 用户ID前缀
  userIdPrefix: 'zhiweijz_user_',
  
  // 默认Offering ID
  defaultOfferingId: 'default',
  
  // 调试模式
  debugMode: process.env.NODE_ENV === 'development'
};

// 验证配置
export function validateProductConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查API密钥
  if (!REVENUECAT_CONFIG.apiKey) {
    errors.push('RevenueCat API密钥未配置');
  }
  
  // 检查产品ID唯一性
  const productIds = APP_STORE_PRODUCTS.map(p => p.id);
  const duplicateIds = productIds.filter((id, index) => productIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`发现重复的产品ID: ${duplicateIds.join(', ')}`);
  }
  
  // 检查权益配置
  const allEntitlements = Object.values(ENTITLEMENTS);
  APP_STORE_PRODUCTS.forEach(product => {
    product.entitlements.forEach(entitlement => {
      if (!allEntitlements.includes(entitlement as any)) {
        errors.push(`产品 ${product.id} 包含未定义的权益: ${entitlement}`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
