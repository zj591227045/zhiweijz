/**
 * RevenueCat产品映射服务
 * 处理RevenueCat产品ID到会员类型的映射和权益配置
 */

export interface ProductMapping {
  productId: string;
  memberType: 'DONATION_ONE' | 'DONATION_TWO' | 'DONATION_THREE';
  billingPeriod: 'monthly' | 'yearly';
  monthlyPoints: number;
  hasCharityAttribution: boolean;
  hasPrioritySupport: boolean;
  duration: number; // 月数
}

export interface MembershipUpdate {
  memberType: 'DONATION_ONE' | 'DONATION_TWO' | 'DONATION_THREE';
  billingPeriod: 'monthly' | 'yearly';
  monthlyPoints: number;
  hasCharityAttribution: boolean;
  hasPrioritySupport: boolean;
  duration: number;
  platform: string;
  externalProductId: string;
  externalTransactionId?: string;
}

/**
 * RevenueCat产品映射配置
 */
export class RevenueCatMappingService {
  
  /**
   * 产品ID到会员类型的映射表
   */
  private static readonly PRODUCT_MAPPINGS: Record<string, ProductMapping> = {
    // 捐赠会员（壹）月付
    'cn.jacksonz.zhiweijz.donation.one.monthly': {
      productId: 'cn.jacksonz.zhiweijz.donation.one.monthly',
      memberType: 'DONATION_ONE',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: false,
      hasPrioritySupport: false,
      duration: 1
    },
    
    // 捐赠会员（贰）月付
    'cn.jacksonz.zhiweijz.donation.two.monthly': {
      productId: 'cn.jacksonz.zhiweijz.donation.two.monthly',
      memberType: 'DONATION_TWO',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: true,
      hasPrioritySupport: false,
      duration: 1
    },
    
    // 捐赠会员（叁）月付
    'cn.jacksonz.zhiweijz.donation.three.monthly': {
      productId: 'cn.jacksonz.zhiweijz.donation.three.monthly',
      memberType: 'DONATION_THREE',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: true,
      hasPrioritySupport: true,
      duration: 1
    },
    
    // 捐赠会员（壹）年付
    'cn.jacksonz.zhiweijz.donation.one.yearly': {
      productId: 'cn.jacksonz.zhiweijz.donation.one.yearly',
      memberType: 'DONATION_ONE',
      billingPeriod: 'yearly',
      monthlyPoints: 1500, // 年付用户获得更多积分
      hasCharityAttribution: false,
      hasPrioritySupport: false,
      duration: 12
    },
    
    // 捐赠会员（贰）年付
    'cn.jacksonz.zhiweijz.donation.two.yearly': {
      productId: 'cn.jacksonz.zhiweijz.donation.two.yearly',
      memberType: 'DONATION_TWO',
      billingPeriod: 'yearly',
      monthlyPoints: 1500,
      hasCharityAttribution: true,
      hasPrioritySupport: false,
      duration: 12
    },
    
    // 捐赠会员（叁）年付
    'cn.jacksonz.zhiweijz.donation.three.yearly': {
      productId: 'cn.jacksonz.zhiweijz.donation.three.yearly',
      memberType: 'DONATION_THREE',
      billingPeriod: 'yearly',
      monthlyPoints: 1500,
      hasCharityAttribution: true,
      hasPrioritySupport: true,
      duration: 12
    }
  };

  /**
   * Android支付产品映射（为未来Android集成预留）
   * 使用相同的会员级别，但产品ID不同
   */
  private static readonly ANDROID_PRODUCT_MAPPINGS: Record<string, ProductMapping> = {
    // Android微信支付产品ID（示例）
    'zhiweijz_donation_one_monthly_wechat': {
      productId: 'zhiweijz_donation_one_monthly_wechat',
      memberType: 'DONATION_ONE',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: false,
      hasPrioritySupport: false,
      duration: 1
    },
    
    'zhiweijz_donation_two_monthly_wechat': {
      productId: 'zhiweijz_donation_two_monthly_wechat',
      memberType: 'DONATION_TWO',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: true,
      hasPrioritySupport: false,
      duration: 1
    },
    
    'zhiweijz_donation_three_monthly_wechat': {
      productId: 'zhiweijz_donation_three_monthly_wechat',
      memberType: 'DONATION_THREE',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: true,
      hasPrioritySupport: true,
      duration: 1
    },
    
    // Android支付宝产品ID（示例）
    'zhiweijz_donation_one_monthly_alipay': {
      productId: 'zhiweijz_donation_one_monthly_alipay',
      memberType: 'DONATION_ONE',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: false,
      hasPrioritySupport: false,
      duration: 1
    },
    
    'zhiweijz_donation_two_monthly_alipay': {
      productId: 'zhiweijz_donation_two_monthly_alipay',
      memberType: 'DONATION_TWO',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: true,
      hasPrioritySupport: false,
      duration: 1
    },
    
    'zhiweijz_donation_three_monthly_alipay': {
      productId: 'zhiweijz_donation_three_monthly_alipay',
      memberType: 'DONATION_THREE',
      billingPeriod: 'monthly',
      monthlyPoints: 1000,
      hasCharityAttribution: true,
      hasPrioritySupport: true,
      duration: 1
    }
  };

  /**
   * 根据产品ID获取会员类型映射
   */
  static getProductMapping(productId: string): ProductMapping | null {
    // 首先检查iOS产品
    if (this.PRODUCT_MAPPINGS[productId]) {
      return this.PRODUCT_MAPPINGS[productId];
    }
    
    // 然后检查Android产品
    if (this.ANDROID_PRODUCT_MAPPINGS[productId]) {
      return this.ANDROID_PRODUCT_MAPPINGS[productId];
    }
    
    return null;
  }

  /**
   * 根据产品ID确定会员级别
   */
  static determineMembershipLevel(productId: string): string | null {
    const mapping = this.getProductMapping(productId);
    return mapping ? mapping.memberType : null;
  }

  /**
   * 根据产品ID生成会员更新数据
   */
  static generateMembershipUpdate(
    productId: string, 
    platform: string = 'ios',
    transactionId?: string
  ): MembershipUpdate | null {
    const mapping = this.getProductMapping(productId);
    
    if (!mapping) {
      return null;
    }

    return {
      memberType: mapping.memberType,
      billingPeriod: mapping.billingPeriod,
      monthlyPoints: mapping.monthlyPoints,
      hasCharityAttribution: mapping.hasCharityAttribution,
      hasPrioritySupport: mapping.hasPrioritySupport,
      duration: mapping.duration,
      platform,
      externalProductId: productId,
      externalTransactionId: transactionId
    };
  }

  /**
   * 获取所有支持的产品ID列表
   */
  static getAllProductIds(): string[] {
    return [
      ...Object.keys(this.PRODUCT_MAPPINGS),
      ...Object.keys(this.ANDROID_PRODUCT_MAPPINGS)
    ];
  }

  /**
   * 获取iOS产品ID列表
   */
  static getIOSProductIds(): string[] {
    return Object.keys(this.PRODUCT_MAPPINGS);
  }

  /**
   * 获取Android产品ID列表
   */
  static getAndroidProductIds(): string[] {
    return Object.keys(this.ANDROID_PRODUCT_MAPPINGS);
  }

  /**
   * 检查产品ID是否有效
   */
  static isValidProductId(productId: string): boolean {
    return this.getProductMapping(productId) !== null;
  }

  /**
   * 根据会员类型获取对应的产品列表
   */
  static getProductsByMemberType(memberType: 'DONATION_ONE' | 'DONATION_TWO' | 'DONATION_THREE'): ProductMapping[] {
    const allMappings = { ...this.PRODUCT_MAPPINGS, ...this.ANDROID_PRODUCT_MAPPINGS };
    return Object.values(allMappings).filter(mapping => mapping.memberType === memberType);
  }

  /**
   * 解析RevenueCat用户ID
   */
  static parseRevenueCatUserId(appUserId: string): string | null {
    // RevenueCat用户ID格式: zhiweijz_user_123 或 user_123
    const patterns = [
      /^zhiweijz_user_(\d+)$/,
      /^user_(\d+)$/,
      /^(\d+)$/ // 纯数字ID
    ];

    for (const pattern of patterns) {
      const match = appUserId.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 生成RevenueCat用户ID
   */
  static generateRevenueCatUserId(userId: string): string {
    return `zhiweijz_user_${userId}`;
  }
}
