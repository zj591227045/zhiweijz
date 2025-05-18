import { TransactionType, PrismaClient } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetTransactionService } from './budget-transaction.service';

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

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
    this.budgetTransactionService = new BudgetTransactionService();
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

    // 创建交易记录
    const transaction = await this.transactionRepository.create(userId, transactionData);

    // 更新预算
    if (transactionData.accountBookId) {
      await this.budgetTransactionService.recordTransaction(
        transactionData.accountBookId,
        transactionData.categoryId,
        transactionData.amount,
        transactionData.type,
        transactionData.date
      );
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

    // 更新交易记录
    const updatedTransaction = await this.transactionRepository.update(id, transactionData);

    // 如果金额或分类发生变化，更新预算
    if (
      (transactionData.amount !== undefined && Number(oldTransaction.amount) !== transactionData.amount) ||
      (transactionData.categoryId !== undefined && oldTransaction.categoryId !== transactionData.categoryId)
    ) {
      // 如果有账本ID，更新预算
      const accountBookId = oldTransaction.accountBookId;
      if (accountBookId) {
        // 如果金额减少，需要先减去原金额
        if (transactionData.amount !== undefined && Number(oldTransaction.amount) > transactionData.amount) {
          // 暂不处理金额减少的情况，因为预算已用金额只增不减
        }

        // 更新预算
        await this.budgetTransactionService.recordTransaction(
          accountBookId,
          transactionData.categoryId || oldTransaction.categoryId,
          transactionData.amount || Number(oldTransaction.amount),
          oldTransaction.type,
          transactionData.date || oldTransaction.date
        );
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
