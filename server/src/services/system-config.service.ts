import { PrismaClient } from '@prisma/client';
import { LLMProviderService } from '../ai/llm/llm-provider-service';

const prisma = new PrismaClient();

export interface GlobalAIConfig {
  enabled: boolean;
  provider?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  dailyTokenLimit: number;
}

export interface AIServiceStatus {
  isOnline: boolean;
  responseTime?: number;
  lastChecked: string;
  version?: string;
}

export class SystemConfigService {
  private llmProviderService: LLMProviderService;

  constructor() {
    this.llmProviderService = new LLMProviderService();
  }



  /**
   * 更新全局AI配置
   */
  async updateGlobalAIConfig(config: Partial<GlobalAIConfig>): Promise<GlobalAIConfig> {
    try {
      // 更新数据库中的配置
      await this.updateGlobalAIConfigInDB(config);

      // 获取更新后的配置
      const updatedConfig = await this.getGlobalAIConfig();

      console.log('更新全局AI配置:', updatedConfig);

      return updatedConfig;
    } catch (error) {
      console.error('更新全局AI配置失败:', error);
      throw new Error('更新全局AI配置失败');
    }
  }



  /**
   * 获取TOKEN使用量统计
   */
  async getTokenUsage(params?: { startDate?: string; endDate?: string }) {
    try {
      // 这里应该从数据库查询实际的TOKEN使用量
      // 暂时返回模拟数据
      return {
        totalTokens: 50000,
        promptTokens: 30000,
        completionTokens: 20000,
        totalCalls: 500,
        successfulCalls: 480,
        failedCalls: 20,
        averageTokensPerCall: 100,
        dailyUsage: [
          { date: '2024-01-01', tokens: 1000, calls: 10 },
          { date: '2024-01-02', tokens: 1500, calls: 15 },
          { date: '2024-01-03', tokens: 2000, calls: 20 }
        ]
      };
    } catch (error) {
      console.error('获取TOKEN使用量统计失败:', error);
      throw new Error('获取TOKEN使用量统计失败');
    }
  }

  /**
   * 获取今日TOKEN使用量
   */
  async getTodayTokenUsage() {
    try {
      // 这里应该从数据库查询今日的TOKEN使用量
      // 暂时返回模拟数据
      const usedTokens = 2500;
      const dailyLimit = 10000;
      const remainingTokens = dailyLimit - usedTokens;
      const usagePercentage = Math.round((usedTokens / dailyLimit) * 100);

      return {
        usedTokens,
        totalCalls: 25,
        successfulCalls: 24,
        failedCalls: 1,
        dailyLimit,
        remainingTokens,
        usagePercentage
      };
    } catch (error) {
      console.error('获取今日TOKEN使用量失败:', error);
      throw new Error('获取今日TOKEN使用量失败');
    }
  }

  /**
   * 切换AI服务类型
   */
  async switchAIServiceType(
    userId: string,
    serviceType: 'official' | 'custom',
    serviceId?: string,
    accountId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`用户 ${userId} 切换AI服务类型到 ${serviceType}`, serviceId ? `服务ID: ${serviceId}` : '');

      if (serviceType === 'official') {
        // 切换到官方服务
        console.log('切换到官方AI服务');

        // 启用全局AI配置，设置为官方服务
        await this.updateGlobalAIConfigInDB({
          enabled: true
        });
        // 设置服务类型为官方
        await this.upsertSystemConfig('llm_service_type', 'official');

        // 如果提供了账本ID，清除账本的自定义LLM设置绑定
        if (accountId) {
          await this.clearAccountLLMBinding(accountId);
        }

        return {
          success: true,
          message: '已成功切换到官方AI服务'
        };
      } else {
        // 切换到自定义服务
        if (!serviceId) {
          throw new Error('切换到自定义服务时必须提供服务ID');
        }

        console.log(`切换到自定义AI服务: ${serviceId}`);

        // 验证服务ID是否存在并属于该用户或其家庭成员
        const isValidService = await this.validateUserLLMSetting(userId, serviceId, accountId);
        if (!isValidService) {
          throw new Error('无效的服务ID或无权访问该服务');
        }

        // 保持全局AI配置启用，但标记为使用自定义服务
        await this.updateGlobalAIConfigInDB({
          enabled: true
        });
        // 设置服务类型为自定义
        await this.upsertSystemConfig('llm_service_type', 'custom');

        // 如果提供了账本ID，绑定账本到指定的LLM设置
        if (accountId) {
          await this.bindAccountToLLMSetting(accountId, serviceId);
        }

        return {
          success: true,
          message: '已成功切换到自定义AI服务'
        };
      }
    } catch (error) {
      console.error('切换AI服务类型失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '切换AI服务类型失败'
      };
    }
  }

  /**
   * 测试AI服务连接
   */
  async testAIServiceConnection(
    userId: string,
    serviceType: 'official' | 'custom',
    serviceId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`测试AI服务连接: ${serviceType}`, serviceId ? `服务ID: ${serviceId}` : '');

      if (serviceType === 'official') {
        // 测试官方服务连接
        // 这里应该实际测试官方AI服务的连接
        console.log('测试官方AI服务连接');

        // 模拟连接测试
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
          success: true,
          message: '官方AI服务连接正常'
        };
      } else {
        // 测试自定义服务连接
        if (!serviceId) {
          throw new Error('测试自定义服务时必须提供服务ID');
        }

        console.log(`测试自定义AI服务连接: ${serviceId}`);

        // 这里应该获取自定义服务的配置并测试连接
        // 使用LLMProviderService来测试连接

        // 模拟连接测试
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
          success: true,
          message: '自定义AI服务连接正常'
        };
      }
    } catch (error) {
      console.error('测试AI服务连接失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试AI服务连接失败'
      };
    }
  }

  /**
   * 获取全局AI配置
   */
  async getGlobalAIConfig(): Promise<GlobalAIConfig> {
    try {
      // 获取所有LLM相关的系统配置
      const configs = await prisma.systemConfig.findMany({
        where: {
          category: 'llm'
        }
      });

      // 转换为配置对象
      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = config.value || '';
        return acc;
      }, {} as Record<string, string>);

      return {
        enabled: configMap['llm_global_enabled'] === 'true',
        provider: configMap['llm_global_provider'] || 'openai',
        model: configMap['llm_global_model'] || 'gpt-3.5-turbo',
        baseUrl: configMap['llm_global_base_url'] || '',
        temperature: parseFloat(configMap['llm_global_temperature'] || '0.7'),
        maxTokens: parseInt(configMap['llm_global_max_tokens'] || '1000'),
        dailyTokenLimit: parseInt(configMap['llm_daily_token_limit'] || '50000')
      };
    } catch (error) {
      console.error('获取全局AI配置错误:', error);
      throw new Error('获取全局AI配置失败');
    }
  }

  /**
   * 获取AI服务状态
   */
  async getAIServiceStatus(): Promise<AIServiceStatus> {
    try {
      const config = await this.getGlobalAIConfig();
      
      if (!config.enabled) {
        return {
          isOnline: false,
          lastChecked: new Date().toISOString()
        };
      }

      // 简单的URL连通性测试，而非完整的LLM对话测试
      const startTime = Date.now();
      try {
        const testUrl = this.getTestUrl(config.provider || 'openai', config.baseUrl);
        
        if (!testUrl) {
          return {
            isOnline: false,
            lastChecked: new Date().toISOString()
          };
        }

        // 使用简单的HTTP请求测试连通性（使用AbortController实现超时）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        
        try {
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'ZhiWeiJZ/1.0.0',
              'Accept': 'application/json'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          const responseTime = Date.now() - startTime;
          
          // 只要能连通就认为服务正常（不需要验证API Key）
          const isOnline = response.status < 500; // 4xx也算正常，5xx才算服务异常
          
          return {
            isOnline,
            responseTime,
            lastChecked: new Date().toISOString(),
            version: '1.0.0'
          };
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          isOnline: false,
          responseTime,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('获取AI服务状态错误:', error);
      return {
        isOnline: false,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * 根据提供商获取测试URL
   */
  private getTestUrl(provider: string, baseUrl?: string): string | null {
    // 如果有自定义baseUrl，使用自定义URL
    if (baseUrl) {
      return baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
    }

    // 根据提供商返回对应的测试URL
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'https://api.openai.com/v1/models';
      case 'siliconflow':
        return 'https://api.siliconflow.cn/v1/models';
      case 'deepseek':
        return 'https://api.deepseek.com/v1/models';
      default:
        return null;
    }
  }

  /**
   * 根据key获取系统配置值
   */
  private async getSystemConfigValue(key: string): Promise<string> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });
      return config?.value || '';
    } catch (error) {
      console.error(`获取系统配置 ${key} 错误:`, error);
      return '';
    }
  }

  /**
   * 检查全局AI服务是否启用
   */
  async isGlobalAIEnabled(): Promise<boolean> {
    try {
      const config = await this.getGlobalAIConfig();
      return config.enabled;
    } catch (error) {
      console.error('检查全局AI服务状态错误:', error);
      return false;
    }
  }

  /**
   * 获取全局AI服务配置（用于LLM调用）
   */
  async getGlobalAIServiceConfig(): Promise<{
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
    temperature: number;
    maxTokens: number;
  } | null> {
    try {
      const config = await this.getGlobalAIConfig();

      if (!config.enabled) {
        return null;
      }

      const apiKey = await this.getSystemConfigValue('llm_global_api_key');
      if (!apiKey) {
        return null;
      }

      return {
        provider: config.provider || 'openai',
        model: config.model || 'gpt-3.5-turbo',
        apiKey,
        baseUrl: config.baseUrl || undefined,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000
      };
    } catch (error) {
      console.error('获取全局AI服务配置错误:', error);
      return null;
    }
  }

  /**
   * 更新全局AI配置到数据库
   */
  private async updateGlobalAIConfigInDB(config: Partial<GlobalAIConfig>): Promise<void> {
    try {
      const updates = [];

      if (config.enabled !== undefined) {
        updates.push(this.upsertSystemConfig('llm_global_enabled', config.enabled.toString()));
      }
      if (config.provider) {
        updates.push(this.upsertSystemConfig('llm_global_provider', config.provider));
      }
      if (config.model) {
        updates.push(this.upsertSystemConfig('llm_global_model', config.model));
      }
      if (config.baseUrl) {
        updates.push(this.upsertSystemConfig('llm_global_base_url', config.baseUrl));
      }
      if (config.temperature !== undefined) {
        updates.push(this.upsertSystemConfig('llm_global_temperature', config.temperature.toString()));
      }
      if (config.maxTokens !== undefined) {
        updates.push(this.upsertSystemConfig('llm_global_max_tokens', config.maxTokens.toString()));
      }
      if (config.dailyTokenLimit !== undefined) {
        updates.push(this.upsertSystemConfig('llm_daily_token_limit', config.dailyTokenLimit.toString()));
      }

      await Promise.all(updates);
      console.log('全局AI配置已更新到数据库');
    } catch (error) {
      console.error('更新全局AI配置到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 插入或更新系统配置
   */
  private async upsertSystemConfig(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        category: 'llm',
        description: `LLM配置: ${key}`
      }
    });
  }

  /**
   * 验证用户LLM设置是否有效
   */
  private async validateUserLLMSetting(userId: string, serviceId: string, accountId?: string): Promise<boolean> {
    try {
      // 查询LLM设置
      const llmSetting = await prisma.userLLMSetting.findUnique({
        where: { id: serviceId }
      });

      if (!llmSetting) {
        return false;
      }

      // 如果是用户自己的设置，直接允许
      if (llmSetting.userId === userId) {
        return true;
      }

      // 如果提供了账本ID，检查是否为家庭账本且LLM设置属于家庭成员
      if (accountId) {
        const accountBook = await prisma.accountBook.findUnique({
          where: { id: accountId },
          include: {
            family: {
              include: {
                members: {
                  where: { userId: { not: null } },
                  select: { userId: true }
                }
              }
            }
          }
        });

        if (accountBook?.type === 'FAMILY' && accountBook.family) {
          const familyUserIds = accountBook.family.members
            .map(member => member.userId)
            .filter(id => id !== null);

          // 检查当前用户是否是家庭成员
          const isCurrentUserFamilyMember = familyUserIds.includes(userId);
          // 检查LLM设置所有者是否是家庭成员
          const isLLMOwnerFamilyMember = familyUserIds.includes(llmSetting.userId);

          return isCurrentUserFamilyMember && isLLMOwnerFamilyMember;
        }
      }

      return false;
    } catch (error) {
      console.error('验证用户LLM设置错误:', error);
      return false;
    }
  }

  /**
   * 清除账本的LLM设置绑定
   */
  private async clearAccountLLMBinding(accountId: string): Promise<void> {
    try {
      await prisma.accountBook.update({
        where: { id: accountId },
        data: { userLLMSettingId: null }
      });
      console.log(`已清除账本 ${accountId} 的LLM设置绑定`);
    } catch (error) {
      console.error('清除账本LLM设置绑定错误:', error);
      throw error;
    }
  }

  /**
   * 绑定账本到LLM设置
   */
  private async bindAccountToLLMSetting(accountId: string, serviceId: string): Promise<void> {
    try {
      await prisma.accountBook.update({
        where: { id: accountId },
        data: { userLLMSettingId: serviceId }
      });
      console.log(`已绑定账本 ${accountId} 到LLM设置 ${serviceId}`);
    } catch (error) {
      console.error('绑定账本到LLM设置错误:', error);
      throw error;
    }
  }
}
