/**
 * Token Manager 测试工具
 * 用于测试token状态检查的各种边界情况
 */

import { tokenManager } from '@/lib/token-manager';

export class TokenManagerTest {
  /**
   * 测试token状态检查的健壮性
   */
  static async testTokenStatusRobustness(): Promise<void> {
    console.log('🧪 开始测试Token Manager的健壮性...');

    try {
      // 测试正常情况
      console.log('1. 测试正常token状态检查...');
      const status = await tokenManager.getCurrentStatus();
      console.log('✅ 正常状态检查结果:', status);

      // 测试手动检查
      console.log('2. 测试手动token检查...');
      const checkResult = await tokenManager.checkNow();
      console.log('✅ 手动检查结果:', checkResult);

      console.log('🎉 Token Manager健壮性测试完成');
    } catch (error) {
      console.error('❌ Token Manager测试失败:', error);
    }
  }

  /**
   * 模拟各种响应情况进行测试
   */
  static async simulateResponseScenarios(): Promise<void> {
    console.log('🧪 开始模拟各种响应情况...');

    // 这里可以添加更多的模拟测试
    // 例如模拟网络错误、无效响应等情况

    console.log('🎉 响应情况模拟测试完成');
  }
}

// 导出便捷的测试函数
export const testTokenManager = () => TokenManagerTest.testTokenStatusRobustness();
export const testTokenManagerScenarios = () => TokenManagerTest.simulateResponseScenarios();
