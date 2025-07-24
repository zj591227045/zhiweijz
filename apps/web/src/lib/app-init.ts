/**
 * 应用初始化模块
 * 在应用启动时自动初始化支付系统
 */

import { mobilePaymentService, REVENUECAT_CONFIG } from './payment';
import { Capacitor } from '@capacitor/core';

let isInitialized = false;

/**
 * 初始化应用
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    console.log('🚀 [AppInit] 应用已初始化，跳过');
    return;
  }

  console.log('🚀 [AppInit] 开始初始化应用...');

  try {
    // 检查是否在移动端环境
    const isMobile = Capacitor.isNativePlatform();
    console.log('🚀 [AppInit] 平台信息:', {
      platform: Capacitor.getPlatform(),
      isNative: isMobile
    });

    // 如果在移动端，初始化支付系统
    if (isMobile) {
      await initializePaymentSystem();
    } else {
      console.log('🚀 [AppInit] Web环境，跳过支付系统初始化');
    }

    isInitialized = true;
    console.log('🚀 [AppInit] 应用初始化完成');

  } catch (error) {
    console.error('🚀 [AppInit] 应用初始化失败:', error);
    throw error;
  }
}

/**
 * 初始化支付系统
 */
async function initializePaymentSystem(): Promise<void> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || 'appl_mZpkfekTpXxlxbtlJAMmdXJLoRc';
    
    if (!apiKey) {
      throw new Error('RevenueCat API密钥未配置');
    }

    console.log('💰 [PaymentInit] 开始初始化RevenueCat...');
    await mobilePaymentService.initialize(apiKey);
    console.log('💰 [PaymentInit] RevenueCat初始化成功');

  } catch (error) {
    console.error('💰 [PaymentInit] 支付系统初始化失败:', error);
    // 不抛出错误，允许应用继续运行
  }
}

/**
 * 设置用户ID（用户登录后调用）
 */
export async function setPaymentUserId(userId: string): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!mobilePaymentService.isReady()) {
      console.warn('💰 [PaymentInit] RevenueCat未初始化，无法设置用户ID');
      return;
    }

    await mobilePaymentService.setUserId(userId);
    console.log('💰 [PaymentInit] 用户ID设置成功:', userId);

  } catch (error) {
    console.error('💰 [PaymentInit] 设置用户ID失败:', error);
  }
}

/**
 * 用户登出时清理
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
    console.log('💰 [PaymentInit] 用户状态已清理');

  } catch (error) {
    console.error('💰 [PaymentInit] 清理用户状态失败:', error);
  }
}

/**
 * 检查支付系统状态
 */
export function getPaymentSystemStatus() {
  return {
    isInitialized: isInitialized,
    isReady: mobilePaymentService.isReady(),
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    hasApiKey: !!process.env.NEXT_PUBLIC_REVENUECAT_API_KEY
  };
}
