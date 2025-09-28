/**
 * Android H5支付产品配置
 * 为6种订阅会员产品配置H5支付专用的产品ID和价格
 */

export interface AndroidH5Product {
  id: string;                    // H5支付产品ID
  iosProductId: string;          // 对应的iOS产品ID
  name: string;                  // 产品名称
  description: string;           // 产品描述
  membershipTier: string;        // 会员级别
  duration: 'monthly' | 'yearly'; // 订阅周期
  
  // 价格信息（单位：分）
  wechatPrice: number;           // 微信支付价格
  alipayPrice: number;           // 支付宝支付价格
  
  // 显示价格（用于前端显示）
  displayPrice: string;          // 显示价格
  originalPrice?: string;        // 原价（年付显示折扣）
  discountPercentage?: number;   // 折扣百分比
  
  // 会员权益
  monthlyPoints: number;         // 每月积分
  hasCharityAttribution: boolean; // 是否有公益署名
  hasPrioritySupport: boolean;   // 是否有优先客服
  
  // 元数据
  isPopular?: boolean;           // 是否推荐
  sortOrder: number;             // 排序
  isActive: boolean;             // 是否激活
}

/**
 * Android H5支付产品配置列表
 * 对应现有的6种iOS订阅产品
 */
export const ANDROID_H5_PRODUCTS: AndroidH5Product[] = [
  // 捐赠会员（壹）月付
  {
    id: 'zhiweijz_donation_one_monthly',
    iosProductId: 'cn.jacksonz.zhiweijz.donation.one.monthly',
    name: '捐赠会员（壹）',
    description: '1000点/月会员记账点，支持应用发展',
    membershipTier: 'DONATION_ONE',
    duration: 'monthly',
    wechatPrice: 500,  // ¥5.00
    alipayPrice: 500,  // ¥5.00
    displayPrice: '¥5',
    monthlyPoints: 1000,
    hasCharityAttribution: false,
    hasPrioritySupport: false,
    sortOrder: 1,
    isActive: true
  },

  // 捐赠会员（贰）月付
  {
    id: 'zhiweijz_donation_two_monthly',
    iosProductId: 'cn.jacksonz.zhiweijz.donation.two.monthly',
    name: '捐赠会员（贰）',
    description: '1000点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权',
    membershipTier: 'DONATION_TWO',
    duration: 'monthly',
    wechatPrice: 1000, // ¥10.00
    alipayPrice: 1000, // ¥10.00
    displayPrice: '¥10',
    monthlyPoints: 1000,
    hasCharityAttribution: true,
    hasPrioritySupport: false,
    isPopular: true,
    sortOrder: 2,
    isActive: true
  },

  // 捐赠会员（叁）月付
  {
    id: 'zhiweijz_donation_three_monthly',
    iosProductId: 'cn.jacksonz.zhiweijz.donation.three.monthly',
    name: '捐赠会员（叁）',
    description: '1000点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，优先客服支持',
    membershipTier: 'DONATION_THREE',
    duration: 'monthly',
    wechatPrice: 1500, // ¥15.00
    alipayPrice: 1500, // ¥15.00
    displayPrice: '¥15',
    monthlyPoints: 1000,
    hasCharityAttribution: true,
    hasPrioritySupport: true,
    sortOrder: 3,
    isActive: true
  },

  // 年费捐赠会员（壹）
  {
    id: 'zhiweijz_donation_one_yearly',
    iosProductId: 'cn.jacksonz.zhiweijz.donation.one.yearly',
    name: '年费捐赠会员（壹）',
    description: '1500点/月会员记账点，年付更优惠',
    membershipTier: 'DONATION_ONE',
    duration: 'yearly',
    wechatPrice: 5500, // ¥55.00
    alipayPrice: 5500, // ¥55.00
    displayPrice: '¥55',
    originalPrice: '¥60',
    discountPercentage: 8,
    monthlyPoints: 1500,
    hasCharityAttribution: false,
    hasPrioritySupport: false,
    sortOrder: 4,
    isActive: true
  },

  // 年费捐赠会员（贰）
  {
    id: 'zhiweijz_donation_two_yearly',
    iosProductId: 'cn.jacksonz.zhiweijz.donation.two.yearly',
    name: '年费捐赠会员（贰）',
    description: '1500点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，年付更优惠',
    membershipTier: 'DONATION_TWO',
    duration: 'yearly',
    wechatPrice: 11000, // ¥110.00
    alipayPrice: 11000, // ¥110.00
    displayPrice: '¥110',
    originalPrice: '¥120',
    discountPercentage: 8,
    monthlyPoints: 1500,
    hasCharityAttribution: true,
    hasPrioritySupport: false,
    sortOrder: 5,
    isActive: true
  },

  // 年费捐赠会员（叁）
  {
    id: 'zhiweijz_donation_three_yearly',
    iosProductId: 'cn.jacksonz.zhiweijz.donation.three.yearly',
    name: '年费捐赠会员（叁）',
    description: '1500点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，优先客服支持，年付更优惠',
    membershipTier: 'DONATION_THREE',
    duration: 'yearly',
    wechatPrice: 16500, // ¥165.00
    alipayPrice: 16500, // ¥165.00
    displayPrice: '¥165',
    originalPrice: '¥180',
    discountPercentage: 8,
    monthlyPoints: 1500,
    hasCharityAttribution: true,
    hasPrioritySupport: true,
    sortOrder: 6,
    isActive: true
  }
];

/**
 * 工具函数
 */

/**
 * 根据产品ID获取产品配置
 */
export function getAndroidH5ProductById(productId: string): AndroidH5Product | undefined {
  return ANDROID_H5_PRODUCTS.find(product => product.id === productId);
}

/**
 * 根据iOS产品ID获取对应的Android H5产品
 */
export function getAndroidH5ProductByIOSId(iosProductId: string): AndroidH5Product | undefined {
  return ANDROID_H5_PRODUCTS.find(product => product.iosProductId === iosProductId);
}

/**
 * 获取激活的产品列表
 */
export function getActiveAndroidH5Products(): AndroidH5Product[] {
  return ANDROID_H5_PRODUCTS.filter(product => product.isActive);
}

/**
 * 根据会员级别获取产品列表
 */
export function getAndroidH5ProductsByTier(tier: string): AndroidH5Product[] {
  return ANDROID_H5_PRODUCTS.filter(product => 
    product.membershipTier === tier && product.isActive
  );
}

/**
 * 根据订阅周期获取产品列表
 */
export function getAndroidH5ProductsByDuration(duration: 'monthly' | 'yearly'): AndroidH5Product[] {
  return ANDROID_H5_PRODUCTS.filter(product => 
    product.duration === duration && product.isActive
  );
}

/**
 * 获取推荐产品列表
 */
export function getPopularAndroidH5Products(): AndroidH5Product[] {
  return ANDROID_H5_PRODUCTS.filter(product => 
    product.isPopular && product.isActive
  );
}

/**
 * 根据支付方式获取产品价格
 */
export function getProductPrice(productId: string, payType: 'wechat' | 'alipay'): number | null {
  const product = getAndroidH5ProductById(productId);
  if (!product) return null;
  
  return payType === 'wechat' ? product.wechatPrice : product.alipayPrice;
}

/**
 * 验证产品配置
 */
export function validateAndroidH5ProductConfig(): boolean {
  try {
    // 检查产品ID唯一性
    const productIds = ANDROID_H5_PRODUCTS.map(p => p.id);
    const uniqueIds = new Set(productIds);
    if (productIds.length !== uniqueIds.size) {
      console.error('Android H5产品ID存在重复');
      return false;
    }

    // 检查iOS产品ID映射
    const iosProductIds = ANDROID_H5_PRODUCTS.map(p => p.iosProductId);
    const uniqueIOSIds = new Set(iosProductIds);
    if (iosProductIds.length !== uniqueIOSIds.size) {
      console.error('iOS产品ID映射存在重复');
      return false;
    }

    // 检查价格配置
    for (const product of ANDROID_H5_PRODUCTS) {
      if (product.wechatPrice <= 0 || product.alipayPrice <= 0) {
        console.error(`产品 ${product.id} 价格配置无效`);
        return false;
      }
    }

    console.log('✅ Android H5产品配置验证通过');
    return true;
  } catch (error) {
    console.error('Android H5产品配置验证失败:', error);
    return false;
  }
}

/**
 * 获取产品配置摘要
 */
export function getAndroidH5ProductsSummary() {
  const activeProducts = getActiveAndroidH5Products();
  const monthlyProducts = getAndroidH5ProductsByDuration('monthly');
  const yearlyProducts = getAndroidH5ProductsByDuration('yearly');
  const popularProducts = getPopularAndroidH5Products();

  return {
    total: ANDROID_H5_PRODUCTS.length,
    active: activeProducts.length,
    monthly: monthlyProducts.length,
    yearly: yearlyProducts.length,
    popular: popularProducts.length,
    products: activeProducts.map(p => ({
      id: p.id,
      name: p.name,
      tier: p.membershipTier,
      duration: p.duration,
      wechatPrice: p.wechatPrice,
      alipayPrice: p.alipayPrice,
      isPopular: p.isPopular
    }))
  };
}
