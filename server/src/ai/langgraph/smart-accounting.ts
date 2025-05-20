import { LLMProviderService } from '../llm/llm-provider-service';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { SMART_ACCOUNTING_SYSTEM_PROMPT, SMART_ACCOUNTING_USER_PROMPT } from '../prompts/accounting-prompts';
import { SmartAccountingState } from '../types/accounting-types';
import NodeCache from 'node-cache';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

/**
 * 智能记账工作流
 * 实现了从用户描述中提取交易信息，并匹配到预算和账本的功能
 */
export class SmartAccounting {
  private llmProviderService: LLMProviderService;
  private prisma: PrismaClient;
  private cache: NodeCache;

  /**
   * 构造函数
   * @param llmProviderService LLM提供商服务
   */
  constructor(llmProviderService: LLMProviderService) {
    // 加载环境变量
    dotenv.config();

    this.llmProviderService = llmProviderService;
    this.prisma = new PrismaClient();
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1小时过期

    // 设置硅基流动API密钥
    process.env.SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-limqgsnsbmlwuxltjfmshpkfungijbliynwmmcknjupedyme';
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
    accountType: string
  ) {
    if (!accountId) {
      console.error('处理智能记账时缺少账本ID');
      return null;
    }

    if (!userId) {
      console.error('处理智能记账时缺少用户ID');
      return null;
    }

    // 生成缓存键
    const cacheKey = `smartAccounting:${userId}:${accountId}:${description}`;

    // 检查缓存
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // 创建初始状态
    const initialState: SmartAccountingState = {
      description,
      userId,
      accountId,
      accountType: accountType.toLowerCase() as 'personal' | 'family',
    };

    // 由于LangGraph的API变化，我们使用简单的顺序执行
    try {
      // 分析交易
      const analyzedState = await this.analyzeTransactionHandler(initialState);

      // 匹配预算
      const budgetState = await this.matchBudgetHandler(analyzedState);

      // 匹配账本
      const accountState = await this.matchAccountHandler(budgetState);

      // 生成结果
      const resultState = await this.generateResultHandler(accountState);

      // 缓存结果
      if (resultState.result) {
        this.cache.set(cacheKey, resultState.result);
      }

      return resultState.result;
    } catch (error) {
      console.error('工作流执行错误:', error);
      return null;
    }
  }

  /**
   * 智能分析节点 - 合并了实体提取和分类匹配
   * @param state 工作流状态
   * @returns 更新后的工作流状态
   */
  private async analyzeTransactionHandler(state: SmartAccountingState) {
    try {
      // 获取所有分类
      const categories = await this.prisma.category.findMany({
        where: {
          OR: [
            { userId: state.userId },
            { isDefault: true },
            { accountBookId: state.accountId }
          ]
        }
      });

      // 获取LLM设置
      const llmSettings = await this.llmProviderService.getLLMSettings(state.userId, state.accountId, state.accountType);
      const provider = this.llmProviderService.getProvider(llmSettings.provider);

      // 准备分类列表
      const categoryList = categories.map(c =>
        `- ID: ${c.id}, 名称: ${c.name}, 类型: ${c.type === 'EXPENSE' ? '支出' : '收入'}`
      ).join('\n');

      // 准备提示
      const currentDate = new Date().toISOString().split('T')[0];
      const systemPrompt = SMART_ACCOUNTING_SYSTEM_PROMPT.replace('{{categories}}', categoryList);
      const userPrompt = SMART_ACCOUNTING_USER_PROMPT
        .replace('{{description}}', state.description)
        .replace('{{currentDate}}', currentDate);

      // 调用LLM
      const response = await provider.generateChat([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ], llmSettings);

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
        const validCategory = categories.find(c => c.id === analyzedTransaction.categoryId);
        if (!validCategory) {
          throw new Error('无效的分类ID');
        }

        return { ...state, analyzedTransaction };
      }

      throw new Error('无法解析智能分析结果');
    } catch (error) {
      console.error('智能分析错误:', error);

      // 回退到默认分类
      const defaultCategory = await this.prisma.category.findFirst({
        where: { name: '其他' }
      }) || await this.prisma.category.findFirst();

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
            confidence: 0.5
          }
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
      // 查找匹配的预算，优先级：
      // 1. 账本+分类+日期范围匹配的预算
      // 2. 用户+分类+日期范围匹配的预算
      const budget = await this.prisma.budget.findFirst({
        where: {
          OR: [
            // 账本预算
            {
              accountBookId: state.accountId,
              categoryId: state.analyzedTransaction.categoryId,
              startDate: { lte: state.analyzedTransaction.date },
              endDate: { gte: state.analyzedTransaction.date }
            },
            // 用户个人预算
            {
              userId: state.userId,
              categoryId: state.analyzedTransaction.categoryId,
              startDate: { lte: state.analyzedTransaction.date },
              endDate: { gte: state.analyzedTransaction.date }
            }
          ]
        },
        orderBy: {
          // 优先使用账本预算
          accountBookId: 'desc'
        }
      });

      if (budget) {
        console.log(`找到匹配的预算: ${budget.id} - ${budget.name}`);
        return {
          ...state,
          matchedBudget: {
            id: budget.id,
            name: budget.name
          }
        };
      }

      console.log(`未找到匹配的预算，分类ID: ${state.analyzedTransaction.categoryId}`);
      return state;
    } catch (error) {
      console.error('预算匹配错误:', error);
      return state;
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
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: state.accountId,
          OR: [
            { userId: state.userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null
              },
              family: {
                members: {
                  some: {
                    userId: state.userId
                  }
                }
              }
            }
          ]
        }
      });

      if (accountBook) {
        console.log(`验证账本成功: ${accountBook.id} - ${accountBook.name}`);
        return {
          ...state,
          accountId: accountBook.id,
          accountType: accountBook.type.toLowerCase() as 'personal' | 'family'
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
      return state;
    }

    try {
      // 获取账本信息
      const accountBook = await this.prisma.accountBook.findUnique({
        where: { id: state.accountId }
      });

      // 获取分类信息
      const category = await this.prisma.category.findUnique({
        where: { id: state.analyzedTransaction.categoryId }
      });

      // 获取预算信息
      let budget = null;
      if (state.matchedBudget?.id) {
        budget = await this.prisma.budget.findUnique({
          where: { id: state.matchedBudget.id }
        });
      }

      // 生成最终结果
      const result = {
        // 交易基本信息
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
        budgetType: budget?.period === 'MONTHLY' ? 'PERSONAL' : 'GENERAL',

        // 用户信息
        userId: state.userId,

        // AI分析信息
        confidence: state.analyzedTransaction.confidence,

        // 创建时间
        createdAt: new Date(),

        // 原始描述
        originalDescription: state.description
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
        accountType: state.accountType || 'personal',
        budgetId: state.matchedBudget?.id,
        budgetName: state.matchedBudget?.name,
        userId: state.userId,
        confidence: state.analyzedTransaction.confidence,
        createdAt: new Date(),
        originalDescription: state.description
      };

      return { ...state, result };
    }
  }
}
