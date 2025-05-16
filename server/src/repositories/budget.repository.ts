import { PrismaClient, Budget, BudgetPeriod, Prisma, Category } from '@prisma/client';
import { CreateBudgetDto, UpdateBudgetDto, BudgetQueryParams } from '../models/budget.model';

// 扩展Budget类型，包含category关联
export type BudgetWithCategory = Budget & {
  category?: Category | null;
};

const prisma = new PrismaClient();

export class BudgetRepository {
  /**
   * 创建预算
   */
  async create(userId: string, budgetData: CreateBudgetDto): Promise<BudgetWithCategory> {
    return prisma.budget.create({
      data: {
        name: budgetData.name,
        amount: new Prisma.Decimal(budgetData.amount),
        period: budgetData.period,
        categoryId: budgetData.categoryId,
        startDate: budgetData.startDate,
        ...(budgetData.endDate && { endDate: budgetData.endDate }),
        rollover: budgetData.rollover,
        userId,
        familyId: budgetData.familyId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 根据ID查找预算
   */
  async findById(id: string): Promise<BudgetWithCategory | null> {
    return prisma.budget.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  /**
   * 查询预算列表
   */
  async findAll(userId: string, params: BudgetQueryParams): Promise<{ budgets: BudgetWithCategory[]; total: number }> {
    const {
      period,
      categoryId,
      familyId,
      active,
      page = 1,
      limit = 20,
      sortBy = 'startDate',
      sortOrder = 'desc'
    } = params;

    // 构建查询条件
    const where: Prisma.BudgetWhereInput = {
      userId,
      ...(period && { period }),
      ...(categoryId && { categoryId }),
      ...(familyId && { familyId }),
      ...(active && {
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ] as Prisma.BudgetWhereInput[],
      }),
    };

    // 构建排序条件
    const orderBy: Prisma.BudgetOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 查询总数
    const total = await prisma.budget.count({ where });

    // 查询分页数据
    const budgets = await prisma.budget.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
      },
    });

    return { budgets, total };
  }

  /**
   * 更新预算
   */
  async update(id: string, budgetData: UpdateBudgetDto): Promise<BudgetWithCategory> {
    const data: Prisma.BudgetUpdateInput = {
      ...(budgetData.name !== undefined && { name: budgetData.name }),
      ...(budgetData.amount !== undefined && { amount: new Prisma.Decimal(budgetData.amount) }),
      ...(budgetData.period !== undefined && { period: budgetData.period }),
      ...(budgetData.categoryId !== undefined && { categoryId: budgetData.categoryId }),
      ...(budgetData.startDate !== undefined && { startDate: budgetData.startDate }),
      ...(budgetData.endDate !== undefined && { endDate: budgetData.endDate }),
      ...(budgetData.rollover !== undefined && { rollover: budgetData.rollover }),
    };

    return prisma.budget.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * 删除预算
   */
  async delete(id: string): Promise<Budget> {
    return prisma.budget.delete({
      where: { id },
    });
  }

  /**
   * 计算预算已使用金额
   */
  async calculateSpentAmount(budgetId: string): Promise<number> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { category: true },
    }) as BudgetWithCategory | null;

    if (!budget) {
      throw new Error('预算不存在');
    }

    // 构建查询条件
    const where: Prisma.TransactionWhereInput = {
      userId: budget.userId || undefined,
      type: 'EXPENSE',
      date: {
        gte: budget.startDate,
        ...(budget.endDate && { lte: budget.endDate }),
      },
      ...(budget.categoryId && { categoryId: budget.categoryId }),
    };

    // 计算总支出
    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  /**
   * 获取当前活跃的预算
   */
  async findActiveBudgets(userId: string, date: Date = new Date()): Promise<BudgetWithCategory[]> {
    return prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: date },
        OR: [
          { endDate: null },
          { endDate: { gte: date } },
        ] as Prisma.BudgetWhereInput[],
      },
      include: {
        category: true,
      },
    });
  }
}
