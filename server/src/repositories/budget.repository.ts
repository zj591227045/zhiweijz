import { PrismaClient, Budget, BudgetPeriod, BudgetType, Prisma, Category } from '@prisma/client';
import { CreateBudgetDto, UpdateBudgetDto, BudgetQueryParams } from '../models/budget.model';

// 扩展Budget类型，包含category、accountBook、user和categoryBudgets关联
export type BudgetWithCategory = Budget & {
  category?: Category | null;
  categoryBudgets?: any[];
  accountBook?: {
    id: string;
    name: string;
    type: string;
    familyId?: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
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
   * 根据托管成员ID和家庭ID查找预算
   */
  async findByFamilyMemberAndFamily(
    familyMemberId: string,
    familyId: string,
  ): Promise<BudgetWithCategory[]> {
    return prisma.budget.findMany({
      where: {
        familyMemberId,
        familyId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 计算家庭成员在指定预算期间的支出金额
   * @param budgetId 预算ID
   * @param memberId 成员ID（可以是userId或familyMemberId）
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param isCustodial 是否为托管成员
   */
  async calculateMemberSpentAmount(
    budgetId: string,
    memberId: string,
    startDate: Date,
    endDate: Date,
    isCustodial: boolean = false,
  ): Promise<number> {
    // 获取预算信息
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      select: { familyId: true, accountBookId: true },
    });

    if (!budget) {
      return 0;
    }

    // 构建查询条件
    const where: Prisma.TransactionWhereInput = {
      accountBookId: budget.accountBookId,
      familyId: budget.familyId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      type: 'EXPENSE',
    };

    // 根据成员类型添加过滤条件
    if (isCustodial) {
      // 如果是托管成员，使用familyMemberId过滤
      where.familyMemberId = memberId;
    } else {
      // 如果是普通成员，使用userId过滤
      where.userId = memberId;
    }

    // 查询该成员在该预算期间的所有支出交易
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        amount: true,
      },
    });

    // 计算总支出
    const totalSpent = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
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
        familyMemberId: budgetData.familyMemberId,
        accountBookId: budgetData.accountBookId,
        enableCategoryBudget: budgetData.enableCategoryBudget ?? false,
        isAutoCalculated: budgetData.isAutoCalculated ?? false,
        budgetType: budgetData.budgetType || BudgetType.PERSONAL,
        refreshDay: budgetData.refreshDay || 1,
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // 添加关联查询托管成员信息
        familyMember: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            isCustodial: true,
          },
        },
      },
    });
  }

  /**
   * 查询预算列表
   */
  async findAll(
    userId: string,
    params: BudgetQueryParams,
  ): Promise<{ budgets: BudgetWithCategory[]; total: number }> {
    const {
      period,
      categoryId,
      familyId,
      active,
      budgetType,
      page = 1,
      limit = 20,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = params;

    console.log('BudgetRepository.findAll 参数:', {
      userId,
      params,
    });

    // 构建查询条件
    const where: Prisma.BudgetWhereInput = {};

    // 如果指定了账本ID，验证权限并查询该账本的所有预算
    if (params.accountBookId) {
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
        throw new Error('无权限查看该账本的预算');
      }

      where.accountBookId = params.accountBookId;
    } else {
      // 如果没有指定账本ID，只查询用户自己的预算
      where.userId = userId;
    }

    // 添加其他过滤条件
    if (budgetType) {
      where.budgetType = budgetType;
    }
    if (period) {
      where.period = period;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (familyId) {
      where.familyId = familyId;
    }
    if (active !== undefined) {
      const now = new Date();
      if (active) {
        where.startDate = { lte: now };
        where.endDate = { gte: now };
      } else {
        where.OR = [{ startDate: { gt: now } }, { endDate: { lt: now } }];
      }
    }

    console.log('BudgetRepository.findAll 查询条件:', JSON.stringify(where, null, 2));

    // 构建排序条件
    const orderBy: Prisma.BudgetOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 查询总数
    const total = await prisma.budget.count({ where });

    // 查询分页数据，包含用户信息和托管成员信息
    const budgets = await prisma.budget.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accountBook: {
          select: {
            id: true,
            name: true,
            type: true,
            familyId: true,
          },
        },
        // 添加关联查询托管成员信息
        familyMember: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            isCustodial: true,
          },
        },
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
      ...(budgetData.enableCategoryBudget !== undefined && {
        enableCategoryBudget: budgetData.enableCategoryBudget,
      }),
      ...(budgetData.isAutoCalculated !== undefined && {
        isAutoCalculated: budgetData.isAutoCalculated,
      }),
      ...(budgetData.budgetType !== undefined && { budgetType: budgetData.budgetType }),
      ...(budgetData.refreshDay !== undefined && { refreshDay: budgetData.refreshDay }),
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
    const budget = (await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { category: true },
    })) as BudgetWithCategory | null;

    if (!budget) {
      throw new Error('预算不存在');
    }

    console.log('计算预算已使用金额 - 预算信息:', {
      budgetId,
      userId: budget.userId,
      familyMemberId: (budget as any).familyMemberId,
      categoryId: budget.categoryId,
      accountBookId: budget.accountBookId,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });

    // 构建查询条件 - 直接使用budgetId过滤
    const where: Prisma.TransactionWhereInput = {
      type: 'EXPENSE',
      date: {
        gte: budget.startDate,
        ...(budget.endDate && { lte: budget.endDate }),
      },
      budgetId: budgetId, // 直接使用预算ID过滤
    };

    console.log('使用预算ID过滤交易记录:', {
      budgetId,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });

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
   * 可选根据账本ID进行过滤
   */
  async findActiveBudgets(
    userId: string,
    date: Date = new Date(),
    accountBookId?: string,
  ): Promise<BudgetWithCategory[]> {
    // 如果指定了账本ID，则查询该账本的所有预算（家庭成员可以查看家庭账本的所有预算）
    if (accountBookId) {
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
        throw new Error('无权限查看该账本的预算');
      }

      // 查询该账本的所有活跃预算（包括托管成员的预算）
      const where = {
        accountBookId,
        startDate: { lte: date },
        endDate: { gte: date },
      };

      console.log('查询指定账本的活跃预算，条件:', JSON.stringify(where, null, 2));

      return prisma.budget.findMany({
        where,
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          accountBook: {
            select: {
              id: true,
              name: true,
              type: true,
              familyId: true,
            },
          },
          // 添加关联查询托管成员信息
          familyMember: {
            select: {
              id: true,
              name: true,
              gender: true,
              birthDate: true,
              isCustodial: true,
            },
          },
        },
      });
    }

    // 如果没有指定账本ID，使用原有逻辑查询用户相关的所有预算
    // 1. 查找用户所属的所有家庭ID
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });

    const familyIds = familyMembers.map((member) => member.familyId);

    // 2. 构建查询条件：包括用户个人预算和用户所属家庭的预算
    const where = {
      OR: [] as any[],
    };

    // 添加用户个人预算条件
    const personalCondition: any = {
      userId,
      startDate: { lte: date },
      endDate: { gte: date },
    };

    // 添加家庭预算条件
    const familyCondition: any = {
      familyId: { in: familyIds },
      startDate: { lte: date },
      endDate: { gte: date },
    };

    // 添加个人预算条件
    where.OR.push(personalCondition);

    // 只有当用户属于至少一个家庭时，才添加家庭预算条件
    if (familyIds.length > 0) {
      where.OR.push(familyCondition);
    }

    console.log('查询用户相关的活跃预算，条件:', JSON.stringify(where, null, 2));

    return prisma.budget.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accountBook: {
          select: {
            id: true,
            name: true,
            type: true,
            familyId: true,
          },
        },
        // 添加关联查询托管成员信息
        familyMember: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            isCustodial: true,
          },
        },
      },
    });
  }

  /**
   * 根据账本ID查找活跃的预算
   */
  async findActiveByAccountBookId(
    accountBookId: string,
    date: Date = new Date(),
  ): Promise<BudgetWithCategory | null> {
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
   * @param userId 用户ID
   * @param period 预算周期
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param familyId 家庭ID（可选）
   * @param accountBookId 账本ID（可选）
   * @param excludeFamilyMember 是否排除托管成员的预算（默认为true）
   */
  async findByPeriodAndDate(
    userId: string,
    period: BudgetPeriod,
    startDate: Date,
    endDate: Date,
    familyId?: string,
    accountBookId?: string,
    excludeFamilyMember: boolean = true,
  ): Promise<BudgetWithCategory[]> {
    console.log('BudgetRepository.findByPeriodAndDate 参数:', {
      userId,
      period,
      startDate,
      endDate,
      familyId,
      accountBookId,
      excludeFamilyMember,
    });

    // 构建基础查询条件
    const where: any = {
      period,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };

    // 如果指定了账本ID，则查询该账本的预算
    if (accountBookId) {
      where.accountBookId = accountBookId;

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
        throw new Error('无权限查看该账本的预算');
      }

      // 始终限制为当前用户相关的预算
      where.userId = userId;

      // 如果excludeFamilyMember为true，则只查询个人预算（排除托管成员预算）
      if (excludeFamilyMember) {
        where.familyMemberId = null;
      }
      // 如果excludeFamilyMember为false，则查询所有用户相关的预算（包括托管成员预算）
    } else {
      // 如果没有指定账本ID，则只查询用户自己的预算
      where.userId = userId;

      // 添加家庭ID过滤（如果指定）
      if (familyId) {
        where.familyId = familyId;
      }

      // 如果excludeFamilyMember为true，则只查询familyMemberId为null的记录
      if (excludeFamilyMember) {
        where.familyMemberId = null;
      }
    }

    return prisma.budget.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // 添加关联查询托管成员信息
        familyMember: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            isCustodial: true,
          },
        },
      },
    });
  }
}
