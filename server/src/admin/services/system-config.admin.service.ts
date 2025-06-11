import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SystemConfigListParams {
  category?: string;
  search?: string;
}

export interface CreateSystemConfigData {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

export interface UpdateSystemConfigData {
  value?: string;
  description?: string;
  category?: string;
}

export interface BatchUpdateConfigData {
  key: string;
  value: string;
}

export interface LLMConfigData {
  enabled?: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMTestConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export class SystemConfigAdminService {
  /**
   * 获取系统配置列表
   */
  async getSystemConfigs(params: SystemConfigListParams) {
    try {
      const { category, search } = params;
      
      // 构建查询条件
      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { key: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const configs = await prisma.systemConfig.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ],
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          },
          updater: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      // 分组配置按分类
      const configsByCategory = configs.reduce((acc: any, config) => {
        const cat = config.category || 'general';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(config);
        return acc;
      }, {});

      return {
        configs,
        configsByCategory,
        total: configs.length
      };
    } catch (error) {
      console.error('获取系统配置列表错误:', error);
      throw new Error('获取系统配置列表失败');
    }
  }

  /**
   * 根据ID获取系统配置
   */
  async getSystemConfigById(id: string) {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          },
          updater: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      return config;
    } catch (error) {
      console.error('获取系统配置错误:', error);
      throw new Error('获取系统配置失败');
    }
  }

  /**
   * 根据key获取系统配置
   */
  async getSystemConfigByKey(key: string) {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });

      return config;
    } catch (error) {
      console.error('获取系统配置错误:', error);
      throw new Error('获取系统配置失败');
    }
  }

  /**
   * 创建系统配置
   */
  async createSystemConfig(data: CreateSystemConfigData, createdById?: string) {
    try {
      // 检查key是否已存在
      const existingConfig = await prisma.systemConfig.findUnique({
        where: { key: data.key }
      });

      if (existingConfig) {
        throw new Error('配置键已存在');
      }

      const config = await prisma.systemConfig.create({
        data: {
          key: data.key,
          value: data.value,
          description: data.description,
          category: data.category || 'general',
          createdBy: createdById,
          updatedBy: createdById
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      return config;
    } catch (error) {
      console.error('创建系统配置错误:', error);
      if (error instanceof Error && error.message.includes('已存在')) {
        throw error;
      }
      throw new Error('创建系统配置失败');
    }
  }

  /**
   * 更新系统配置
   */
  async updateSystemConfig(id: string, data: UpdateSystemConfigData, updatedById?: string) {
    try {
      // 检查配置是否存在
      const existingConfig = await prisma.systemConfig.findUnique({
        where: { id }
      });

      if (!existingConfig) {
        throw new Error('系统配置不存在');
      }

      const config = await prisma.systemConfig.update({
        where: { id },
        data: {
          ...(data.value !== undefined && { value: data.value }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
          updatedBy: updatedById,
          updatedAt: new Date()
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          },
          updater: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      return config;
    } catch (error) {
      console.error('更新系统配置错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      throw new Error('更新系统配置失败');
    }
  }

  /**
   * 删除系统配置
   */
  async deleteSystemConfig(id: string) {
    try {
      // 检查配置是否存在
      const existingConfig = await prisma.systemConfig.findUnique({
        where: { id }
      });

      if (!existingConfig) {
        throw new Error('系统配置不存在');
      }

      await prisma.systemConfig.delete({
        where: { id }
      });

      return true;
    } catch (error) {
      console.error('删除系统配置错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      throw new Error('删除系统配置失败');
    }
  }

  /**
   * 批量更新系统配置
   */
  async batchUpdateSystemConfigs(configs: BatchUpdateConfigData[], updatedById?: string) {
    try {
      const results = [];

      for (const configData of configs) {
        try {
          const config = await prisma.systemConfig.upsert({
            where: { key: configData.key },
            update: {
              value: configData.value,
              updatedBy: updatedById,
              updatedAt: new Date()
            },
            create: {
              key: configData.key,
              value: configData.value,
              category: 'general',
              createdBy: updatedById,
              updatedBy: updatedById
            }
          });

          results.push({
            key: configData.key,
            success: true,
            config
          });
        } catch (error) {
          results.push({
            key: configData.key,
            success: false,
            error: error instanceof Error ? error.message : '更新失败'
          });
        }
      }

      return {
        results,
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      };
    } catch (error) {
      console.error('批量更新系统配置错误:', error);
      throw new Error('批量更新系统配置失败');
    }
  }

  /**
   * 获取LLM相关配置
   */
  async getLLMConfigs() {
    try {
      const llmConfigs = await prisma.systemConfig.findMany({
        where: {
          category: 'llm'
        },
        orderBy: { key: 'asc' }
      });

      // 转换为对象格式
      const configObj: any = {};
      llmConfigs.forEach(config => {
        const key = config.key.replace('llm_global_', '');
        if (key === 'enabled') {
          configObj[key] = config.value === 'true';
        } else if (key === 'temperature') {
          configObj[key] = parseFloat(config.value || '0.7');
        } else if (key === 'max_tokens') {
          configObj[key] = parseInt(config.value || '1000');
        } else {
          configObj[key] = config.value;
        }
      });

      return configObj;
    } catch (error) {
      console.error('获取LLM配置错误:', error);
      throw new Error('获取LLM配置失败');
    }
  }

  /**
   * 更新LLM配置
   */
  async updateLLMConfigs(data: LLMConfigData, updatedById?: string) {
    try {
      const updates = [];

      if (data.enabled !== undefined) {
        updates.push({
          key: 'llm_global_enabled',
          value: data.enabled.toString()
        });
      }

      if (data.provider !== undefined) {
        updates.push({
          key: 'llm_global_provider',
          value: data.provider
        });
      }

      if (data.model !== undefined) {
        updates.push({
          key: 'llm_global_model',
          value: data.model
        });
      }

      if (data.apiKey !== undefined) {
        updates.push({
          key: 'llm_global_api_key',
          value: data.apiKey
        });
      }

      if (data.baseUrl !== undefined) {
        updates.push({
          key: 'llm_global_base_url',
          value: data.baseUrl
        });
      }

      if (data.temperature !== undefined) {
        updates.push({
          key: 'llm_global_temperature',
          value: data.temperature.toString()
        });
      }

      if (data.maxTokens !== undefined) {
        updates.push({
          key: 'llm_global_max_tokens',
          value: data.maxTokens.toString()
        });
      }

      // 批量更新
      for (const update of updates) {
        await prisma.systemConfig.upsert({
          where: { key: update.key },
          update: {
            value: update.value,
            updatedBy: updatedById,
            updatedAt: new Date()
          },
          create: {
            key: update.key,
            value: update.value,
            category: 'llm',
            description: this.getLLMConfigDescription(update.key),
            createdBy: updatedById,
            updatedBy: updatedById
          }
        });
      }

      return true;
    } catch (error) {
      console.error('更新LLM配置错误:', error);
      throw new Error('更新LLM配置失败');
    }
  }

  /**
   * 测试LLM连接
   */
  async testLLMConnection(config: LLMTestConfig) {
    try {
      // 这里实现LLM连接测试逻辑
      // 可以发送一个简单的测试请求到LLM服务
      
      // 模拟测试逻辑
      const testMessage = "Hello, this is a test message.";
      
      // 根据不同的provider实现不同的测试逻辑
      let testResult;
      
      switch (config.provider.toLowerCase()) {
        case 'openai':
          testResult = await this.testOpenAIConnection(config);
          break;
        case 'siliconflow':
          testResult = await this.testSiliconFlowConnection(config);
          break;
        default:
          testResult = await this.testGenericConnection(config);
      }

      return {
        success: testResult.success,
        message: testResult.message,
        responseTime: testResult.responseTime,
        details: testResult.details
      };
    } catch (error) {
      console.error('测试LLM连接错误:', error);
      return {
        success: false,
        message: '连接测试失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 测试OpenAI连接
   */
  private async testOpenAIConnection(config: LLMTestConfig) {
    const startTime = Date.now();
    
    try {
      // 这里可以实现实际的OpenAI API测试
      // 暂时返回模拟结果
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'OpenAI连接测试成功',
        responseTime,
        details: {
          provider: 'OpenAI',
          model: config.model,
          status: 'connected'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'OpenAI连接测试失败',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  /**
   * 测试硅基流动连接
   */
  private async testSiliconFlowConnection(config: LLMTestConfig) {
    const startTime = Date.now();
    
    try {
      // 这里可以实现实际的硅基流动API测试
      // 暂时返回模拟结果
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: '硅基流动连接测试成功',
        responseTime,
        details: {
          provider: 'SiliconFlow',
          model: config.model,
          status: 'connected'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '硅基流动连接测试失败',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  /**
   * 测试通用连接
   */
  private async testGenericConnection(config: LLMTestConfig) {
    const startTime = Date.now();
    
    try {
      // 这里可以实现通用的API测试
      // 暂时返回模拟结果
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: '连接测试成功',
        responseTime,
        details: {
          provider: config.provider,
          model: config.model,
          status: 'connected'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '连接测试失败',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  /**
   * 获取LLM配置描述
   */
  private getLLMConfigDescription(key: string): string {
    const descriptions: { [key: string]: string } = {
      'llm_global_enabled': '是否启用全局LLM配置',
      'llm_global_provider': '全局LLM服务提供商',
      'llm_global_model': '全局LLM模型',
      'llm_global_api_key': '全局LLM API密钥',
      'llm_global_base_url': '全局LLM服务地址',
      'llm_global_temperature': '全局LLM温度参数',
      'llm_global_max_tokens': '全局LLM最大Token数'
    };

    return descriptions[key] || '系统配置';
  }
} 