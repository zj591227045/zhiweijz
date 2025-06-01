import { Request, Response } from 'express';
import { LLMProviderService } from '../ai/llm/llm-provider-service';
import { SmartAccounting } from '../ai/langgraph/smart-accounting';
import { PrismaClient, TransactionType } from '@prisma/client';
import { SmartAccountingResult, SmartAccountingError } from '../types/smart-accounting';

/**
 * AI功能控制器
 * 处理AI相关的API请求
 */
export class AIController {
  private llmProviderService: LLMProviderService;
  private smartAccounting: SmartAccounting;
  private prisma: PrismaClient;

  /**
   * 构造函数
   */
  constructor() {
    this.llmProviderService = new LLMProviderService();
    this.smartAccounting = new SmartAccounting(this.llmProviderService);
    this.prisma = new PrismaClient();
  }

  /**
   * 获取可用的AI提供商列表
   * @param req 请求
   * @param res 响应
   */
  public async getProviders(req: Request, res: Response) {
    try {
      // 获取所有注册的提供商名称
      const providers = Array.from(this.llmProviderService.getProviderNames());
      res.json(providers);
    } catch (error) {
      console.error('获取AI提供商列表错误:', error);
      res.status(500).json({ error: '获取AI提供商列表失败' });
    }
  }

  /**
   * 智能记账API处理方法
   * @param req 请求
   * @param res 响应
   */
  public async handleSmartAccounting(req: Request, res: Response) {
    try {
      const { description } = req.body;
      const { accountId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!description) {
        return res.status(400).json({ error: '描述不能为空' });
      }

      if (!accountId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      // 检查账本是否存在并且用户有权限访问
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null
              },
              family: {
                members: {
                  some: {
                    userId
                  }
                }
              }
            }
          ]
        }
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 处理描述
      const result = await this.smartAccounting.processDescription(
        description,
        userId,
        accountId,
        accountBook.type
      );

      if (!result) {
        return res.status(500).json({ error: '智能记账处理失败' });
      }

      res.json(result);
    } catch (error) {
      console.error('智能记账错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取用户LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async getUserLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 获取用户LLM设置
      const settings = await this.llmProviderService.getLLMSettings(userId);

      // 移除敏感信息
      const safeSettings = {
        ...settings,
        apiKey: settings.apiKey ? '******' : null
      };

      res.json(safeSettings);
    } catch (error) {
      console.error('获取用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 创建用户LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async createUserLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, provider, model, apiKey, temperature, maxTokens, baseUrl, description } = req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!name || !provider || !model) {
        return res.status(400).json({ error: '名称、提供商和模型不能为空' });
      }

      // 创建用户LLM设置
      const settingId = await this.llmProviderService.createUserLLMSetting(userId, {
        name,
        provider,
        model,
        apiKey,
        temperature,
        maxTokens,
        baseUrl,
        description
      });

      res.json({ success: true, id: settingId });
    } catch (error) {
      console.error('创建用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取账本LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async getAccountLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检查用户是否有权限访问该账本
      const hasAccess = await this.checkAccountAccess(userId, accountId);
      if (!hasAccess) {
        return res.status(403).json({ error: '无权访问该账本' });
      }

      // 首先检查账本是否真的绑定了LLM服务
      try {
        // 查找账本
        const accountBook = await this.prisma.accountBook.findUnique({
          where: { id: accountId }
        });

        // 如果账本不存在
        if (!accountBook) {
          return res.status(404).json({
            bound: false,
            error: '账本不存在'
          });
        }

        // 检查账本是否绑定了LLM服务
        if (!accountBook.userLLMSettingId) {
          console.log(`账本 ${accountId} 未绑定LLM服务`);
          return res.status(200).json({
            bound: false,
            message: '账本未绑定LLM服务'
          });
        }

        // 查找关联的UserLLMSetting
        const userLLMSetting = await this.prisma.userLLMSetting.findUnique({
          where: { id: accountBook.userLLMSettingId }
        });

        // 如果找不到关联的UserLLMSetting
        if (!userLLMSetting) {
          console.log(`账本 ${accountId} 绑定的LLM服务 ${accountBook.userLLMSettingId} 不存在`);
          return res.status(200).json({
            bound: false,
            message: '账本绑定的LLM服务不存在'
          });
        }

        // 找到了关联的UserLLMSetting，返回设置信息
        console.log(`账本 ${accountId} 已绑定LLM服务 ${userLLMSetting.id}`);

        // 获取账本LLM设置
        const settings = await this.llmProviderService.getLLMSettings(
          userId,
          accountId
        );

        // 移除敏感信息
        const safeSettings = {
          bound: true,
          id: userLLMSetting.id,
          name: userLLMSetting.name,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey ? '******' : null,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          baseUrl: settings.baseUrl,
          description: userLLMSetting.description
        };

        return res.json(safeSettings);
      } catch (error) {
        console.error('检查账本LLM服务绑定错误:', error);
        return res.status(500).json({
          bound: false,
          error: '处理请求时出错'
        });
      }
    } catch (error) {
      console.error('获取账本LLM设置错误:', error);
      return res.status(500).json({
        bound: false,
        error: '处理请求时出错'
      });
    }
  }

  /**
   * 更新账本LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async updateAccountLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;
      const { userLLMSettingId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!userLLMSettingId) {
        return res.status(400).json({ error: '用户LLM设置ID不能为空' });
      }

      // 检查用户是否有权限访问该账本
      const hasAccess = await this.checkAccountAccess(userId, accountId);
      if (!hasAccess) {
        return res.status(403).json({ error: '无权访问该账本' });
      }

      // 验证LLM设置是否可访问（对于家庭账本，允许使用家庭成员的LLM设置）
      const canAccessLLMSetting = await this.checkLLMSettingAccess(userId, accountId, userLLMSettingId);
      if (!canAccessLLMSetting) {
        return res.status(403).json({ error: '无权使用该LLM设置' });
      }

      // 更新账本LLM设置
      await this.llmProviderService.updateAccountLLMSettings(
        accountId,
        userLLMSettingId
      );

      res.json({ success: true });
    } catch (error) {
      console.error('更新账本LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取用户所有LLM设置（包括家庭成员可访问的设置）
   * @param req 请求
   * @param res 响应
   */
  public async getUserLLMSettingsList(req: Request, res: Response) {
    try {
      console.log('收到获取用户LLM设置列表请求');
      console.log('请求头:', req.headers);

      const userId = req.user?.id;
      const accountBookId = req.query.accountBookId as string | undefined;
      console.log('用户ID:', userId, '账本ID:', accountBookId);

      if (!userId) {
        console.log('未授权: 用户ID不存在');
        return res.status(401).json({ error: '未授权' });
      }

      console.log(`正在查询用户 ${userId} 的LLM设置列表`);

      try {
        let settings: any[] = [];

        if (accountBookId) {
          // 如果指定了账本ID，查询该账本可访问的所有LLM设置
          console.log(`查询账本 ${accountBookId} 可访问的LLM设置`);

          // 首先验证用户是否有权限访问该账本
          const hasAccess = await this.checkAccountAccess(userId, accountBookId);
          if (!hasAccess) {
            return res.status(403).json({ error: '无权访问该账本' });
          }

          // 查询账本信息
          const accountBook = await this.prisma.accountBook.findUnique({
            where: { id: accountBookId },
            include: {
              family: {
                include: {
                  members: {
                    where: { userId: { not: null } },
                    include: {
                      user: {
                        select: { id: true }
                      }
                    }
                  }
                }
              }
            }
          });

          if (accountBook) {
            let userIds = [userId]; // 默认包含当前用户

            // 如果是家庭账本，包含所有家庭成员的LLM设置
            if (accountBook.type === 'FAMILY' && accountBook.family) {
              const familyUserIds = accountBook.family.members
                .filter(member => member.user)
                .map(member => member.user!.id);
              userIds = [...new Set([...userIds, ...familyUserIds])];
              console.log(`家庭账本，包含家庭成员用户IDs:`, familyUserIds);
            }

            // 查询所有相关用户的LLM设置
            settings = await this.prisma.$queryRaw`
              SELECT id, name, provider, model, temperature, max_tokens, created_at, updated_at, description, base_url, user_id
              FROM "user_llm_settings"
              WHERE "user_id" = ANY(${userIds})
              ORDER BY "created_at" DESC
            `;
          }
        } else {
          // 如果没有指定账本ID，只查询用户自己的LLM设置
          settings = await this.prisma.$queryRaw`
            SELECT id, name, provider, model, temperature, max_tokens, created_at, updated_at, description, base_url, user_id
            FROM "user_llm_settings"
            WHERE "user_id" = ${userId}
            ORDER BY "created_at" DESC
          `;
        }

        console.log(`查询结果: 找到 ${Array.isArray(settings) ? settings.length : 0} 条记录`);
        if (Array.isArray(settings) && settings.length > 0) {
          console.log('第一条记录示例:', settings[0]);
        }

        // 如果没有找到记录，返回空数组
        if (!settings || (Array.isArray(settings) && settings.length === 0)) {
          console.log('没有找到LLM设置记录，返回空数组');

          // 设置CORS头
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          return res.json([]);
        }

        // 转换字段名称为驼峰命名，并添加所有者信息
        const formattedSettings = Array.isArray(settings) ? settings.map(setting => ({
          id: setting.id,
          name: setting.name,
          provider: setting.provider,
          model: setting.model,
          temperature: setting.temperature,
          maxTokens: setting.max_tokens,
          createdAt: setting.created_at,
          updatedAt: setting.updated_at,
          description: setting.description,
          baseUrl: setting.base_url,
          userId: setting.user_id,
          isOwner: setting.user_id === userId // 标记是否为当前用户创建的设置
        })) : [];

        console.log('返回格式化后的LLM设置列表');
        console.log('响应数据:', formattedSettings);

        // 设置CORS头
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        res.json(formattedSettings);
      } catch (queryError) {
        console.error('数据库查询错误:', queryError);
        // 如果数据库查询出错，返回空数组

        // 设置CORS头
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        res.json([]);
      }
    } catch (error) {
      console.error('获取用户LLM设置列表错误:', error);

      // 设置CORS头
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取用户LLM设置详情
   * @param req 请求
   * @param res 响应
   */
  public async getUserLLMSettingsById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!id) {
        return res.status(400).json({ error: 'LLM设置ID不能为空' });
      }

      console.log(`正在查询用户 ${userId} 的LLM设置 ${id}`);

      try {
        // 查询指定的LLM设置
        const settings = await this.prisma.$queryRaw`
          SELECT id, name, provider, model, temperature, max_tokens, created_at, updated_at, description, base_url
          FROM "user_llm_settings"
          WHERE "id" = ${id} AND "user_id" = ${userId}
        `;

        if (!settings || (Array.isArray(settings) && settings.length === 0)) {
          return res.status(404).json({ error: 'LLM设置不存在' });
        }

        const setting = Array.isArray(settings) ? settings[0] : settings;

        // 转换字段名称为驼峰命名
        const formattedSetting = {
          id: setting.id,
          name: setting.name,
          provider: setting.provider,
          model: setting.model,
          temperature: setting.temperature,
          maxTokens: setting.max_tokens,
          createdAt: setting.created_at,
          updatedAt: setting.updated_at,
          description: setting.description,
          baseUrl: setting.base_url
        };

        console.log('返回LLM设置详情:', formattedSetting);
        res.json(formattedSetting);
      } catch (queryError) {
        console.error('数据库查询错误:', queryError);
        res.status(500).json({ error: '查询LLM设置失败' });
      }
    } catch (error) {
      console.error('获取用户LLM设置详情错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 更新用户LLM设置（通过ID）
   * @param req 请求
   * @param res 响应
   */
  public async updateUserLLMSettingsById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, provider, model, apiKey, temperature, maxTokens, baseUrl, description } = req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检查设置是否存在且属于该用户
      const setting = await this.prisma.userLLMSetting.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!setting) {
        return res.status(404).json({ error: '未找到LLM设置或无权访问' });
      }

      // 准备更新数据
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (provider !== undefined) updateData.provider = provider;
      if (model !== undefined) updateData.model = model;
      if (apiKey !== undefined) updateData.apiKey = apiKey;
      if (temperature !== undefined) updateData.temperature = temperature;
      if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (description !== undefined) updateData.description = description;

      // 更新设置
      await this.prisma.userLLMSetting.update({
        where: { id },
        data: updateData
      });

      res.json({ success: true });
    } catch (error) {
      console.error('更新用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 删除用户LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async deleteUserLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检查设置是否存在且属于该用户
      const setting = await this.prisma.userLLMSetting.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!setting) {
        return res.status(404).json({ error: '未找到LLM设置或无权访问' });
      }

      // 删除设置
      await this.prisma.userLLMSetting.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('删除用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 测试LLM连接
   * @param req 请求
   * @param res 响应
   */
  public async testLLMConnection(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { provider, model, apiKey, baseUrl, useExistingKey } = req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!provider || !model) {
        return res.status(400).json({ error: '提供商和模型不能为空' });
      }

      // 如果使用现有密钥，获取用户的API密钥
      let testApiKey = apiKey;
      if (useExistingKey) {
        // 获取用户现有的API密钥
        const userSettings = await this.prisma.userLLMSetting.findFirst({
          where: {
            userId,
            provider
          },
          select: {
            apiKey: true
          }
        });

        if (!userSettings || !userSettings.apiKey) {
          return res.status(400).json({
            success: false,
            message: '未找到现有API密钥，请提供新的API密钥'
          });
        }

        testApiKey = userSettings.apiKey;
      } else if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API密钥不能为空'
        });
      }

      // 测试连接
      const result = await this.llmProviderService.testConnection({
        provider,
        model,
        apiKey: testApiKey,
        baseUrl
      });

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('测试LLM连接错误:', error);
      res.status(500).json({
        success: false,
        message: '测试连接时出错'
      });
    }
  }

  /**
   * 智能记账并直接创建交易记录 - 支持请求体中包含账本ID和用户名称
   * @param req 请求
   * @param res 响应
   */
  public async handleSmartAccountingDirectWithBody(req: Request, res: Response) {
    try {
      const { description, accountBookId, userName, includeDebugInfo } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!description) {
        return res.status(400).json({ error: '描述不能为空' });
      }

      if (!accountBookId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      // 检查账本是否存在并且用户有权限访问
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null
              },
              family: {
                members: {
                  some: {
                    userId
                  }
                }
              }
            }
          ]
        }
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 如果提供了用户名称，验证该用户是否为家庭成员
      let targetUserId = userId; // 默认使用请求发起人的ID
      if (userName && accountBook.type === 'FAMILY') {
        // 查找家庭成员
        const familyMember = await this.prisma.familyMember.findFirst({
          where: {
            familyId: accountBook.familyId || undefined,
            OR: [
              { name: userName },
              {
                user: {
                  name: userName
                }
              }
            ]
          },
          include: {
            user: true
          }
        });

        if (familyMember && familyMember.userId) {
          targetUserId = familyMember.userId;
        }
      }

      // 处理描述
      const smartResult = await this.smartAccounting.processDescription(
        description,
        targetUserId,
        accountBookId,
        accountBook.type,
        includeDebugInfo || false
      );

      if (!smartResult) {
        return res.status(500).json({ error: '智能记账处理失败' });
      }

      // 检查是否有错误信息（如内容与记账无关）
      if ('error' in smartResult) {
        return res.status(400).json({ info: smartResult.error });
      }

      // 从智能记账结果创建交易记录
      try {
        // 准备交易数据
        const now = new Date();
        const dateObj = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );

        const transactionData = {
          amount: (smartResult as any).amount,
          type: (smartResult as any).type as TransactionType,
          categoryId: (smartResult as any).categoryId,
          description: (smartResult as any).note || description,
          date: dateObj,
          accountBookId: accountBookId,
          userId: targetUserId, // 使用目标用户ID
          // 如果是家庭账本，添加家庭ID
          familyId: accountBook.type === 'FAMILY' ? accountBook.familyId : null,
          // 预算ID如果有的话
          budgetId: (smartResult as any).budgetId || null
        };

        // 创建交易记录
        const transaction = await this.prisma.transaction.create({
          data: transactionData
        });

        // 返回创建的交易记录
        res.status(201).json({
          ...transaction,
          smartAccountingResult: smartResult
        });
      } catch (createError) {
        console.error('创建交易记录错误:', createError);
        // 即使创建失败，也返回智能记账结果
        res.status(500).json({
          error: '创建交易记录失败',
          smartAccountingResult: smartResult
        });
      }
    } catch (error) {
      console.error('智能记账直接创建错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 智能记账并直接创建交易记录
   * @param req 请求
   * @param res 响应
   */
  public async handleSmartAccountingDirect(req: Request, res: Response) {
    try {
      const { description } = req.body;
      const { accountId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!description) {
        return res.status(400).json({ error: '描述不能为空' });
      }

      if (!accountId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      // 检查账本是否存在并且用户有权限访问
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null
              },
              family: {
                members: {
                  some: {
                    userId
                  }
                }
              }
            }
          ]
        }
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 处理描述，获取智能记账结果
      const result = await this.smartAccounting.processDescription(
        description,
        userId,
        accountId,
        accountBook.type
      );

      if (!result) {
        return res.status(500).json({ error: '智能记账处理失败' });
      }

      // 检查是否有错误信息（如内容与记账无关）
      if ('error' in result) {
        return res.status(400).json({ info: result.error });
      }

      // 使用类型断言
      const smartResult = result as SmartAccountingResult;

      // 从智能记账结果创建交易记录
      try {
        // 准备交易数据
        // 处理日期，使用当前本地时间而不是智能记账返回的日期
        // 智能记账的日期通常只包含日期部分，我们需要使用当前时间
        const now = new Date();
        const dateObj = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );

        const transactionData = {
          amount: smartResult.amount,
          type: smartResult.type as TransactionType,
          categoryId: smartResult.categoryId,
          description: smartResult.note || description,
          date: dateObj,
          accountBookId: accountId,
          userId,
          // 如果是家庭账本，添加家庭ID
          familyId: accountBook.type === 'FAMILY' ? accountBook.familyId : null,
          // 预算ID如果有的话
          budgetId: smartResult.budgetId || null
        };

        // 创建交易记录
        const transaction = await this.prisma.transaction.create({
          data: transactionData
        });

        // 返回创建的交易记录
        res.status(201).json({
          ...transaction,
          smartAccountingResult: smartResult
        });
      } catch (createError) {
        console.error('创建交易记录错误:', createError);
        // 即使创建失败，也返回智能记账结果
        res.status(500).json({
          error: '创建交易记录失败',
          smartAccountingResult: smartResult
        });
      }
    } catch (error) {
      console.error('智能记账直接创建错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 检查用户是否有权限访问账本
   * @param userId 用户ID
   * @param accountId 账本ID
   * @returns 是否有权限
   */
  private async checkAccountAccess(userId: string, accountId: string): Promise<boolean> {
    try {
      const accountBook = await this.prisma.accountBook.findUnique({
        where: { id: accountId }
      });

      if (!accountBook) {
        return false;
      }

      // 检查是否是用户自己的账本
      if (accountBook.userId === userId) {
        return true;
      }

      // 检查是否是家庭账本且用户是家庭成员
      if (accountBook.type === 'FAMILY' && accountBook.familyId) {
        const familyMember = await this.prisma.familyMember.findFirst({
          where: {
            familyId: accountBook.familyId,
            userId
          }
        });

        return !!familyMember;
      }

      return false;
    } catch (error) {
      console.error('检查账本访问权限错误:', error);
      return false;
    }
  }

  /**
   * 检查用户是否有权限使用指定的LLM设置
   * @param userId 用户ID
   * @param accountId 账本ID
   * @param llmSettingId LLM设置ID
   * @returns 是否有权限
   */
  private async checkLLMSettingAccess(userId: string, accountId: string, llmSettingId: string): Promise<boolean> {
    try {
      // 查询LLM设置
      const llmSetting = await this.prisma.userLLMSetting.findUnique({
        where: { id: llmSettingId }
      });

      if (!llmSetting) {
        return false;
      }

      // 如果是用户自己的LLM设置，直接允许
      if (llmSetting.userId === userId) {
        return true;
      }

      // 查询账本信息
      const accountBook = await this.prisma.accountBook.findUnique({
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

      if (!accountBook) {
        return false;
      }

      // 如果是家庭账本，检查LLM设置是否属于家庭成员
      if (accountBook.type === 'FAMILY' && accountBook.family) {
        const familyUserIds = accountBook.family.members
          .map(member => member.userId)
          .filter(id => id !== null);

        // 检查当前用户是否是家庭成员
        const isCurrentUserFamilyMember = familyUserIds.includes(userId);
        // 检查LLM设置所有者是否是家庭成员
        const isLLMOwnerFamilyMember = familyUserIds.includes(llmSetting.userId);

        return isCurrentUserFamilyMember && isLLMOwnerFamilyMember;
      }

      return false;
    } catch (error) {
      console.error('检查LLM设置访问权限错误:', error);
      return false;
    }
  }
}