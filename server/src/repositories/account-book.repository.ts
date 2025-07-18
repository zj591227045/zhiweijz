import { AccountBook, Prisma } from '@prisma/client';
import prisma from '../config/database';
import {
  AccountBookQueryParams,
  CreateAccountBookDto,
  UpdateAccountBookDto,
} from '../models/account-book.model';

export class AccountBookRepository {
  /**
   * 创建账本
   */
  async create(userId: string, accountBookData: CreateAccountBookDto): Promise<AccountBook> {
    // 如果设置为默认账本，先将该用户的所有其他账本设为非默认
    if (accountBookData.isDefault) {
      await this.resetDefaultAccountBooks(userId);
    }

    return prisma.accountBook.create({
      data: {
        userId,
        name: accountBookData.name,
        description: accountBookData.description,
        type: accountBookData.type || 'PERSONAL',
        familyId: accountBookData.familyId,
        isDefault: accountBookData.isDefault ?? false,
      },
    });
  }

  /**
   * 根据ID查找账本
   */
  async findById(id: string): Promise<AccountBook | null> {
    return prisma.accountBook.findUnique({
      where: { id },
    });
  }

  /**
   * 根据用户ID查找所有账本
   */
  async findAllByUserId(
    userId: string,
    params: AccountBookQueryParams,
  ): Promise<{ accountBooks: AccountBook[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      familyId,
    } = params;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const whereCondition: Prisma.AccountBookWhereInput = { userId };

    // 添加类型过滤
    if (type) {
      whereCondition.type = type;
    }

    // 添加家庭ID过滤
    if (familyId) {
      whereCondition.familyId = familyId;
    }

    const [accountBooks, total] = await Promise.all([
      prisma.accountBook.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.accountBook.count({
        where: whereCondition,
      }),
    ]);

    return { accountBooks, total };
  }

  /**
   * 查找用户的默认账本
   */
  async findDefaultByUserId(userId: string): Promise<AccountBook | null> {
    return prisma.accountBook.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });
  }

  /**
   * 更新账本
   */
  async update(id: string, accountBookData: UpdateAccountBookDto): Promise<AccountBook> {
    // 获取账本信息
    const accountBook = await this.findById(id);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 如果设置为默认账本，先将该用户的所有其他账本设为非默认
    if (accountBookData.isDefault) {
      await this.resetDefaultAccountBooks(accountBook.userId);
    }

    return prisma.accountBook.update({
      where: { id },
      data: {
        name: accountBookData.name,
        description: accountBookData.description,
        type: accountBookData.type,
        familyId: accountBookData.familyId,
        isDefault: accountBookData.isDefault,
      },
    });
  }

  /**
   * 删除账本
   */
  async delete(id: string): Promise<void> {
    await prisma.accountBook.delete({
      where: { id },
    });
  }

  /**
   * 重置用户的所有默认账本
   */
  private async resetDefaultAccountBooks(userId: string): Promise<void> {
    await prisma.accountBook.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  /**
   * 根据家庭ID查找所有账本
   */
  async findAllByFamilyId(
    familyId: string,
    params: AccountBookQueryParams,
  ): Promise<{ accountBooks: AccountBook[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [accountBooks, total] = await Promise.all([
      prisma.accountBook.findMany({
        where: {
          familyId,
          type: 'FAMILY',
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.accountBook.count({
        where: {
          familyId,
          type: 'FAMILY',
        },
      }),
    ]);

    return { accountBooks, total };
  }

  /**
   * 根据用户所属的家庭ID列表查找所有家庭账本
   */
  async findAllByUserFamilies(
    familyIds: string[],
    params: AccountBookQueryParams,
  ): Promise<{ accountBooks: AccountBook[]; total: number }> {
    if (!familyIds.length) {
      return { accountBooks: [], total: 0 };
    }

    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [accountBooks, total] = await Promise.all([
      prisma.accountBook.findMany({
        where: {
          familyId: { in: familyIds },
          type: 'FAMILY',
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.accountBook.count({
        where: {
          familyId: { in: familyIds },
          type: 'FAMILY',
        },
      }),
    ]);

    return { accountBooks, total };
  }

  /**
   * 重置账本
   * 清除所有记账记录、预算信息和历史记录
   */
  async resetAccountBook(accountBookId: string): Promise<void> {
    // 使用事务确保所有操作要么全部成功，要么全部失败
    await prisma.$transaction(async (tx) => {
      // 1. 删除所有关联的记账记录
      await tx.transaction.deleteMany({
        where: { accountBookId },
      });

      // 2. 删除所有分类预算
      const budgets = await tx.budget.findMany({
        where: { accountBookId },
        select: { id: true },
      });

      const budgetIds = budgets.map((budget) => budget.id);

      if (budgetIds.length > 0) {
        await tx.categoryBudget.deleteMany({
          where: { budgetId: { in: budgetIds } },
        });
      }

      // 3. 删除所有预算
      await tx.budget.deleteMany({
        where: { accountBookId },
      });

      // 注意：我们不删除分类，因为分类是账本的基础结构
      // 但我们可以重置分类的使用统计等信息（如果有的话）

      console.log(`已重置账本 ${accountBookId} 的所有数据`);
    });
  }

  /**
   * 获取账本的统计信息
   */
  async getAccountBookStats(accountBookId: string): Promise<{
    transactionCount: number;
    categoryCount: number;
    budgetCount: number;
  }> {
    const [transactionCount, categoryCount, budgetCount] = await Promise.all([
      prisma.transaction.count({
        where: { accountBookId },
      }),
      prisma.category.count({
        where: { accountBookId },
      }),
      prisma.budget.count({
        where: { accountBookId },
      }),
    ]);

    return { transactionCount, categoryCount, budgetCount };
  }
}
