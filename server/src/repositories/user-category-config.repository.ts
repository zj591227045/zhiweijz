import { PrismaClient, UserCategoryConfig } from '@prisma/client';
import {
  CreateUserCategoryConfigDto,
  UpdateUserCategoryConfigDto,
} from '../models/user-category-config.model';

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
      data: configsData.map((config) => ({
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
  async findByUserIdAndCategoryId(
    userId: string,
    categoryId: string,
  ): Promise<UserCategoryConfig | null> {
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
    configData: UpdateUserCategoryConfigDto,
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
   * 更新用户分类配置的显示顺序（优化版本：只更新变化的记录）
   * @param userId 用户ID
   * @param categoryIds 需要更新的分类ID列表
   * @param orderedIds 排序后的完整分类ID列表
   */
  async updateDisplayOrder(
    userId: string,
    categoryIds: string[],
    orderedIds: string[],
  ): Promise<void> {
    console.log(`存储库层: 开始更新用户分类配置的显示顺序，用户ID: ${userId}`);
    console.log(`存储库层: 需要更新的分类IDs: ${categoryIds.join(', ')}`);
    console.log(`存储库层: 排序后的分类IDs: ${orderedIds.join(', ')}`);

    // 首先检查哪些分类已经有配置
    const existingConfigs = await prisma.userCategoryConfig.findMany({
      where: {
        userId,
        categoryId: { in: categoryIds },
      },
    });

    const existingConfigMap = new Map(existingConfigs.map((config) => [config.categoryId, config]));
    console.log(`存储库层: 已有配置的分类数量: ${existingConfigs.length}`);

    // 分析需要的操作
    const toUpdate: Array<{ categoryId: string; newOrder: number; oldOrder: number }> = [];
    const toCreate: Array<{ categoryId: string; displayOrder: number }> = [];

    for (const categoryId of categoryIds) {
      const newOrder = orderedIds.indexOf(categoryId);
      const existingConfig = existingConfigMap.get(categoryId);

      if (existingConfig) {
        // 只有当顺序真正发生变化时才更新
        if (existingConfig.displayOrder !== newOrder) {
          toUpdate.push({
            categoryId,
            newOrder,
            oldOrder: existingConfig.displayOrder,
          });
        }
      } else {
        // 需要创建新配置
        toCreate.push({
          categoryId,
          displayOrder: newOrder,
        });
      }
    }

    console.log(`存储库层: 需要更新的分类数量: ${toUpdate.length}`);
    console.log(`存储库层: 需要创建的分类数量: ${toCreate.length}`);

    // 如果没有任何变化，直接返回
    if (toUpdate.length === 0 && toCreate.length === 0) {
      console.log(`存储库层: 没有需要更新的分类配置，跳过数据库操作`);
      return;
    }

    try {
      // 使用事务确保原子性
      await prisma.$transaction(async (tx) => {
        // 更新已存在且需要变化的配置
        for (const { categoryId, newOrder, oldOrder } of toUpdate) {
          console.log(`存储库层: 更新分类 ${categoryId} 的显示顺序从 ${oldOrder} 到 ${newOrder}`);
          await tx.userCategoryConfig.update({
            where: {
              userId_categoryId: {
                userId,
                categoryId,
              },
            },
            data: { displayOrder: newOrder },
          });
        }

        // 创建不存在的配置
        if (toCreate.length > 0) {
          console.log(`存储库层: 批量创建 ${toCreate.length} 个新的分类配置`);
          await tx.userCategoryConfig.createMany({
            data: toCreate.map(({ categoryId, displayOrder }) => ({
              userId,
              categoryId,
              displayOrder,
              isHidden: false,
            })),
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

  /**
   * 为单个分类创建或更新配置（用于添加新分类）
   * @param userId 用户ID
   * @param categoryId 分类ID
   * @param config 配置选项
   */
  async upsertCategoryConfig(
    userId: string,
    categoryId: string,
    config: { displayOrder?: number; isHidden?: boolean } = {},
  ): Promise<void> {
    console.log(`存储库层: 为用户 ${userId} 的分类 ${categoryId} 创建或更新配置`);

    try {
      await prisma.userCategoryConfig.upsert({
        where: {
          userId_categoryId: {
            userId,
            categoryId,
          },
        },
        update: {
          ...config,
        },
        create: {
          userId,
          categoryId,
          displayOrder: config.displayOrder ?? 999, // 默认放在最后
          isHidden: config.isHidden ?? false,
        },
      });

      console.log(`存储库层: 分类配置创建或更新成功`);
    } catch (error) {
      console.error(`存储库层: 创建或更新分类配置时发生错误:`, error);
      throw error;
    }
  }

  /**
   * 更新发生变化的分类配置（优化版本：只更新变化的记录）
   * @param userId 用户ID
   * @param changedCategories 发生变化的分类配置
   */
  async updateChangedDisplayOrder(
    userId: string,
    changedCategories: Array<{ categoryId: string; newOrder: number }>,
  ): Promise<void> {
    console.log(`存储库层: 开始更新发生变化的分类配置，用户ID: ${userId}`);
    console.log(`存储库层: 需要更新的分类数量: ${changedCategories.length}`);

    if (changedCategories.length === 0) {
      console.log(`存储库层: 没有分类需要更新`);
      return;
    }

    try {
      // 使用事务确保原子性
      await prisma.$transaction(async (tx) => {
        for (const { categoryId, newOrder } of changedCategories) {
          console.log(`存储库层: 更新分类 ${categoryId} 的显示顺序为 ${newOrder}`);

          // 使用upsert确保记录存在
          await tx.userCategoryConfig.upsert({
            where: {
              userId_categoryId: {
                userId,
                categoryId,
              },
            },
            update: {
              displayOrder: newOrder,
            },
            create: {
              userId,
              categoryId,
              displayOrder: newOrder,
              isHidden: false,
            },
          });
        }

        console.log(`存储库层: 事务完成，成功更新 ${changedCategories.length} 个分类配置`);
      });

      console.log(`存储库层: 分类配置更新完成`);
    } catch (error) {
      console.error(`存储库层: 更新分类配置时发生错误:`, error);
      throw error;
    }
  }
}
