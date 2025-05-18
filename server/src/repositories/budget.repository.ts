import { PrismaClient, Budget, BudgetPeriod, BudgetType, Prisma, Category } from '@prisma/client';
import { CreateBudgetDto, UpdateBudgetDto, BudgetQueryParams } from '../models/budget.model';

// 扩展Budget类型，包含category、accountBook和categoryBudgets关联
export type BudgetWithCategory = Budget & {
  category?: Category | null;
  categoryBudgets?: any[];
  accountBook?: {
    id: string;
    name: string;
    type: string;
    familyId?: string | null;
  } | null;
};

const prisma = new PrismaClient();

export class BudgetRepository {
  /**
   * 根据用户ID和家庭ID查找预算
   */
  async findByUserAndFamily(userId: string, familyId: string): Promise<BudgetWithCategory[]> {
    return prisma.budget.findMany({
      where: {
        userId,
        familyId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 计算家庭成员在指定预算期间的支出金额
   */
  async calculateMemberSpentAmount(
    budgetId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // 获取预算信息
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      select: { familyId: true, accountBookId: true }
    });

    if (!budget) {
      return 0;
    }

    // 查询该成员在该预算期间的所有支出交易
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        familyId: budget.familyId,
        accountBookId: budget.accountBookId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'EXPENSE',
      },
      select: {
        amount: true,
      },
    });

    // 计算总支出
    const totalSpent = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    );

    return totalSpent;
  }
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
        accountBookId: budgetData.accountBookId,
        enableCategoryBudget: budgetData.enableCategoryBudget ?? false,
        isAutoCalculated: budgetData.isAutoCalculated ?? false,
        budgetType: budgetData.budgetType || BudgetType.PERSONAL,
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
      budgetType,
      page = 1,
      limit = 20,
      sortBy = 'startDate',
      sortOrder = 'desc'
    } = params;

    console.log('BudgetRepository.findAll 参数:', {
      userId,
      period,
      categoryId,
      familyId,
      accountBookId: params.accountBookId,
      active,
      budgetType,
      page,
      limit
    });

    // 构建查询条件
    const where: Prisma.BudgetWhereInput = {
      userId,
      ...(period && { period }),
      ...(categoryId && { categoryId }),
      ...(familyId && { familyId }),
      ...(params.accountBookId && { accountBookId: params.accountBookId }),
      ...(budgetType && { budgetType }),
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
      ...(budgetData.enableCategoryBudget !== undefined && { enableCategoryBudget: budgetData.enableCategoryBudget }),
      ...(budgetData.isAutoCalculated !== undefined && { isAutoCalculated: budgetData.isAutoCalculated }),
      ...(budgetData.budgetType !== undefined && { budgetType: budgetData.budgetType }),
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

    console.log('计算预算已使用金额 - 预算信息:', {
      budgetId,
      userId: budget.userId,
      categoryId: budget.categoryId,
      accountBookId: budget.accountBookId,
      startDate: budget.startDate,
      endDate: budget.endDate
    });

    // 构建查询条件
    const where: Prisma.TransactionWhereInput = {
      userId: budget.userId || undefined,
      type: 'EXPENSE',
      date: {
        gte: budget.startDate,
        ...(budget.endDate && { lte: budget.endDate }),
      },
      ...(budget.categoryId && { categoryId: budget.categoryId }),
      ...(budget.accountBookId && { accountBookId: budget.accountBookId }),
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
   * 包括用户的个人预算和用户所属家庭的预算
   */
  async findActiveBudgets(userId: string, date: Date = new Date()): Promise<BudgetWithCategory[]> {
    // 1. 查找用户所属的所有家庭ID
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });

    const familyIds = familyMembers.map(member => member.familyId);

    // 2. 构建查询条件：包括用户个人预算和用户所属家庭的预算
    console.log(`查询用户 ${userId} 的活跃预算，包括家庭IDs: ${familyIds.join(', ') || '无'}`);

    // 构建查询条件
    const where = {
      OR: [] as any[]
    };

    // 添加用户个人预算条件
    where.OR.push({
      userId,
      startDate: { lte: date },
      endDate: { gte: date },
    });

    // 只有当用户属于至少一个家庭时，才添加家庭预算条件
    if (familyIds.length > 0) {
      where.OR.push({
        familyId: { in: familyIds },
        startDate: { lte: date },
        endDate: { gte: date },
      });
    }

    console.log('查询条件:', JSON.stringify(where, null, 2));

    return prisma.budget.findMany({
      where,
      include: {
        category: true,
        accountBook: {
          select: {
            id: true,
            name: true,
            type: true,
            familyId: true
          }
        }
      },
    });
  }

  /**
   * 根据账本ID查找活跃的预算
   */
  async findActiveByAccountBookId(accountBookId: string, date: Date = new Date()): Promise<BudgetWithCategory | null> {
    return prisma.budget.findFirst({
      where: {
        accountBookId,
        startDate: { lte: date },
        endDate: { gte: date },
        categoryId: null, // 只查找总预算，不包括分类预算
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 根据周期和日期范围查找预算
   */
  async findByPeriodAndDate(
    userId: string,
    period: BudgetPeriod,
    startDate: Date,
    endDate: Date,
    familyId?: string,
    accountBookId?: string
  ): Promise<BudgetWithCategory[]> {
    console.log('BudgetRepository.findByPeriodAndDate 参数:', {
      userId,
      period,
      startDate,
      endDate,
      familyId,
      accountBookId
    });

    return prisma.budget.findMany({
      where: {
        userId,
        period,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(familyId && { familyId }),
        ...(accountBookId && { accountBookId }),
      },
      include: {
        category: true,
      },
    });
  }
}
