import { PrismaClient, Category, TransactionType } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto } from '../models/category.model';

const prisma = new PrismaClient();

export class CategoryRepository {
  /**
   * 创建分类
   */
  async create(userId: string, categoryData: CreateCategoryDto): Promise<Category> {
    return prisma.category.create({
      data: {
        name: categoryData.name,
        type: categoryData.type,
        icon: categoryData.icon,
        userId,
        familyId: categoryData.familyId,
        isDefault: categoryData.isDefault || false,
      },
    });
  }

  /**
   * 批量创建分类
   */
  async createMany(userId: string, categoriesData: CreateCategoryDto[]): Promise<number> {
    const result = await prisma.category.createMany({
      data: categoriesData.map(category => ({
        name: category.name,
        type: category.type,
        icon: category.icon,
        userId,
        familyId: category.familyId,
        isDefault: category.isDefault || false,
      })),
    });

    return result.count;
  }

  /**
   * 批量创建默认分类（不设置userId）
   */
  async createDefaultCategories(categoriesData: CreateCategoryDto[]): Promise<number> {
    const result = await prisma.category.createMany({
      data: categoriesData.map(category => ({
        name: category.name,
        type: category.type,
        icon: category.icon,
        familyId: null,
        isDefault: true,
      })),
    });

    return result.count;
  }



  /**
   * 根据ID查找分类
   */
  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  /**
   * 获取所有默认分类
   */
  async findDefaultCategories(): Promise<Category[]> {
    return prisma.category.findMany({
      where: { isDefault: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 根据名称查找分类
   */
  async findByName(name: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { name },
    });
  }

  /**
   * 获取用户的所有自定义分类
   */
  async findByUserId(userId: string, type?: TransactionType): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 获取家庭的所有分类
   */
  async findByFamilyId(familyId: string, type?: TransactionType): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        familyId,
        ...(type && { type }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 更新分类
   */
  async update(id: string, categoryData: UpdateCategoryDto): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: categoryData,
    });
  }

  /**
   * 删除分类
   */
  async delete(id: string): Promise<Category> {
    return prisma.category.delete({
      where: { id },
    });
  }

  /**
   * 检查分类是否被交易使用
   */
  async isUsedByTransactions(id: string): Promise<boolean> {
    const count = await prisma.transaction.count({
      where: { categoryId: id },
    });

    return count > 0;
  }

  /**
   * 检查默认分类是否存在
   */
  async defaultCategoriesExist(): Promise<boolean> {
    const count = await prisma.category.count({
      where: { isDefault: true },
    });

    return count > 0;
  }

  /**
   * 根据ID列表查找分类
   */
  async findByIds(ids: string[]): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  /**
   * 更新分类显示顺序
   * 注意：由于Category模型没有displayOrder字段，此方法实际上不执行任何操作
   * 分类排序是通过UserCategoryConfig中的displayOrder字段来实现的
   * @param categoryIds 需要更新的分类ID列表
   * @param orderedIds 排序后的完整分类ID列表
   */
  async updateDisplayOrder(categoryIds: string[], orderedIds: string[]): Promise<void> {
    // 由于Category模型没有displayOrder字段，这里不执行任何操作
    // 实际的排序是在UserCategoryConfigRepository中处理的
    console.log('分类排序通过UserCategoryConfig处理，Category本身不存储排序信息');
    return;
  }

  /**
   * 获取用户可见的所有分类（包括用户自定义分类、家庭分类和默认分类）
   * @param userId 用户ID
   * @param type 分类类型（可选）
   * @returns 分类列表
   */
  async findAll(userId: string, type?: TransactionType): Promise<Category[]> {
    // 查询条件：用户自定义分类 OR 默认分类
    return prisma.category.findMany({
      where: {
        OR: [
          { userId }, // 用户自定义分类
          { isDefault: true }, // 默认分类
          {
            familyId: {
              not: null
            },
            family: {
              members: {
                some: {
                  userId
                }
              }
            }
          } // 用户所属家庭的分类
        ],
        ...(type && { type }), // 如果指定了类型，则按类型筛选
      },
      orderBy: [
        { isDefault: 'desc' }, // 默认分类排在前面
        { name: 'asc' }, // 然后按名称排序
      ],
      include: {
        family: {
          select: {
            name: true
          }
        }
      }
    });
  }
}
