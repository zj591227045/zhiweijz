/**
 * 移动端支付系统初始化
 * 处理RevenueCat的初始化和用户ID设置
 */

import { Platform } from 'react-native';

// RevenueCat相关类型定义
interface PurchasesType {
  configure: (config: { apiKey: string; appUserID?: string }) => Promise<void>;
  logIn: (config: { appUserID: string }) => Promise<any>;
  logOut: () => Promise<any>;
  setLogLevel: (config: { level: string }) => Promise<void>;
  getCustomerInfo: () => Promise<any>;
  restorePurchases: () => Promise<any>;
}

let Purchases: PurchasesType | null = null;
let isInitialized = false;

/**
 * 动态加载RevenueCat
 */
async function loadRevenueCat(): Promise<PurchasesType | null> {
  try {
    const { Purchases: PurchasesModule } = await import('@revenuecat/purchases-capacitor');
    return PurchasesModule;
  } catch (error) {
    console.warn('💰 [MobilePayment] RevenueCat加载失败:', error);
    return null;
  }
}

/**
 * 初始化移动端支付系统
 */
export async function initializeMobilePayment(userId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💰 [MobilePayment] 开始初始化...');

    // 检查是否在移动端环境
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('💰 [MobilePayment] 非移动端环境，跳过初始化');
      return { success: true };
    }

    // 如果已经初始化，直接返回
    if (isInitialized && Purchases) {
      console.log('💰 [MobilePayment] 已经初始化，跳过');
      return { success: true };
    }

    // 加载RevenueCat
    Purchases = await loadRevenueCat();
    if (!Purchases) {
      return { success: false, error: 'RevenueCat加载失败' };
    }

    // 获取API密钥
    const apiKey = Platform.OS === 'ios' 
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_your_ios_key'
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || 'goog_your_android_key';

    // 配置RevenueCat
    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined, // 如果不提供，RevenueCat会生成匿名ID
    });

    // 设置调试日志级别（仅在开发环境）
    if (__DEV__) {
      await Purchases.setLogLevel({ level: 'DEBUG' });
    }

    isInitialized = true;
    console.log('💰 [MobilePayment] 初始化成功');

    return { success: true };

  } catch (error) {
    console.error('💰 [MobilePayment] 初始化失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '初始化失败' 
    };
  }
}

/**
 * 设置用户ID（用户登录后调用）
 */
export async function setPaymentUserId(userId: string): Promise<boolean> {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('💰 [MobilePayment] 非移动端环境，跳过设置用户ID');
      return true;
    }

    if (!Purchases) {
      console.warn('💰 [MobilePayment] RevenueCat未初始化，无法设置用户ID');
      return false;
    }

    await Purchases.logIn({ appUserID: userId });
    console.log('💰 [MobilePayment] 用户ID设置成功:', userId);
    return true;

  } catch (error) {
    console.error('💰 [MobilePayment] 设置用户ID失败:', error);
    return false;
  }
}

/**
 * 用户登出时清理
 */
export async function clearPaymentUser(): Promise<void> {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    if (!Purchases) {
      return;
    }

    await Purchases.logOut();
    console.log('💰 [MobilePayment] 用户状态已清理');

  } catch (error) {
    console.error('💰 [MobilePayment] 清理用户状态失败:', error);
  }
}

/**
 * 检查RevenueCat是否已初始化
 */
export function isPaymentReady(): boolean {
  return isInitialized && !!Purchases;
}

/**
 * 获取客户信息
 */
export async function getCustomerInfo(): Promise<any> {
  if (!Purchases) {
    throw new Error('RevenueCat未初始化');
  }

  return await Purchases.getCustomerInfo();
}

/**
 * 恢复购买
 */
export async function restorePurchases(): Promise<any> {
  if (!Purchases) {
    throw new Error('RevenueCat未初始化');
  }

  return await Purchases.restorePurchases();
}
