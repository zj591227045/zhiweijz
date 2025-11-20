import { LLMProvider } from './llm-provider';
import { OpenAIProvider } from './openai-provider';
import { SiliconFlowProvider } from './siliconflow-provider';
import { DeepseekProvider } from './deepseek-provider';
import { CustomProvider } from './custom-provider';
import { VolcengineProvider } from './volcengine-provider';
import {
  LLMProviderInstance,
  MultiProviderLLMConfig,
  ProviderHealthStatus,
  LLMRequestResult,
  Message,
  LLMSettings,
} from '../types/llm-types';
import axios from 'axios';
import prisma from '../../config/database';

/**
 * 多提供商LLM服务
 * 支持优先级、故障转移和负载均衡
 * 使用单例模式确保全局只有一个实例
 */
export class MultiProviderLLMService {
  private static instance: MultiProviderLLMService | null = null;
  private providers: Map<string, LLMProvider> = new Map();
  private providerInstances: Map<string, LLMProviderInstance> = new Map();
  private loadBalancingCounters: Map<number, number> = new Map(); // priority -> counter
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.registerProviders();
    this.initializeHealthCheck();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MultiProviderLLMService {
    if (!MultiProviderLLMService.instance) {
      MultiProviderLLMService.instance = new MultiProviderLLMService();
    }
    return MultiProviderLLMService.instance;
  }

  /**
   * 注册所有提供商
   */
  private registerProviders() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('siliconflow', new SiliconFlowProvider());
    this.providers.set('deepseek', new DeepseekProvider());
    this.providers.set('volcengine', new VolcengineProvider());
    this.providers.set('custom', new CustomProvider());
  }

  /**
   * 初始化健康检查
   */
  private initializeHealthCheck() {
    // 检查是否使用统一调度器
    const useUnifiedScheduler = process.env.USE_UNIFIED_SCHEDULER === 'true';

    if (useUnifiedScheduler) {
      // 使用统一调度器时，不启动独立的健康检查
      console.log('统一调度器模式 - LLM健康检查由计划任务管理');
      return;
    }

    // 传统模式：启动独立健康检查
    // 每5分钟执行一次健康检查
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    // 启动时立即执行一次健康检查
    setTimeout(() => {
      this.performHealthCheck();
    }, 1000);
  }

  /**
   * 从数据库加载多提供商配置
   */
  public async loadMultiProviderConfig(): Promise<MultiProviderLLMConfig | null> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'llm_multi_provider_config' },
      });

      if (!config || !config.value) {
        return null;
      }

      const multiProviderConfig: MultiProviderLLMConfig = JSON.parse(config.value);

      // 更新内存中的提供商实例
      this.providerInstances.clear();
      multiProviderConfig.providers.forEach((provider) => {
        this.providerInstances.set(provider.id, provider);
      });

      return multiProviderConfig;
    } catch (error) {
      console.error('加载多提供商配置失败:', error);
      return null;
    }
  }

  /**
   * 保存多提供商配置到数据库
   */
  public async saveMultiProviderConfig(config: MultiProviderLLMConfig): Promise<boolean> {
    try {
      await prisma.systemConfig.upsert({
        where: { key: 'llm_multi_provider_config' },
        create: {
          key: 'llm_multi_provider_config',
          value: JSON.stringify(config),
          category: 'llm',
          description: '多提供商LLM配置',
        },
        update: {
          value: JSON.stringify(config),
          updatedAt: new Date(),
        },
      });

      // 更新内存中的提供商实例
      this.providerInstances.clear();
      config.providers.forEach((provider) => {
        this.providerInstances.set(provider.id, provider);
      });

      return true;
    } catch (error) {
      console.error('保存多提供商配置失败:', error);
      return false;
    }
  }

  /**
   * 按优先级获取可用的提供商实例
   */
  private getAvailableProviders(): LLMProviderInstance[][] {
    const providers = Array.from(this.providerInstances.values())
      .filter((p) => p.enabled && p.healthy)
      .sort((a, b) => a.priority - b.priority);

    // 按优先级分组
    const groupedProviders: { [priority: number]: LLMProviderInstance[] } = {};
    providers.forEach((provider) => {
      if (!groupedProviders[provider.priority]) {
        groupedProviders[provider.priority] = [];
      }
      groupedProviders[provider.priority].push(provider);
    });

    return Object.values(groupedProviders);
  }

  /**
   * 从同优先级提供商中选择一个（负载均衡）
   */
  private selectProviderFromGroup(
    providers: LLMProviderInstance[],
    strategy: string,
  ): LLMProviderInstance | null {
    if (providers.length === 0) return null;
    if (providers.length === 1) return providers[0];

    const priority = providers[0].priority;

    switch (strategy) {
      case 'round-robin':
        const counter = this.loadBalancingCounters.get(priority) || 0;
        const selectedProvider = providers[counter];
        this.loadBalancingCounters.set(priority, (counter + 1) % providers.length);
        return selectedProvider;

      case 'weighted':
        // 根据权重随机选择
        const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        for (const provider of providers) {
          random -= provider.weight;
          if (random <= 0) {
            return provider;
          }
        }
        return providers[0];

      case 'random':
        return providers[Math.floor(Math.random() * providers.length)];

      default:
        return providers[0];
    }
  }

  /**
   * 生成文本（支持多提供商故障转移）
   */
  public async generateText(prompt: string, userId?: string): Promise<LLMRequestResult> {
    const startTime = Date.now();
    const config = await this.loadMultiProviderConfig();

    if (!config || !config.enabled) {
      // 回退到单提供商模式
      return this.fallbackToSingleProvider(prompt, userId);
    }

    const providerGroups = this.getAvailableProviders();

    if (providerGroups.length === 0) {
      return {
        success: false,
        error: '没有可用的LLM提供商',
        responseTime: Date.now() - startTime,
      };
    }

    // 按优先级逐级尝试
    for (const providerGroup of providerGroups) {
      const selectedProvider = this.selectProviderFromGroup(
        providerGroup,
        config.loadBalancing.strategy,
      );

      if (!selectedProvider) continue;

      const provider = this.providers.get(selectedProvider.provider);
      if (!provider) continue;

      try {
        const providerOptions = {
          apiKey: selectedProvider.apiKey,
          model: selectedProvider.model,
          baseUrl: selectedProvider.baseUrl,
          temperature: selectedProvider.temperature,
          maxTokens: selectedProvider.maxTokens,
        };

        const result = await provider.generateText(prompt, providerOptions);

        return {
          success: true,
          data: result,
          providerId: selectedProvider.id,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        console.error(`提供商 ${selectedProvider.name} 调用失败:`, error);

        // 标记该提供商为不健康
        selectedProvider.healthy = false;
        selectedProvider.lastHealthCheck = new Date();
        this.providerInstances.set(selectedProvider.id, selectedProvider);

        // 如果启用了故障转移，继续尝试下一个提供商
        if (config.failover.enabled) {
          continue;
        } else {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            providerId: selectedProvider.id,
            responseTime: Date.now() - startTime,
          };
        }
      }
    }

    return {
      success: false,
      error: '所有LLM提供商都不可用',
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * 生成聊天响应（支持多提供商故障转移）
   */
  public async generateChat(messages: Message[], userId?: string): Promise<LLMRequestResult> {
    const startTime = Date.now();
    const config = await this.loadMultiProviderConfig();

    if (!config || !config.enabled) {
      // 回退到单提供商模式
      return this.fallbackToSingleProviderChat(messages, userId);
    }

    const providerGroups = this.getAvailableProviders();

    if (providerGroups.length === 0) {
      return {
        success: false,
        error: '没有可用的LLM提供商',
        responseTime: Date.now() - startTime,
      };
    }

    // 按优先级逐级尝试
    for (const providerGroup of providerGroups) {
      const selectedProvider = this.selectProviderFromGroup(
        providerGroup,
        config.loadBalancing.strategy,
      );

      if (!selectedProvider) continue;

      const provider = this.providers.get(selectedProvider.provider);
      if (!provider) continue;

      try {
        const providerOptions = {
          apiKey: selectedProvider.apiKey,
          model: selectedProvider.model,
          baseUrl: selectedProvider.baseUrl,
          temperature: selectedProvider.temperature,
          maxTokens: selectedProvider.maxTokens,
        };

        const result = await provider.generateChat(messages, providerOptions);

        return {
          success: true,
          data: result,
          providerId: selectedProvider.id,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        console.error(`提供商 ${selectedProvider.name} 调用失败:`, error);

        // 标记该提供商为不健康
        selectedProvider.healthy = false;
        selectedProvider.lastHealthCheck = new Date();
        this.providerInstances.set(selectedProvider.id, selectedProvider);

        // 如果启用了故障转移，继续尝试下一个提供商
        if (config.failover.enabled) {
          continue;
        } else {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            providerId: selectedProvider.id,
            responseTime: Date.now() - startTime,
          };
        }
      }
    }

    return {
      success: false,
      error: '所有LLM提供商都不可用',
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * 回退到单提供商模式（文本生成）
   */
  private async fallbackToSingleProvider(
    prompt: string,
    userId?: string,
  ): Promise<LLMRequestResult> {
    // 这里可以调用原有的 LLMProviderService
    // 为简化实现，这里直接返回错误
    return {
      success: false,
      error: '多提供商服务未启用，且单提供商回退失败',
    };
  }

  /**
   * 回退到单提供商模式（聊天）
   */
  private async fallbackToSingleProviderChat(
    messages: Message[],
    userId?: string,
  ): Promise<LLMRequestResult> {
    // 这里可以调用原有的 LLMProviderService
    // 为简化实现，这里直接返回错误
    return {
      success: false,
      error: '多提供商服务未启用，且单提供商回退失败',
    };
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const config = await this.loadMultiProviderConfig();
    if (!config || !config.enabled) return;

    console.log('执行LLM提供商健康检查...');

    const healthCheckPromises = config.providers.map(async (providerInstance) => {
      if (!providerInstance.enabled) return;

      try {
        const healthStatus = await this.checkProviderHealth(providerInstance);

        // 更新健康状态
        providerInstance.healthy = healthStatus.healthy;
        providerInstance.lastHealthCheck = new Date();
        this.providerInstances.set(providerInstance.id, providerInstance);

        console.log(
          `提供商 ${providerInstance.name} 健康检查: ${healthStatus.healthy ? '✓' : '✗'}`,
          healthStatus.error ? `错误: ${healthStatus.error}` : '',
        );
      } catch (error) {
        console.error(`提供商 ${providerInstance.name} 健康检查失败:`, error);
        providerInstance.healthy = false;
        providerInstance.lastHealthCheck = new Date();
        this.providerInstances.set(providerInstance.id, providerInstance);
      }
    });

    await Promise.all(healthCheckPromises);

    // 更新数据库中的健康状态
    if (config) {
      // 正确更新每个提供商的健康状态
      config.providers.forEach((provider) => {
        const updatedProvider = this.providerInstances.get(provider.id);
        if (updatedProvider) {
          provider.healthy = updatedProvider.healthy;
          provider.lastHealthCheck = updatedProvider.lastHealthCheck;
        }
      });

      await this.saveMultiProviderConfig(config);
      console.log('健康检查完成，状态已保存到数据库');
    }
  }

  /**
   * 检查单个提供商的健康状态
   */
  public async checkProviderHealth(
    providerInstance: LLMProviderInstance,
  ): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      const healthCheckUrl = this.getModelsUrl(providerInstance);
      if (!healthCheckUrl) {
        throw new Error('无法构建健康检查 API URL');
      }

      let response;

      // 火山方舟使用chat/completions进行健康检查
      if (providerInstance.provider.toLowerCase() === 'volcengine') {
        // 直接使用chat/completions进行健康检查，这是最可靠的方式
        const baseUrl = providerInstance.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const chatUrl = `${cleanBaseUrl}/chat/completions`;

        response = await axios.post(chatUrl, {
          model: providerInstance.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1, // 最小token消耗
          temperature: 0.0, // 最低温度，确保一致性
          stream: false, // 确保不使用流式响应
        }, {
          headers: {
            Authorization: `Bearer ${providerInstance.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000, // 15秒超时
        });
      } else {
        // 其他提供商使用标准的models端点
        response = await axios.get(healthCheckUrl, {
          headers: {
            Authorization: `Bearer ${providerInstance.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10秒超时
        });
      }

      const responseTime = Date.now() - startTime;

      return {
        providerId: providerInstance.id,
        healthy: response.status === 200,
        responseTime,
        checkedAt: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = '未知错误';

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const responseData = error.response?.data;

        if (status === 401) {
          errorMessage = 'API密钥无效或过期';
        } else if (status === 404) {
          errorMessage = '模型不存在或接入点ID无效';
        } else if (status === 429) {
          errorMessage = 'API调用频率限制';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = '请求超时';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          errorMessage = '网络连接失败';
        } else {
          errorMessage = `HTTP ${status}: ${statusText || error.message}`;
          if (responseData && typeof responseData === 'object') {
            const errorDetail = responseData.error?.message || responseData.message;
            if (errorDetail) {
              errorMessage += ` - ${errorDetail}`;
            }
          }
        }
      } else {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      console.error(`提供商 ${providerInstance.name} 健康检查失败:`, errorMessage);

      return {
        providerId: providerInstance.id,
        healthy: false,
        responseTime,
        error: errorMessage,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * 获取提供商的models API URL
   */
  private getModelsUrl(providerInstance: LLMProviderInstance): string | null {
    let baseUrl = providerInstance.baseUrl;

    // 如果没有自定义baseUrl，使用默认URL
    if (!baseUrl) {
      switch (providerInstance.provider.toLowerCase()) {
        case 'openai':
          baseUrl = 'https://api.openai.com/v1';
          break;
        case 'siliconflow':
          baseUrl = 'https://api.siliconflow.cn/v1';
          break;
        case 'deepseek':
          baseUrl = 'https://api.deepseek.com/v1';
          break;
        case 'volcengine':
          baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
          break;
        default:
          return null;
      }
    }

    // 确保URL格式正确
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // 火山方舟使用chat/completions端点进行健康检查
    if (providerInstance.provider.toLowerCase() === 'volcengine') {
      return `${cleanBaseUrl}/chat/completions`;
    }

    return `${cleanBaseUrl}/models`;
  }

  /**
   * 获取所有提供商健康状态
   */
  public async getProvidersHealthStatus(): Promise<ProviderHealthStatus[]> {
    const config = await this.loadMultiProviderConfig();
    if (!config) return [];

    return config.providers.map((provider) => ({
      providerId: provider.id,
      healthy: provider.healthy,
      checkedAt: provider.lastHealthCheck || new Date(),
    }));
  }

  /**
   * 手动触发健康检查
   */
  public async triggerHealthCheck(): Promise<void> {
    await this.performHealthCheck();
  }

  /**
   * 销毁服务实例（清理定时器）
   */
  public static destroy(): void {
    if (MultiProviderLLMService.instance) {
      if (MultiProviderLLMService.instance.healthCheckInterval) {
        clearInterval(MultiProviderLLMService.instance.healthCheckInterval);
        MultiProviderLLMService.instance.healthCheckInterval = null;
      }
      MultiProviderLLMService.instance = null;
    }
  }

  /**
   * 获取配置使用优先级说明
   * 返回当前系统使用的LLM配置来源
   */
  public async getConfigPriorityInfo() {
    try {
      const multiProviderConfig = await this.loadMultiProviderConfig();

      if (multiProviderConfig?.enabled && multiProviderConfig.providers.length > 0) {
        const activeProviders = multiProviderConfig.providers.filter((p) => p.enabled).length;
        return {
          mode: 'multi-provider',
          description: '当前使用多提供商配置',
          activeProviders: activeProviders,
          note: '多提供商模式激活时，全局LLM配置将被忽略',
        };
      } else {
        return {
          mode: 'single-provider',
          description: '当前使用全局LLM配置（单一提供商）',
          note: '多提供商模式未启用或无可用提供商，系统回退到全局LLM配置',
        };
      }
    } catch (error) {
      console.error('获取配置优先级信息失败:', error);
      throw new Error('获取配置优先级信息失败');
    }
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}
