import { logger } from '../utils/logger';
import { TransactionType, PrismaClient, Category } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetTransactionService } from './budget-transaction.service';
import { BudgetService } from './budget.service';
import { BudgetRepository } from '../repositories/budget.repository';
import { TransactionAttachmentRepository } from '../repositories/file-storage.repository';

const prisma = new PrismaClient();
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionResponseDto,
  TransactionPaginatedResponseDto,
  TransactionQueryParams,
  toTransactionResponseDto,
} from '../models/transaction.model';
import { toCategoryResponseDto } from '../models/category.model';

export class TransactionService {
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;
  private budgetTransactionService: BudgetTransactionService;
  private budgetService: BudgetService;
  private budgetRepository: BudgetRepository;
  private attachmentRepository: TransactionAttachmentRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
    this.budgetTransactionService = new BudgetTransactionService();
    this.budgetService = new BudgetService();
    this.budgetRepository = new BudgetRepository();
    this.attachmentRepository = new TransactionAttachmentRepository();
  }

  /**
   * 检查记账是否为历史记账（不在当前预算计算周期内）
   * @param transactionDate 记账消费日期
   * @param accountBookId 账本ID（可选）
   * @returns 是否为历史记账
   */
  private async isHistoricalTransaction(
    transactionDate: Date,
    accountBookId?: string,
  ): Promise<boolean> {
    const now = new Date();

    // 如果没有提供账本ID，使用简单的日期比较（超过7天视为历史记账）
    if (!accountBookId) {
      const daysDifference = Math.floor(
        (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysDifference > 7;
    }

    try {
      // 查找与记账日期相关的预算
      const budgets = await prisma.budget.findMany({
        where: {
          accountBookId,
          startDate: { lte: transactionDate },
          endDate: { gte: transactionDate },
          rollover: true, // 只考虑启用了结转的预算
        },
        include: {
          // 包含所有字段
          _count: false,
        },
      });

      // 如果没有找到相关预算，使用默认规则
      if (budgets.length === 0) {
        const daysDifference = Math.floor(
          (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysDifference > 7;
      }

      // 检查每个预算的计算周期
      for (const budget of budgets) {
        // 获取预算的刷新日（默认为1号）
        // 注意：refreshDay字段目前不存在于数据库中，使用默认值1
        const refreshDay = 1;

        // 获取记账日期的年月
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth();
        const transactionDay = transactionDate.getDate();

        // 获取当前日期的年月
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        // 确定记账所在的计算周期
        let transactionCycleYear = transactionYear;
        let transactionCycleMonth = transactionMonth;

        // 如果记账日期在刷新日之前，则属于上个月的计算周期
        if (transactionDay < refreshDay) {
          transactionCycleMonth = transactionMonth - 1;
          if (transactionCycleMonth < 0) {
            transactionCycleMonth = 11;
            transactionCycleYear--;
          }
        }

        // 确定当前所在的计算周期
        let currentCycleYear = currentYear;
        let currentCycleMonth = currentMonth;

        // 如果当前日期在刷新日之前，则属于上个月的计算周期
        if (currentDay < refreshDay) {
          currentCycleMonth = currentMonth - 1;
          if (currentCycleMonth < 0) {
            currentCycleMonth = 11;
            currentCycleYear--;
          }
        }

        // 比较记账周期和当前周期
        if (
          transactionCycleYear !== currentCycleYear ||
          transactionCycleMonth !== currentCycleMonth
        ) {
          logger.info(
            `检测到历史记账: 记账周期=${transactionCycleYear}年${
              transactionCycleMonth + 1
            }月, 当前周期=${currentCycleYear}年${currentCycleMonth + 1}月`,
          );
          return true;
        }
      }

      // 如果所有预算都在当前计算周期内，则不是历史记账
      return false;
    } catch (error) {
      logger.error('检查历史记账失败:', error);
      // 出错时使用默认规则
      const daysDifference = Math.floor(
        (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysDifference > 7;
    }
  }

  /**
   * 查找受记账影响的预算
   * @param accountBookId 账本ID
   * @param date 记账日期
   * @returns 受影响的预算ID数组
   */
  private async findAffectedBudgets(accountBookId: string, date: Date): Promise<string[]> {
    if (!accountBookId) {
      return [];
    }

    try {
      // 查找该日期范围内的所有预算
      const budgets = await prisma.budget.findMany({
        where: {
          accountBookId,
          startDate: { lte: date },
          endDate: { gte: date },
          rollover: true, // 只考虑启用了结转的预算
        },
        select: {
          id: true,
        },
      });

      return budgets.map((budget) => budget.id);
    } catch (error) {
      logger.error('查找受影响的预算失败:', error);
      return [];
    }
  }

  /**
   * 创建记账记录
   */
  async createTransaction(
    userId: string,
    transactionData: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    logger.info('TransactionService.createTransaction 开始:', {
      userId,
      transactionData: {
        ...transactionData,
        isMultiBudget: transactionData.isMultiBudget,
        budgetAllocation: transactionData.budgetAllocation
      }
    });

    // 验证分类是否存在
    const category = await this.categoryRepository.findById(transactionData.categoryId);
    if (!category) {
      logger.error('分类不存在:', transactionData.categoryId);
      throw new Error('分类不存在');
    }

    // 验证记账类型与分类类型是否匹配
    if (category.type !== transactionData.type) {
      logger.error('记账类型与分类类型不匹配:', {
        categoryType: category.type,
        transactionType: transactionData.type
      });
      throw new Error('记账类型与分类类型不匹配');
    }

    // 检查账本信息以确定是否为家庭账本
    let accountBook = null;
    let finalFamilyId = transactionData.familyId;

    if (transactionData.accountBookId) {
      accountBook = await prisma.accountBook.findUnique({
        where: { id: transactionData.accountBookId },
        include: {
          family: true,
        },
      });

      // 如果是家庭账本但没有传递familyId，从账本中获取
      if (accountBook && accountBook.type === 'FAMILY' && accountBook.familyId && !finalFamilyId) {
        finalFamilyId = accountBook.familyId;
      }
    }

    // 如果是家庭账本，需要通过预算ID确定家庭成员ID
    let finalFamilyMemberId = transactionData.familyMemberId;

    if (finalFamilyId && !finalFamilyMemberId && transactionData.budgetId) {
      // 通过预算ID查找预算记录
      const budget = await prisma.budget.findUnique({
        where: { id: transactionData.budgetId },
        include: {
          familyMember: true,
          user: true,
        },
      });

      if (budget) {
        if (budget.familyMemberId) {
          // 预算直接关联到家庭成员（旧架构的托管成员预算）
          finalFamilyMemberId = budget.familyMemberId;
        } else if (budget.userId) {
          // 预算关联到用户（包括普通用户和托管用户），需要查找该用户在家庭中的成员记录
          // 这是统一的处理逻辑：无论是普通用户还是托管用户，都通过userId查找对应的familyMember.id
          const familyMember = await prisma.familyMember.findFirst({
            where: {
              familyId: finalFamilyId,
              userId: budget.userId,
            },
          });

          if (familyMember) {
            finalFamilyMemberId = familyMember.id;
          }
        }
      }
    }

    // 如果通过预算无法确定家庭成员ID，则使用当前用户作为备选方案
    if (finalFamilyId && !finalFamilyMemberId) {
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          familyId: finalFamilyId,
          userId: userId,
        },
      });

      if (familyMember) {
        finalFamilyMemberId = familyMember.id;
      }
    }

    // 检查是否为历史记账
    const isHistorical = await this.isHistoricalTransaction(
      transactionData.date,
      transactionData.accountBookId,
    );

    // 如果是历史记账，记录记账创建时间与消费日期的差异
    const transactionMetadata = isHistorical
      ? {
          isHistorical: true,
          createdAt: new Date(), // 当前时间作为创建时间
          consumptionDate: transactionData.date, // 原始消费日期
        }
      : undefined;

    // 更新记账数据，确保包含正确的familyId和familyMemberId
    const finalTransactionData = {
      ...transactionData,
      familyId: finalFamilyId,
      familyMemberId: finalFamilyMemberId,
    };

    // 在创建记账前，确保用户有当前月份的预算（如果是支出记账）
    if (transactionData.accountBookId && transactionData.type === 'EXPENSE') {
      try {
        await this.budgetService.ensureCurrentMonthBudget(userId, transactionData.accountBookId);
      } catch (error) {
        logger.error('确保当前月份预算失败:', error);
        // 不影响记账创建流程，继续执行
      }
    }

    // 创建记账记录
    const transaction = await this.transactionRepository.create(
      userId,
      finalTransactionData,
      transactionMetadata,
    );

    // 更新预算
    if (transactionData.accountBookId && transactionData.type === 'EXPENSE') {
      logger.info('开始更新预算:', {
        accountBookId: transactionData.accountBookId,
        isMultiBudget: transactionData.isMultiBudget,
        budgetAllocation: transactionData.budgetAllocation
      });

      // 如果是多人预算分摊，需要分别更新每个预算
      if (transactionData.isMultiBudget && transactionData.budgetAllocation) {
        logger.info(`处理多人预算分摊，共 ${transactionData.budgetAllocation.length} 项分摊`);

        for (const allocation of transactionData.budgetAllocation) {
          try {
            logger.info(`处理分摊项:`, allocation);

            // 为每个分摊项单独记录预算交易
            await this.budgetTransactionService.recordTransaction(
              transactionData.accountBookId,
              transactionData.categoryId,
              allocation.amount,
              transactionData.type,
              transactionData.date,
            );
            logger.info(`多人预算分摊：已更新预算 ${allocation.budgetId}，金额 ${allocation.amount}`);
          } catch (error) {
            logger.error(`更新多人预算分摊失败 - 预算ID: ${allocation.budgetId}`, error);
          }
        }
      } else {
        // 单人预算模式，使用原有逻辑
        await this.budgetTransactionService.recordTransaction(
          transactionData.accountBookId,
          transactionData.categoryId,
          transactionData.amount,
          transactionData.type,
          transactionData.date,
        );
      }

      // 如果是历史记账，查找受影响的预算并重新计算结转
      if (isHistorical) {
        logger.info(
          `检测到历史记账（日期: ${transactionData.date.toISOString()}），准备重新计算相关预算结转`,
        );

        // 查找受影响的预算
        const affectedBudgets = await this.findAffectedBudgets(
          transactionData.accountBookId,
          transactionData.date,
        );

        if (affectedBudgets.length > 0) {
          logger.info(`找到 ${affectedBudgets.length} 个受影响的预算，准备重新计算结转`);

          // 对每个受影响的预算重新计算结转
          for (const budgetId of affectedBudgets) {
            try {
              await this.budgetService.recalculateBudgetRollover(budgetId);
              logger.info(`预算 ${budgetId} 结转重新计算完成`);
            } catch (error) {
              logger.error(`预算 ${budgetId} 结转重新计算失败:`, error);
            }
          }
        } else {
          logger.info('未找到受影响的预算，无需重新计算结转');
        }
      }
    }

    return toTransactionResponseDto(transaction, toCategoryResponseDto(category));
  }

  /**
   * 获取记账记录列表
   */
  async getTransactions(
    userId: string,
    params: TransactionQueryParams,
  ): Promise<TransactionPaginatedResponseDto> {
    const { transactions, total } = await this.transactionRepository.findAll(userId, params);

    const data = transactions.map((transaction) =>
      toTransactionResponseDto(
        transaction,
        transaction.category ? toCategoryResponseDto(transaction.category) : undefined,
      ),
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data,
    };
  }

  /**
   * 获取单个记账记录
   */
  async getTransactionById(id: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findById(id);

    if (!transaction) {
      throw new Error('记账记录不存在');
    }

    // 验证权限 - 检查用户是否有权限访问此记账记录
    await this.checkTransactionPermission(userId, id);

    return toTransactionResponseDto(
      transaction,
      transaction.category ? toCategoryResponseDto(transaction.category) : undefined,
    );
  }

  /**
   * 更新记账记录
   */
  async updateTransaction(
    id: string,
    userId: string,
    transactionData: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    // 检查记账记录是否存在
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new Error('记账记录不存在');
    }

    // 验证权限 - 检查用户是否有权限修改此记账记录
    await this.checkTransactionPermission(userId, id);

    // 如果更新了分类，验证分类是否存在
    if (transactionData.categoryId) {
      const category = await this.categoryRepository.findById(transactionData.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }

      // 验证记账类型与分类类型是否匹配
      // 使用更新后的类型，如果没有更新类型则使用原始类型
      const transactionType = transactionData.type || transaction.type;
      if (category.type !== transactionType) {
        throw new Error('记账类型与分类类型不匹配');
      }
    }

    // 如果是家庭账本，需要通过预算ID确定家庭成员ID
    let finalFamilyMemberId = transactionData.familyMemberId;
    if (transaction.familyId && !finalFamilyMemberId) {
      // 优先使用更新数据中的budgetId，如果没有则使用原记账的budgetId
      const budgetId = transactionData.budgetId || transaction.budgetId;

      if (budgetId) {
        // 通过预算ID查找预算记录
        const budget = await prisma.budget.findUnique({
          where: { id: budgetId },
          include: {
            familyMember: true,
            user: true,
          },
        });

        if (budget) {
          if (budget.familyMemberId) {
            // 预算直接关联到家庭成员（托管成员的预算）
            finalFamilyMemberId = budget.familyMemberId;
          } else if (budget.userId) {
            // 预算关联到用户，需要查找该用户在家庭中的成员记录
            const familyMember = await prisma.familyMember.findFirst({
              where: {
                familyId: transaction.familyId,
                userId: budget.userId,
              },
            });

            if (familyMember) {
              finalFamilyMemberId = familyMember.id;
            }
          }
        }
      }

      // 如果通过预算无法确定家庭成员ID，且原记账也没有familyMemberId，则使用当前用户作为备选方案
      if (!finalFamilyMemberId && !transaction.familyMemberId) {
        const familyMember = await prisma.familyMember.findFirst({
          where: {
            familyId: transaction.familyId,
            userId: userId,
          },
        });

        if (familyMember) {
          finalFamilyMemberId = familyMember.id;
        }
      }
    }

    // 获取原记账记录
    const oldTransaction = await this.transactionRepository.findById(id);

    // 检查是否修改了日期，以及是否为历史记账
    let isHistoricalChange = false;
    if (transactionData.date) {
      isHistoricalChange = await this.isHistoricalTransaction(
        transactionData.date,
        oldTransaction.accountBookId || undefined,
      );
    }

    // 如果修改为历史记账，记录元数据
    const transactionMetadata = isHistoricalChange
      ? {
          isHistorical: true,
          updatedAt: new Date(), // 当前时间作为更新时间
          consumptionDate: transactionData.date, // 修改后的消费日期
        }
      : undefined;

    // 更新记账数据，确保包含正确的familyMemberId
    const finalTransactionData = {
      ...transactionData,
      ...(finalFamilyMemberId && { familyMemberId: finalFamilyMemberId }),
    };

    // 更新记账记录
    const updatedTransaction = await this.transactionRepository.update(
      id,
      finalTransactionData,
      transactionMetadata,
    );

    // 如果金额、分类、日期或类型发生变化，更新预算
    const hasRelevantChanges =
      (transactionData.amount !== undefined &&
        Number(oldTransaction.amount) !== transactionData.amount) ||
      (transactionData.categoryId !== undefined &&
        oldTransaction.categoryId !== transactionData.categoryId) ||
      (transactionData.date !== undefined &&
        oldTransaction.date.getTime() !== transactionData.date.getTime()) ||
      (transactionData.type !== undefined &&
        oldTransaction.type !== transactionData.type);

    // 获取最终的交易类型（更新后的类型或原始类型）
    const finalTransactionType = transactionData.type || oldTransaction.type;

    if (hasRelevantChanges && finalTransactionType === 'EXPENSE') {
      // 如果有账本ID，更新预算
      const accountBookId = oldTransaction.accountBookId;
      if (accountBookId) {
        // 更新预算
        await this.budgetTransactionService.recordTransaction(
          accountBookId,
          transactionData.categoryId || oldTransaction.categoryId,
          transactionData.amount || Number(oldTransaction.amount),
          finalTransactionType,
          transactionData.date || oldTransaction.date,
        );

        // 如果是历史记账变更，重新计算受影响的预算结转
        if (
          isHistoricalChange ||
          (await this.isHistoricalTransaction(oldTransaction.date, accountBookId))
        ) {
          logger.info(`检测到历史记账变更，准备重新计算相关预算结转`);

          // 查找受影响的预算（包括原日期和新日期）
          const oldDateBudgets = await this.findAffectedBudgets(accountBookId, oldTransaction.date);

          const newDateBudgets = transactionData.date
            ? await this.findAffectedBudgets(accountBookId, transactionData.date)
            : [];

          // 合并去重
          const affectedBudgets = [...new Set([...oldDateBudgets, ...newDateBudgets])];

          if (affectedBudgets.length > 0) {
            logger.info(`找到 ${affectedBudgets.length} 个受影响的预算，准备重新计算结转`);

            // 对每个受影响的预算重新计算结转
            for (const budgetId of affectedBudgets) {
              try {
                await this.budgetService.recalculateBudgetRollover(budgetId);
                logger.info(`预算 ${budgetId} 结转重新计算完成`);
              } catch (error) {
                logger.error(`预算 ${budgetId} 结转重新计算失败:`, error);
              }
            }
          } else {
            logger.info('未找到受影响的预算，无需重新计算结转');
          }
        }
      }
    }

    return toTransactionResponseDto(
      updatedTransaction,
      updatedTransaction.category ? toCategoryResponseDto(updatedTransaction.category) : undefined,
    );
  }

  /**
   * 删除记账记录
   */
  async deleteTransaction(id: string, userId: string): Promise<void> {
    // 检查记账记录是否存在
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new Error('记账记录不存在');
    }

    // 验证权限 - 检查用户是否有权限删除此记账记录
    await this.checkTransactionPermission(userId, id);

    // 删除记账记录
    await this.transactionRepository.delete(id);
  }

  /**
   * 获取记账统计
   */
  async getTransactionStatistics(
    userId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total: number;
    count: number;
    byCategory: Array<{ categoryId: string; total: number; count: number }>;
  }> {
    // 获取总计统计
    const stats = await this.transactionRepository.getStatistics(userId, type, startDate, endDate);

    // 获取按分类统计
    const categoryStats = await this.transactionRepository.getStatisticsByCategory(
      userId,
      type,
      startDate,
      endDate,
    );

    return {
      total: stats.total,
      count: stats.count,
      byCategory: categoryStats,
    };
  }

  /**
   * 获取记账列表和统计信息
   * 支持根据时间、收入支出、分类进行过滤后再统计
   */
  async getTransactionsWithStatistics(
    userId: string,
    params: TransactionQueryParams,
  ): Promise<{
    transactions: TransactionPaginatedResponseDto;
    statistics: {
      totalIncome: number;
      totalExpense: number;
      incomeByCategory: Array<{
        categoryId: string;
        categoryName: string;
        categoryIcon: string | null;
        amount: number;
        percentage: number;
      }>;
      expenseByCategory: Array<{
        categoryId: string;
        categoryName: string;
        categoryIcon: string | null;
        amount: number;
        percentage: number;
      }>;
    };
  }> {
    // 获取记账列表
    const { transactions, total } = await this.transactionRepository.findAll(userId, params);

    // 构建记账响应数据
    const data = transactions.map((transaction) =>
      toTransactionResponseDto(
        transaction,
        transaction.category ? toCategoryResponseDto(transaction.category) : undefined,
      ),
    );

    // 构建查询参数，用于统计
    const statsParams = {
      startDate: params.startDate,
      endDate: params.endDate,
      categoryId: params.categoryId,
      categoryIds: params.categoryIds, // 添加分类ID数组
      familyId: params.familyId,
      familyMemberId: params.familyMemberId,
      accountBookId: params.accountBookId,
    };

    // 获取收入统计
    const incomeStats = await this.transactionRepository.getFilteredStatistics(
      userId,
      TransactionType.INCOME,
      statsParams,
    );

    // 获取支出统计
    const expenseStats = await this.transactionRepository.getFilteredStatistics(
      userId,
      TransactionType.EXPENSE,
      statsParams,
    );

    // 获取分类信息
    const categories = await this.categoryRepository.findAll(userId);
    const categoryMap = new Map<string, { name: string; icon: string | null }>();
    categories.forEach((category: Category) => {
      categoryMap.set(category.id, {
        name: category.name,
        icon: category.icon,
      });
    });

    // 处理收入分类统计
    const incomeByCategory = incomeStats.byCategory
      .map((item) => {
        const category = categoryMap.get(item.categoryId) || { name: '未知分类', icon: null };
        return {
          categoryId: item.categoryId,
          categoryName: category.name,
          categoryIcon: category.icon,
          amount: item.total,
          percentage: incomeStats.total > 0 ? (item.total / incomeStats.total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // 处理支出分类统计
    const expenseByCategory = expenseStats.byCategory
      .map((item) => {
        const category = categoryMap.get(item.categoryId) || { name: '未知分类', icon: null };
        return {
          categoryId: item.categoryId,
          categoryName: category.name,
          categoryIcon: category.icon,
          amount: item.total,
          percentage: expenseStats.total > 0 ? (item.total / expenseStats.total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      transactions: {
        total,
        page: params.page || 1,
        limit: params.limit || 20,
        data,
      },
      statistics: {
        totalIncome: incomeStats.total,
        totalExpense: expenseStats.total,
        incomeByCategory,
        expenseByCategory,
      },
    };
  }

  /**
   * 获取预算相关记账
   * @param budgetId 预算ID
   * @param page 页码
   * @param limit 每页数量
   * @param familyMemberId 家庭成员ID（可选）
   */
  async getTransactionsByBudget(
    budgetId: string,
    page: number = 1,
    limit: number = 10,
    familyMemberId?: string | null,
  ): Promise<any> {
    try {
      // 获取预算信息
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        select: {
          id: true,
          userId: true,
          familyId: true,
          familyMemberId: true,
          accountBookId: true,
          startDate: true,
          endDate: true,
          categoryId: true,
        },
      });

      if (!budget) {
        throw new Error('预算不存在');
      }

      // 1. 查询单人预算记录
      const singleBudgetWhere: any = {
        budgetId: budgetId, // 直接使用预算ID过滤
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        type: 'EXPENSE',
      };

      logger.debug('使用预算ID过滤记账记录:', {
        budgetId,
        startDate: budget.startDate,
        endDate: budget.endDate,
      });

      // 如果是分类预算，添加分类过滤
      if (budget.categoryId) {
        singleBudgetWhere.categoryId = budget.categoryId;
      }

      // 处理成员过滤 - 统一使用familyMemberId
      if (familyMemberId) {
        // 统一使用familyMemberId过滤，无论是托管成员还是普通成员
        // 因为记账记录的familyMemberId字段已经正确设置了归属关系
        singleBudgetWhere.familyMemberId = familyMemberId;
      }
      // 如果预算本身关联了托管成员，使用预算的familyMemberId查询
      else if (budget.familyMemberId) {
        singleBudgetWhere.familyMemberId = budget.familyMemberId;
      }
      // 如果预算关联了用户且不是家庭预算，使用预算的userId查询
      else if (budget.userId && !budget.familyId) {
        singleBudgetWhere.userId = budget.userId;
      }
      // 如果是家庭预算，不添加额外过滤，已经通过accountBookId过滤了

      // 查询单人预算记录
      const singleBudgetTransactions = await prisma.transaction.findMany({
        where: singleBudgetWhere,
        include: {
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      logger.debug(`找到 ${singleBudgetTransactions.length} 条单人预算记录`);

      // 2. 查询多人预算分摊记录
      const multiBudgetWhere: any = {
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        type: 'EXPENSE',
        isMultiBudget: true,
        budgetAllocation: {
          not: null,
        },
      };

      // 如果有账本ID，添加账本过滤
      if (budget.accountBookId) {
        multiBudgetWhere.accountBookId = budget.accountBookId;
      }

      // 如果是分类预算，添加分类过滤
      if (budget.categoryId) {
        multiBudgetWhere.categoryId = budget.categoryId;
      }

      // 处理成员过滤
      if (familyMemberId) {
        multiBudgetWhere.familyMemberId = familyMemberId;
      } else if (budget.familyMemberId) {
        multiBudgetWhere.familyMemberId = budget.familyMemberId;
      } else if (budget.userId && !budget.familyId) {
        multiBudgetWhere.userId = budget.userId;
      }

      const multiBudgetTransactions = await prisma.transaction.findMany({
        where: multiBudgetWhere,
        include: {
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      logger.debug(`找到 ${multiBudgetTransactions.length} 条多人预算分摊记录`);

      // 3. 过滤多人预算分摊记录，只保留包含当前预算的记录
      const filteredMultiBudgetTransactions = multiBudgetTransactions.filter((transaction) => {
        try {
          let budgetAllocation;
          const allocationData = (transaction as any).budgetAllocation;

          if (typeof allocationData === 'string') {
            budgetAllocation = JSON.parse(allocationData);
          } else if (typeof allocationData === 'object') {
            budgetAllocation = allocationData;
          }

          if (Array.isArray(budgetAllocation)) {
            return budgetAllocation.some((allocation: any) => allocation.budgetId === budgetId);
          }
        } catch (error) {
          logger.error('解析预算分摊数据失败:', error);
        }
        return false;
      });

      logger.debug(`过滤后的多人预算分摊记录: ${filteredMultiBudgetTransactions.length} 条`);

      // 4. 合并两种记录并排序
      const allTransactions = [...singleBudgetTransactions, ...filteredMultiBudgetTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      // 5. 分页
      const total = allTransactions.length;
      const paginatedTransactions = allTransactions.slice((page - 1) * limit, page * limit);

      // 转换为响应格式
      const data = paginatedTransactions.map((transaction) =>
        toTransactionResponseDto(
          transaction,
          transaction.category ? toCategoryResponseDto(transaction.category) : undefined,
        ),
      );

      return {
        data,
        total,
        page,
        limit,
        hasMore: page * limit < total,
        nextPage: page * limit < total ? page + 1 : null,
      };
    } catch (error) {
      logger.error('获取预算相关记账失败:', error);
      throw error;
    }
  }

  /**
   * 获取记账的附件列表
   */
  async getTransactionAttachments(transactionId: string, userId: string) {
    try {
      // 验证记账是否属于当前用户或用户有权限访问
      const transaction = await this.transactionRepository.findById(transactionId);
      if (!transaction) {
        throw new Error('记账不存在');
      }

      // 检查用户是否有权限访问此记账记录
      await this.checkTransactionPermission(userId, transactionId);

      // 获取附件列表
      const attachments = await this.attachmentRepository.findByTransactionId(transactionId);

      return attachments;
    } catch (error) {
      logger.error('获取记账附件失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的附件统计信息
   */
  async getUserAttachmentStats(userId: string) {
    try {
      const stats = await this.attachmentRepository.getAttachmentStats(userId);
      return stats;
    } catch (error) {
      logger.error('获取用户附件统计失败:', error);
      throw error;
    }
  }

  /**
   * 删除记账附件
   */
  async deleteTransactionAttachment(attachmentId: string, userId: string) {
    try {
      // 获取附件信息并验证权限
      const attachments = await this.attachmentRepository.findByFileId(attachmentId);
      if (attachments.length === 0) {
        throw new Error('附件不存在');
      }

      const attachment = attachments[0];
      // 验证权限 - 检查用户是否有权限删除此记账记录的附件
      await this.checkTransactionPermission(userId, attachment.transactionId);

      // 删除附件关联
      await this.attachmentRepository.delete(attachment.id);

      return { success: true, message: '附件删除成功' };
    } catch (error) {
      logger.error('删除记账附件失败:', error);
      throw error;
    }
  }

  /**
   * 检查记账记录权限
   */
  private async checkTransactionPermission(userId: string, transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          { userId }, // 用户自己创建的记录
          {
            accountBook: {
              OR: [
                { userId }, // 用户自己的账本
                {
                  family: {
                    members: {
                      some: { userId }, // 用户是家庭成员
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    if (!transaction) {
      throw new Error('记账不存在或无权限访问');
    }
  }
}
