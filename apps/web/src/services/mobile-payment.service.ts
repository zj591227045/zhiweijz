/**
 * 移动端支付服务
 * 处理App内购买和订阅功能，集成RevenueCat
 */

import { Capacitor } from '@capacitor/core';
// 导入产品配置
import {
  ENTITLEMENTS,
  MembershipTier as MembershipLevel
} from '../config/app-store-products';
import { loadRevenueCat, isMobileEnvironment } from './revenuecat-loader';

// RevenueCat类型定义
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
  introPrice?: PurchasesIntroPrice;
}

interface PurchasesIntroPrice {
  price: number;
  priceString: string;
  period: string;
  cycles: number;
  periodUnit: string;
  periodNumberOfUnits: number;
}

interface CustomerInfo {
  originalAppUserId: string;
  allPurchaseDates: { [key: string]: string };
  activeSubscriptions: string[];
  allExpirationDates: { [key: string]: string };
  entitlements: {
    active: { [key: string]: EntitlementInfo };
    all: { [key: string]: EntitlementInfo };
  };
}

interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  latestPurchaseDate: string;
  originalPurchaseDate: string;
  expirationDate?: string;
  store: string;
  productIdentifier: string;
  isSandbox: boolean;
}

interface PurchaseResult {
  customerInfo: CustomerInfo;
  productIdentifier: string;
  transaction?: any;
}

// 重新导出会员级别枚举以保持向后兼容
export { MembershipLevel };

export class MobilePaymentService {
  private static instance: MobilePaymentService;
  private isInitialized = false;
  private Purchases: any = null;

  private constructor() {}

  static getInstance(): MobilePaymentService {
    if (!MobilePaymentService.instance) {
      MobilePaymentService.instance = new MobilePaymentService();
    }
    return MobilePaymentService.instance;
  }

  /**
   * 初始化RevenueCat
   */
  async initialize(apiKey: string, userId?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('💰 [MobilePayment] 已经初始化，跳过');
      return;
    }

    try {
      // 检查是否在移动端环境（使用改进的检测逻辑）
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      const isMobile = isNative || platform === 'ios' || platform === 'android';

      console.log('💰 [MobilePayment] 环境检测:', {
        platform,
        isNative,
        isMobile,
        isMobileEnvironment: isMobileEnvironment()
      });

      if (!isMobile) {
        console.log('💰 [MobilePayment] 非移动端平台，跳过RevenueCat初始化');
        return;
      }

      // 使用新的RevenueCat加载器
      console.log('💰 [MobilePayment] 开始加载RevenueCat...');
      this.Purchases = await loadRevenueCat();
      console.log('💰 [MobilePayment] RevenueCat加载完成:', !!this.Purchases);

      // 如果是真实的RevenueCat实例，进行配置
      if (isMobileEnvironment()) {
        try {
          // 验证API密钥格式
          if (!apiKey) {
            throw new Error('API密钥不能为空');
          }

          // 检查API密钥格式（iOS: appl_, Android: goog_, Web: web_）
          const validPrefixes = ['appl_', 'goog_', 'web_'];
          const hasValidPrefix = validPrefixes.some(prefix => apiKey.startsWith(prefix));

          if (!hasValidPrefix) {
            console.warn('⚠️ [MobilePayment] API密钥格式可能不正确，期望前缀: appl_/goog_/web_');
          }

          console.log('💰 [MobilePayment] 配置RevenueCat，API密钥前缀:', apiKey.substring(0, 5) + '...');

          // 配置RevenueCat
          await this.Purchases.configure({
            apiKey,
            appUserID: userId || undefined, // 如果不提供，RevenueCat会生成匿名ID
          });

          // 设置调试日志级别（仅在开发环境）
          if (process.env.NODE_ENV === 'development') {
            await this.Purchases.setLogLevel({ level: 'DEBUG' });
          }

          console.log('💰 [MobilePayment] RevenueCat配置成功');
        } catch (error) {
          console.error('💰 [MobilePayment] RevenueCat配置失败:', error);
          throw error; // 重新抛出错误，让调用者知道配置失败
        }
      }

      this.isInitialized = true;
      console.log('💰 [MobilePayment] RevenueCat初始化成功');

      // 获取初始客户信息（但不同步到后端，避免阻塞初始化）
      try {
        const customerInfo = await this.Purchases.getCustomerInfo();
        console.log('💰 [MobilePayment] 获取初始客户信息成功');

        // 异步同步到后端，不阻塞初始化流程
        this.syncCustomerInfoWithBackend(customerInfo).catch(error => {
          console.warn('💰 [MobilePayment] 后端同步失败（不影响功能）:', error);
        });
      } catch (error) {
        console.warn('💰 [MobilePayment] 获取初始客户信息失败:', error);
        // 不抛出错误，允许初始化继续
      }

    } catch (error) {
      console.error('💰 [MobilePayment] 初始化失败:', error);
      throw new Error(`RevenueCat初始化失败: ${error.message}`);
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    const ready = this.isInitialized && this.Purchases !== null;
    console.log('💰 [MobilePayment] 检查初始化状态:', {
      isInitialized: this.isInitialized,
      hasPurchases: !!this.Purchases,
      hasPurchaseProduct: !!this.Purchases?.purchaseProduct,
      hasPurchasePackage: !!this.Purchases?.purchasePackage,
      ready
    });
    return ready;
  }

  /**
   * 获取可用的产品套餐
   */
  async getOfferings(): Promise<PurchasesOffering[]> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    try {
      const offerings = await this.Purchases.getOfferings();
      console.log('💰 [MobilePayment] 获取到产品套餐:', offerings);
      
      return offerings.all ? Object.values(offerings.all) : [];
    } catch (error) {
      console.error('💰 [MobilePayment] 获取产品套餐失败:', error);
      throw new Error(`获取产品套餐失败: ${error.message}`);
    }
  }

  /**
   * 购买产品（支持Product ID和Package ID）
   */
  async purchaseProduct(identifier: string): Promise<PurchaseResult> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    if (!this.Purchases) {
      throw new Error('Purchases对象未初始化');
    }

    try {
      console.log('💰 [MobilePayment] 开始购买:', identifier);
      console.log('💰 [MobilePayment] Purchases对象状态:', {
        hasPurchases: !!this.Purchases,
        hasPurchaseProduct: !!this.Purchases.purchaseProduct,
        hasPurchasePackage: !!this.Purchases.purchasePackage,
        purchasesType: typeof this.Purchases
      });

      let result: PurchaseResult;

      // 判断是Package ID还是Product ID
      if (identifier.includes('$rc_') || identifier.includes('Monthly') || identifier.includes('Annual')) {
        // 使用Package ID购买 - 需要先找到对应的Package对象
        console.log('💰 [MobilePayment] 使用Package ID购买:', identifier);

        // 从offerings中找到对应的package
        const offerings = await this.getOfferings();
        let targetPackage: PurchasesPackage | null = null;

        for (const offering of offerings) {
          if (offering.availablePackages) {
            targetPackage = offering.availablePackages.find(pkg => pkg.identifier === identifier) || null;
            if (targetPackage) break;
          }
        }

        if (!targetPackage) {
          throw new Error(`找不到Package: ${identifier}`);
        }

        if (!this.Purchases.purchasePackage) {
          throw new Error('purchasePackage方法不可用');
        }

        result = await this.Purchases.purchasePackage({
          aPackage: targetPackage
        });
      } else {
        // 使用Product ID购买
        console.log('💰 [MobilePayment] 使用Product ID购买:', identifier);

        if (!this.Purchases.purchaseProduct) {
          throw new Error('purchaseProduct方法不可用');
        }

        result = await this.Purchases.purchaseProduct({
          productIdentifier: identifier
        });
      }

      console.log('💰 [MobilePayment] 购买成功:', result);

      // 通知后端更新用户会员状态
      await this.syncPurchaseWithBackend(result);

      return result;
    } catch (error) {
      console.error('💰 [MobilePayment] 购买失败:', error);

      // 处理用户取消购买的情况
      if (error?.code === 'PURCHASE_CANCELLED' || error?.message?.includes('cancelled')) {
        throw new Error('用户取消了购买');
      }

      throw new Error(`购买失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 购买套餐
   */
  async purchasePackage(packageObj: PurchasesPackage): Promise<PurchaseResult> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    try {
      console.log('💰 [MobilePayment] 开始购买套餐:', packageObj.identifier);
      
      const result = await this.Purchases.purchasePackage({
        aPackage: packageObj
      });

      console.log('💰 [MobilePayment] 套餐购买成功:', result);
      
      // 通知后端更新用户会员状态
      await this.syncPurchaseWithBackend(result);
      
      return result;
    } catch (error) {
      console.error('💰 [MobilePayment] 套餐购买失败:', error);
      
      if (error.code === 'PURCHASE_CANCELLED') {
        throw new Error('用户取消了购买');
      }
      
      throw new Error(`套餐购买失败: ${error.message}`);
    }
  }

  /**
   * 恢复购买
   */
  async restorePurchases(): Promise<CustomerInfo> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    try {
      console.log('💰 [MobilePayment] 开始恢复购买');
      
      const customerInfo = await this.Purchases.restorePurchases();
      
      console.log('💰 [MobilePayment] 购买恢复成功:', customerInfo);
      
      // 通知后端同步会员状态
      await this.syncCustomerInfoWithBackend(customerInfo);
      
      return customerInfo;
    } catch (error) {
      console.error('💰 [MobilePayment] 恢复购买失败:', error);
      throw new Error(`恢复购买失败: ${error.message}`);
    }
  }

  /**
   * 获取客户信息
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    try {
      const result = await this.Purchases.getCustomerInfo();
      console.log('💰 [MobilePayment] 原始客户信息:', result);

      // RevenueCat可能返回包装的格式 {customerInfo: {...}} 或直接格式 {...}
      const customerInfo = result.customerInfo || result;
      console.log('💰 [MobilePayment] 解析后的客户信息:', customerInfo);

      return customerInfo;
    } catch (error) {
      console.error('💰 [MobilePayment] 获取客户信息失败:', error);

      // 安全的错误处理，确保错误信息不为空
      let errorMessage = '获取客户信息失败';
      if (error instanceof Error && error.message) {
        errorMessage = `获取客户信息失败: ${error.message}`;
      } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        errorMessage = `获取客户信息失败: ${JSON.stringify(error)}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 刷新客户信息
   */
  async refreshCustomerInfo(): Promise<CustomerInfo> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    try {
      const customerInfo = await this.Purchases.getCustomerInfo();

      // 同步到后端，等待完成以确保数据一致性
      try {
        await this.syncCustomerInfoWithBackend(customerInfo);
        console.log('💰 [MobilePayment] 后端同步成功');
      } catch (syncError) {
        console.warn('💰 [MobilePayment] 后端同步失败（不影响功能）:', syncError);
        // 不抛出错误，因为RevenueCat数据获取成功
      }

      return customerInfo;
    } catch (error) {
      console.error('💰 [MobilePayment] 刷新客户信息失败:', error);

      // 安全的错误处理，确保错误信息不为空
      let errorMessage = '刷新客户信息失败';
      if (error instanceof Error && error.message) {
        errorMessage = `刷新客户信息失败: ${error.message}`;
      } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        errorMessage = `刷新客户信息失败: ${JSON.stringify(error)}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 检查用户是否有特定权益
   */
  async hasEntitlement(entitlementId: string): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo?.entitlements?.all?.[entitlementId]?.isActive || false;
    } catch (error) {
      console.error('💰 [MobilePayment] 检查权益失败:', error);
      return false;
    }
  }

  /**
   * 获取用户会员级别
   */
  async getMembershipLevel(): Promise<MembershipLevel> {
    try {
      const customerInfo = await this.getCustomerInfo();

      console.log('💰 [MobilePayment] 开始分析会员级别，客户信息:', {
        hasCustomerInfo: !!customerInfo,
        hasEntitlements: !!customerInfo?.entitlements,
        hasAll: !!customerInfo?.entitlements?.all,
        allKeys: customerInfo?.entitlements?.all ? Object.keys(customerInfo.entitlements.all) : []
      });

      // 检查是否有活跃的权益 - RevenueCat的结构是 entitlements.all，不是 entitlements.active
      const activeEntitlements = customerInfo?.entitlements?.all;

      // 如果没有活跃权益或权益对象为空，返回免费级别
      if (!activeEntitlements || Object.keys(activeEntitlements).length === 0) {
        console.log('💰 [MobilePayment] 没有活跃权益，返回FREE级别');
        return MembershipLevel.FREE;
      }

      // 详细的调试信息
      const activeEntitlementKeys = Object.keys(activeEntitlements);
      console.log('💰 [MobilePayment] 所有权益列表:', activeEntitlementKeys);

      // 检查每个权益的详细状态，并过滤出真正活跃的权益
      const reallyActiveEntitlements: string[] = [];
      activeEntitlementKeys.forEach(key => {
        const entitlement = activeEntitlements[key];
        const isActive = entitlement?.isActive === true;
        console.log(`💰 [MobilePayment] 权益 ${key}:`, {
          isActive,
          productIdentifier: entitlement?.productIdentifier,
          expirationDate: entitlement?.expirationDate
        });

        if (isActive) {
          reallyActiveEntitlements.push(key);
        }
      });

      console.log('💰 [MobilePayment] 真正活跃的权益:', reallyActiveEntitlements);

      console.log('💰 [MobilePayment] 检查目标权益:', {
        donationThree: ENTITLEMENTS.DONATION_THREE_FEATURES,
        donationTwo: ENTITLEMENTS.DONATION_TWO_FEATURES,
        donationOne: ENTITLEMENTS.DONATION_ONE_FEATURES
      });

      // 检查捐赠会员（叁）权益
      const donationThreeEntitlement = activeEntitlements[ENTITLEMENTS.DONATION_THREE_FEATURES];
      console.log('💰 [MobilePayment] 捐赠会员（叁）权益检查:', {
        exists: !!donationThreeEntitlement,
        isActive: donationThreeEntitlement?.isActive,
        entitlement: donationThreeEntitlement
      });

      if (donationThreeEntitlement?.isActive) {
        console.log('💰 [MobilePayment] 检测到捐赠会员（叁）');
        return MembershipLevel.DONATION_THREE;
      }

      // 检查捐赠会员（贰）权益
      const donationTwoEntitlement = activeEntitlements[ENTITLEMENTS.DONATION_TWO_FEATURES];
      console.log('💰 [MobilePayment] 捐赠会员（贰）权益检查:', {
        exists: !!donationTwoEntitlement,
        isActive: donationTwoEntitlement?.isActive,
        entitlement: donationTwoEntitlement
      });

      if (donationTwoEntitlement?.isActive) {
        console.log('💰 [MobilePayment] 检测到捐赠会员（贰）');
        return MembershipLevel.DONATION_TWO;
      }

      // 检查捐赠会员（壹）权益
      const donationOneEntitlement = activeEntitlements[ENTITLEMENTS.DONATION_ONE_FEATURES];
      console.log('💰 [MobilePayment] 捐赠会员（壹）权益检查:', {
        exists: !!donationOneEntitlement,
        isActive: donationOneEntitlement?.isActive,
        entitlement: donationOneEntitlement
      });

      if (donationOneEntitlement?.isActive) {
        console.log('💰 [MobilePayment] 检测到捐赠会员（壹）');
        return MembershipLevel.DONATION_ONE;
      }

      console.log('💰 [MobilePayment] 未检测到任何会员权益，返回FREE');
      return MembershipLevel.FREE;
    } catch (error) {
      console.error('💰 [MobilePayment] 获取会员级别失败:', error);
      // 发生错误时返回免费级别，确保应用正常运行
      return MembershipLevel.FREE;
    }
  }

  /**
   * 同步购买信息到后端
   */
  private async syncPurchaseWithBackend(purchaseResult: PurchaseResult): Promise<void> {
    try {
      // 调用后端API同步购买信息
      const response = await fetch('/api/payment/sync-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerInfo: purchaseResult.customerInfo,
          productIdentifier: purchaseResult.productIdentifier,
          transaction: purchaseResult.transaction,
          platform: 'ios',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`后端同步失败: ${response.statusText}`);
      }

      console.log('💰 [MobilePayment] 购买信息已同步到后端');
    } catch (error) {
      console.error('💰 [MobilePayment] 同步购买信息到后端失败:', error);
      // 不抛出错误，因为购买已经成功，只是同步失败
    }
  }

  /**
   * 同步客户信息到后端
   */
  private async syncCustomerInfoWithBackend(customerInfo: CustomerInfo): Promise<void> {
    try {
      // 添加超时控制，避免无限等待
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch('/api/payment/sync-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          customerInfo,
          platform: 'ios',
          timestamp: new Date().toISOString()
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`后端同步失败: ${response.statusText}`);
      }

      console.log('💰 [MobilePayment] 客户信息已同步到后端');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('💰 [MobilePayment] 后端同步超时（10秒）');
      } else {
        console.error('💰 [MobilePayment] 同步客户信息到后端失败:', error);
      }
    }
  }

  /**
   * 设置用户ID
   */
  async setUserId(userId: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error('RevenueCat未初始化');
    }

    try {
      await this.Purchases.logIn({ appUserID: userId });
      console.log('💰 [MobilePayment] 用户ID设置成功:', userId);
    } catch (error) {
      console.error('💰 [MobilePayment] 设置用户ID失败:', error);

      // 安全的错误处理，确保错误信息不为空
      let errorMessage = '设置用户ID失败';
      if (error instanceof Error && error.message) {
        errorMessage = `设置用户ID失败: ${error.message}`;
      } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        errorMessage = `设置用户ID失败: ${JSON.stringify(error)}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 登出用户
   */
  async logOut(): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.Purchases.logOut();
      console.log('💰 [MobilePayment] 用户已登出');
    } catch (error) {
      console.error('💰 [MobilePayment] 登出失败:', error);
    }
  }


}

// 导出单例实例
export const mobilePaymentService = MobilePaymentService.getInstance();
