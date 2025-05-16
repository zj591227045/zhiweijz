import { AccountBook, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AccountBookQueryParams, CreateAccountBookDto, UpdateAccountBookDto } from '../models/account-book.model';

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
    params: AccountBookQueryParams
  ): Promise<{ accountBooks: AccountBook[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [accountBooks, total] = await Promise.all([
      prisma.accountBook.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.accountBook.count({
        where: { userId },
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
