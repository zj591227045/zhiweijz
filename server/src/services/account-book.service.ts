import { AccountBookRepository } from '../repositories/account-book.repository';
import { AccountLLMSettingRepository } from '../repositories/account-llm-setting.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import { FamilyRepository } from '../repositories/family.repository';
import {
  AccountBookPaginatedResponseDto,
  AccountBookQueryParams,
  AccountBookResponseDto,
  CreateAccountBookDto,
  UpdateAccountBookDto,
  toAccountBookResponseDto,
} from '../models/account-book.model';
import { AccountBookType } from '@prisma/client';
import {
  AccountLLMSettingResponseDto,
  CreateAccountLLMSettingDto,
  UpdateAccountLLMSettingDto,
  toAccountLLMSettingResponseDto,
} from '../models/account-llm-setting.model';
import { CreateBudgetDto } from '../models/budget.model';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AccountBookService {
  private accountBookRepository: AccountBookRepository;
  private accountLLMSettingRepository: AccountLLMSettingRepository;
  private budgetRepository: BudgetRepository;
  private familyRepository: FamilyRepository;

  constructor() {
    this.accountBookRepository = new AccountBookRepository();
    this.accountLLMSettingRepository = new AccountLLMSettingRepository();
    this.budgetRepository = new BudgetRepository();
    this.familyRepository = new FamilyRepository();
  }

  /**
   * 创建账本
   */
  async createAccountBook(
    userId: string,
    accountBookData: CreateAccountBookDto,
  ): Promise<AccountBookResponseDto> {
    // 创建账本
    const accountBook = await this.accountBookRepository.create(userId, accountBookData);

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount,
    );
  }

  /**
   * 为账本创建默认月度预算 - 已废弃，保留方法签名以兼容旧代码
   * @private
   * @deprecated 账本不再自动创建预算，预算由用户手动创建或在家庭成员添加时自动创建
   */
  private async createDefaultMonthlyBudget(userId: string, accountBookId: string): Promise<void> {
    // 此方法已废弃，不再自动创建预算
    console.log(`不再为账本 ${accountBookId} 自动创建预算`);
    return;
  }

  /**
   * 获取账本列表
   */
  async getAccountBooks(
    userId: string,
    params: AccountBookQueryParams,
  ): Promise<AccountBookPaginatedResponseDto> {
    // 1. 获取用户的个人账本
    const { accountBooks: personalAccountBooks, total: personalTotal } =
      await this.accountBookRepository.findAllByUserId(userId, params);

    // 2. 获取用户所属的所有家庭ID
    const userFamilies = await this.familyRepository.findAllFamiliesByUserId(userId);
    const familyIds = userFamilies.map((family) => family.id);

    // 3. 获取用户所属家庭的所有家庭账本
    const { accountBooks: familyAccountBooks, total: familyTotal } =
      await this.accountBookRepository.findAllByUserFamilies(familyIds, params);

    // 4. 合并个人账本和家庭账本
    const allAccountBooks = [...personalAccountBooks, ...familyAccountBooks];

    // 5. 去重（以防有重复）
    const uniqueAccountBooks = allAccountBooks.filter(
      (book, index, self) => index === self.findIndex((b) => b.id === book.id),
    );

    // 6. 获取每个账本的统计信息
    const accountBooksWithStats = await Promise.all(
      uniqueAccountBooks.map(async (accountBook) => {
        const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);
        return toAccountBookResponseDto(
          accountBook,
          stats.transactionCount,
          stats.categoryCount,
          stats.budgetCount,
        );
      }),
    );

    // 7. 应用排序（如果需要）
    if (params.sortBy) {
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      accountBooksWithStats.sort((a, b) => {
        const aValue = a[params.sortBy as keyof AccountBookResponseDto];
        const bValue = b[params.sortBy as keyof AccountBookResponseDto];

        // 处理可能的 undefined 值
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortOrder; // undefined 值排在后面
        if (bValue === undefined) return -sortOrder; // undefined 值排在后面

        if (aValue < bValue) return -1 * sortOrder;
        if (aValue > bValue) return 1 * sortOrder;
        return 0;
      });
    }

    // 8. 应用分页（如果需要）
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBooks = accountBooksWithStats.slice(startIndex, endIndex);

    return {
      total: uniqueAccountBooks.length,
      page: page,
      limit: limit,
      data: paginatedBooks,
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
    if (accountBook.type === 'PERSONAL') {
      // 个人账本只能被创建者访问
      if (accountBook.userId !== userId) {
        throw new Error('无权访问此账本');
      }
    } else if (accountBook.type === 'FAMILY') {
      // 家庭账本可以被家庭成员访问
      if (!accountBook.familyId) {
        throw new Error('账本数据错误：家庭账本缺少家庭ID');
      }

      const isMember = await this.familyRepository.isFamilyMember(userId, accountBook.familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭账本');
      }
    }

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount,
    );
  }

  /**
   * 获取用户的默认账本
   */
  async getDefaultAccountBook(userId: string): Promise<AccountBookResponseDto | null> {
    // 从用户设置中获取默认账本ID
    const { UserSettingService } = require('./user-setting.service');
    const { UserSettingKey } = require('../models/user-setting.model');
    const userSettingService = new UserSettingService();

    const defaultAccountBookSetting = await userSettingService.getUserSetting(
      userId,
      UserSettingKey.DEFAULT_ACCOUNT_BOOK_ID,
    );

    let accountBook = null;

    // 如果用户设置中有默认账本ID，则获取该账本
    if (defaultAccountBookSetting && defaultAccountBookSetting.value) {
      accountBook = await this.accountBookRepository.findById(defaultAccountBookSetting.value);
    }

    // 如果没有找到默认账本，则尝试获取标记为默认的账本
    if (!accountBook) {
      accountBook = await this.accountBookRepository.findDefaultByUserId(userId);
    }

    // 如果仍然没有找到默认账本，则返回null
    if (!accountBook) {
      return null;
    }

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount,
    );
  }

  /**
   * 更新账本
   */
  async updateAccountBook(
    id: string,
    userId: string,
    accountBookData: UpdateAccountBookDto,
  ): Promise<AccountBookResponseDto> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(id);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.type === 'PERSONAL') {
      // 个人账本只能被创建者更新
      if (accountBook.userId !== userId) {
        throw new Error('无权更新此账本');
      }
    } else if (accountBook.type === 'FAMILY') {
      // 家庭账本只能被家庭管理员更新
      if (!accountBook.familyId) {
        throw new Error('账本数据错误：家庭账本缺少家庭ID');
      }

      // 检查用户是否为家庭管理员
      const family = await this.familyRepository.findFamilyById(accountBook.familyId);
      if (!family) {
        throw new Error('关联的家庭不存在');
      }

      const isAdmin =
        family.createdBy === userId ||
        family.members.some((m) => m.userId === userId && m.role === 'ADMIN');

      if (!isAdmin) {
        throw new Error('只有家庭管理员可以更新家庭账本');
      }
    }

    // 不允许更改账本类型
    if (accountBookData.type && accountBookData.type !== accountBook.type) {
      throw new Error('不能更改账本类型');
    }

    // 不允许更改关联的家庭
    if (accountBookData.familyId && accountBookData.familyId !== accountBook.familyId) {
      throw new Error('不能更改账本关联的家庭');
    }

    // 更新账本
    const updatedAccountBook = await this.accountBookRepository.update(id, accountBookData);

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(id);

    return toAccountBookResponseDto(
      updatedAccountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount,
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
    if (accountBook.type === 'PERSONAL') {
      // 个人账本只能被创建者删除
      if (accountBook.userId !== userId) {
        throw new Error('无权删除此账本');
      }

      // 如果是默认账本，需要从用户设置中移除默认账本ID
      if (accountBook.isDefault) {
        const { UserSettingService } = require('./user-setting.service');
        const { UserSettingKey } = require('../models/user-setting.model');
        const userSettingService = new UserSettingService();

        try {
          await userSettingService.deleteUserSetting(
            userId,
            UserSettingKey.DEFAULT_ACCOUNT_BOOK_ID,
          );
        } catch (error) {
          console.error('删除默认账本设置失败:', error);
          // 继续删除账本，不影响主流程
        }
      }
    } else if (accountBook.type === 'FAMILY') {
      // 家庭账本只能被家庭管理员删除
      if (!accountBook.familyId) {
        throw new Error('账本数据错误：家庭账本缺少家庭ID');
      }

      // 检查用户是否为家庭管理员
      const family = await this.familyRepository.findFamilyById(accountBook.familyId);
      if (!family) {
        throw new Error('关联的家庭不存在');
      }

      const isAdmin =
        family.createdBy === userId ||
        family.members.some((m) => m.userId === userId && m.role === 'ADMIN');

      if (!isAdmin) {
        throw new Error('只有家庭管理员可以删除家庭账本');
      }
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
    if (accountBook.type === 'PERSONAL') {
      // 个人账本只能被创建者设置为默认
      if (accountBook.userId !== userId) {
        throw new Error('无权设置此账本');
      }
    } else if (accountBook.type === 'FAMILY') {
      // 家庭账本可以被家庭成员设置为默认
      if (!accountBook.familyId) {
        throw new Error('账本数据错误：家庭账本缺少家庭ID');
      }

      const isMember = await this.familyRepository.isFamilyMember(userId, accountBook.familyId);
      if (!isMember) {
        throw new Error('无权设置此家庭账本');
      }
    }

    // 使用用户设置服务来存储默认账本ID
    const { UserSettingService } = require('./user-setting.service');
    const { UserSettingKey } = require('../models/user-setting.model');
    const userSettingService = new UserSettingService();

    // 将账本ID保存到用户设置中
    await userSettingService.createOrUpdateUserSetting(userId, {
      key: UserSettingKey.DEFAULT_ACCOUNT_BOOK_ID,
      value: id,
    });

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(id);

    return toAccountBookResponseDto(
      accountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount,
    );
  }

  /**
   * 创建默认账本
   */
  async createDefaultAccountBook(
    userId: string,
    name: string = '默认账本',
  ): Promise<AccountBookResponseDto> {
    const accountBookData: CreateAccountBookDto = {
      name,
      description: '系统自动创建的默认账本',
      type: 'PERSONAL',
      isDefault: true,
    };

    // 创建账本
    const accountBook = await this.createAccountBook(userId, accountBookData);

    // 为账本创建默认个人预算
    try {
      await this.createDefaultPersonalBudget(userId, accountBook.id);
    } catch (error) {
      console.error('创建默认个人预算失败:', error);
      // 不影响账本创建流程，继续执行
    }

    return accountBook;
  }

  /**
   * 为账本创建默认个人预算
   * @private
   */
  private async createDefaultPersonalBudget(userId: string, accountBookId: string): Promise<void> {
    // 获取账本信息以确定是否为家庭账本
    const accountBook = await this.accountBookRepository.findById(accountBookId);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 获取当前月份的起止日期
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 创建预算数据
    const budgetData: CreateBudgetDto = {
      name: '个人预算',
      amount: 0, // 默认为0，表示不限制
      period: 'MONTHLY',
      startDate,
      endDate,
      rollover: false,
      accountBookId,
      enableCategoryBudget: false,
      isAutoCalculated: false,
      budgetType: 'PERSONAL',
    };

    // 如果是家庭账本，设置家庭相关字段
    if (accountBook.type === 'FAMILY' && accountBook.familyId) {
      budgetData.familyId = accountBook.familyId;

      // 查找用户在家庭中的成员记录
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          familyId: accountBook.familyId,
          userId: userId,
        },
      });

      if (familyMember) {
        budgetData.familyMemberId = familyMember.id;
      }
    }

    // 创建预算（使用 budgetService 以确保重复检查）
    const { BudgetService } = require('./budget.service');
    const budgetService = new BudgetService();
    await budgetService.createBudget(userId, budgetData);
  }

  /**
   * 创建家庭账本
   */
  async createFamilyAccountBook(
    userId: string,
    familyId: string,
    accountBookData: CreateAccountBookDto,
  ): Promise<AccountBookResponseDto> {
    // 验证用户是否为家庭成员
    const isMember = await this.familyRepository.isFamilyMember(userId, familyId);
    if (!isMember) {
      throw new Error('无权为此家庭创建账本');
    }

    // 设置账本类型为家庭账本
    const familyAccountBookData: CreateAccountBookDto = {
      ...accountBookData,
      type: 'FAMILY',
      familyId,
    };

    return this.createAccountBook(userId, familyAccountBookData);
  }

  /**
   * 获取家庭账本列表
   */
  async getFamilyAccountBooks(
    userId: string,
    familyId: string,
    params: AccountBookQueryParams,
  ): Promise<AccountBookPaginatedResponseDto> {
    // 验证用户是否为家庭成员
    const isMember = await this.familyRepository.isFamilyMember(userId, familyId);
    if (!isMember) {
      throw new Error('无权访问此家庭的账本');
    }

    // 设置查询参数
    const queryParams: AccountBookQueryParams = {
      ...params,
      type: 'FAMILY',
      familyId,
    };

    const { accountBooks, total } = await this.accountBookRepository.findAllByFamilyId(
      familyId,
      queryParams,
    );

    // 获取每个账本的统计信息
    const accountBooksWithStats = await Promise.all(
      accountBooks.map(async (accountBook) => {
        const stats = await this.accountBookRepository.getAccountBookStats(accountBook.id);
        return toAccountBookResponseDto(
          accountBook,
          stats.transactionCount,
          stats.categoryCount,
          stats.budgetCount,
        );
      }),
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data: accountBooksWithStats,
    };
  }

  /**
   * 重置家庭账本
   * 清除所有记账记录、预算信息和历史记录
   */
  async resetFamilyAccountBook(
    accountBookId: string,
    userId: string,
  ): Promise<AccountBookResponseDto> {
    // 检查账本是否存在
    const accountBook = await this.accountBookRepository.findById(accountBookId);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证是否为家庭账本
    if (accountBook.type !== 'FAMILY') {
      throw new Error('只能重置家庭账本');
    }

    // 验证是否有家庭ID
    if (!accountBook.familyId) {
      throw new Error('账本数据错误：家庭账本缺少家庭ID');
    }

    // 检查用户是否为家庭管理员
    const family = await this.familyRepository.findFamilyById(accountBook.familyId);
    if (!family) {
      throw new Error('关联的家庭不存在');
    }

    const isAdmin =
      family.createdBy === userId ||
      family.members.some((m) => m.userId === userId && m.role === 'ADMIN');

    if (!isAdmin) {
      throw new Error('只有家庭管理员可以重置家庭账本');
    }

    // 执行重置操作
    await this.accountBookRepository.resetAccountBook(accountBookId);

    // 获取更新后的账本信息
    const updatedAccountBook = await this.accountBookRepository.findById(accountBookId);
    if (!updatedAccountBook) {
      throw new Error('重置账本后获取账本信息失败');
    }

    // 获取账本统计信息
    const stats = await this.accountBookRepository.getAccountBookStats(accountBookId);

    return toAccountBookResponseDto(
      updatedAccountBook,
      stats.transactionCount,
      stats.categoryCount,
      stats.budgetCount,
    );
  }

  /**
   * 获取账本LLM设置
   */
  async getAccountBookLLMSetting(
    accountBookId: string,
    userId: string,
  ): Promise<AccountLLMSettingResponseDto | null> {
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
    settingData: CreateAccountLLMSettingDto,
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
