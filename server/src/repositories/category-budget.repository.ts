import { PrismaClient, CategoryBudget, Prisma, Category } from '@prisma/client';
import { CreateCategoryBudgetDto, UpdateCategoryBudgetDto, CategoryBudgetQueryParams } from '../models/category-budget.model';

// 扩展CategoryBudget类型，包含category关联
export type CategoryBudgetWithCategory = CategoryBudget & {
  category?: Category | null;
};

const prisma = new PrismaClient();

export class CategoryBudgetRepository {
  /**
   * 创建分类预算
   */
  async create(data: CreateCategoryBudgetDto): Promise<CategoryBudgetWithCategory> {
    return prisma.categoryBudget.create({
      data: {
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        amount: new Prisma.Decimal(data.amount),
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 根据ID查找分类预算
   */
  async findById(id: string): Promise<CategoryBudgetWithCategory | null> {
    return prisma.categoryBudget.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  /**
   * 根据预算ID和分类ID查找分类预算
   */
  async findByBudgetAndCategory(budgetId: string, categoryId: string): Promise<CategoryBudgetWithCategory | null> {
    return prisma.categoryBudget.findUnique({
      where: {
        budgetId_categoryId: {
          budgetId,
          categoryId,
        },
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 查询分类预算列表
   */
  async findAll(params: CategoryBudgetQueryParams): Promise<{ categoryBudgets: CategoryBudgetWithCategory[]; total: number }> {
    const {
      budgetId,
      categoryId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // 构建查询条件
    const where: Prisma.CategoryBudgetWhereInput = {
      ...(budgetId && { budgetId }),
      ...(categoryId && { categoryId }),
    };

    // 构建排序条件
    const orderBy: Prisma.CategoryBudgetOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 查询总数
    const total = await prisma.categoryBudget.count({ where });

    // 查询分类预算列表
    const categoryBudgets = await prisma.categoryBudget.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
      },
    });

    return { categoryBudgets, total };
  }

  /**
   * 根据预算ID查找分类预算列表
   */
  async findByBudgetId(budgetId: string): Promise<CategoryBudgetWithCategory[]> {
    return prisma.categoryBudget.findMany({
      where: { budgetId },
      include: {
        category: true,
      },
    });
  }

  /**
   * 更新分类预算
   */
  async update(id: string, data: UpdateCategoryBudgetDto): Promise<CategoryBudgetWithCategory> {
    const updateData: Prisma.CategoryBudgetUpdateInput = {
      ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
      ...(data.spent !== undefined && { spent: new Prisma.Decimal(data.spent) }),
    };

    return prisma.categoryBudget.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  /**
   * 更新分类预算已用金额
   */
  async updateSpent(id: string, spent: number): Promise<CategoryBudgetWithCategory> {
    return prisma.categoryBudget.update({
      where: { id },
      data: {
        spent: new Prisma.Decimal(spent),
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * 删除分类预算
   */
  async delete(id: string): Promise<void> {
    await prisma.categoryBudget.delete({
      where: { id },
    });
  }

  /**
   * 删除预算下的所有分类预算
   */
  async deleteByBudgetId(budgetId: string): Promise<void> {
    await prisma.categoryBudget.deleteMany({
      where: { budgetId },
    });
  }

  /**
   * 计算预算下所有分类预算的总金额
   */
  async calculateTotalAmount(budgetId: string): Promise<number> {
    const result = await prisma.categoryBudget.aggregate({
      where: { budgetId },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  /**
   * 计算预算下所有分类预算的总支出
   */
  async calculateTotalSpent(budgetId: string): Promise<number> {
    const result = await prisma.categoryBudget.aggregate({
      where: { budgetId },
      _sum: {
        spent: true,
      },
    });

    return result._sum.spent ? Number(result._sum.spent) : 0;
  }
}
