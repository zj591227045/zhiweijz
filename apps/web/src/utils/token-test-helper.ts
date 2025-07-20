/**
 * Token测试辅助工具
 * 用于测试和验证token刷新机制
 */

import { tokenManager } from '@/lib/token-manager';
import { apiClient } from '@/lib/api-client';

interface TokenTestResult {
  success: boolean;
  message: string;
  details?: any;
}

class TokenTestHelper {
  private testResults: Array<{ test: string; result: TokenTestResult; timestamp: Date }> = [];

  /**
   * 测试当前token状态
   */
  async testCurrentTokenStatus(): Promise<TokenTestResult> {
    try {
      const status = await tokenManager.getCurrentStatus();

      if (!status) {
        return {
          success: false,
          message: '无法获取token状态',
        };
      }

      return {
        success: true,
        message: `Token状态正常，剩余时间: ${status.remainingTime}秒，需要刷新: ${status.needsRefresh}`,
        details: status,
      };
    } catch (error) {
      return {
        success: false,
        message: `获取token状态失败: ${error.message}`,
        details: error,
      };
    }
  }

  /**
   * 测试token刷新功能
   */
  async testTokenRefresh(): Promise<TokenTestResult> {
    try {
      const success = await tokenManager.refreshToken();

      return {
        success,
        message: success ? 'Token刷新成功' : 'Token刷新失败',
      };
    } catch (error) {
      return {
        success: false,
        message: `Token刷新异常: ${error.message}`,
        details: error,
      };
    }
  }

  /**
   * 测试API调用（验证token自动刷新）
   */
  async testApiCall(): Promise<TokenTestResult> {
    try {
      // 调用一个需要认证的API
      const response = await apiClient.get('/auth/check');

      return {
        success: true,
        message: 'API调用成功，token验证通过',
        details: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `API调用失败: ${error.message}`,
        details: error,
      };
    }
  }

  /**
   * 模拟长时间停留测试
   */
  async simulateLongStay(durationMinutes: number = 10): Promise<void> {
    console.log(`🧪 开始模拟长时间停留测试 (${durationMinutes}分钟)`);

    const startTime = Date.now();
    const endTime = startTime + durationMinutes * 60 * 1000;

    // 每分钟检查一次token状态
    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      console.log(`⏰ 已停留 ${elapsed} 分钟`);

      const result = await this.testCurrentTokenStatus();
      console.log(`📊 Token状态:`, result);

      if (Date.now() >= endTime) {
        clearInterval(interval);
        console.log(`✅ 长时间停留测试完成`);
      }
    }, 60 * 1000);
  }

  /**
   * 运行完整的token测试套件
   */
  async runFullTestSuite(): Promise<void> {
    console.log('🧪 开始运行Token测试套件');

    const tests = [
      { name: '当前Token状态', test: () => this.testCurrentTokenStatus() },
      { name: 'Token刷新功能', test: () => this.testTokenRefresh() },
      { name: 'API调用测试', test: () => this.testApiCall() },
    ];

    for (const { name, test } of tests) {
      console.log(`\n🔍 执行测试: ${name}`);

      try {
        const result = await test();
        this.testResults.push({
          test: name,
          result,
          timestamp: new Date(),
        });

        console.log(result.success ? '✅' : '❌', result.message);
        if (result.details) {
          console.log('📋 详细信息:', result.details);
        }
      } catch (error) {
        console.error('❌ 测试执行异常:', error);
        this.testResults.push({
          test: name,
          result: {
            success: false,
            message: `测试执行异常: ${error.message}`,
            details: error,
          },
          timestamp: new Date(),
        });
      }
    }

    console.log('\n📊 测试套件完成');
    this.printTestSummary();
  }

  /**
   * 打印测试摘要
   */
  printTestSummary(): void {
    console.log('\n📋 测试摘要:');
    console.log('='.repeat(50));

    this.testResults.forEach(({ test, result, timestamp }) => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      console.log(`${status} ${test} (${timestamp.toLocaleTimeString()})`);
      if (!result.success) {
        console.log(`   错误: ${result.message}`);
      }
    });

    const passed = this.testResults.filter((r) => r.result.success).length;
    const total = this.testResults.length;
    console.log(`\n总计: ${passed}/${total} 测试通过`);
  }

  /**
   * 清除测试结果
   */
  clearResults(): void {
    this.testResults = [];
    console.log('🧹 测试结果已清除');
  }

  /**
   * 获取测试结果
   */
  getResults(): Array<{ test: string; result: TokenTestResult; timestamp: Date }> {
    return [...this.testResults];
  }

  /**
   * 监控token状态变化
   */
  startTokenMonitoring(): void {
    console.log('👀 开始监控token状态变化');

    // 每30秒检查一次token状态
    const interval = setInterval(async () => {
      const result = await this.testCurrentTokenStatus();
      const timestamp = new Date().toLocaleTimeString();

      if (result.success) {
        console.log(`[${timestamp}] 📊 Token状态: ${result.message}`);
      } else {
        console.warn(`[${timestamp}] ⚠️ Token问题: ${result.message}`);
      }
    }, 30 * 1000);

    // 返回停止函数
    return () => {
      clearInterval(interval);
      console.log('🛑 停止token状态监控');
    };
  }
}

// 创建全局实例
export const tokenTestHelper = new TokenTestHelper();

// 在开发环境下将测试工具添加到window对象
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).tokenTestHelper = tokenTestHelper;
  console.log('🧪 Token测试工具已加载，使用 window.tokenTestHelper 访问');
}
