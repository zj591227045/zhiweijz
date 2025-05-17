import { AccountBookRepository } from '../repositories/account-book.repository';
import { AccountLLMSettingRepository } from '../repositories/account-llm-setting.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import {
  AccountBookPaginatedResponseDto,
  AccountBookQueryParams,
  AccountBookResponseDto,
  CreateAccountBookDto,
  UpdateAccountBookDto,
  toAccountBookResponseDto,
} from '../models/account-book.model';
import {
  AccountLLMSettingResponseDto,
  CreateAccountLLMSettingDto,
  UpdateAccountLLMSettingDto,
  toAccountLLMSettingResponseDto,
} from '../models/account-llm-setting.model';
import { CreateBudgetDto } from '../models/budget.model';

export class AccountBookService {
  private accountBookRepository: AccountBookRepository;
  private accountLLMSettingRepository: AccountLLMSettingRepository;
  private budgetRepository: BudgetRepository;

  constructor() {
    this.accountBookRepository = new AccountBookRepository();
    this.accountLLMSettingRepository = new AccountLLMSettingRepository();
    this.budgetRepository = new BudgetRepository();
  }

  /**
   * 创建账本
   */
  async createAccountBook(userId: string, accountBookData: CreateAccountBookDto): Promise<AccountBookResponseDto> {
    // 创建账本
    const accountBook = await this.accountBookRepository.create(userId, accountBookData);

    // 自动创建月度预算
    try {
      await this.createDefaultMonthlyBudget(userId, accountBook.id);
      console.log(`已为账本 ${accountBook.id} 创建默认月度预算`);
    } catch (error) {
      console.error('创建默认月度预算失败:', error);
      // 不影响账本创建流程，继续执行
    }

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount
    );
  }

  /**
   * 为账本创建默认月度预算
   * @private
   */
  private async createDefaultMonthlyBudget(userId: string, accountBookId: string): Promise<void> {
    // 获取当前月份的起止日期
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 创建月度预算数据
    const budgetData: CreateBudgetDto = {
      name: '月度总预算',
      amount: 0, // 默认为0，表示不限制
      period: 'MONTHLY',
      startDate,
      endDate,
      rollover: false,
      accountBookId,
      enableCategoryBudget: false,
      isAutoCalculated: false
    };

    // 创建预算
    await this.budgetRepository.create(userId, budgetData);
  }

  /**
   * 获取账本列表
   */
  async getAccountBooks(userId: string, params: AccountBookQueryParams): Promise<AccountBookPaginatedResponseDto> {
    const { accountBooks, total } = await this.accountBookRepository.findAllByUserId(userId, params);

    // 获取每个账本的统计信息
    const accountBooksWithStats = await Promise.all(
      accountBooks.map(async (accountBook) => {
        const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);
        return toAccountBookResponseDto(
          accountBook,
          stats.transactionCount,
          stats.categoryCount,
          stats.budgetCount
        );
      })
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data: accountBooksWithStats,
    };
  }

  /**
   * 获取单个账本
   */
  async getAccountBookById(id: string, userId: string): Promise<AccountBookResponseDto> {
    const accountBook = await this.accountBookRepository.findById(id);

    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.userId !== userId) {
      throw new Error('无权访问此账本');
    }

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount
    );
  }

  /**
   * 获取用户的默认账本
   */
  async getDefaultAccountBook(userId: string): Promise<AccountBookResponseDto | null> {
    const accountBook = await this.accountBookRepository.findDefaultByUserId(userId);

    if (!accountBook) {
      return null;
    }

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount
    );
  }

  /**
   * 更新账本
   */
  async updateAccountBook(id: string, userId: string, accountBookData: UpdateAccountBookDto): Promise<AccountBookResponseDto> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(id);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.userId !== userId) {
      throw new Error('无权更新此账本');
    }

    // 更新账本
    const updatedAccountBook = await this.accountBookRepository.update(id, accountBookData);

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(id);

    return toAccountBookResponseDto(
      updatedAccountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount
    );
  }

  /**
   * 删除账本
   */
  async deleteAccountBook(id: string, userId: string): Promise<void> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(id);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.userId !== userId) {
      throw new Error('无权删除此账本');
    }

    // 检查是否为默认账本
    if (accountBook.isDefault) {
      throw new Error('不能删除默认账本');
    }

    // 删除账本
    await this.accountBookRepository.delete(id);
  }

  /**
   * 设置默认账本
   */
  async setDefaultAccountBook(id: string, userId: string): Promise<AccountBookResponseDto> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(id);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.userId !== userId) {
      throw new Error('无权设置此账本');
    }

    // 更新账本为默认
    const updatedAccountBook = await this.accountBookRepository.update(id, { isDefault: true });

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(id);

    return toAccountBookResponseDto(
      updatedAccountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount
    );
  }

  /**
   * 创建默认账本
   */
  async createDefaultAccountBook(userId: string, name: string = '默认账本'): Promise<AccountBookResponseDto> {
    const accountBookData: CreateAccountBookDto = {
      name,
      description: '系统自动创建的默认账本',
      isDefault: true,
    };

    return this.createAccountBook(userId, accountBookData);
  }

  /**
   * 获取账本LLM设置
   */
  async getAccountBookLLMSetting(accountBookId: string, userId: string): Promise<AccountLLMSettingResponseDto | null> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(accountBookId);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.userId !== userId) {
      throw new Error('无权访问此账本');
    }

    const setting = await this.accountLLMSettingRepository.findByAccountBookId(accountBookId);
    if (!setting) {
      return null;
    }

    return toAccountLLMSettingResponseDto(setting);
  }

  /**
   * 更新账本LLM设置
   */
  async updateAccountBookLLMSetting(
    accountBookId: string,
    userId: string,
    settingData: CreateAccountLLMSettingDto
  ): Promise<AccountLLMSettingResponseDto> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(accountBookId);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.userId !== userId) {
      throw new Error('无权更新此账本');
    }

    const setting = await this.accountLLMSettingRepository.upsert(accountBookId, settingData);
    return toAccountLLMSettingResponseDto(setting);
  }
}
