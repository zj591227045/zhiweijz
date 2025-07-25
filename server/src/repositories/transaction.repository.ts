import { PrismaClient, Transaction, TransactionType, Prisma } from '@prisma/client';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryParams,
} from '../models/transaction.model';

const prisma = new PrismaClient();

export class TransactionRepository {
  /**
   * 创建记账记录
   * @param userId 用户ID
   * @param transactionData 记账数据
   * @param metadata 元数据（可选）
   */
  async create(
    userId: string,
    transactionData: CreateTransactionDto,
    metadata?: any,
  ): Promise<any> {
    // 构建基本数据
    const data: any = {
      amount: new Prisma.Decimal(transactionData.amount),
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      description: transactionData.description,
      date: transactionData.date,
      userId,
      familyId: transactionData.familyId,
      familyMemberId: transactionData.familyMemberId,
      accountBookId: transactionData.accountBookId,
      budgetId: transactionData.budgetId, // 添加预算ID
    };

    // 如果提供了元数据，添加到数据中
    if (metadata) {
      try {
        // 将元数据存储在JSON字段中
        (data as any).metadata = metadata;

        // 如果是历史记账，记录创建时间和消费日期
        if (metadata.isHistorical) {
          console.log(
            `记录历史记账元数据: 创建时间=${metadata.createdAt}, 消费日期=${metadata.consumptionDate}`,
          );
        }
      } catch (error) {
        console.error('添加记账元数据失败:', error);
      }
    }

    return prisma.transaction.create({
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * 根据ID查找记账记录
   */
  async findById(id: string): Promise<any> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        accountBook: true,
        budget: true,
      },
    });
  }

  /**
   * 查询记账记录列表
   */
  async findAll(
    userId: string,
    params: TransactionQueryParams,
  ): Promise<{ transactions: any[]; total: number }> {
    const {
      type,
      startDate,
      endDate,
      categoryId,
      categoryIds,
      familyId,
      familyMemberId,
      search, // 添加搜索参数
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = params;

    // 构建查询条件
    const where: Prisma.TransactionWhereInput = {
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(familyId && { familyId }),
      ...(familyMemberId && { familyMemberId }),
    };

    // 处理日期范围过滤
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    // 添加搜索条件
    if (search && search.trim()) {
      where.description = {
        contains: search.trim(),
        mode: 'insensitive', // 不区分大小写搜索
      };
    }

    // 如果指定了账本ID，则查询该账本的所有记账记录（家庭成员可以查看家庭账本的所有记录）
    if (params.accountBookId) {
      where.accountBookId = params.accountBookId;

      // 验证用户是否有权限查看该账本
      const accountBook = await prisma.accountBook.findFirst({
        where: {
          id: params.accountBookId,
          OR: [
            { userId: userId }, // 个人账本
            {
              family: {
                members: {
                  some: { userId: userId }, // 家庭账本成员
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        throw new Error('无权限查看该账本的记账记录');
      }
    } else {
      // 如果没有指定账本ID，则只查询用户自己的记账记录
      where.userId = userId;
    }

    // 处理多个分类ID
    if (categoryIds && categoryIds.length > 0) {
      where.categoryId = {
        in: categoryIds,
      };
    }

    // 构建排序条件
    // 首先按日期排序，然后按创建时间排序，确保同一天的记账按创建时间排序
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { createdAt: sortOrder },
    ];

    // 查询总数
    const total = await prisma.transaction.count({ where });

    // 查询分页数据
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
      },
    });

    return { transactions, total };
  }

  /**
   * 更新记账记录
   * @param id 记账ID
   * @param transactionData 记账数据
   * @param metadata 元数据（可选）
   */
  async update(id: string, transactionData: UpdateTransactionDto, metadata?: any): Promise<any> {
    const data: Prisma.TransactionUpdateInput = {
      ...(transactionData.amount !== undefined && {
        amount: new Prisma.Decimal(transactionData.amount),
      }),
      ...(transactionData.categoryId && { categoryId: transactionData.categoryId }),
      ...(transactionData.description !== undefined && {
        description: transactionData.description,
      }),
      ...(transactionData.date && { date: transactionData.date }),
      ...(transactionData.familyMemberId && { familyMemberId: transactionData.familyMemberId }),
      ...(transactionData.budgetId && { budgetId: transactionData.budgetId }),
    };

    // 如果提供了元数据，添加到数据中
    if (metadata) {
      try {
        // 获取现有元数据
        const existingTransaction = await prisma.transaction.findUnique({
          where: { id },
        });

        // 合并现有元数据和新元数据
        const existingMetadata = (existingTransaction as any)?.metadata || {};
        (data as any).metadata = { ...existingMetadata, ...metadata };

        // 如果是历史记账，记录更新时间和消费日期
        if (metadata.isHistorical) {
          console.log(
            `更新历史记账元数据: 更新时间=${metadata.updatedAt}, 消费日期=${metadata.consumptionDate}`,
          );
        }
      } catch (error) {
        console.error('更新记账元数据失败:', error);
      }
    }

    return prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * 删除记账记录
   */
  async delete(id: string): Promise<Transaction> {
    return prisma.transaction.delete({
      where: { id },
    });
  }

  /**
   * 获取用户的记账统计
   */
  async getStatistics(
    userId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
  ): Promise<{ total: number; count: number }> {
    const result = await prisma.transaction.aggregate({
      where: {
        userId,
        type,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      total: result._sum.amount ? Number(result._sum.amount) : 0,
      count: result._count,
    };
  }

  /**
   * 按分类统计记账
   */
  async getStatisticsByCategory(
    userId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ categoryId: string; total: number; count: number }>> {
    const results = await prisma.$queryRaw<
      Array<{ categoryId: string; total: string; count: string }>
    >`
      SELECT
        "categoryId",
        SUM("amount") as total,
        COUNT(*) as count
      FROM "transactions"
      WHERE
        "userId" = ${userId} AND
        "type" = ${type} AND
        "date" >= ${startDate} AND
        "date" <= ${endDate}
      GROUP BY "categoryId"
      ORDER BY total DESC
    `;

    return results.map((result) => ({
      categoryId: result.categoryId,
      total: Number(result.total),
      count: Number(result.count),
    }));
  }

  /**
   * 根据日期范围查找记账记录
   */
  async findByDateRange(
    userId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
    familyId?: string,
    accountBookId?: string,
    excludeFamilyMember: boolean = false,
    budgetId?: string,
    categoryIds?: string[],
    tagIds?: string[],
    budgetIds?: string[],
  ): Promise<any[]> {
    console.log('TransactionRepository.findByDateRange 参数:', {
      userId,
      type,
      startDate,
      endDate,
      familyId,
      accountBookId,
      excludeFamilyMember,
      budgetId,
      categoryIds,
      tagIds,
      budgetIds,
    });

    const whereConditions: any = {
      type,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(familyId && { familyId }),
      // 如果excludeFamilyMember为true，则只查询familyMemberId为null的记录
      // 这样可以排除托管成员的记账记录
      ...(excludeFamilyMember && { familyMemberId: null }),
    };

    // 处理预算ID过滤
    if (budgetId === 'NO_BUDGET') {
      // 无预算筛选：只查询budgetId为null的记账
      whereConditions.budgetId = null;
    } else if (budgetIds && budgetIds.length > 0) {
      // 多个预算ID筛选
      whereConditions.budgetId = { in: budgetIds };
    } else if (budgetId && budgetId !== 'NO_BUDGET') {
      // 单个预算ID筛选
      whereConditions.budgetId = budgetId;
    }
    // 如果budgetId为null或undefined，则不添加预算筛选条件（查询所有记账）

    // 如果指定了账本ID，则查询该账本的所有记账记录（家庭成员可以查看家庭账本的所有记录）
    if (accountBookId) {
      whereConditions.accountBookId = accountBookId;

      // 验证用户是否有权限查看该账本
      const accountBook = await prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId: userId }, // 个人账本
            {
              family: {
                members: {
                  some: { userId: userId }, // 家庭账本成员
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        throw new Error('无权限查看该账本的记账记录');
      }
    } else {
      // 如果没有指定账本ID，则只查询用户自己的记账记录
      whereConditions.userId = userId;
    }

    // 处理分类ID过滤
    if (categoryIds && categoryIds.length > 0) {
      whereConditions.categoryId = {
        in: categoryIds,
      };
    }

    // 处理标签ID过滤
    if (tagIds && tagIds.length > 0) {
      whereConditions.transactionTags = {
        some: {
          tagId: {
            in: tagIds,
          },
        },
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereConditions,
      include: {
        category: true,
        transactionTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    console.log(
      `找到 ${transactions.length} 条记账记录，其中 ${
        transactions.filter((t) => t.category).length
      } 条有关联的分类信息`,
    );

    // 检查是否有记账没有关联到分类
    const transactionsWithoutCategory = transactions.filter((t) => !t.category);
    if (transactionsWithoutCategory.length > 0) {
      console.log(`警告: ${transactionsWithoutCategory.length} 条记账没有关联到分类`);
      console.log(
        '没有分类的记账ID:',
        transactionsWithoutCategory.map((t) => t.id),
      );
    }

    return transactions;
  }

  /**
   * 获取过滤后的记账统计
   * 支持根据时间、分类、账本等条件进行过滤
   */
  async getFilteredStatistics(
    userId: string,
    type: TransactionType,
    params: {
      startDate?: Date;
      endDate?: Date;
      categoryId?: string;
      categoryIds?: string[]; // 添加分类ID数组参数
      familyId?: string;
      familyMemberId?: string;
      accountBookId?: string;
    },
  ): Promise<{
    total: number;
    count: number;
    byCategory: Array<{ categoryId: string; total: number; count: number }>;
  }> {
    // 构建查询条件
    const where: Prisma.TransactionWhereInput = {
      userId,
      type,
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.familyId && { familyId: params.familyId }),
      ...(params.familyMemberId && { familyMemberId: params.familyMemberId }),
      ...(params.accountBookId && { accountBookId: params.accountBookId }),
    };

    // 处理日期范围过滤
    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) {
        where.date.gte = params.startDate;
      }
      if (params.endDate) {
        where.date.lte = params.endDate;
      }
    }

    // 处理多个分类ID
    if (params.categoryIds && params.categoryIds.length > 0) {
      where.categoryId = {
        in: params.categoryIds,
      };
    }

    // 获取总计统计
    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // 按分类统计
    const categoryResults = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 处理按分类统计结果
    const byCategory = categoryResults
      .map((item) => ({
        categoryId: item.categoryId,
        total: item._sum.amount ? Number(item._sum.amount) : 0,
        count: item._count.id,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      total: result._sum.amount ? Number(result._sum.amount) : 0,
      count: result._count,
      byCategory,
    };
  }
}
