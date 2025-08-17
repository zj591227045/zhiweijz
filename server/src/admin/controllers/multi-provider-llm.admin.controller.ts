import { Request, Response } from 'express';
import { MultiProviderLLMService } from '../../ai/llm/multi-provider-service';
import {
  LLMProviderInstance,
  MultiProviderLLMConfig,
  ProviderHealthStatus,
} from '../../ai/types/llm-types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 多提供商LLM管理控制器
 */
export class MultiProviderLLMAdminController {
  private multiProviderService: MultiProviderLLMService;

  constructor() {
    this.multiProviderService = new MultiProviderLLMService();
  }

  /**
   * 获取多提供商配置
   */
  public async getMultiProviderConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.multiProviderService.loadMultiProviderConfig();

      res.json({
        success: true,
        data: config || {
          id: uuidv4(),
          name: '默认多提供商配置',
          enabled: false,
          providers: [],
          failover: {
            enabled: true,
            maxRetries: 3,
            retryInterval: 1000,
          },
          loadBalancing: {
            strategy: 'round-robin',
            healthCheckInterval: 300000,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('获取多提供商配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取多提供商配置失败',
      });
    }
  }

  /**
   * 更新多提供商配置
   */
  public async updateMultiProviderConfig(req: Request, res: Response): Promise<void> {
    try {
      const config: MultiProviderLLMConfig = req.body;

      // 验证配置
      if (!config.id || !config.name) {
        res.status(400).json({
          success: false,
          message: '配置ID和名称不能为空',
        });
        return;
      }

      // 验证提供商实例
      for (const provider of config.providers) {
        if (!provider.id || !provider.provider || !provider.name) {
          res.status(400).json({
            success: false,
            message: '提供商实例的ID、类型和名称不能为空',
          });
          return;
        }

        if (!provider.apiKey) {
          res.status(400).json({
            success: false,
            message: `提供商 ${provider.name} 的API密钥不能为空`,
          });
          return;
        }
      }

      // 更新时间戳
      config.updatedAt = new Date();

      // 保存配置
      const success = await this.multiProviderService.saveMultiProviderConfig(config);

      if (success) {
        res.json({
          success: true,
          message: '多提供商配置已成功保存',
        });
      } else {
        res.status(500).json({
          success: false,
          message: '保存多提供商配置失败',
        });
      }
    } catch (error) {
      console.error('更新多提供商配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新多提供商配置失败',
      });
    }
  }

  /**
   * 添加提供商实例
   */
  public async addProviderInstance(req: Request, res: Response): Promise<void> {
    try {
      const providerData: Omit<
        LLMProviderInstance,
        'id' | 'createdAt' | 'updatedAt' | 'healthy' | 'lastHealthCheck'
      > = req.body;

      // 验证必填字段
      if (!providerData.provider || !providerData.name || !providerData.apiKey) {
        res.status(400).json({
          success: false,
          message: '提供商类型、名称和API密钥不能为空',
        });
        return;
      }

      // 获取当前配置
      let config = await this.multiProviderService.loadMultiProviderConfig();

      if (!config) {
        // 创建新配置
        config = {
          id: uuidv4(),
          name: '默认多提供商配置',
          enabled: false,
          providers: [],
          failover: {
            enabled: true,
            maxRetries: 3,
            retryInterval: 1000,
          },
          loadBalancing: {
            strategy: 'round-robin',
            healthCheckInterval: 300000,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // 创建新的提供商实例
      const newProvider: LLMProviderInstance = {
        id: uuidv4(),
        ...providerData,
        healthy: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 添加到配置中
      config.providers.push(newProvider);
      config.updatedAt = new Date();

      // 保存配置
      const success = await this.multiProviderService.saveMultiProviderConfig(config);

      if (success) {
        res.json({
          success: true,
          message: '提供商实例已成功添加',
          data: newProvider,
        });
      } else {
        res.status(500).json({
          success: false,
          message: '添加提供商实例失败',
        });
      }
    } catch (error) {
      console.error('添加提供商实例失败:', error);
      res.status(500).json({
        success: false,
        message: '添加提供商实例失败',
      });
    }
  }

  /**
   * 更新提供商实例
   */
  public async updateProviderInstance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const providerData: Partial<LLMProviderInstance> = req.body;

      // 获取当前配置
      const config = await this.multiProviderService.loadMultiProviderConfig();

      if (!config) {
        res.status(404).json({
          success: false,
          message: '多提供商配置不存在',
        });
        return;
      }

      // 查找提供商实例
      const providerIndex = config.providers.findIndex((p) => p.id === id);

      if (providerIndex === -1) {
        res.status(404).json({
          success: false,
          message: '提供商实例不存在',
        });
        return;
      }

      // 更新提供商实例
      config.providers[providerIndex] = {
        ...config.providers[providerIndex],
        ...providerData,
        id, // 确保ID不被修改
        updatedAt: new Date(),
      };

      config.updatedAt = new Date();

      // 保存配置
      const success = await this.multiProviderService.saveMultiProviderConfig(config);

      if (success) {
        res.json({
          success: true,
          message: '提供商实例已成功更新',
          data: config.providers[providerIndex],
        });
      } else {
        res.status(500).json({
          success: false,
          message: '更新提供商实例失败',
        });
      }
    } catch (error) {
      console.error('更新提供商实例失败:', error);
      res.status(500).json({
        success: false,
        message: '更新提供商实例失败',
      });
    }
  }

  /**
   * 删除提供商实例
   */
  public async deleteProviderInstance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 获取当前配置
      const config = await this.multiProviderService.loadMultiProviderConfig();

      if (!config) {
        res.status(404).json({
          success: false,
          message: '多提供商配置不存在',
        });
        return;
      }

      // 查找提供商实例
      const providerIndex = config.providers.findIndex((p) => p.id === id);

      if (providerIndex === -1) {
        res.status(404).json({
          success: false,
          message: '提供商实例不存在',
        });
        return;
      }

      // 删除提供商实例
      config.providers.splice(providerIndex, 1);
      config.updatedAt = new Date();

      // 保存配置
      const success = await this.multiProviderService.saveMultiProviderConfig(config);

      if (success) {
        res.json({
          success: true,
          message: '提供商实例已成功删除',
        });
      } else {
        res.status(500).json({
          success: false,
          message: '删除提供商实例失败',
        });
      }
    } catch (error) {
      console.error('删除提供商实例失败:', error);
      res.status(500).json({
        success: false,
        message: '删除提供商实例失败',
      });
    }
  }

  /**
   * 测试提供商实例连接
   */
  public async testProviderInstance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 获取当前配置
      const config = await this.multiProviderService.loadMultiProviderConfig();

      if (!config) {
        res.status(404).json({
          success: false,
          message: '多提供商配置不存在',
        });
        return;
      }

      // 查找提供商实例
      const provider = config.providers.find((p) => p.id === id);

      if (!provider) {
        res.status(404).json({
          success: false,
          message: '提供商实例不存在',
        });
        return;
      }

      // 执行健康检查
      const healthStatus = await this.multiProviderService.checkProviderHealth(provider);

      // 提供更详细的响应信息
      const response = {
        success: healthStatus.healthy,
        data: {
          ...healthStatus,
          provider: {
            id: provider.id,
            name: provider.name,
            provider: provider.provider,
            model: provider.model,
            baseUrl: provider.baseUrl,
          },
        },
        message: healthStatus.healthy
          ? '提供商连接测试成功'
          : `提供商连接测试失败: ${healthStatus.error || '未知错误'}`,
      };

      // 如果健康检查失败，返回400状态码但仍然包含详细信息
      if (!healthStatus.healthy) {
        res.status(400).json(response);
      } else {
        res.json(response);
      }
    } catch (error) {
      console.error('测试提供商实例连接失败:', error);
      res.status(500).json({
        success: false,
        message: '测试提供商实例连接失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取所有提供商健康状态
   */
  public async getProvidersHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthStatuses = await this.multiProviderService.getProvidersHealthStatus();

      res.json({
        success: true,
        data: healthStatuses,
      });
    } catch (error) {
      console.error('获取提供商健康状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取提供商健康状态失败',
      });
    }
  }

  /**
   * 手动触发健康检查
   */
  public async triggerHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      await this.multiProviderService.triggerHealthCheck();

      res.json({
        success: true,
        message: '健康检查已触发',
      });
    } catch (error) {
      console.error('触发健康检查失败:', error);
      res.status(500).json({
        success: false,
        message: '触发健康检查失败',
      });
    }
  }

  /**
   * 获取预定义的提供商模板
   */
  public async getProviderTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = [
        {
          provider: 'openai',
          name: 'OpenAI',
          defaultModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
          defaultBaseUrl: 'https://api.openai.com/v1',
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
        },
        {
          provider: 'siliconflow',
          name: '硅基流动',
          defaultModels: ['Qwen/Qwen3-32B', 'Qwen/Qwen2.5-32B-Instruct', 'Qwen/Qwen3-14B'],
          defaultBaseUrl: 'https://api.siliconflow.cn/v1',
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
        },
        {
          provider: 'deepseek',
          name: 'Deepseek',
          defaultModels: ['deepseek-chat', 'deepseek-coder'],
          defaultBaseUrl: 'https://api.deepseek.com/v1',
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
        },
        {
          provider: 'volcengine',
          name: '火山方舟',
          defaultModels: [
            'doubao-1-5-lite-32k-250115', // 豆包-lite-32k
            'ep-20250112212411-2kbkh', // 用户实际模型
            'ep-20241217-xxxxx', // 豆包-pro-4k (示例接入点ID)
            'ep-20241217-yyyyy', // 豆包-pro-32k (示例接入点ID)
            'ep-20241217-zzzzz', // 豆包-lite-4k (示例接入点ID)
            'ep-20241217-aaaaa', // 豆包-lite-32k (示例接入点ID)
            'ep-20241217-bbbbb', // 豆包-pro-128k (示例接入点ID)
          ],
          defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
          description: '火山方舟大模型服务平台，支持豆包系列模型。支持任何有效的接入点ID或模型名称',
          features: ['文本生成', '对话聊天', '视觉识别'],
          healthCheckType: 'chat_completions', // 特殊标记，表示使用chat/completions进行健康检查
        },
        {
          provider: 'custom',
          name: '自定义',
          defaultModels: [],
          defaultBaseUrl: '',
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
        },
      ];

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('获取提供商模板失败:', error);
      res.status(500).json({
        success: false,
        message: '获取提供商模板失败',
      });
    }
  }

  /**
   * 获取配置优先级信息
   */
  async getConfigPriorityInfo(req: Request, res: Response): Promise<void> {
    try {
      const priorityInfo = await this.multiProviderService.getConfigPriorityInfo();

      res.json({
        success: true,
        data: priorityInfo,
      });
    } catch (error) {
      console.error('获取配置优先级信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置优先级信息失败',
      });
    }
  }
}
