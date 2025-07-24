/**
 * 应用初始化模块
 * 负责在应用启动时初始化各种服务，包括支付系统
 */

import { initializeMobilePayment, setPaymentUserId } from './mobile-payment-init';
import { Capacitor } from '@capacitor/core';

interface InitializationOptions {
  userId?: string;
  skipPaymentInit?: boolean;
  enableDebugMode?: boolean;
}

interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  services: {
    payment: boolean;
    capacitor: boolean;
  };
}

/**
 * 初始化应用
 */
export async function initializeApp(options: InitializationOptions = {}): Promise<InitializationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const services = {
    payment: false,
    capacitor: false
  };

  console.log('🚀 [AppInit] 开始初始化应用...');

  try {
    // 1. 检查Capacitor环境
    const capacitorResult = await initializeCapacitor();
    services.capacitor = capacitorResult.success;
    
    if (!capacitorResult.success) {
      warnings.push(...capacitorResult.warnings);
    }

    // 2. 初始化支付系统（如果不跳过）
    if (!options.skipPaymentInit) {
      const paymentResult = await initializePaymentSystem(options.userId);
      services.payment = paymentResult.success;
      
      if (!paymentResult.success && paymentResult.error) {
        errors.push(paymentResult.error);
      }
      
      if (paymentResult.warnings) {
        warnings.push(...paymentResult.warnings);
      }
    }

    // 3. 设置调试模式
    if (options.enableDebugMode || process.env.NODE_ENV === 'development') {
      setupDebugMode();
    }

    // 4. 设置全局错误处理
    setupGlobalErrorHandling();

    const success = errors.length === 0;
    
    console.log(`🚀 [AppInit] 应用初始化${success ? '成功' : '失败'}:`, {
      services,
      errors: errors.length,
      warnings: warnings.length
    });

    return {
      success,
      errors,
      warnings,
      services
    };

  } catch (error) {
    console.error('🚀 [AppInit] 应用初始化异常:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    errors.push(`应用初始化异常: ${errorMessage}`);
    
    return {
      success: false,
      errors,
      warnings,
      services
    };
  }
}

/**
 * 初始化Capacitor环境
 */
async function initializeCapacitor(): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  
  try {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    console.log('🔌 [CapacitorInit] 平台信息:', { platform, isNative });
    
    if (!isNative) {
      warnings.push('运行在Web环境，某些原生功能不可用');
    }

    // 检查关键插件是否可用
    const availablePlugins = [];
    const unavailablePlugins = [];
    
    const pluginsToCheck = ['App', 'Haptics', 'StatusBar', 'Keyboard'];
    
    for (const pluginName of pluginsToCheck) {
      const isAvailable = Capacitor.isPluginAvailable(pluginName);
      if (isAvailable) {
        availablePlugins.push(pluginName);
      } else {
        unavailablePlugins.push(pluginName);
      }
    }
    
    console.log('🔌 [CapacitorInit] 插件状态:', {
      available: availablePlugins,
      unavailable: unavailablePlugins
    });
    
    if (unavailablePlugins.length > 0) {
      warnings.push(`部分插件不可用: ${unavailablePlugins.join(', ')}`);
    }

    return { success: true, warnings };

  } catch (error) {
    console.error('🔌 [CapacitorInit] 初始化失败:', error);
    warnings.push('Capacitor初始化失败');
    return { success: false, warnings };
  }
}

/**
 * 初始化支付系统
 */
async function initializePaymentSystem(userId?: string) {
  try {
    console.log('💰 [PaymentInit] 开始初始化支付系统...');
    
    const result = await initializeMobilePayment(userId);
    
    if (result.success) {
      console.log('💰 [PaymentInit] 支付系统初始化成功');
      
      // 如果提供了用户ID，设置用户ID
      if (userId && Capacitor.isNativePlatform()) {
        try {
          await setPaymentUserId(userId);
          console.log('💰 [PaymentInit] 用户ID设置成功');
        } catch (error) {
          console.warn('💰 [PaymentInit] 设置用户ID失败:', error);
        }
      }
    } else {
      console.warn('💰 [PaymentInit] 支付系统初始化失败:', result.error);
    }
    
    return result;

  } catch (error) {
    console.error('💰 [PaymentInit] 支付系统初始化异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '支付系统初始化异常'
    };
  }
}

/**
 * 设置调试模式
 */
function setupDebugMode() {
  console.log('🐛 [DebugMode] 启用调试模式');
  
  // 在window对象上暴露调试工具
  if (typeof window !== 'undefined') {
    (window as any).__ZHIWEIJZ_DEBUG__ = {
      capacitor: Capacitor,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      plugins: Capacitor.Plugins,
      // 可以添加更多调试工具
    };
  }
}

/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandling() {
  if (typeof window === 'undefined') return;

  // 处理未捕获的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    // 避免记录空对象
    if (event.reason && typeof event.reason === 'object' && Object.keys(event.reason).length === 0) {
      console.warn('🚨 [GlobalError] 检测到空的Promise错误对象，跳过记录');
      return;
    }

    console.error('🚨 [GlobalError] 未处理的Promise错误:', event.reason);

    // 如果是支付相关错误，可以特殊处理
    if (event.reason?.message?.includes('RevenueCat') ||
        event.reason?.message?.includes('payment')) {
      console.warn('🚨 [GlobalError] 支付系统错误，可能需要重新初始化');
    }
  });

  // 处理未捕获的JavaScript错误
  window.addEventListener('error', (event) => {
    console.error('🚨 [GlobalError] 未处理的JavaScript错误:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
}

/**
 * 用户登录后的初始化
 */
export async function initializeUserSession(userId: string): Promise<boolean> {
  try {
    console.log('👤 [UserSession] 初始化用户会话:', userId);
    
    // 设置支付系统用户ID
    if (Capacitor.isNativePlatform()) {
      const success = await setPaymentUserId(userId);
      if (!success) {
        console.warn('👤 [UserSession] 设置支付用户ID失败');
        return false;
      }
    }
    
    console.log('👤 [UserSession] 用户会话初始化成功');
    return true;

  } catch (error) {
    console.error('👤 [UserSession] 用户会话初始化失败:', error);
    return false;
  }
}

/**
 * 用户登出时的清理
 */
export async function cleanupUserSession(): Promise<void> {
  try {
    console.log('👤 [UserSession] 清理用户会话');
    
    // 清理支付系统用户状态
    if (Capacitor.isNativePlatform()) {
      const { clearPaymentUser } = await import('./mobile-payment-init');
      await clearPaymentUser();
    }
    
    console.log('👤 [UserSession] 用户会话清理完成');

  } catch (error) {
    console.error('👤 [UserSession] 用户会话清理失败:', error);
  }
}

/**
 * 检查应用健康状态
 */
export async function checkAppHealth(): Promise<{
  isHealthy: boolean;
  issues: string[];
  services: {
    capacitor: boolean;
    payment: boolean;
  };
}> {
  const issues: string[] = [];
  const services = {
    capacitor: false,
    payment: false
  };

  try {
    // 检查Capacitor状态
    services.capacitor = typeof Capacitor !== 'undefined';
    if (!services.capacitor) {
      issues.push('Capacitor不可用');
    }

    // 检查支付系统状态
    if (Capacitor.isNativePlatform()) {
      const { checkPaymentHealth } = await import('./mobile-payment-init');
      const paymentHealth = await checkPaymentHealth();
      services.payment = paymentHealth.isHealthy;
      
      if (!paymentHealth.isHealthy && paymentHealth.issues) {
        issues.push(...paymentHealth.issues);
      }
    } else {
      services.payment = true; // Web环境认为支付系统健康
    }

    const isHealthy = issues.length === 0;
    
    return {
      isHealthy,
      issues,
      services
    };

  } catch (error) {
    console.error('🏥 [HealthCheck] 健康检查失败:', error);
    issues.push('健康检查异常');
    
    return {
      isHealthy: false,
      issues,
      services
    };
  }
}

/**
 * 获取应用信息
 */
export function getAppInfo() {
  return {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '未知',
    environment: process.env.NODE_ENV,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || '未知'
  };
}
