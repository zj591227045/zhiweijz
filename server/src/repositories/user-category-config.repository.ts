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

  /**
   * 更新用户分类配置的显示顺序
   * @param userId 用户ID
   * @param categoryIds 需要更新的分类ID列表
   * @param orderedIds 排序后的完整分类ID列表
   */
  async updateDisplayOrder(userId: string, categoryIds: string[], orderedIds: string[]): Promise<void> {
    console.log(`存储库层: 开始更新用户分类配置的显示顺序，用户ID: ${userId}`);
    console.log(`存储库层: 需要更新的分类IDs: ${categoryIds.join(', ')}`);
    console.log(`存储库层: 排序后的分类IDs: ${orderedIds.join(', ')}`);

    // 首先检查哪些分类已经有配置
    const existingConfigs = await prisma.userCategoryConfig.findMany({
      where: {
        userId,
        categoryId: { in: categoryIds }
      }
    });

    const existingCategoryIds = existingConfigs.map(config => config.categoryId);
    console.log(`存储库层: 已有配置的分类数量: ${existingCategoryIds.length}`);
    console.log(`存储库层: 已有配置的分类IDs: ${existingCategoryIds.join(', ')}`);

    // 需要创建的配置
    const categoryIdsToCreate = categoryIds.filter(id => !existingCategoryIds.includes(id));
    console.log(`存储库层: 需要创建配置的分类数量: ${categoryIdsToCreate.length}`);
    console.log(`存储库层: 需要创建配置的分类IDs: ${categoryIdsToCreate.join(', ')}`);

    try {
      // 使用事务确保原子性
      await prisma.$transaction(async (tx) => {
        // 更新已存在的配置
        console.log(`存储库层: 开始更新已存在的配置`);
        for (const categoryId of existingCategoryIds) {
          const displayOrder = orderedIds.indexOf(categoryId);
          console.log(`存储库层: 更新分类 ${categoryId} 的显示顺序为 ${displayOrder}`);
          await tx.userCategoryConfig.update({
            where: {
              userId_categoryId: {
                userId,
                categoryId,
              },
            },
            data: { displayOrder },
          });
        }

        // 创建不存在的配置
        if (categoryIdsToCreate.length > 0) {
          console.log(`存储库层: 开始创建新的配置`);
          await tx.userCategoryConfig.createMany({
            data: categoryIdsToCreate.map(categoryId => {
              const displayOrder = orderedIds.indexOf(categoryId);
              console.log(`存储库层: 为分类 ${categoryId} 创建配置，显示顺序为 ${displayOrder}`);
              return {
                userId,
                categoryId,
                displayOrder,
                isHidden: false
              };
            }),
            skipDuplicates: true,
          });
        }

        console.log(`存储库层: 事务完成`);
      });

      console.log(`存储库层: 更新用户分类配置的显示顺序完成`);
    } catch (error) {
      console.error(`存储库层: 更新用户分类配置的显示顺序时发生错误:`, error);
      throw error;
    }
  }
}
