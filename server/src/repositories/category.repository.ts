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
   * 获取用户的所有分类
   */
  async findByUserId(userId: string, type?: TransactionType): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        OR: [
          { userId },
          { isDefault: true },
        ],
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
        OR: [
          { familyId },
          { isDefault: true },
        ],
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
}
