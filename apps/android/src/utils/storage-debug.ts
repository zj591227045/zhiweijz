import { AsyncStorageAdapter, STORAGE_KEYS, storageUtils } from '../adapters/storage-adapter';

/**
 * AsyncStorage调试工具
 * 提供存储状态检查、数据导出、清理等功能
 */
export class StorageDebugger {
  private storage: AsyncStorageAdapter;

  constructor(storage: AsyncStorageAdapter) {
    this.storage = storage;
  }

  /**
   * 打印所有存储项
   */
  async printAllItems(): Promise<void> {
    try {
      console.log('=== AsyncStorage 调试信息 ===');
      
      const keys = await this.storage.getAllKeys();
      console.log(`总共有 ${keys.length} 个存储项:`);
      
      if (keys.length === 0) {
        console.log('存储为空');
        return;
      }

      const items = await this.storage.multiGet(keys);
      
      for (const [key, value] of items) {
        console.log(`${key}: ${value ? (value.length > 100 ? `${value.substring(0, 100)}...` : value) : 'null'}`);
      }
      
      console.log('=== 调试信息结束 ===');
    } catch (error) {
      console.error('打印存储项失败:', error);
    }
  }

  /**
   * 检查特定键的存储状态
   */
  async checkKey(key: string): Promise<{
    exists: boolean;
    value: string | null;
    size: number;
    isValidJSON: boolean;
    parsedValue?: any;
  }> {
    try {
      const value = await this.storage.getItem(key);
      const exists = value !== null;
      const size = value ? value.length : 0;
      
      let isValidJSON = false;
      let parsedValue;
      
      if (value) {
        try {
          parsedValue = JSON.parse(value);
          isValidJSON = true;
        } catch {
          isValidJSON = false;
        }
      }

      return {
        exists,
        value,
        size,
        isValidJSON,
        parsedValue,
      };
    } catch (error) {
      console.error(`检查键 ${key} 失败:`, error);
      return {
        exists: false,
        value: null,
        size: 0,
        isValidJSON: false,
      };
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuthStatus(): Promise<{
    hasToken: boolean;
    tokenLength: number;
    hasUserInfo: boolean;
    hasAuthStorage: boolean;
    authStorageData?: any;
  }> {
    try {
      const tokenCheck = await this.checkKey(STORAGE_KEYS.AUTH_TOKEN);
      const userCheck = await this.checkKey(STORAGE_KEYS.USER_INFO);
      const authStorageCheck = await this.checkKey(STORAGE_KEYS.AUTH_STORAGE);

      return {
        hasToken: tokenCheck.exists,
        tokenLength: tokenCheck.size,
        hasUserInfo: userCheck.exists,
        hasAuthStorage: authStorageCheck.exists,
        authStorageData: authStorageCheck.parsedValue,
      };
    } catch (error) {
      console.error('检查认证状态失败:', error);
      return {
        hasToken: false,
        tokenLength: 0,
        hasUserInfo: false,
        hasAuthStorage: false,
      };
    }
  }

  /**
   * 导出所有存储数据
   */
  async exportAllData(): Promise<Record<string, any>> {
    try {
      const keys = await this.storage.getAllKeys();
      const items = await this.storage.multiGet(keys);
      const exportData: Record<string, any> = {};

      for (const [key, value] of items) {
        if (value) {
          try {
            exportData[key] = JSON.parse(value);
          } catch {
            exportData[key] = value;
          }
        } else {
          exportData[key] = null;
        }
      }

      return exportData;
    } catch (error) {
      console.error('导出数据失败:', error);
      return {};
    }
  }

  /**
   * 清理过期或无效的存储项
   */
  async cleanupInvalidItems(): Promise<{
    removedKeys: string[];
    errors: string[];
  }> {
    const removedKeys: string[] = [];
    const errors: string[] = [];

    try {
      const keys = await this.storage.getAllKeys();
      
      for (const key of keys) {
        try {
          const value = await this.storage.getItem(key);
          
          // 检查是否为空值
          if (value === null || value === undefined || value === '') {
            await this.storage.removeItem(key);
            removedKeys.push(key);
            continue;
          }

          // 检查是否为无效JSON（对于应该是JSON的键）
          if (Object.values(STORAGE_KEYS).includes(key as any)) {
            try {
              JSON.parse(value);
            } catch {
              // 如果是认证相关的键但不是有效JSON，可能需要清理
              if (key.includes('auth') || key.includes('storage')) {
                await this.storage.removeItem(key);
                removedKeys.push(key);
              }
            }
          }
        } catch (error) {
          errors.push(`处理键 ${key} 时出错: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`清理过程出错: ${error}`);
    }

    return { removedKeys, errors };
  }

  /**
   * 测试存储读写性能
   */
  async performanceTest(iterations: number = 100): Promise<{
    writeTime: number;
    readTime: number;
    deleteTime: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let writeTime = 0;
    let readTime = 0;
    let deleteTime = 0;

    try {
      const testKey = 'performance-test-key';
      const testValue = JSON.stringify({ test: 'data', timestamp: Date.now() });

      // 写入测试
      const writeStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.storage.setItem(`${testKey}-${i}`, testValue);
      }
      writeTime = Date.now() - writeStart;

      // 读取测试
      const readStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.storage.getItem(`${testKey}-${i}`);
      }
      readTime = Date.now() - readStart;

      // 删除测试
      const deleteStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.storage.removeItem(`${testKey}-${i}`);
      }
      deleteTime = Date.now() - deleteStart;

    } catch (error) {
      errors.push(`性能测试出错: ${error}`);
    }

    return {
      writeTime,
      readTime,
      deleteTime,
      errors,
    };
  }

  /**
   * 生成存储报告
   */
  async generateReport(): Promise<string> {
    try {
      const authStatus = await this.checkAuthStatus();
      const storageInfo = await storageUtils.getStorageInfo(this.storage);
      const performanceResult = await this.performanceTest(10);

      const report = `
=== AsyncStorage 状态报告 ===
生成时间: ${new Date().toLocaleString()}

存储概况:
- 总键数: ${storageInfo.totalKeys}
- 估计大小: ${storageInfo.estimatedSize} 字符

认证状态:
- 有认证令牌: ${authStatus.hasToken ? '是' : '否'}
- 令牌长度: ${authStatus.tokenLength}
- 有用户信息: ${authStatus.hasUserInfo ? '是' : '否'}
- 有认证存储: ${authStatus.hasAuthStorage ? '是' : '否'}

性能测试 (10次操作):
- 写入耗时: ${performanceResult.writeTime}ms
- 读取耗时: ${performanceResult.readTime}ms
- 删除耗时: ${performanceResult.deleteTime}ms

存储键列表:
${storageInfo.keys.map(key => `- ${key}`).join('\n')}

=== 报告结束 ===
      `;

      return report.trim();
    } catch (error) {
      return `生成报告失败: ${error}`;
    }
  }
}

/**
 * 创建存储调试器实例
 */
export function createStorageDebugger(storage: AsyncStorageAdapter): StorageDebugger {
  return new StorageDebugger(storage);
}

/**
 * 快速调试函数 - 打印存储状态
 */
export async function quickDebugStorage(storage: AsyncStorageAdapter): Promise<void> {
  const debugger = createStorageDebugger(storage);
  await debugger.printAllItems();
  
  const authStatus = await debugger.checkAuthStatus();
  console.log('认证状态:', authStatus);
}

/**
 * 快速调试函数 - 生成并打印报告
 */
export async function quickReportStorage(storage: AsyncStorageAdapter): Promise<void> {
  const debugger = createStorageDebugger(storage);
  const report = await debugger.generateReport();
  console.log(report);
}
