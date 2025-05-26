import { LLMProvider } from './llm-provider';
import { OpenAIProvider } from './openai-provider';
import { SiliconFlowProvider } from './siliconflow-provider';
import { DeepseekProvider } from './deepseek-provider';
import { LLMSettings, Message } from '../types/llm-types';
import { PrismaClient } from '@prisma/client';

/**
 * LLM提供商服务
 * 管理多个LLM提供商，提供统一的接口
 */
export class LLMProviderService {
  /** 提供商映射 */
  private providers: Map<string, LLMProvider> = new Map();
  /** 默认设置 */
  private defaultSettings: LLMSettings = {
    provider: 'siliconflow',
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    model: 'Qwen/Qwen3-32B',
    temperature: 0.7,
    maxTokens: 1000,
  };
  /** Prisma客户端 */
  private prisma: PrismaClient;

  /**
   * 构造函数
   * 注册默认提供商
   */
  constructor() {
    this.prisma = new PrismaClient();

    // 注册OpenAI提供商
    this.registerProvider(new OpenAIProvider());

    // 注册硅基流动提供商
    this.registerProvider(new SiliconFlowProvider());

    // 注册Deepseek提供商
    this.registerProvider(new DeepseekProvider());
  }

  /**
   * 注册LLM提供商
   * @param provider LLM提供商
   */
  public registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * 获取LLM提供商
   * @param providerName 提供商名称
   * @returns LLM提供商
   */
  public getProvider(providerName: string): LLMProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`LLM provider '${providerName}' not found`);
    }
    return provider;
  }

  /**
   * 获取所有注册的提供商名称
   * @returns 提供商名称集合
   */
  public getProviderNames(): Set<string> {
    return new Set(this.providers.keys());
  }

  /**
   * 获取用户或账本的LLM设置
   * @param userId 用户ID
   * @param accountId 账本ID (可选)
   * @param accountType 账本类型 (可选)
   * @returns LLM设置
   */
  public async getLLMSettings(
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ): Promise<LLMSettings> {
    try {
      // 如果提供了账本信息，优先使用账本绑定的UserLLMSetting
      if (accountId) {
        try {
          // 查找账本
          const accountBook = await this.prisma.accountBook.findUnique({
            where: { id: accountId }
          });

          // 如果账本存在
          if (accountBook) {
            // 查找关联的UserLLMSetting
            // 由于Prisma客户端可能还没有更新，我们使用原始查询
            const userLLMSettings = await this.prisma.$queryRaw`
              SELECT u.* FROM "user_llm_settings" u
              JOIN "account_books" a ON a."user_llm_setting_id" = u.id
              WHERE a.id = ${accountId}
            `;

            // 使用第一个找到的设置
            const userLLMSetting = Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;

            if (userLLMSetting) {
              console.log(`账本 ${accountId} 使用绑定的LLM设置: ${userLLMSetting.id}`);
              return {
                provider: userLLMSetting.provider || this.defaultSettings.provider,
                model: userLLMSetting.model || this.defaultSettings.model,
                apiKey: userLLMSetting.api_key || process.env[`${(userLLMSetting.provider || this.defaultSettings.provider).toUpperCase()}_API_KEY`] || '',
                temperature: userLLMSetting.temperature || this.defaultSettings.temperature,
                maxTokens: userLLMSetting.max_tokens || this.defaultSettings.maxTokens,
                baseUrl: userLLMSetting.base_url
              };
            }
          }

          // 如果账本没有绑定UserLLMSetting，尝试使用旧的AccountLLMSetting
          const accountSettings = await this.prisma.accountLLMSetting.findFirst({
            where: { accountBookId: accountId }
          });

          if (accountSettings) {
            console.log(`账本 ${accountId} 使用旧的AccountLLMSetting`);
            return {
              provider: accountSettings.provider,
              model: accountSettings.model,
              apiKey: accountSettings.apiKey || process.env[`${accountSettings.provider.toUpperCase()}_API_KEY`] || '',
              temperature: accountSettings.temperature,
              maxTokens: accountSettings.maxTokens
            };
          }
        } catch (error) {
          console.error('获取账本LLM设置错误:', error);
        }
      }

      // 如果没有账本设置或未提供账本信息，使用用户的默认LLM设置
      try {
        // 查找用户的默认LLM设置
        // 由于Prisma客户端可能还没有更新，我们使用原始查询
        const userLLMSettings = await this.prisma.$queryRaw`
          SELECT * FROM "user_llm_settings"
          WHERE "user_id" = ${userId}
          LIMIT 1
        `;

        const userLLMSetting = Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;

        if (userLLMSetting) {
          console.log(`用户 ${userId} 使用UserLLMSetting: ${userLLMSetting.id}`);
          return {
            provider: userLLMSetting.provider || this.defaultSettings.provider,
            model: userLLMSetting.model || this.defaultSettings.model,
            apiKey: userLLMSetting.api_key || process.env[`${(userLLMSetting.provider || this.defaultSettings.provider).toUpperCase()}_API_KEY`] || '',
            temperature: userLLMSetting.temperature || this.defaultSettings.temperature,
            maxTokens: userLLMSetting.max_tokens || this.defaultSettings.maxTokens,
            baseUrl: userLLMSetting.base_url
          };
        }

        // 如果没有找到UserLLMSetting，尝试从userSetting表获取
        const userSettings = await this.prisma.userSetting.findFirst({
          where: {
            userId,
            key: 'llm_settings'
          }
        });

        if (userSettings && userSettings.value) {
          try {
            console.log(`用户 ${userId} 使用UserSetting中的llm_settings`);
            const llmSettings = JSON.parse(userSettings.value);
            return {
              provider: llmSettings.provider || this.defaultSettings.provider,
              model: llmSettings.model || this.defaultSettings.model,
              apiKey: llmSettings.apiKey || process.env[`${llmSettings.provider.toUpperCase()}_API_KEY`] || '',
              temperature: llmSettings.temperature || this.defaultSettings.temperature,
              maxTokens: llmSettings.maxTokens || this.defaultSettings.maxTokens,
              baseUrl: llmSettings.baseUrl
            };
          } catch (parseError) {
            console.error('解析用户LLM设置错误:', parseError);
          }
        }
      } catch (error) {
        console.error('获取用户LLM设置错误:', error);
      }

      // 如果没有用户设置，使用默认设置
      console.log(`使用默认LLM设置`);
      return {
        ...this.defaultSettings,
        apiKey: process.env.SILICONFLOW_API_KEY || ''
      };
    } catch (error) {
      console.error('获取LLM设置错误:', error);
      return {
        ...this.defaultSettings,
        apiKey: process.env.SILICONFLOW_API_KEY || ''
      };
    }
  }

  /**
   * 更新用户LLM设置
   * @param userId 用户ID
   * @param settings LLM设置
   */
  public async updateUserLLMSettings(userId: string, settings: Partial<LLMSettings>): Promise<void> {
    try {
      // 由于userLLMSetting表可能还不存在，我们使用userSetting表来存储LLM设置
      const existingSettings = await this.prisma.userSetting.findFirst({
        where: {
          userId,
          key: 'llm_settings'
        }
      });

      const llmSettings = {
        provider: settings.provider || this.defaultSettings.provider,
        model: settings.model || this.defaultSettings.model,
        apiKey: settings.apiKey,
        temperature: settings.temperature || this.defaultSettings.temperature,
        maxTokens: settings.maxTokens || this.defaultSettings.maxTokens
      };

      if (existingSettings) {
        // 更新现有设置
        await this.prisma.userSetting.update({
          where: { id: existingSettings.id },
          data: {
            value: JSON.stringify(llmSettings)
          }
        });
      } else {
        // 创建新设置
        await this.prisma.userSetting.create({
          data: {
            userId,
            key: 'llm_settings',
            value: JSON.stringify(llmSettings)
          }
        });
      }
    } catch (error) {
      console.error('更新用户LLM设置错误:', error);
      throw error;
    }
  }

  /**
   * 更新账本LLM设置
   * @param accountId 账本ID
   * @param userLLMSettingId 用户LLM设置ID
   */
  public async updateAccountLLMSettings(
    accountId: string,
    userLLMSettingId: string
  ): Promise<void> {
    try {
      // 检查账本是否存在
      const accountBook = await this.prisma.accountBook.findUnique({
        where: { id: accountId }
      });

      if (!accountBook) {
        throw new Error(`账本不存在: ${accountId}`);
      }

      // 检查用户LLM设置是否存在
      const userLLMSettings = await this.prisma.$queryRaw`
        SELECT * FROM "user_llm_settings"
        WHERE "id" = ${userLLMSettingId}
      `;

      const userLLMSetting = Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;

      if (!userLLMSetting) {
        throw new Error(`用户LLM设置不存在: ${userLLMSettingId}`);
      }

      // 更新账本的userLLMSettingId
      await this.prisma.$executeRaw`
        UPDATE "account_books"
        SET "user_llm_setting_id" = ${userLLMSettingId}
        WHERE "id" = ${accountId}
      `;

      console.log(`账本 ${accountId} 已绑定到LLM设置 ${userLLMSettingId}`);
    } catch (error) {
      console.error('更新账本LLM设置错误:', error);
      throw error;
    }
  }

  /**
   * 创建用户LLM设置
   * @param userId 用户ID
   * @param settings LLM设置
   * @returns 创建的LLM设置ID
   */
  public async createUserLLMSetting(
    userId: string,
    settings: {
      name: string;
      provider: string;
      model: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      baseUrl?: string;
      description?: string;
    }
  ): Promise<string> {
    try {
      // 使用原始SQL插入记录
      const result = await this.prisma.$executeRaw`
        INSERT INTO "user_llm_settings" (
          "id", "user_id", "provider", "model", "api_key", "temperature", "max_tokens",
          "created_at", "updated_at", "name", "description", "base_url"
        ) VALUES (
          gen_random_uuid(), ${userId}, ${settings.provider}, ${settings.model},
          ${settings.apiKey || null}, ${settings.temperature || 0.7}, ${settings.maxTokens || 1000},
          NOW(), NOW(), ${settings.name}, ${settings.description || null}, ${settings.baseUrl || null}
        )
        RETURNING "id"
      `;

      // 获取插入的ID
      const insertedId = await this.prisma.$queryRaw`
        SELECT "id" FROM "user_llm_settings"
        WHERE "user_id" = ${userId}
        ORDER BY "created_at" DESC
        LIMIT 1
      `;

      const id = Array.isArray(insertedId) && insertedId.length > 0 ? insertedId[0].id : null;

      if (!id) {
        throw new Error('创建用户LLM设置失败');
      }

      console.log(`为用户 ${userId} 创建了LLM设置: ${id}`);
      return id;
    } catch (error) {
      console.error('创建用户LLM设置错误:', error);
      throw error;
    }
  }

  /**
   * 生成文本
   * @param prompt 提示文本
   * @param userId 用户ID
   * @param accountId 账本ID (可选)
   * @param accountType 账本类型 (可选)
   * @returns 生成的文本
   */
  public async generateText(
    prompt: string,
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ): Promise<string> {
    const settings = await this.getLLMSettings(userId, accountId, accountType);
    const provider = this.getProvider(settings.provider);
    return provider.generateText(prompt, settings);
  }

  /**
   * 生成聊天响应
   * @param messages 消息数组
   * @param userId 用户ID
   * @param accountId 账本ID (可选)
   * @param accountType 账本类型 (可选)
   * @returns 生成的响应
   */
  public async generateChat(
    messages: Message[],
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ): Promise<string> {
    const settings = await this.getLLMSettings(userId, accountId, accountType);
    const provider = this.getProvider(settings.provider);
    return provider.generateChat(messages, settings);
  }

  /**
   * 测试LLM连接
   * @param settings 测试用的LLM设置
   * @returns 测试结果
   */
  public async testConnection(settings: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // 检查提供商是否存在
      if (!this.providers.has(settings.provider)) {
        return {
          success: false,
          message: `未知的提供商: ${settings.provider}`
        };
      }

      // 检查API密钥
      if (!settings.apiKey) {
        return {
          success: false,
          message: 'API密钥不能为空'
        };
      }

      // 获取提供商
      const provider = this.getProvider(settings.provider);

      // 构建完整的设置
      const fullSettings = {
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        temperature: 0.7,
        maxTokens: 100
      };

      // 尝试发送一个简单的测试请求
      try {
        // 使用一个简单的提示进行测试
        const testPrompt = "Hello, this is a test message. Please respond with 'OK' if you receive this.";
        const response = await provider.generateText(testPrompt, fullSettings);

        return {
          success: true,
          message: `连接测试成功: ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`
        };
      } catch (apiError) {
        console.error('API调用错误:', apiError);
        return {
          success: false,
          message: `连接测试失败: ${apiError instanceof Error ? apiError.message : String(apiError)}`
        };
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      return {
        success: false,
        message: `测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
