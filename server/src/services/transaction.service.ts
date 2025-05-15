import { TransactionType } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
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

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
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
    
    // 更新交易记录
    const updatedTransaction = await this.transactionRepository.update(id, transactionData);
    
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
}
