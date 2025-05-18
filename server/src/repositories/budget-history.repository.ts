import { PrismaClient, BudgetHistory, Prisma, RolloverType } from '@prisma/client';
import { CreateBudgetHistoryDto, BudgetHistoryQueryParams } from '../models/budget-history.model';

const prisma = new PrismaClient();

export class BudgetHistoryRepository {
  /**
   * 创建预算历史记录
   */
  async create(data: CreateBudgetHistoryDto): Promise<BudgetHistory> {
    return prisma.budgetHistory.create({
      data: {
        budgetId: data.budgetId,
        period: data.period,
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        description: data.description,
      },
    });
  }

  /**
   * 根据ID查找预算历史记录
   */
  async findById(id: string): Promise<BudgetHistory | null> {
    return prisma.budgetHistory.findUnique({
      where: { id },
    });
  }

  /**
   * 根据预算ID查找历史记录
   */
  async findByBudgetId(budgetId: string): Promise<BudgetHistory[]> {
    return prisma.budgetHistory.findMany({
      where: { budgetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 查询预算历史记录列表
   */
  async findAll(params: BudgetHistoryQueryParams): Promise<{ histories: BudgetHistory[]; total: number }> {
    const {
      budgetId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // 构建查询条件
    const where: Prisma.BudgetHistoryWhereInput = {
      ...(budgetId && { budgetId }),
    };

    // 构建排序条件
    const orderBy: Prisma.BudgetHistoryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 查询总数
    const total = await prisma.budgetHistory.count({ where });

    // 查询分页数据
    const histories = await prisma.budgetHistory.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    return { histories, total };
  }

  /**
   * 删除预算历史记录
   */
  async delete(id: string): Promise<BudgetHistory> {
    return prisma.budgetHistory.delete({
      where: { id },
    });
  }

  /**
   * 删除预算的所有历史记录
   */
  async deleteByBudgetId(budgetId: string): Promise<Prisma.BatchPayload> {
    return prisma.budgetHistory.deleteMany({
      where: { budgetId },
    });
  }
}
