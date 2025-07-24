/**
 * 移动端支付初始化模块
 * 负责在应用启动时初始化RevenueCat
 */

import { mobilePaymentService } from '../services/mobile-payment.service';
import { REVENUECAT_CONFIG, validateProductConfig } from '../config/app-store-products';
import { Capacitor } from '@capacitor/core';

interface InitializationResult {
  success: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * 初始化移动端支付系统
 */
export async function initializeMobilePayment(userId?: string): Promise<InitializationResult> {
  const warnings: string[] = [];
  
  try {
    // 检查是否在移动端环境
    if (!Capacitor.isNativePlatform()) {
      console.log('🔄 [MobilePaymentInit] 非移动端环境，跳过初始化');
      return { 
        success: true, 
        warnings: ['非移动端环境，App内购买功能不可用'] 
      };
    }

    // 验证产品配置
    const configValidation = validateProductConfig();
    if (!configValidation.isValid) {
      console.error('🔄 [MobilePaymentInit] 产品配置验证失败:', configValidation.errors);
      return {
        success: false,
        error: `产品配置错误: ${configValidation.errors.join(', ')}`
      };
    }

    // 检查API密钥
    if (!REVENUECAT_CONFIG.apiKey) {
      console.error('🔄 [MobilePaymentInit] RevenueCat API密钥未配置');
      return {
        success: false,
        error: 'RevenueCat API密钥未配置，请检查环境变量 NEXT_PUBLIC_REVENUECAT_API_KEY'
      };
    }

    // 初始化RevenueCat
    console.log('🔄 [MobilePaymentInit] 开始初始化RevenueCat...');
    await mobilePaymentService.initialize(REVENUECAT_CONFIG.apiKey, userId);

    // 检查初始化状态
    if (!mobilePaymentService.isReady()) {
      throw new Error('RevenueCat初始化后状态检查失败');
    }

    console.log('🔄 [MobilePaymentInit] RevenueCat初始化成功');

    // 在开发环境下添加警告
    if (REVENUECAT_CONFIG.environment === 'sandbox') {
      warnings.push('当前运行在沙盒环境，仅用于测试');
    }

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('🔄 [MobilePaymentInit] 初始化失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      success: false,
      error: `RevenueCat初始化失败: ${errorMessage}`
    };
  }
}

/**
 * 设置用户ID（用户登录后调用）
 */
export async function setPaymentUserId(userId: string): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('🔄 [MobilePaymentInit] 非移动端环境，跳过设置用户ID');
      return true;
    }

    if (!mobilePaymentService.isReady()) {
      console.warn('🔄 [MobilePaymentInit] RevenueCat未初始化，无法设置用户ID');
      return false;
    }

    await mobilePaymentService.setUserId(userId);
    console.log('🔄 [MobilePaymentInit] 用户ID设置成功:', userId);
    return true;

  } catch (error) {
    console.error('🔄 [MobilePaymentInit] 设置用户ID失败:', error);
    return false;
  }
}

/**
 * 用户登出时清理支付状态
 */
export async function clearPaymentUser(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!mobilePaymentService.isReady()) {
      return;
    }

    await mobilePaymentService.logOut();
    console.log('🔄 [MobilePaymentInit] 支付用户状态已清理');

  } catch (error) {
    console.error('🔄 [MobilePaymentInit] 清理支付用户状态失败:', error);
  }
}

/**
 * 检查支付系统健康状态
 */
export async function checkPaymentHealth(): Promise<{
  isHealthy: boolean;
  details: {
    isNativePlatform: boolean;
    isInitialized: boolean;
    hasApiKey: boolean;
    configValid: boolean;
  };
  issues?: string[];
}> {
  const issues: string[] = [];
  
  // 检查平台
  const isNativePlatform = Capacitor.isNativePlatform();
  if (!isNativePlatform) {
    issues.push('非原生移动端平台');
  }

  // 检查初始化状态
  const isInitialized = mobilePaymentService.isReady();
  if (!isInitialized && isNativePlatform) {
    issues.push('RevenueCat未初始化');
  }

  // 检查API密钥
  const hasApiKey = !!REVENUECAT_CONFIG.apiKey;
  if (!hasApiKey) {
    issues.push('RevenueCat API密钥未配置');
  }

  // 检查配置
  const configValidation = validateProductConfig();
  if (!configValidation.isValid) {
    issues.push(`产品配置错误: ${configValidation.errors.join(', ')}`);
  }

  const isHealthy = isNativePlatform ? 
    (isInitialized && hasApiKey && configValidation.isValid) : 
    true; // 非移动端环境认为是健康的

  return {
    isHealthy,
    details: {
      isNativePlatform,
      isInitialized,
      hasApiKey,
      configValid: configValidation.isValid
    },
    issues: issues.length > 0 ? issues : undefined
  };
}

/**
 * 获取支付系统信息（用于调试）
 */
export function getPaymentSystemInfo(): {
  platform: string;
  environment: string;
  apiKeyConfigured: boolean;
  isInitialized: boolean;
  productCount: number;
} {
  return {
    platform: Capacitor.getPlatform(),
    environment: REVENUECAT_CONFIG.environment,
    apiKeyConfigured: !!REVENUECAT_CONFIG.apiKey,
    isInitialized: mobilePaymentService.isReady(),
    productCount: validateProductConfig().isValid ? 
      require('../config/app-store-products').getActiveProducts().length : 0
  };
}

/**
 * 在应用启动时自动初始化（可选）
 * 可以在 _app.tsx 或主组件中调用
 */
export async function autoInitializePayment(): Promise<void> {
  try {
    // 只在移动端环境自动初始化
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // 延迟初始化，确保应用完全加载
    setTimeout(async () => {
      const result = await initializeMobilePayment();
      
      if (result.success) {
        console.log('🔄 [MobilePaymentInit] 自动初始化成功');
        if (result.warnings) {
          console.warn('🔄 [MobilePaymentInit] 警告:', result.warnings);
        }
      } else {
        console.error('🔄 [MobilePaymentInit] 自动初始化失败:', result.error);
      }
    }, 1000); // 延迟1秒

  } catch (error) {
    console.error('🔄 [MobilePaymentInit] 自动初始化异常:', error);
  }
}

// 导出常用的配置信息
export { REVENUECAT_CONFIG } from '../config/app-store-products';
