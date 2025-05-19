import { TransactionType, PrismaClient } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetTransactionService } from './budget-transaction.service';
import { BudgetService } from './budget.service';
import { BudgetRepository } from '../repositories/budget.repository';

const prisma = new PrismaClient();
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionResponseDto,
  TransactionPaginatedResponseDto,
  TransactionQueryParams,
  toTransactionResponseDto
} from '../models/transaction.model';
import { toCategoryResponseDto } from '../models/category.model';

export class TransactionService {
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;
  private budgetTransactionService: BudgetTransactionService;
  private budgetService: BudgetService;
  private budgetRepository: BudgetRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
    this.budgetTransactionService = new BudgetTransactionService();
    this.budgetService = new BudgetService();
    this.budgetRepository = new BudgetRepository();
  }

  /**
   * 检查交易是否为历史交易（不在当前预算计算周期内）
   * @param transactionDate 交易消费日期
   * @param accountBookId 账本ID（可选）
   * @returns 是否为历史交易
   */
  private async isHistoricalTransaction(transactionDate: Date, accountBookId?: string): Promise<boolean> {
    const now = new Date();

    // 如果没有提供账本ID，使用简单的日期比较（超过7天视为历史交易）
    if (!accountBookId) {
      const daysDifference = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDifference > 7;
    }

    try {
      // 查找与交易日期相关的预算
      const budgets = await prisma.budget.findMany({
        where: {
          accountBookId,
          startDate: { lte: transactionDate },
          endDate: { gte: transactionDate },
          rollover: true, // 只考虑启用了结转的预算
        },
        include: {
          // 包含所有字段
          _count: false
        }
      });

      // 如果没有找到相关预算，使用默认规则
      if (budgets.length === 0) {
        const daysDifference = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDifference > 7;
      }

      // 检查每个预算的计算周期
      for (const budget of budgets) {
        // 获取预算的刷新日（默认为1号）
        // 注意：refreshDay字段目前不存在于数据库中，使用默认值1
        const refreshDay = 1;

        // 获取交易日期的年月
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth();
        const transactionDay = transactionDate.getDate();

        // 获取当前日期的年月
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        // 确定交易所在的计算周期
        let transactionCycleYear = transactionYear;
        let transactionCycleMonth = transactionMonth;

        // 如果交易日期在刷新日之前，则属于上个月的计算周期
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

        // 比较交易周期和当前周期
        if (
          transactionCycleYear !== currentCycleYear ||
          transactionCycleMonth !== currentCycleMonth
        ) {
          console.log(`检测到历史交易: 交易周期=${transactionCycleYear}年${transactionCycleMonth + 1}月, 当前周期=${currentCycleYear}年${currentCycleMonth + 1}月`);
          return true;
        }
      }

      // 如果所有预算都在当前计算周期内，则不是历史交易
      return false;
    } catch (error) {
      console.error('检查历史交易失败:', error);
      // 出错时使用默认规则
      const daysDifference = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDifference > 7;
    }
  }

  /**
   * 查找受交易影响的预算
   * @param accountBookId 账本ID
   * @param date 交易日期
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
          id: true
        }
      });

      return budgets.map(budget => budget.id);
    } catch (error) {
      console.error('查找受影响的预算失败:', error);
      return [];
    }
  }

  /**
   * 创建交易记录
   */
  async createTransaction(userId: string, transactionData: CreateTransactionDto): Promise<TransactionResponseDto> {
    // 验证分类是否存在
    const category = await this.categoryRepository.findById(transactionData.categoryId);
    if (!category) {
      throw new Error('分类不存在');
    }

    // 验证交易类型与分类类型是否匹配
    if (category.type !== transactionData.type) {
      throw new Error('交易类型与分类类型不匹配');
    }

    // 检查是否为历史交易
    const isHistorical = await this.isHistoricalTransaction(transactionData.date, transactionData.accountBookId);

    // 如果是历史交易，记录交易创建时间与消费日期的差异
    const transactionMetadata = isHistorical ? {
      isHistorical: true,
      createdAt: new Date(), // 当前时间作为创建时间
      consumptionDate: transactionData.date // 原始消费日期
    } : undefined;

    // 创建交易记录
    const transaction = await this.transactionRepository.create(userId, transactionData, transactionMetadata);

    // 更新预算
    if (transactionData.accountBookId && transactionData.type === 'EXPENSE') {
      await this.budgetTransactionService.recordTransaction(
        transactionData.accountBookId,
        transactionData.categoryId,
        transactionData.amount,
        transactionData.type,
        transactionData.date
      );

      // 如果是历史交易，查找受影响的预算并重新计算结转
      if (isHistorical) {
        console.log(`检测到历史交易（日期: ${transactionData.date.toISOString()}），准备重新计算相关预算结转`);

        // 查找受影响的预算
        const affectedBudgets = await this.findAffectedBudgets(
          transactionData.accountBookId,
          transactionData.date
        );

        if (affectedBudgets.length > 0) {
          console.log(`找到 ${affectedBudgets.length} 个受影响的预算，准备重新计算结转`);

          // 对每个受影响的预算重新计算结转
          for (const budgetId of affectedBudgets) {
            try {
              await this.budgetService.recalculateBudgetRollover(budgetId, true, transactionData.date);
              console.log(`预算 ${budgetId} 结转重新计算完成`);
            } catch (error) {
              console.error(`预算 ${budgetId} 结转重新计算失败:`, error);
            }
          }
        } else {
          console.log('未找到受影响的预算，无需重新计算结转');
        }
      }
    }

    return toTransactionResponseDto(transaction, toCategoryResponseDto(category));
  }

  /**
   * 获取交易记录列表
   */
  async getTransactions(userId: string, params: TransactionQueryParams): Promise<TransactionPaginatedResponseDto> {
    const { transactions, total } = await this.transactionRepository.findAll(userId, params);

    const data = transactions.map(transaction =>
      toTransactionResponseDto(
        transaction,
        transaction.category ? toCategoryResponseDto(transaction.category) : undefined
      )
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data,
    };
  }

  /**
   * 获取单个交易记录
   */
  async getTransactionById(id: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findById(id);

    if (!transaction) {
      throw new Error('交易记录不存在');
    }

    // 验证权限
    if (transaction.userId !== userId && !transaction.familyId) {
      throw new Error('无权访问此交易记录');
    }

    return toTransactionResponseDto(
      transaction,
      transaction.category ? toCategoryResponseDto(transaction.category) : undefined
    );
  }

  /**
   * 更新交易记录
   */
  async updateTransaction(id: string, userId: string, transactionData: UpdateTransactionDto): Promise<TransactionResponseDto> {
    // 检查交易记录是否存在
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new Error('交易记录不存在');
    }

    // 验证权限
    if (transaction.userId !== userId && !transaction.familyId) {
      throw new Error('无权修改此交易记录');
    }

    // 如果更新了分类，验证分类是否存在
    if (transactionData.categoryId) {
      const category = await this.categoryRepository.findById(transactionData.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }

      // 验证交易类型与分类类型是否匹配
      if (category.type !== transaction.type) {
        throw new Error('交易类型与分类类型不匹配');
      }
    }

    // 获取原交易记录
    const oldTransaction = await this.transactionRepository.findById(id);

    // 检查是否修改了日期，以及是否为历史交易
    let isHistoricalChange = false;
    if (transactionData.date) {
      isHistoricalChange = await this.isHistoricalTransaction(
        transactionData.date,
        oldTransaction.accountBookId || undefined
      );
    }

    // 如果修改为历史交易，记录元数据
    const transactionMetadata = isHistoricalChange ? {
      isHistorical: true,
      updatedAt: new Date(), // 当前时间作为更新时间
      consumptionDate: transactionData.date // 修改后的消费日期
    } : undefined;

    // 更新交易记录
    const updatedTransaction = await this.transactionRepository.update(id, transactionData, transactionMetadata);

    // 如果金额、分类或日期发生变化，更新预算
    const hasRelevantChanges =
      (transactionData.amount !== undefined && Number(oldTransaction.amount) !== transactionData.amount) ||
      (transactionData.categoryId !== undefined && oldTransaction.categoryId !== transactionData.categoryId) ||
      (transactionData.date !== undefined && oldTransaction.date.getTime() !== transactionData.date.getTime());

    if (hasRelevantChanges && oldTransaction.type === 'EXPENSE') {
      // 如果有账本ID，更新预算
      const accountBookId = oldTransaction.accountBookId;
      if (accountBookId) {
        // 更新预算
        await this.budgetTransactionService.recordTransaction(
          accountBookId,
          transactionData.categoryId || oldTransaction.categoryId,
          transactionData.amount || Number(oldTransaction.amount),
          oldTransaction.type,
          transactionData.date || oldTransaction.date
        );

        // 如果是历史交易变更，重新计算受影响的预算结转
        if (isHistoricalChange || await this.isHistoricalTransaction(oldTransaction.date, accountBookId)) {
          console.log(`检测到历史交易变更，准备重新计算相关预算结转`);

          // 查找受影响的预算（包括原日期和新日期）
          const oldDateBudgets = await this.findAffectedBudgets(
            accountBookId,
            oldTransaction.date
          );

          const newDateBudgets = transactionData.date ?
            await this.findAffectedBudgets(accountBookId, transactionData.date) : [];

          // 合并去重
          const affectedBudgets = [...new Set([...oldDateBudgets, ...newDateBudgets])];

          if (affectedBudgets.length > 0) {
            console.log(`找到 ${affectedBudgets.length} 个受影响的预算，准备重新计算结转`);

            // 对每个受影响的预算重新计算结转
            for (const budgetId of affectedBudgets) {
              try {
                // 使用最早的受影响日期作为重新计算的起点
                const affectedDate = transactionData.date && oldTransaction.date
                  ? (transactionData.date < oldTransaction.date ? transactionData.date : oldTransaction.date)
                  : (transactionData.date || oldTransaction.date);

                await this.budgetService.recalculateBudgetRollover(budgetId, true, affectedDate);
                console.log(`预算 ${budgetId} 结转重新计算完成`);
              } catch (error) {
                console.error(`预算 ${budgetId} 结转重新计算失败:`, error);
              }
            }
          } else {
            console.log('未找到受影响的预算，无需重新计算结转');
          }
        }
      }
    }

    return toTransactionResponseDto(
      updatedTransaction,
      updatedTransaction.category ? toCategoryResponseDto(updatedTransaction.category) : undefined
    );
  }

  /**
   * 删除交易记录
   */
  async deleteTransaction(id: string, userId: string): Promise<void> {
    // 检查交易记录是否存在
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new Error('交易记录不存在');
    }

    // 验证权限
    if (transaction.userId !== userId && !transaction.familyId) {
      throw new Error('无权删除此交易记录');
    }

    // 删除交易记录
    await this.transactionRepository.delete(id);
  }

  /**
   * 获取交易统计
   */
  async getTransactionStatistics(userId: string, type: TransactionType, startDate: Date, endDate: Date): Promise<{ total: number; count: number; byCategory: Array<{ categoryId: string; total: number; count: number }> }> {
    // 获取总计统计
    const stats = await this.transactionRepository.getStatistics(userId, type, startDate, endDate);

    // 获取按分类统计
    const categoryStats = await this.transactionRepository.getStatisticsByCategory(userId, type, startDate, endDate);

    return {
      total: stats.total,
      count: stats.count,
      byCategory: categoryStats,
    };
  }

  /**
   * 获取预算相关交易
   * @param budgetId 预算ID
   * @param page 页码
   * @param limit 每页数量
   * @param familyMemberId 家庭成员ID（可选）
   */
  async getTransactionsByBudget(
    budgetId: string,
    page: number = 1,
    limit: number = 10,
    familyMemberId?: string | null
  ): Promise<any> {
    try {
      // 获取预算信息
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        select: {
          id: true,
          userId: true,
          familyId: true,
          accountBookId: true,
          startDate: true,
          endDate: true,
          categoryId: true
        }
      });

      if (!budget) {
        throw new Error('预算不存在');
      }

      // 构建查询条件
      const where: any = {
        accountBookId: budget.accountBookId,
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        },
        type: 'EXPENSE'
      };

      // 如果是分类预算，添加分类过滤
      if (budget.categoryId) {
        where.categoryId = budget.categoryId;
      }

      // 如果指定了家庭成员，添加家庭成员过滤
      if (familyMemberId) {
        where.userId = familyMemberId;
      }

      // 查询交易记录
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true
        },
        orderBy: {
          date: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      });

      // 查询总数
      const total = await prisma.transaction.count({ where });

      // 转换为响应格式
      const data = transactions.map(transaction =>
        toTransactionResponseDto(
          transaction,
          transaction.category ? toCategoryResponseDto(transaction.category) : undefined
        )
      );

      return {
        data,
        total,
        page,
        limit,
        hasMore: page * limit < total,
        nextPage: page * limit < total ? page + 1 : null
      };
    } catch (error) {
      console.error('获取预算相关交易失败:', error);
      throw error;
    }
  }
}
