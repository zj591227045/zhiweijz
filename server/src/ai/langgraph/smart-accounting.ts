import { LLMProviderService } from '../llm/llm-provider-service';
import {
  SMART_ACCOUNTING_SYSTEM_PROMPT,
  SMART_ACCOUNTING_USER_PROMPT,
} from '../prompts/accounting-prompts';
import { SmartAccountingState } from '../types/accounting-types';
import { SmartAccountingResponse } from '../../types/smart-accounting';
import { MultimodalAIConfigService } from '../../services/multimodal-ai-config.service';
import { 
  SmartAccountingPromptProcessor,
  SmartAccountingPromptVariables,
  RelevanceCheckPromptVariables 
} from '../../utils/prompt-utils';
import NodeCache from 'node-cache';
import prisma from '../../config/database';
import dotenv from 'dotenv';
import AccountingPointsService from '../../services/accounting-points.service';
import { MembershipService } from '../../services/membership.service';

/**
 * 智能记账工作流
 * 实现了从用户描述中提取记账信息，并匹配到预算和账本的功能
 */
export class SmartAccounting {
  private llmProviderService: LLMProviderService;
  private configService: MultimodalAIConfigService;
  private cache: NodeCache;
  private membershipService: MembershipService;

  /**
   * 构造函数
   * @param llmProviderService LLM提供商服务
   */
  constructor(llmProviderService: LLMProviderService) {
    // 加载环境变量
    dotenv.config();

    this.llmProviderService = llmProviderService;
    this.configService = new MultimodalAIConfigService();
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1小时过期
    this.membershipService = new MembershipService();

    // 移除硬编码的API密钥 - 应该通过环境变量或配置文件设置
    // process.env.SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-limqgsnsbmlwuxltjfmshpkfungijbliynwmmcknjupedyme';
  }

  /**
   * 处理用户描述
   * @param description 用户描述
   * @param userId 用户ID
   * @param accountId 账本ID (必需)
   * @param accountType 账本类型 (必需)
   * @returns 处理结果
   */
  public async processDescription(
    description: string,
    userId: string,
    accountId: string,
    accountType: string,
    includeDebugInfo: boolean = false,
  ): Promise<SmartAccountingResponse> {
    if (!accountId) {
      console.error('处理智能记账时缺少账本ID');
      return null;
    }

    if (!userId) {
      console.error('处理智能记账时缺少用户ID');
      return null;
    }

    // 检查记账点余额（LLM文字记账消费1点）- 仅在记账点系统启用时检查
    if (this.membershipService.isAccountingPointsEnabled()) {
      const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.text);
      if (!canUsePoints) {
        return {
          error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员'
        };
      }
    }

    // 生成缓存键
    const cacheKey = `smartAccounting:${userId}:${accountId}:${description}`;

    // 检查缓存
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      // 注意：缓存命中时也需要扣除记账点，因为用户确实使用了服务
      if (this.membershipService.isAccountingPointsEnabled()) {
        try {
          await AccountingPointsService.deductPoints(userId, 'text', AccountingPointsService.POINT_COSTS.text);
        } catch (pointsError) {
          console.error('扣除记账点失败:', pointsError);
          // 记账点扣除失败不影响返回结果，但需要记录日志
        }
      }
      return cachedResult as SmartAccountingResponse;
    }

    // 创建初始状态
    const initialState: SmartAccountingState = {
      description,
      userId,
      accountId,
      accountType: accountType.toLowerCase() as 'personal' | 'family',
      includeDebugInfo,
    };

    // 由于LangGraph的API变化，我们使用简单的顺序执行
    try {
      // 分析记账
      const analyzedState = await this.analyzeTransactionHandler(initialState);

      // 检查是否有错误（如内容与记账无关）
      if (analyzedState.error) {
        console.log('智能记账分析失败:', analyzedState.error);
        // 返回包含错误信息的对象，而不是null
        return { error: analyzedState.error };
      }

      // 匹配预算
      const budgetState = await this.matchBudgetHandler(analyzedState);

      // 匹配账本
      const accountState = await this.matchAccountHandler(budgetState);

      // 生成结果
      const resultState = await this.generateResultHandler(accountState);

      // 智能记账成功，扣除记账点（仅在记账点系统启用时）
      if (this.membershipService.isAccountingPointsEnabled()) {
        try {
          await AccountingPointsService.deductPoints(userId, 'text', AccountingPointsService.POINT_COSTS.text);
        } catch (pointsError) {
          console.error('扣除记账点失败:', pointsError);
          // 记账点扣除失败不影响返回结果，但需要记录日志
        }
      }

      // 缓存结果
      if (resultState.result) {
        this.cache.set(cacheKey, resultState.result);
        return resultState.result;
      }

      // 如果没有结果，返回null
      return null;
    } catch (error) {
      console.error('工作流执行错误:', error);
      return null;
    }
  }

  /**
   * 获取预算列表用于LLM提示
   * @param userId 用户ID
   * @param accountId 账本ID
   * @returns 预算列表字符串
   */
  private async getBudgetListForPrompt(userId: string, accountId: string): Promise<string> {
    try {
      // 获取当前账本信息
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: accountId },
        include: {
          family: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!accountBook) {
        return '';
      }

      const budgets = [];
      const currentDate = new Date();

      // 获取当前活跃的预算
      const activeBudgets = await prisma.budget.findMany({
        where: {
          OR: [
            // 账本预算
            {
              accountBookId: accountId,
              startDate: { lte: currentDate },
              endDate: { gte: currentDate },
            },
            // 用户个人预算
            {
              userId: userId,
              startDate: { lte: currentDate },
              endDate: { gte: currentDate },
            },
            // 家庭预算（如果是家庭账本）
            ...(accountBook.familyId
              ? [
                  {
                    familyId: accountBook.familyId,
                    startDate: { lte: currentDate },
                    endDate: { gte: currentDate },
                  },
                ]
              : []),
          ],
        },
        include: {
          familyMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // 处理预算信息
      for (const budget of activeBudgets) {
        let budgetDisplayName = budget.name;

        // 根据预算类型生成正确的显示名称
        if ((budget as any).budgetType === 'GENERAL') {
          // 通用预算：直接使用预算名称
          budgetDisplayName = budget.name;
        } else if ((budget as any).budgetType === 'PERSONAL') {
          // 个人预算：只显示人员名称
          if (budget.familyMemberId && budget.familyMember) {
            // 托管成员预算
            budgetDisplayName = budget.familyMember.user?.name || budget.familyMember.name;
          } else if (budget.userId) {
            // 家庭成员预算或个人预算
            const user = await prisma.user.findUnique({
              where: { id: budget.userId },
              select: { name: true },
            });
            if (user) {
              budgetDisplayName = user.name;
            }
          }
        }

        budgets.push(`- 预算名称: ${budgetDisplayName}, ID: ${budget.id}`);
      }

      return budgets.join('\n');
    } catch (error) {
      console.error('获取预算列表失败:', error);
      return '';
    }
  }

  /**
   * 智能分析节点 - 合并了实体提取和分类匹配
   * @param state 工作流状态
   * @returns 更新后的工作流状态
   */
  private async analyzeTransactionHandler(state: SmartAccountingState) {
    try {
      // 获取配置的提示词
      const config = await this.configService.getFullConfig();
      
      // 第一步：判断请求内容是否与记账相关
      const relevanceCheckTemplate = config.smartAccounting.relevanceCheckPrompt || `
你是一个专业的财务助手。请判断以下用户描述是否与记账相关。

判断标准：
1. 包含金额信息（必须）
2. 包含记账流水明细（必须）
3. 可能包含日期信息（可选）
4. 可能包含预算信息（可选）

如果描述中包含明确的金额和记账内容（如购买、支付、收入、转账等），则判定为与记账相关。
如果描述中只是询问、闲聊或其他非记账相关内容，则判定为与记账无关。

请只回答 "相关" 或 "无关"，不要有其他文字。

用户描述: {{description}}`;

      // 使用工具函数替换占位符
      const relevanceVariables: RelevanceCheckPromptVariables = {
        description: state.description
      };
      const relevanceCheckPrompt = SmartAccountingPromptProcessor.processRelevanceCheckPrompt(
        relevanceCheckTemplate,
        relevanceVariables
      );

      const relevanceResponse = await this.llmProviderService.generateChat(
        [
          { role: 'system', content: '你是一个专业的财务助手，负责判断用户描述是否与记账相关。' },
          { role: 'user', content: relevanceCheckPrompt },
        ],
        state.userId,
        state.accountId,
        state.accountType,
      );

      const relevanceResult = relevanceResponse.trim();

      // 如果内容与记账无关，直接返回错误
      if (relevanceResult.includes('无关')) {
        return {
          ...state,
          error: '消息与记账无关',
        };
      }

      // 获取所有分类
      const categories = await prisma.category.findMany({
        where: {
          OR: [{ userId: state.userId }, { isDefault: true }, { accountBookId: state.accountId }],
        },
      });

      // 使用简化的分类列表
      const categoryList = await this.getSimplifiedCategoryListForPrompt(
        state.userId,
        state.accountId || '',
      );

      // 按需获取预算列表
      const needBudgetInfo = this.hasBudgetKeywords(state.description);
      const budgetList = needBudgetInfo
        ? `预算列表：${await this.getBudgetListForPrompt(state.userId, state.accountId || '')}`
        : '';

      // 准备提示词 - 使用配置的提示词
      const currentDate = new Date().toISOString().split('T')[0];
      const smartAccountingTemplate = config.smartAccounting.smartAccountingPrompt || SMART_ACCOUNTING_SYSTEM_PROMPT;
      
      // 使用工具函数替换占位符
      const smartAccountingVariables: SmartAccountingPromptVariables = {
        description: state.description,
        categories: categoryList,
        budgets: budgetList,
        currentDate: currentDate
      };
      const systemPrompt = SmartAccountingPromptProcessor.processSmartAccountingPrompt(
        smartAccountingTemplate,
        smartAccountingVariables
      );

      // 使用配置的提示词或默认提示词
      const userPrompt = `用户描述: ${state.description}\n当前日期: ${currentDate}`;

      // 调用LLM
      const response = await this.llmProviderService.generateChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        state.userId,
        state.accountId,
        state.accountType,
      );

      // 解析响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analyzedTransaction = JSON.parse(jsonMatch[0]);

        // 处理日期
        if (analyzedTransaction.date) {
          analyzedTransaction.date = new Date(analyzedTransaction.date);
        } else {
          analyzedTransaction.date = new Date();
        }

        // 验证分类ID是否有效
        const validCategory = categories.find((c: any) => c.id === analyzedTransaction.categoryId);
        if (!validCategory) {
          throw new Error('无效的分类ID');
        }

        // 保存调试信息
        const debugInfo = {
          systemPrompt,
          userPrompt,
          llmResponse: response,
          parsedResult: analyzedTransaction,
        };

        return {
          ...state,
          analyzedTransaction,
          debugInfo,
        };
      }

      throw new Error('无法解析智能分析结果');
    } catch (error) {
      console.error('智能分析错误:', error);

      // 检查是否是Token限额错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Token使用受限')) {
        console.log('Token限额错误，返回错误状态');
        return {
          ...state,
          error: errorMessage,
        };
      }

      // 对于其他错误，回退到默认分类
      const defaultCategory =
        (await prisma.category.findFirst({
          where: { name: '其他' },
        })) || (await prisma.category.findFirst());

      if (defaultCategory) {
        return {
          ...state,
          analyzedTransaction: {
            amount: 0,
            date: new Date(),
            categoryId: defaultCategory.id,
            categoryName: defaultCategory.name,
            type: defaultCategory.type as 'EXPENSE' | 'INCOME',
            note: state.description,
            confidence: 0.5,
          },
        };
      }

      return state;
    }
  }

  /**
   * 预算匹配节点
   * @param state 工作流状态
   * @returns 更新后的工作流状态
   */
  private async matchBudgetHandler(state: SmartAccountingState) {
    if (!state.analyzedTransaction || !state.accountId || !state.userId) {
      return state;
    }

    try {
      let budget = null;
      console.log(`🎯 [预算匹配] 开始为用户 ${state.userId} 匹配预算`);

      // 如果LLM识别出了预算名称，优先根据预算名称匹配
      if (state.analyzedTransaction.budgetName) {
        console.log(`🔍 [预算匹配] 尝试根据预算名称匹配: ${state.analyzedTransaction.budgetName}`);
        budget = await this.findBudgetByName(
          state.analyzedTransaction.budgetName,
          state.userId,
          state.accountId,
        );
        if (budget) {
          console.log(`✅ [预算匹配] 根据预算名称找到匹配的预算: ${budget.id} - ${budget.name}`);
          return {
            ...state,
            matchedBudget: {
              id: budget.id,
              name: budget.name,
            },
          };
        } else {
          console.log(`❌ [预算匹配] 未找到名称匹配的预算，使用默认逻辑`);
        }
      }

      // 如果没有识别出预算名称或根据名称未找到，则使用默认逻辑
      // 优先级：
      // 1. 请求发起人在当前账本的个人预算（优先级最高）
      // 2. 请求发起人的个人预算（按分类匹配）
      // 3. 当前账本+分类+日期范围匹配的预算

      console.log(`🔍 [预算匹配] 查找用户 ${state.userId} 在账本 ${state.accountId} 的个人预算`);

      // 首先尝试找到请求发起人的个人预算
      budget = await prisma.budget.findFirst({
        where: {
          userId: state.userId,
          accountBookId: state.accountId,
          startDate: { lte: state.analyzedTransaction.date },
          endDate: { gte: state.analyzedTransaction.date },
        },
        orderBy: [
          // 优先匹配分类
          { categoryId: state.analyzedTransaction.categoryId ? 'desc' : 'asc' },
        ],
      });

      if (budget) {
        console.log(
          `✅ [预算匹配] 找到用户个人预算: ${budget.id} - ${budget.name} (分类匹配: ${
            budget.categoryId === state.analyzedTransaction.categoryId ? '是' : '否'
          })`,
        );
      }

      // 如果没有找到发起人的个人预算，再尝试其他预算
      if (!budget) {
        console.log(`🔍 [预算匹配] 未找到个人预算，查找账本通用预算`);
        budget = await prisma.budget.findFirst({
          where: {
            OR: [
              // 当前账本预算（按分类匹配）
              {
                accountBookId: state.accountId,
                categoryId: state.analyzedTransaction.categoryId,
                startDate: { lte: state.analyzedTransaction.date },
                endDate: { gte: state.analyzedTransaction.date },
              },
              // 通用账本预算
              {
                accountBookId: state.accountId,
                categoryId: null,
                startDate: { lte: state.analyzedTransaction.date },
                endDate: { gte: state.analyzedTransaction.date },
              },
            ],
          },
          orderBy: [
            // 优先匹配分类的预算
            { categoryId: 'desc' },
          ],
        });

        if (budget) {
          console.log(
            `✅ [预算匹配] 找到账本预算: ${budget.id} - ${budget.name} (类型: ${
              budget.categoryId ? '分类预算' : '通用预算'
            })`,
          );
        }
      }

      if (budget) {
        return {
          ...state,
          matchedBudget: {
            id: budget.id,
            name: budget.name,
          },
        };
      }

      console.log(
        `❌ [预算匹配] 未找到任何匹配的预算，分类ID: ${state.analyzedTransaction.categoryId}`,
      );
      return state;
    } catch (error) {
      console.error('预算匹配错误:', error);
      return state;
    }
  }

  /**
   * 根据预算名称查找预算
   * @param budgetName 预算名称
   * @param userId 用户ID
   * @param accountId 账本ID
   * @returns 匹配的预算
   */
  private async findBudgetByName(budgetName: string, userId: string, accountId: string) {
    try {
      const currentDate = new Date();

      // 获取账本信息
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: accountId },
        include: {
          family: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!accountBook) {
        return null;
      }

      // 获取当前活跃的预算
      const activeBudgets = await prisma.budget.findMany({
        where: {
          OR: [
            // 账本预算
            {
              accountBookId: accountId,
              startDate: { lte: currentDate },
              endDate: { gte: currentDate },
            },
            // 用户个人预算
            {
              userId: userId,
              startDate: { lte: currentDate },
              endDate: { gte: currentDate },
            },
            // 家庭预算（如果是家庭账本）
            ...(accountBook.familyId
              ? [
                  {
                    familyId: accountBook.familyId,
                    startDate: { lte: currentDate },
                    endDate: { gte: currentDate },
                  },
                ]
              : []),
          ],
        },
        include: {
          familyMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // 匹配预算名称
      for (const budget of activeBudgets) {
        // 生成预算的显示名称（与getBudgetListForPrompt中的逻辑保持一致）
        let budgetDisplayName = budget.name;

        // 根据预算类型生成正确的显示名称
        if ((budget as any).budgetType === 'GENERAL') {
          // 通用预算：直接使用预算名称
          budgetDisplayName = budget.name;
        } else if ((budget as any).budgetType === 'PERSONAL') {
          // 个人预算：只显示人员名称
          if (budget.familyMemberId && budget.familyMember) {
            // 托管成员预算
            budgetDisplayName = budget.familyMember.user?.name || budget.familyMember.name;
          } else if (budget.userId) {
            // 家庭成员预算或个人预算
            const user = await prisma.user.findUnique({
              where: { id: budget.userId },
              select: { name: true },
            });
            if (user) {
              budgetDisplayName = user.name;
            }
          }
        }

        // 精确匹配预算显示名称
        if (budgetDisplayName === budgetName) {
          return budget;
        }

        // 模糊匹配：检查用户描述中是否包含成员名称
        if ((budget as any).budgetType === 'PERSONAL') {
          if (budget.familyMemberId && budget.familyMember) {
            const memberName = budget.familyMember.user?.name || budget.familyMember.name;
            if (budgetName.includes(memberName)) {
              return budget;
            }
          } else if (budget.userId) {
            const user = await prisma.user.findUnique({
              where: { id: budget.userId },
              select: { name: true },
            });
            if (user && budgetName.includes(user.name)) {
              return budget;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('根据名称查找预算失败:', error);
      return null;
    }
  }

  /**
   * 账本匹配节点
   * @param state 工作流状态
   * @returns 更新后的工作流状态
   */
  private async matchAccountHandler(state: SmartAccountingState) {
    // 由于API调用时已经要求提供账本ID，这里只需验证账本是否存在
    if (!state.accountId || !state.userId) {
      console.error('缺少账本ID或用户ID');
      return state;
    }

    try {
      // 验证账本是否存在并且用户有权限访问
      const accountBook = await prisma.accountBook.findFirst({
        where: {
          id: state.accountId,
          OR: [
            { userId: state.userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null,
              },
              family: {
                members: {
                  some: {
                    userId: state.userId,
                  },
                },
              },
            },
          ],
        },
      });

      if (accountBook) {
        console.log(`验证账本成功: ${accountBook.id} - ${accountBook.name}`);
        return {
          ...state,
          accountId: accountBook.id,
          accountType: accountBook.type.toLowerCase() as 'personal' | 'family',
        };
      } else {
        console.error(`账本不存在或用户无权访问: ${state.accountId}`);
      }
    } catch (error) {
      console.error('账本验证错误:', error);
    }

    return state;
  }

  /**
   * 结果生成节点
   * @param state 工作流状态
   * @returns 更新后的工作流状态
   */
  private async generateResultHandler(state: SmartAccountingState) {
    if (!state.analyzedTransaction || !state.accountId || !state.userId) {
      console.error('生成结果时缺少必要信息');
      // 返回一个基本的错误结果
      const errorResult = {
        amount: 0,
        date: new Date(),
        categoryId: '',
        categoryName: '未知分类',
        type: 'EXPENSE' as const,
        note: '生成结果时缺少必要信息',
        accountId: state.accountId || '',
        accountName: '未知账本',
        accountType: state.accountType || 'personal',
        userId: state.userId || '',
        confidence: 0,
        createdAt: new Date(),
        originalDescription: state.description,
      };
      return { ...state, result: errorResult };
    }

    try {
      // 获取账本信息
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: state.accountId },
      });

      // 获取分类信息
      const category = await prisma.category.findUnique({
        where: { id: state.analyzedTransaction.categoryId },
      });

      // 获取预算信息
      let budget = null;
      let budgetOwnerName = null;
      if (state.matchedBudget?.id) {
        budget = await prisma.budget.findUnique({
          where: { id: state.matchedBudget.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            familyMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // 获取预算所属人员名称
        if (budget) {
          if (budget.familyMemberId && budget.familyMember) {
            // 家庭成员预算（包括托管成员）
            budgetOwnerName = budget.familyMember.user?.name || budget.familyMember.name;
          } else if (budget.userId && budget.user) {
            // 个人用户预算
            budgetOwnerName = budget.user.name;
          } else {
            // 通用预算（直接使用预算名称）
            budgetOwnerName = budget.name;
          }
        }
      }

      // 生成最终结果
      const result = {
        // 记账基本信息
        amount: state.analyzedTransaction.amount,
        date: state.analyzedTransaction.date,
        categoryId: state.analyzedTransaction.categoryId,
        categoryName: category?.name || state.analyzedTransaction.categoryName,
        type: category?.type || state.analyzedTransaction.type,
        note: state.analyzedTransaction.note,

        // 账本信息
        accountId: state.accountId,
        accountName: accountBook?.name || '未知账本',
        accountType: accountBook?.type.toLowerCase() || state.accountType || 'personal',

        // 预算信息
        budgetId: state.matchedBudget?.id,
        budgetName: budget?.name || state.matchedBudget?.name,
        budgetOwnerName: budgetOwnerName || undefined,
        budgetType: budget?.period === 'MONTHLY' ? 'PERSONAL' : 'GENERAL',

        // 用户信息
        userId: state.userId,

        // AI分析信息
        confidence: state.analyzedTransaction.confidence,

        // 创建时间
        createdAt: new Date(),

        // 原始描述
        originalDescription: state.description,

        // 调试信息（仅在开发环境或调试模式下包含）
        ...(process.env.NODE_ENV === 'development' || state.includeDebugInfo
          ? {
              debugInfo: state.debugInfo,
            }
          : {}),
      };

      console.log('生成智能记账结果:', JSON.stringify(result, null, 2));
      return { ...state, result };
    } catch (error) {
      console.error('生成结果时出错:', error);

      // 生成基本结果
      const result = {
        amount: state.analyzedTransaction.amount,
        date: state.analyzedTransaction.date,
        categoryId: state.analyzedTransaction.categoryId,
        categoryName: state.analyzedTransaction.categoryName,
        type: state.analyzedTransaction.type,
        note: state.analyzedTransaction.note,
        accountId: state.accountId,
        accountName: '未知账本', // 添加缺失的 accountName 字段
        accountType: state.accountType || 'personal',
        budgetId: state.matchedBudget?.id,
        budgetName: state.matchedBudget?.name,
        budgetOwnerName: undefined, // 添加缺失的 budgetOwnerName 字段
        userId: state.userId,
        confidence: state.analyzedTransaction.confidence,
        createdAt: new Date(),
        originalDescription: state.description,
      };

      return { ...state, result };
    }
  }

  /**
   * 检测描述是否包含预算相关关键词
   * @param description 用户描述
   * @returns 是否需要加载预算信息
   */
  private hasBudgetKeywords(description: string): boolean {
    const budgetKeywords = [
      '预算',
      '记账',
      '账上',
      '记在',
      '分配',
      '预算给',
      '从预算',
      '预算中',
      '预算里',
      '记到',
      '记入',
    ];

    return budgetKeywords.some((keyword) => description.includes(keyword));
  }

  /**
   * 获取简化的分类列表用于LLM提示（仅名称和类型）
   * @param userId 用户ID
   * @param accountId 账本ID
   * @returns 简化的分类列表字符串
   */
  private async getSimplifiedCategoryListForPrompt(
    userId: string,
    accountId: string,
  ): Promise<string> {
    try {
      // 获取所有分类
      const categories = await prisma.category.findMany({
        where: {
          OR: [{ userId: userId }, { isDefault: true }, { accountBookId: accountId }],
        },
      });

      // 只返回ID、名称和类型
      return categories
        .map((c: any) => `${c.id}:${c.name}(${c.type === 'EXPENSE' ? '支出' : '收入'})`)
        .join(',');
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return '';
    }
  }
}
