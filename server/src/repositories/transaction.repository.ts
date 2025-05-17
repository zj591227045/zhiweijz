import { PrismaClient, Transaction, TransactionType, Prisma } from '@prisma/client';
import { CreateTransactionDto, UpdateTransactionDto, TransactionQueryParams } from '../models/transaction.model';

const prisma = new PrismaClient();

export class TransactionRepository {
  /**
   * 创建交易记录
   */
  async create(userId: string, transactionData: CreateTransactionDto): Promise<any> {
    return prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(transactionData.amount),
        type: transactionData.type,
        categoryId: transactionData.categoryId,
        description: transactionData.description,
        date: transactionData.date,
        userId,
        familyId: transactionData.familyId,
        familyMemberId: transactionData.familyMemberId,
        accountBookId: transactionData.accountBookId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 根据ID查找交易记录
   */
  async findById(id: string): Promise<any> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  /**
   * 查询交易记录列表
   */
  async findAll(userId: string, params: TransactionQueryParams): Promise<{ transactions: any[]; total: number }> {
    const {
      type,
      startDate,
      endDate,
      categoryId,
      familyId,
      familyMemberId,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = params;

    // 构建查询条件
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(startDate && { date: { gte: startDate } }),
      ...(endDate && { date: { lte: endDate } }),
      ...(categoryId && { categoryId }),
      ...(familyId && { familyId }),
      ...(familyMemberId && { familyMemberId }),
      ...(params.accountBookId && { accountBookId: params.accountBookId }),
    };

    // 构建排序条件
    const orderBy: Prisma.TransactionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

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
   * 更新交易记录
   */
  async update(id: string, transactionData: UpdateTransactionDto): Promise<any> {
    const data: Prisma.TransactionUpdateInput = {
      ...(transactionData.amount !== undefined && { amount: new Prisma.Decimal(transactionData.amount) }),
      ...(transactionData.categoryId && { categoryId: transactionData.categoryId }),
      ...(transactionData.description !== undefined && { description: transactionData.description }),
      ...(transactionData.date && { date: transactionData.date }),
      ...(transactionData.familyMemberId && { familyMemberId: transactionData.familyMemberId }),
      ...(transactionData.budgetId && { budgetId: transactionData.budgetId }),
    };

    return prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * 删除交易记录
   */
  async delete(id: string): Promise<Transaction> {
    return prisma.transaction.delete({
      where: { id },
    });
  }

  /**
   * 获取用户的交易统计
   */
  async getStatistics(userId: string, type: TransactionType, startDate: Date, endDate: Date): Promise<{ total: number; count: number }> {
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
   * 按分类统计交易
   */
  async getStatisticsByCategory(userId: string, type: TransactionType, startDate: Date, endDate: Date): Promise<Array<{ categoryId: string; total: number; count: number }>> {
    const results = await prisma.$queryRaw<Array<{ categoryId: string; total: string; count: string }>>`
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

    return results.map(result => ({
      categoryId: result.categoryId,
      total: Number(result.total),
      count: Number(result.count),
    }));
  }

  /**
   * 根据日期范围查找交易记录
   */
  async findByDateRange(
    userId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date,
    familyId?: string,
    accountBookId?: string
  ): Promise<any[]> {
    console.log('TransactionRepository.findByDateRange 参数:', {
      userId,
      type,
      startDate,
      endDate,
      familyId,
      accountBookId
    });

    return prisma.transaction.findMany({
      where: {
        userId,
        type,
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(familyId && { familyId }),
        ...(accountBookId && { accountBookId }),
      },
      include: {
        category: true,
      },
    });
  }
}
