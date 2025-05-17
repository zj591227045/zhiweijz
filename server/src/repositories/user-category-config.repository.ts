import { PrismaClient, UserCategoryConfig } from '@prisma/client';
import { CreateUserCategoryConfigDto, UpdateUserCategoryConfigDto } from '../models/user-category-config.model';

const prisma = new PrismaClient();

export class UserCategoryConfigRepository {
  /**
   * 创建用户分类配置
   */
  async create(configData: CreateUserCategoryConfigDto): Promise<UserCategoryConfig> {
    return prisma.userCategoryConfig.create({
      data: {
        userId: configData.userId,
        categoryId: configData.categoryId,
        isHidden: configData.isHidden || false,
        displayOrder: configData.displayOrder || 0,
      },
    });
  }

  /**
   * 批量创建用户分类配置
   */
  async createMany(configsData: CreateUserCategoryConfigDto[]): Promise<number> {
    const result = await prisma.userCategoryConfig.createMany({
      data: configsData.map(config => ({
        userId: config.userId,
        categoryId: config.categoryId,
        isHidden: config.isHidden || false,
        displayOrder: config.displayOrder || 0,
      })),
      skipDuplicates: true, // 跳过重复的记录
    });

    return result.count;
  }

  /**
   * 根据ID查找用户分类配置
   */
  async findById(id: string): Promise<UserCategoryConfig | null> {
    return prisma.userCategoryConfig.findUnique({
      where: { id },
    });
  }

  /**
   * 根据用户ID和分类ID查找用户分类配置
   */
  async findByUserIdAndCategoryId(userId: string, categoryId: string): Promise<UserCategoryConfig | null> {
    return prisma.userCategoryConfig.findUnique({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
    });
  }

  /**
   * 获取用户的所有分类配置
   */
  async findByUserId(userId: string): Promise<UserCategoryConfig[]> {
    return prisma.userCategoryConfig.findMany({
      where: { userId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * 更新用户分类配置
   */
  async update(id: string, configData: UpdateUserCategoryConfigDto): Promise<UserCategoryConfig> {
    return prisma.userCategoryConfig.update({
      where: { id },
      data: configData,
    });
  }

  /**
   * 根据用户ID和分类ID更新用户分类配置
   */
  async updateByUserIdAndCategoryId(
    userId: string,
    categoryId: string,
    configData: UpdateUserCategoryConfigDto
  ): Promise<UserCategoryConfig> {
    return prisma.userCategoryConfig.update({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
      data: configData,
    });
  }

  /**
   * 删除用户分类配置
   */
  async delete(id: string): Promise<UserCategoryConfig> {
    return prisma.userCategoryConfig.delete({
      where: { id },
    });
  }

  /**
   * 删除用户的所有分类配置
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await prisma.userCategoryConfig.deleteMany({
      where: { userId },
    });

    return result.count;
  }
}
