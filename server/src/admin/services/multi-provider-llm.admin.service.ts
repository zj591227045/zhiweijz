import { MultiProviderLLMService } from '../../ai/llm/multi-provider-service';
import { MultiProviderLLMConfig } from '../../ai/types/llm-types';

export class MultiProviderLLMAdminService {
  private multiProviderService: MultiProviderLLMService;

  constructor() {
    this.multiProviderService = new MultiProviderLLMService();
  }

  /**
   * 获取多提供商配置
   */
  async getMultiProviderConfig(): Promise<MultiProviderLLMConfig | null> {
    try {
      return await this.multiProviderService.loadMultiProviderConfig();
    } catch (error) {
      console.error('获取多提供商配置失败:', error);
      throw new Error('获取多提供商配置失败');
    }
  }

  /**
   * 更新多提供商配置
   * 注意：当启用多提供商模式时，系统将优先使用多提供商配置而非全局单一配置
   */
  async updateMultiProviderConfig(config: Partial<MultiProviderLLMConfig>): Promise<void> {
    try {
      // 如果启用多提供商模式，需要检查是否与全局LLM配置冲突
      if (config.enabled) {
        console.log('启用多提供商模式，系统将优先使用多提供商配置');
        
        // 可选：自动禁用全局LLM配置以避免混淆
        // 这是一个可选的业务逻辑，可以根据需要启用
        // await this.disableGlobalLLMConfig();
      }

      // 获取当前配置
      const currentConfig = await this.multiProviderService.loadMultiProviderConfig();
      const updatedConfig = { ...currentConfig, ...config } as MultiProviderLLMConfig;
      
      await this.multiProviderService.saveMultiProviderConfig(updatedConfig);
    } catch (error) {
      console.error('更新多提供商配置失败:', error);
      throw new Error('更新多提供商配置失败');
    }
  }

  /**
   * 获取配置使用优先级说明
   * 返回当前系统使用的LLM配置来源
   */
  async getConfigPriorityInfo() {
    try {
      const multiProviderConfig = await this.multiProviderService.loadMultiProviderConfig();
      
      if (multiProviderConfig?.enabled && multiProviderConfig.providers.length > 0) {
        return {
          mode: 'multi-provider',
          description: '当前使用多提供商配置',
          activeProviders: multiProviderConfig.providers.filter((p: any) => p.enabled).length,
          note: '多提供商模式激活时，全局LLM配置将被忽略'
        };
      } else {
        return {
          mode: 'single-provider',
          description: '当前使用全局LLM配置（单一提供商）',
          note: '多提供商模式未启用或无可用提供商，系统回退到全局LLM配置'
        };
      }
    } catch (error) {
      console.error('获取配置优先级信息失败:', error);
      throw new Error('获取配置优先级信息失败');
    }
  }

  /**
   * 可选：禁用全局LLM配置（避免混淆）
   */
  private async disableGlobalLLMConfig() {
    try {
      // 这里可以调用系统配置服务来禁用全局LLM
      // 但通常不推荐自动禁用，让用户手动选择更好
      console.log('建议用户在启用多提供商模式时禁用全局LLM配置以避免混淆');
    } catch (error) {
      console.error('禁用全局LLM配置失败:', error);
    }
  }
} 