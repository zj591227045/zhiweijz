import { LLMProvider } from './llm-provider';
import { OpenAIProvider } from './openai-provider';
import { SiliconFlowProvider } from './siliconflow-provider';
import { DeepseekProvider } from './deepseek-provider';
import { CustomProvider } from './custom-provider';
import { LLMSettings, Message, LLMResponse } from '../types/llm-types';
import { TokenLimitService } from '../../services/token-limit.service';
import { MultiProviderLLMService } from './multi-provider-service';
import prisma from '../../config/database';

/**
 * LLM提供商服务
 * 管理多个LLM提供商，提供统一的接口
 */
export class LLMProviderService {
  /** 提供商映射 */
  private providers: Map<string, LLMProvider> = new Map();
  /** Token限制服务 */
  private tokenLimitService: TokenLimitService = new TokenLimitService();
  /** 多提供商服务 */
  public multiProviderService: MultiProviderLLMService = new MultiProviderLLMService();
  /** 默认设置 */
  private defaultSettings: LLMSettings = {
    provider: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 1000,
  };

  /** 请求上下文，用于传递来源信息 */
  private requestContext: {
    source?: 'App' | 'WeChat' | 'API';
  } = {};
  /**
   * 简单的token估算方法（作为回退）
   * @param text 文本内容
   * @returns 估算的token数量
   */
  private estimateTokens(text: string): number {
    // 简单估算：中文字符按1.5个字符=1token计算，其他按4个字符=1token
    const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherCharCount = text.length - chineseCharCount;
    return Math.ceil(chineseCharCount / 1.5 + otherCharCount / 4);
  }

  /**
   * 确定服务类型
   * @param settings LLM设置
   * @returns 服务类型
   */
  private async determineServiceType(settings: LLMSettings, userId?: string): Promise<string> {
    // 检查当前设置是否为多提供商模式
    if ((settings as any).isMultiProvider) {
      return 'multi-provider';
    }

    // 如果提供了用户ID，读取用户级别的AI服务类型配置
    if (userId) {
      try {
        const userServiceTypeSetting = await prisma.userSetting.findUnique({
          where: {
            userId_key: {
              userId,
              key: 'ai_service_type',
            },
          },
        });

        if (userServiceTypeSetting?.value === 'custom') {
          return 'custom';
        } else {
          return 'official';
        }
      } catch (error) {
        console.error('获取用户AI服务类型失败:', error);
      }
    }

    // 兼容旧版本：检查系统级别配置
    const serviceTypeConfig = await prisma.systemConfig.findUnique({
      where: { key: 'llm_service_type' },
    });

    if (serviceTypeConfig?.value === 'official') {
      return 'official';
    }

    // 默认为自定义服务
    return 'custom';
  }

  /**
   * 检查是否应该使用多提供商服务并处理请求
   * @param settings LLM设置
   * @param prompt 提示文本（用于文本生成）
   * @param messages 消息数组（用于聊天）
   * @param userId 用户ID
   * @param accountId 账本ID（可选）
   * @param isChat 是否为聊天请求
   * @returns 如果使用多提供商则返回结果，否则返回null
   */
  private async handleMultiProviderRequest(
    settings: LLMSettings,
    prompt: string | null,
    messages: Message[] | null,
    userId: string,
    accountId?: string,
    isChat: boolean = false,
  ): Promise<string | null> {
    // 🚀 检查是否使用多提供商模式
    if ((settings as any).isMultiProvider) {
      console.log(`使用多提供商服务处理${isChat ? '聊天' : '文本生成'}请求`);

      const startTime = Date.now();
      let result: any;
      let isSuccess = false;
      let errorMessage: string | null = null;
      let responseContent = '';
      let usedProvider = 'multi-provider';
      let usedModel = 'multi-provider';

      try {
        if (isChat && messages) {
          result = await this.multiProviderService.generateChat(messages, userId);
        } else if (!isChat && prompt) {
          result = await this.multiProviderService.generateText(prompt, userId);
        } else {
          throw new Error('多提供商请求参数不正确');
        }

        if (result.success) {
          isSuccess = true;
          responseContent = result.data || '';

          // 尝试获取实际使用的提供商信息
          if (result.providerId) {
            const config = await this.multiProviderService.loadMultiProviderConfig();
            const usedProviderInstance = config?.providers.find((p) => p.id === result.providerId);
            if (usedProviderInstance) {
              usedProvider = usedProviderInstance.provider;
              usedModel = usedProviderInstance.model;
            }
          }

          return responseContent;
        } else {
          isSuccess = false;
          errorMessage = result.error || '多提供商服务调用失败';
          throw new Error(errorMessage || '多提供商服务调用失败');
        }
      } catch (error) {
        isSuccess = false;
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        // 📊 记录多提供商调用日志
        const duration = Date.now() - startTime;

        // 提取用户消息和系统提示
        let userMessage = '';
        let systemPrompt: string | null = null;

        if (isChat && messages) {
          systemPrompt = messages.find((m) => m.role === 'system')?.content || null;
          userMessage = messages
            .filter((m) => m.role === 'user')
            .map((m) => m.content)
            .join('\n');
        } else if (prompt) {
          userMessage = prompt;
        }

        // 估算token数量（多提供商暂时使用估算）
        const promptTokens = this.estimateTokens(userMessage + (systemPrompt || ''));
        const completionTokens = this.estimateTokens(responseContent);

        await this.logLLMCall({
          userId,
          accountId,
          provider: usedProvider,
          model: usedModel,
          userMessage,
          assistantMessage: responseContent || null,
          systemPrompt,
          isSuccess,
          errorMessage,
          duration,
          promptTokens,
          completionTokens,
          serviceType: 'multi-provider',
          source: this.requestContext.source,
        });
      }
    }

    return null; // 不使用多提供商
  }

  /**
   * 构造函数
   * 注册默认提供商
   */
  constructor() {
    // 注册OpenAI提供商
    this.registerProvider(new OpenAIProvider());

    // 注册硅基流动提供商
    this.registerProvider(new SiliconFlowProvider());

    // 注册Deepseek提供商
    this.registerProvider(new DeepseekProvider());

    // 注册自定义提供商
    this.registerProvider(new CustomProvider());
  }

  /**
   * 设置请求上下文
   * @param context 请求上下文
   */
  public setRequestContext(context: { source?: 'App' | 'WeChat' | 'API' }): void {
    this.requestContext = context;
  }

  /**
   * 清除请求上下文
   */
  public clearRequestContext(): void {
    this.requestContext = {};
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
    accountType?: 'personal' | 'family',
  ): Promise<LLMSettings> {
    try {
      console.log(
        `🔍 [调试] getLLMSettings调用 - userId: ${userId}, accountId: ${accountId}, accountType: ${accountType}`,
      );

      // 🔥 修改：读取用户级别的AI服务类型配置，而不是系统级别
      const userServiceTypeSetting = await prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'ai_service_type',
          },
        },
      });

      const serviceType = userServiceTypeSetting?.value || 'official';
      console.log(
        `🔍 [调试] 用户 ${userId} 的AI服务类型: ${serviceType} (数据库记录: ${JSON.stringify(
          userServiceTypeSetting,
        )})`,
      );

      // 🚀 如果用户选择了官方服务，直接使用官方服务配置
      if (serviceType === 'official') {
        console.log('用户选择了官方AI服务，跳过自定义设置检查');

        // 🚀 优先级1: 检查多提供商配置（官方AI服务）
        const multiProviderConfig = await this.multiProviderService.loadMultiProviderConfig();
        if (multiProviderConfig?.enabled && multiProviderConfig.providers.length > 0) {
          const activeProviders = multiProviderConfig.providers.filter((p) => p.enabled);
          if (activeProviders.length > 0) {
            console.log('✅ 使用多提供商LLM配置（官方AI服务）');
            return {
              provider: 'multi-provider',
              model: 'multi-provider',
              apiKey: '',
              temperature: 0.7,
              maxTokens: 1000,
              isMultiProvider: true,
            } as LLMSettings & { isMultiProvider: boolean };
          }
        }

        // 🚀 优先级2: 使用全局LLM配置（官方AI服务）
        console.log('使用全局LLM配置（官方AI服务）');
        const globalConfig = await this.getFullGlobalLLMConfig();

        if (globalConfig) {
          console.log(`✅ 使用全局LLM配置: ${globalConfig.provider}/${globalConfig.model}`);
          return globalConfig;
        }

        // 如果没有全局配置，使用默认设置
        console.log(`使用默认LLM设置`);
        return {
          ...this.defaultSettings,
          apiKey: '',
        };
      }

      // 🚀 如果用户选择了自定义服务，则检查用户的自定义设置（仅限该用户创建的设置）
      console.log('用户选择了自定义AI服务，检查用户自己的自定义设置');

      // 如果提供了账本信息，优先使用账本绑定的UserLLMSetting（但必须属于该用户）
      if (accountId) {
        try {
          const accountBook = await prisma.accountBook.findUnique({
            where: { id: accountId },
            include: {
              userLLMSetting: true,
            },
          });

          if (accountBook && accountBook.userLLMSetting) {
            // 🔥 权限检查：确保LLM设置属于当前用户
            if (accountBook.userLLMSetting.userId === userId) {
              console.log(`✅ 使用账本绑定的用户自定义LLM设置: ${accountBook.userLLMSetting.id}`);
              return {
                provider: accountBook.userLLMSetting.provider || this.defaultSettings.provider,
                model: accountBook.userLLMSetting.model || this.defaultSettings.model,
                apiKey: accountBook.userLLMSetting.apiKey || '',
                temperature:
                  accountBook.userLLMSetting.temperature || this.defaultSettings.temperature,
                maxTokens: accountBook.userLLMSetting.maxTokens || this.defaultSettings.maxTokens,
                baseUrl: accountBook.userLLMSetting.baseUrl || undefined,
              };
            } else {
              console.log(`⚠️ 账本绑定的LLM设置不属于当前用户，跳过`);
            }
          }
        } catch (error) {
          console.error('获取账本绑定的LLM设置错误:', error);
        }
      }

      // 如果没有账本绑定设置，查找用户的默认LLM设置（仅限该用户创建的设置）
      try {
        const userLLMSetting = await prisma.userLLMSetting.findFirst({
          where: { userId },
        });

        if (userLLMSetting) {
          console.log(`✅ 使用用户默认自定义LLM设置: ${userLLMSetting.id}`);
          return {
            provider: userLLMSetting.provider || this.defaultSettings.provider,
            model: userLLMSetting.model || this.defaultSettings.model,
            apiKey: userLLMSetting.apiKey || '',
            temperature: userLLMSetting.temperature || this.defaultSettings.temperature,
            maxTokens: userLLMSetting.maxTokens || this.defaultSettings.maxTokens,
            baseUrl: userLLMSetting.baseUrl || undefined,
          };
        }
      } catch (error) {
        console.error('获取用户默认LLM设置错误:', error);
      }

      // 如果没有找到自定义设置，回退到官方服务
      console.log('未找到用户的自定义LLM设置，回退到官方服务');

      // 🚀 回退：检查多提供商配置（官方AI服务）
      const multiProviderConfig = await this.multiProviderService.loadMultiProviderConfig();
      if (multiProviderConfig?.enabled && multiProviderConfig.providers.length > 0) {
        const activeProviders = multiProviderConfig.providers.filter((p) => p.enabled);
        if (activeProviders.length > 0) {
          console.log('✅ 回退到多提供商LLM配置（官方AI服务）');
          return {
            provider: 'multi-provider',
            model: 'multi-provider',
            apiKey: '',
            temperature: 0.7,
            maxTokens: 1000,
            isMultiProvider: true,
          } as LLMSettings & { isMultiProvider: boolean };
        }
      }

      // 🚀 回退：使用全局LLM配置（官方AI服务）
      console.log('回退到全局LLM配置（官方AI服务）');
      const globalConfig = await this.getFullGlobalLLMConfig();

      if (globalConfig) {
        console.log(`✅ 回退到全局LLM配置: ${globalConfig.provider}/${globalConfig.model}`);
        return globalConfig;
      }

      // 如果没有全局配置，使用默认设置
      console.log(`使用默认LLM设置`);
      return {
        ...this.defaultSettings,
        apiKey: '',
      };
    } catch (error) {
      console.error('获取LLM设置错误:', error);

      // 即使出错，也尝试使用全局配置
      try {
        const globalConfig = await this.getFullGlobalLLMConfig();
        if (globalConfig) {
          console.log(`回退到全局LLM配置: ${globalConfig.provider}/${globalConfig.model}`);
          return globalConfig;
        }
      } catch (globalError) {
        console.error('获取全局LLM配置错误:', globalError);
      }

      return {
        ...this.defaultSettings,
        apiKey: '',
      };
    }
  }

  /**
   * 更新用户LLM设置
   * @param userId 用户ID
   * @param settings LLM设置
   */
  public async updateUserLLMSettings(
    userId: string,
    settings: Partial<LLMSettings>,
  ): Promise<void> {
    try {
      // 由于userLLMSetting表可能还不存在，我们使用userSetting表来存储LLM设置
      const existingSettings = await prisma.userSetting.findFirst({
        where: {
          userId,
          key: 'llm_settings',
        },
      });

      const llmSettings = {
        provider: settings.provider || this.defaultSettings.provider,
        model: settings.model || this.defaultSettings.model,
        apiKey: settings.apiKey,
        temperature: settings.temperature || this.defaultSettings.temperature,
        maxTokens: settings.maxTokens || this.defaultSettings.maxTokens,
      };

      if (existingSettings) {
        // 更新现有设置
        await prisma.userSetting.update({
          where: { id: existingSettings.id },
          data: {
            value: JSON.stringify(llmSettings),
          },
        });
      } else {
        // 创建新设置
        await prisma.userSetting.create({
          data: {
            userId,
            key: 'llm_settings',
            value: JSON.stringify(llmSettings),
          },
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
    userLLMSettingId: string,
  ): Promise<void> {
    try {
      // 检查账本是否存在
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: accountId },
      });

      if (!accountBook) {
        throw new Error(`账本不存在: ${accountId}`);
      }

      // 检查用户LLM设置是否存在
      const userLLMSettings = await prisma.$queryRaw`
        SELECT * FROM "user_llm_settings"
        WHERE "id" = ${userLLMSettingId}
      `;

      const userLLMSetting =
        Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;

      if (!userLLMSetting) {
        throw new Error(`用户LLM设置不存在: ${userLLMSettingId}`);
      }

      // 更新账本的userLLMSettingId
      await prisma.$executeRaw`
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
    },
  ): Promise<string> {
    try {
      console.log('开始创建用户LLM设置:', { userId, settings });

      // 使用Prisma ORM方法创建记录，这样更安全可靠
      const createdSetting = await prisma.userLLMSetting.create({
        data: {
          userId,
          name: settings.name,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey || null,
          temperature: settings.temperature || 0.7,
          maxTokens: settings.maxTokens || 1000,
          baseUrl: settings.baseUrl || null,
          description: settings.description || null,
        },
        select: {
          id: true,
        },
      });

      console.log('成功创建用户LLM设置:', createdSetting.id);
      return createdSetting.id;
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
    accountType?: 'personal' | 'family',
  ): Promise<string> {
    // 💡 Token限制检查 - 预估prompt的token数量
    const estimatedPromptTokens = this.estimateTokens(prompt);
    const tokenCheck = await this.tokenLimitService.canUseTokens(userId, estimatedPromptTokens);

    if (!tokenCheck.canUse) {
      throw new Error(`Token使用受限: ${tokenCheck.reason}`);
    }

    const settings = await this.getLLMSettings(userId, accountId, accountType);

    // 🚀 检查是否使用多提供商模式
    const multiProviderResult = await this.handleMultiProviderRequest(
      settings,
      prompt,
      null,
      userId,
      accountId,
      false,
    );
    if (multiProviderResult !== null) {
      return multiProviderResult;
    }

    const provider = this.getProvider(settings.provider);

    // 确定服务类型
    const serviceType = await this.determineServiceType(settings);

    const startTime = Date.now();
    let result: string = '';
    let isSuccess = false;
    let errorMessage: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // 尝试使用带token使用量信息的方法
      if (provider.generateTextWithUsage) {
        const response: LLMResponse = await provider.generateTextWithUsage(prompt, settings);
        result = response.content;

        if (response.usage) {
          promptTokens = response.usage.prompt_tokens;
          completionTokens = response.usage.completion_tokens;
        } else {
          // 如果API没有返回usage信息，回退到估算
          promptTokens = this.estimateTokens(prompt);
          completionTokens = this.estimateTokens(result);
        }
      } else {
        // 回退到原来的方法
        result = await provider.generateText(prompt, settings);
        promptTokens = this.estimateTokens(prompt);
        completionTokens = this.estimateTokens(result);
      }

      isSuccess = true;
      return result;
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      await this.logLLMCall({
        userId,
        accountId,
        provider: settings.provider,
        model: settings.model,
        userMessage: prompt,
        assistantMessage: result || null,
        systemPrompt: null,
        isSuccess,
        errorMessage,
        duration,
        promptTokens,
        completionTokens,
        serviceType,
        source: this.requestContext.source,
      });
    }
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
    accountType?: 'personal' | 'family',
  ): Promise<string> {
    // 💡 Token限制检查 - 预估所有消息的token数量
    const allMessagesText = messages.map((m) => m.content).join('\n');
    const estimatedPromptTokens = this.estimateTokens(allMessagesText);
    const tokenCheck = await this.tokenLimitService.canUseTokens(userId, estimatedPromptTokens);

    if (!tokenCheck.canUse) {
      throw new Error(`Token使用受限: ${tokenCheck.reason}`);
    }

    const settings = await this.getLLMSettings(userId, accountId, accountType);

    // 🚀 检查是否使用多提供商模式
    const multiProviderResult = await this.handleMultiProviderRequest(
      settings,
      null,
      messages,
      userId,
      accountId,
      true,
    );
    if (multiProviderResult !== null) {
      return multiProviderResult;
    }

    const provider = this.getProvider(settings.provider);

    // 确定服务类型
    const serviceType = await this.determineServiceType(settings);

    const startTime = Date.now();
    let result: string = '';
    let isSuccess = false;
    let errorMessage: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;

    // 提取系统消息和用户消息
    const systemMessage = messages.find((m) => m.role === 'system')?.content || null;
    const userMessage = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');

    try {
      // 尝试使用带token使用量信息的方法
      if (provider.generateChatWithUsage) {
        const response: LLMResponse = await provider.generateChatWithUsage(messages, settings);
        result = response.content;

        if (response.usage) {
          promptTokens = response.usage.prompt_tokens;
          completionTokens = response.usage.completion_tokens;
        } else {
          // 如果API没有返回usage信息，回退到估算
          const promptText = (systemMessage || '') + userMessage;
          promptTokens = this.estimateTokens(promptText);
          completionTokens = this.estimateTokens(result);
        }
      } else {
        // 回退到原来的方法
        result = await provider.generateChat(messages, settings);
        const promptText = (systemMessage || '') + userMessage;
        promptTokens = this.estimateTokens(promptText);
        completionTokens = this.estimateTokens(result);
      }

      isSuccess = true;
      return result;
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      await this.logLLMCall({
        userId,
        accountId,
        provider: settings.provider,
        model: settings.model,
        userMessage,
        assistantMessage: result || null,
        systemPrompt: systemMessage,
        isSuccess,
        errorMessage,
        duration,
        promptTokens,
        completionTokens,
        serviceType,
        source: this.requestContext.source,
      });
    }
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
          message: `未知的提供商: ${settings.provider}`,
        };
      }

      // 检查API密钥
      if (!settings.apiKey) {
        return {
          success: false,
          message: 'API密钥不能为空',
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
        maxTokens: 100,
      };

      // 尝试发送一个简单的测试请求
      try {
        // 使用一个简单的提示进行测试
        const testPrompt =
          "Hello, this is a test message. Please respond with 'OK' if you receive this.";
        const response = await provider.generateText(testPrompt, fullSettings);

        return {
          success: true,
          message: `连接测试成功: ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`,
        };
      } catch (apiError) {
        console.error('API调用错误:', apiError);
        return {
          success: false,
          message: `连接测试失败: ${
            apiError instanceof Error ? apiError.message : String(apiError)
          }`,
        };
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      return {
        success: false,
        message: `测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 获取全局LLM配置
   * @returns 全局LLM配置（不包含敏感信息）
   */
  public async getGlobalLLMConfig(): Promise<{
    enabled: boolean;
    provider?: string;
    model?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
  }> {
    try {
      const llmConfigs = await prisma.systemConfig.findMany({
        where: {
          category: 'llm',
        },
      });

      // 转换为对象格式
      const configObj: any = { enabled: false };

      llmConfigs.forEach((config) => {
        const key = config.key.replace('llm_global_', '');
        if (key === 'enabled') {
          configObj[key] = config.value === 'true';
        } else if (key === 'temperature') {
          configObj[key] = parseFloat(config.value || '0.7');
        } else if (key === 'max_tokens') {
          configObj['maxTokens'] = parseInt(config.value || '1000');
        } else if (key !== 'api_key') {
          // 排除敏感信息
          configObj[key] = config.value;
        }
      });

      return configObj;
    } catch (error) {
      console.error('获取全局LLM配置错误:', error);
      return { enabled: false };
    }
  }

  /**
   * 获取全局LLM配置（包含API Key，仅供内部使用）
   * @returns 完整的全局LLM配置
   */
  private async getFullGlobalLLMConfig(): Promise<LLMSettings | null> {
    try {
      const llmConfigs = await prisma.systemConfig.findMany({
        where: {
          category: 'llm',
        },
      });

      // 转换为对象格式
      const configObj: any = {};

      llmConfigs.forEach((config) => {
        const key = config.key.replace('llm_global_', '');
        if (key === 'enabled') {
          configObj[key] = config.value === 'true';
        } else if (key === 'temperature') {
          configObj[key] = parseFloat(config.value || '0.7');
        } else if (key === 'max_tokens') {
          configObj['maxTokens'] = parseInt(config.value || '1000');
        } else if (key === 'api_key') {
          configObj['apiKey'] = config.value;
        } else if (key === 'base_url') {
          configObj['baseUrl'] = config.value;
        } else {
          configObj[key] = config.value;
        }
      });

      // 检查是否启用且配置完整
      if (configObj.enabled && configObj.provider && configObj.model) {
        return {
          provider: configObj.provider,
          model: configObj.model,
          apiKey: configObj.apiKey || '',
          temperature: configObj.temperature || this.defaultSettings.temperature,
          maxTokens: configObj.maxTokens || this.defaultSettings.maxTokens,
          baseUrl: configObj.baseUrl,
        };
      }

      return null;
    } catch (error) {
      console.error('获取完整全局LLM配置错误:', error);
      return null;
    }
  }

  /**
   * 记录LLM调用日志
   * @param logData 日志数据
   */
  private async logLLMCall(logData: {
    userId: string;
    accountId?: string;
    provider: string;
    model: string;
    userMessage: string;
    assistantMessage: string | null;
    systemPrompt: string | null;
    isSuccess: boolean;
    errorMessage: string | null;
    duration: number;
    promptTokens: number;
    completionTokens: number;
    serviceType?: string;
    source?: 'App' | 'WeChat' | 'API';
  }): Promise<void> {
    try {
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: logData.userId },
        select: { name: true },
      });

      // 获取账本信息（如果提供了accountId）
      let accountBook = null;
      if (logData.accountId) {
        accountBook = await prisma.accountBook.findUnique({
          where: { id: logData.accountId },
          select: { name: true },
        });
      }

      // 计算总token数
      const totalTokens = logData.promptTokens + logData.completionTokens;

      // 计算成本（这里可以根据不同提供商的定价模型来计算）
      const cost = this.calculateCost(
        logData.provider,
        logData.model,
        logData.promptTokens,
        logData.completionTokens,
      );

      // 确定服务类型：如果没有明确指定，则根据用户级别的AI服务类型配置来判断
      let serviceType = logData.serviceType;
      if (!serviceType) {
        try {
          // 先尝试获取用户级别的AI服务类型配置
          const userServiceTypeSetting = await prisma.userSetting.findUnique({
            where: {
              userId_key: {
                userId: logData.userId,
                key: 'ai_service_type',
              },
            },
          });

          if (userServiceTypeSetting?.value === 'custom') {
            serviceType = 'custom';
          } else {
            // 如果用户选择了官方服务，检查是否使用多提供商配置
            const multiProviderConfig = await this.multiProviderService.loadMultiProviderConfig();
            if (multiProviderConfig?.enabled && multiProviderConfig.providers.length > 0) {
              // 检查当前提供商/模型是否匹配多提供商中的某个配置
              const isMultiProvider = multiProviderConfig.providers.some(
                (p) => p.enabled && p.provider === logData.provider && p.model === logData.model,
              );
              if (isMultiProvider) {
                serviceType = 'multi-provider';
              } else {
                serviceType = 'official';
              }
            } else {
              serviceType = 'official';
            }
          }
        } catch (error) {
          console.error('确定服务类型失败:', error);
          // 兜底逻辑：检查全局配置
          const globalConfig = await this.getGlobalLLMConfig();
          if (globalConfig.enabled) {
            serviceType = 'official';
          } else {
            serviceType = 'custom';
          }
        }
      }

      // 创建日志记录
      await prisma.llmCallLog.create({
        data: {
          userId: logData.userId,
          userName: user?.name || 'Unknown User',
          accountBookId: logData.accountId || null,
          accountBookName: accountBook?.name || null,
          provider: logData.provider,
          model: logData.model,
          source: logData.source || 'App',
          aiServiceType: 'llm',
          serviceType: serviceType,
          promptTokens: logData.promptTokens,
          completionTokens: logData.completionTokens,
          totalTokens: totalTokens,
          userMessage: logData.userMessage,
          assistantMessage: logData.assistantMessage,
          systemPrompt: logData.systemPrompt,
          isSuccess: logData.isSuccess,
          errorMessage: logData.errorMessage,
          duration: logData.duration,
          cost: cost,
        },
      });

      console.log(
        `LLM调用日志已记录: ${logData.provider}/${logData.model}, tokens: ${totalTokens}, duration: ${logData.duration}ms, serviceType: ${serviceType}`,
      );
    } catch (error) {
      console.error('记录LLM调用日志失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 计算LLM调用成本
   * @param provider 提供商
   * @param model 模型
   * @param promptTokens 输入token数量
   * @param completionTokens 输出token数量
   * @returns 成本（美元）
   */
  private calculateCost(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    // 定义不同提供商和模型的定价（每1K token的价格，单位：美元）
    const pricing: Record<string, Record<string, { input: number; output: number }>> = {
      openai: {
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      },
      siliconflow: {
        'Qwen/Qwen3-32B': { input: 0.0001, output: 0.0001 },
        'Qwen/Qwen3-8B': { input: 0.00005, output: 0.00005 },
        'deepseek-chat': { input: 0.00014, output: 0.00028 },
      },
      deepseek: {
        'deepseek-chat': { input: 0.00014, output: 0.00028 },
        'deepseek-coder': { input: 0.00014, output: 0.00028 },
      },
    };

    // 获取定价信息
    const providerPricing = pricing[provider.toLowerCase()];
    if (!providerPricing) {
      return 0; // 未知提供商，返回0成本
    }

    const modelPricing = providerPricing[model];
    if (!modelPricing) {
      return 0; // 未知模型，返回0成本
    }

    // 计算成本
    const inputCost = (promptTokens / 1000) * modelPricing.input;
    const outputCost = (completionTokens / 1000) * modelPricing.output;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  /**
   * 获取用户的默认LLM设置
   * @param userId 用户ID
   * @returns 用户的默认LLM设置
   */
  public async getUserDefaultLLMSetting(userId: string): Promise<any | null> {
    try {
      const userLLMSetting = await prisma.userLLMSetting.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }, // 获取最新创建的设置作为默认设置
      });

      if (userLLMSetting) {
        console.log(`✅ 找到用户 ${userId} 的默认LLM设置: ${userLLMSetting.name}`);
        return {
          id: userLLMSetting.id,
          name: userLLMSetting.name,
          provider: userLLMSetting.provider,
          model: userLLMSetting.model,
          baseUrl: userLLMSetting.baseUrl,
          temperature: userLLMSetting.temperature,
          maxTokens: userLLMSetting.maxTokens,
        };
      }

      console.log(`❌ 未找到用户 ${userId} 的LLM设置`);
      return null;
    } catch (error) {
      console.error('获取用户默认LLM设置错误:', error);
      return null;
    }
  }
}
