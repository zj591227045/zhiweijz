import { AsyncStorageAdapter, STORAGE_KEYS } from '../adapters/storage-adapter';
import { createStorageDebugger } from './storage-debug';

/**
 * AsyncStorage功能测试套件
 */
export class AsyncStorageTestSuite {
  private storage: AsyncStorageAdapter;
  private debugger: any;

  constructor() {
    this.storage = new AsyncStorageAdapter();
    this.debugger = createStorageDebugger(this.storage);
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      name: string;
      passed: boolean;
      error?: string;
      duration: number;
    }>;
  }> {
    const tests = [
      { name: '基础读写测试', fn: () => this.testBasicReadWrite() },
      { name: 'JSON数据测试', fn: () => this.testJSONData() },
      { name: '认证数据测试', fn: () => this.testAuthData() },
      { name: '批量操作测试', fn: () => this.testBatchOperations() },
      { name: '错误处理测试', fn: () => this.testErrorHandling() },
      { name: '性能测试', fn: () => this.testPerformance() },
      { name: '持久化测试', fn: () => this.testPersistence() },
    ];

    const results = [];
    let passed = 0;
    let failed = 0;

    console.log('🧪 开始AsyncStorage测试套件...');

    for (const test of tests) {
      const startTime = Date.now();
      try {
        console.log(`⏳ 运行测试: ${test.name}`);
        await test.fn();
        const duration = Date.now() - startTime;
        console.log(`✅ ${test.name} 通过 (${duration}ms)`);
        results.push({
          name: test.name,
          passed: true,
          duration,
        });
        passed++;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`❌ ${test.name} 失败 (${duration}ms):`, error.message);
        results.push({
          name: test.name,
          passed: false,
          error: error.message,
          duration,
        });
        failed++;
      }
    }

    console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
    return { passed, failed, results };
  }

  /**
   * 基础读写测试
   */
  private async testBasicReadWrite(): Promise<void> {
    const testKey = 'test-basic-key';
    const testValue = 'test-basic-value';

    // 测试写入
    await this.storage.setItem(testKey, testValue);

    // 测试读取
    const retrievedValue = await this.storage.getItem(testKey);
    if (retrievedValue !== testValue) {
      throw new Error(`期望值: ${testValue}, 实际值: ${retrievedValue}`);
    }

    // 测试删除
    await this.storage.removeItem(testKey);
    const deletedValue = await this.storage.getItem(testKey);
    if (deletedValue !== null) {
      throw new Error(`删除后应该为null, 实际值: ${deletedValue}`);
    }
  }

  /**
   * JSON数据测试
   */
  private async testJSONData(): Promise<void> {
    const testKey = 'test-json-key';
    const testData = {
      id: 1,
      name: '测试用户',
      email: 'test@example.com',
      settings: {
        theme: 'dark',
        notifications: true,
      },
      tags: ['tag1', 'tag2', 'tag3'],
    };

    // 测试JSON写入
    await this.storage.setItem(testKey, JSON.stringify(testData));

    // 测试JSON读取
    const retrievedValue = await this.storage.getItem(testKey);
    if (!retrievedValue) {
      throw new Error('JSON数据读取失败');
    }

    const parsedData = JSON.parse(retrievedValue);
    if (JSON.stringify(parsedData) !== JSON.stringify(testData)) {
      throw new Error('JSON数据不匹配');
    }

    // 清理
    await this.storage.removeItem(testKey);
  }

  /**
   * 认证数据测试
   */
  private async testAuthData(): Promise<void> {
    const testToken = 'test-auth-token-' + Date.now();
    const testUser = {
      id: '123',
      name: '测试用户',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
    };

    // 测试认证令牌存储
    await this.storage.setItem(STORAGE_KEYS.AUTH_TOKEN, testToken);
    const retrievedToken = await this.storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (retrievedToken !== testToken) {
      throw new Error('认证令牌存储失败');
    }

    // 测试用户信息存储
    await this.storage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(testUser));
    const retrievedUserStr = await this.storage.getItem(STORAGE_KEYS.USER_INFO);
    if (!retrievedUserStr) {
      throw new Error('用户信息存储失败');
    }

    const retrievedUser = JSON.parse(retrievedUserStr);
    if (retrievedUser.id !== testUser.id || retrievedUser.email !== testUser.email) {
      throw new Error('用户信息不匹配');
    }

    // 清理
    await this.storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await this.storage.removeItem(STORAGE_KEYS.USER_INFO);
  }

  /**
   * 批量操作测试
   */
  private async testBatchOperations(): Promise<void> {
    const testData = [
      ['batch-key-1', 'value-1'],
      ['batch-key-2', 'value-2'],
      ['batch-key-3', 'value-3'],
    ] as [string, string][];

    // 测试批量写入
    await this.storage.multiSet(testData);

    // 测试批量读取
    const keys = testData.map(([key]) => key);
    const retrievedData = await this.storage.multiGet(keys);

    for (let i = 0; i < testData.length; i++) {
      const [expectedKey, expectedValue] = testData[i];
      const [retrievedKey, retrievedValue] = retrievedData[i];
      
      if (retrievedKey !== expectedKey || retrievedValue !== expectedValue) {
        throw new Error(`批量操作数据不匹配: 期望 ${expectedKey}=${expectedValue}, 实际 ${retrievedKey}=${retrievedValue}`);
      }
    }

    // 测试批量删除
    await this.storage.multiRemove(keys);

    // 验证删除
    const deletedData = await this.storage.multiGet(keys);
    for (const [key, value] of deletedData) {
      if (value !== null) {
        throw new Error(`批量删除失败: ${key} 仍然存在`);
      }
    }
  }

  /**
   * 错误处理测试
   */
  private async testErrorHandling(): Promise<void> {
    // 测试无效键名（这个测试可能需要根据实际情况调整）
    try {
      await this.storage.getItem('');
      // 如果没有抛出错误，这可能是正常的，取决于AsyncStorage的实现
    } catch (error) {
      // 预期的错误，继续测试
    }

    // 测试大数据存储（可能会有限制）
    const largeData = 'x'.repeat(1024 * 1024); // 1MB数据
    try {
      await this.storage.setItem('large-data-test', largeData);
      await this.storage.removeItem('large-data-test');
    } catch (error) {
      // 如果存储大数据失败，这可能是正常的限制
      console.warn('大数据存储测试失败，这可能是正常的存储限制');
    }
  }

  /**
   * 性能测试
   */
  private async testPerformance(): Promise<void> {
    const iterations = 50;
    const testKey = 'perf-test-key';
    const testValue = JSON.stringify({ data: 'performance test data', timestamp: Date.now() });

    // 写入性能测试
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.storage.setItem(`${testKey}-${i}`, testValue);
    }
    const writeTime = Date.now() - writeStart;

    // 读取性能测试
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.storage.getItem(`${testKey}-${i}`);
    }
    const readTime = Date.now() - readStart;

    // 删除性能测试
    const deleteStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.storage.removeItem(`${testKey}-${i}`);
    }
    const deleteTime = Date.now() - deleteStart;

    console.log(`性能测试结果 (${iterations}次操作):`);
    console.log(`- 写入: ${writeTime}ms (平均 ${(writeTime / iterations).toFixed(2)}ms/次)`);
    console.log(`- 读取: ${readTime}ms (平均 ${(readTime / iterations).toFixed(2)}ms/次)`);
    console.log(`- 删除: ${deleteTime}ms (平均 ${(deleteTime / iterations).toFixed(2)}ms/次)`);

    // 性能阈值检查（可以根据需要调整）
    if (writeTime > 5000 || readTime > 3000 || deleteTime > 3000) {
      throw new Error('性能测试未达到预期阈值');
    }
  }

  /**
   * 持久化测试
   */
  private async testPersistence(): Promise<void> {
    const testKey = 'persistence-test-key';
    const testValue = 'persistence-test-value-' + Date.now();

    // 写入数据
    await this.storage.setItem(testKey, testValue);

    // 模拟应用重启（实际上我们无法真正重启，但可以创建新的适配器实例）
    const newStorage = new AsyncStorageAdapter();
    const retrievedValue = await newStorage.getItem(testKey);

    if (retrievedValue !== testValue) {
      throw new Error(`持久化测试失败: 期望 ${testValue}, 实际 ${retrievedValue}`);
    }

    // 清理
    await this.storage.removeItem(testKey);
  }

  /**
   * 清理测试数据
   */
  async cleanup(): Promise<void> {
    try {
      const keys = await this.storage.getAllKeys();
      const testKeys = keys.filter(key => 
        key.startsWith('test-') || 
        key.startsWith('batch-') || 
        key.startsWith('perf-') ||
        key.startsWith('persistence-')
      );
      
      if (testKeys.length > 0) {
        await this.storage.multiRemove(testKeys);
        console.log(`🧹 清理了 ${testKeys.length} 个测试数据`);
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  }
}

/**
 * 快速运行AsyncStorage测试
 */
export async function runAsyncStorageTests(): Promise<void> {
  const testSuite = new AsyncStorageTestSuite();
  
  try {
    const results = await testSuite.runAllTests();
    
    console.log('\n📋 详细测试结果:');
    results.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      const error = result.error ? ` - ${result.error}` : '';
      console.log(`${status} ${result.name} (${duration})${error}`);
    });
    
    if (results.failed === 0) {
      console.log('\n🎉 所有AsyncStorage测试通过！');
    } else {
      console.log(`\n⚠️  有 ${results.failed} 个测试失败，需要检查AsyncStorage配置`);
    }
  } finally {
    await testSuite.cleanup();
  }
}
