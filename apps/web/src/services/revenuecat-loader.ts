/**
 * RevenueCat动态加载器
 * 解决Web环境中无法导入Capacitor插件的问题
 */

// 检查是否在移动端环境（包括模拟器）
export const isMobileEnvironment = () => {
  if (typeof window === 'undefined') return false;

  // 检查Capacitor是否存在
  const hasCapacitor = !!(window as any).Capacitor;
  if (!hasCapacitor) return false;

  // 获取平台信息
  const platform = (window as any).Capacitor?.getPlatform?.();
  console.log('💰 [isMobileEnvironment] 检测到平台:', platform);

  // 支持iOS和Android平台（包括模拟器）
  return platform === 'ios' || platform === 'android';
};

// 模拟的Purchases接口
export interface MockPurchases {
  configure: (config: any) => Promise<void>;
  setLogLevel: (config: any) => Promise<void>;
  getCustomerInfo: () => Promise<any>;
  getOfferings: () => Promise<any>;
  purchaseProduct: (options: { productIdentifier: string }) => Promise<any>;
  purchasePackage: (options: { aPackage: any }) => Promise<any>;
  restorePurchases: () => Promise<any>;
  logIn: (userId: string) => Promise<any>;
  logOut: () => Promise<any>;
}

// 创建模拟的Purchases对象
export const createMockPurchases = (): MockPurchases => {
  const mockCustomerInfo = {
    originalAppUserId: 'mock_user',
    entitlements: { active: {}, all: {} },
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    nonSubscriptionTransactions: [],
    firstSeen: new Date().toISOString(),
    originalApplicationVersion: '1.0.0',
    requestDate: new Date().toISOString(),
    latestExpirationDate: null,
    originalPurchaseDate: null,
    managementURL: null
  };

  return {
    configure: async (config: any) => {
      console.log('💰 [MockPurchases] 配置完成:', config);
    },
    setLogLevel: async (config: any) => {
      console.log('💰 [MockPurchases] 设置日志级别:', config);
    },
    getCustomerInfo: async () => {
      console.log('💰 [MockPurchases] 获取客户信息');
      return mockCustomerInfo;
    },
    getOfferings: async () => {
      console.log('💰 [MockPurchases] 获取产品信息');
      return {
        current: null,
        all: {}
      };
    },
    purchaseProduct: async (options: { productIdentifier: string }) => {
      console.log('💰 [MockPurchases] 模拟购买产品:', options.productIdentifier);
      const platform = (window as any).Capacitor?.getPlatform?.() || 'unknown';
      throw new Error(`当前环境(${platform})不支持App内购买，请在真实iOS/Android设备上进行购买`);
    },
    purchasePackage: async (options: { aPackage: any }) => {
      console.log('💰 [MockPurchases] 模拟购买包:', options.aPackage?.identifier);
      const platform = (window as any).Capacitor?.getPlatform?.() || 'unknown';
      throw new Error(`当前环境(${platform})不支持App内购买，请在真实iOS/Android设备上进行购买`);
    },
    restorePurchases: async () => {
      console.log('💰 [MockPurchases] 模拟恢复购买');
      return {
        customerInfo: mockCustomerInfo,
        activeSubscriptions: []
      };
    },
    logIn: async (userId: string) => {
      console.log('💰 [MockPurchases] 模拟登录:', userId);
      return {
        customerInfo: { ...mockCustomerInfo, originalAppUserId: userId },
        created: false
      };
    },
    logOut: async () => {
      console.log('💰 [MockPurchases] 模拟登出');
      return {
        customerInfo: { ...mockCustomerInfo, originalAppUserId: 'anonymous' }
      };
    }
  };
};

// 动态加载RevenueCat
export const loadRevenueCat = async (): Promise<MockPurchases | any> => {
  const platform = (window as any).Capacitor?.getPlatform?.() || 'unknown';
  const isMobile = isMobileEnvironment();

  console.log('💰 [RevenueCatLoader] 环境检测详情:', {
    platform,
    isMobile,
    hasCapacitor: !!(window as any).Capacitor,
    hasWindow: typeof window !== 'undefined'
  });

  if (!isMobile) {
    console.log('💰 [RevenueCatLoader] 非移动端环境，使用模拟实现');
    return createMockPurchases();
  }

  try {
    // 仅在移动端环境中尝试加载真实的RevenueCat
    console.log('💰 [RevenueCatLoader] 移动端环境，尝试加载真实RevenueCat...');

    // 检查Capacitor插件注册情况
    const capacitor = (window as any).Capacitor;
    if (capacitor && capacitor.Plugins) {
      console.log('💰 [RevenueCatLoader] 可用的Capacitor插件:', Object.keys(capacitor.Plugins));

      // 检查RevenueCat插件是否已注册
      if (capacitor.Plugins.Purchases) {
        console.log('💰 [RevenueCatLoader] 发现Capacitor.Plugins.Purchases，直接使用');
        return capacitor.Plugins.Purchases;
      }
    }

    // 检查是否已经全局可用
    if ((window as any).CapacitorPurchases) {
      console.log('💰 [RevenueCatLoader] 发现全局CapacitorPurchases，直接使用');
      return (window as any).CapacitorPurchases;
    }

    // 尝试直接导入
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      console.log('💰 [RevenueCatLoader] 直接导入成功:', !!Purchases);
      return Purchases;
    } catch (directImportError) {
      console.log('💰 [RevenueCatLoader] 直接导入失败，尝试动态导入:', directImportError);

      // 使用动态字符串构造来避免Webpack静态分析
      const parts = ['@revenuecat', 'purchases-capacitor'];
      const moduleName = parts.join('/');

      // 使用Function构造器来完全避免静态分析
      const importFn = new Function('name', 'return import(name)');
      const module = await importFn(moduleName);

      console.log('💰 [RevenueCatLoader] 动态导入成功:', !!module.Purchases);
      return module.Purchases;
    }
  } catch (error) {
    console.error('💰 [RevenueCatLoader] 加载RevenueCat完全失败，使用模拟实现:', error);
    console.error('💰 [RevenueCatLoader] 错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return createMockPurchases();
  }
};

export default {
  isMobileEnvironment,
  createMockPurchases,
  loadRevenueCat
};
