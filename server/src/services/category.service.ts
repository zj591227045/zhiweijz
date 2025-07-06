import { TransactionType, Category } from '@prisma/client';
import { CategoryRepository } from '../repositories/category.repository';
import { UserCategoryConfigService } from './user-category-config.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  toCategoryResponseDto,
  defaultCategories,
  defaultCategoryOrder,
} from '../models/category.model';
import { UserCategoryConfigRepository } from '../repositories/user-category-config.repository';

// 简单的内存缓存
interface Cache {
  defaultCategories?: Category[];
  lastFetched?: number;
}

export class CategoryService {
  private categoryRepository: CategoryRepository;
  private userCategoryConfigService: UserCategoryConfigService;
  private userCategoryConfigRepository: UserCategoryConfigRepository;
  private cache: Cache = {};
  private readonly CACHE_TTL = 3600000; // 缓存有效期：1小时

  constructor() {
    this.categoryRepository = new CategoryRepository();
    this.userCategoryConfigService = new UserCategoryConfigService();
    this.userCategoryConfigRepository = new UserCategoryConfigRepository();
  }

  /**
   * 初始化默认分类
   */
  async initializeDefaultCategories(): Promise<number> {
    // 检查默认分类是否已存在
    const defaultCategoriesExist = await this.categoryRepository.defaultCategoriesExist();
    if (defaultCategoriesExist) {
      return 0; // 默认分类已存在，无需初始化
    }

    // 创建默认分类（不设置userId，表示系统默认分类）
    const result = await this.categoryRepository.createDefaultCategories(defaultCategories);

    // 清除缓存
    this.cache = {};

    return result;
  }

  /**
   * 为用户创建默认分类配置
   * 这个方法为指定用户创建所有默认分类的用户配置记录
   */
  async createUserDefaultCategories(userId: string): Promise<number> {
    console.log(`CategoryService: 开始为用户 ${userId} 创建默认分类配置`);

    try {
      // 1. 获取所有默认分类
      const defaultCategories = await this.categoryRepository.findDefaultCategories();
      console.log(`CategoryService: 找到 ${defaultCategories.length} 个默认分类`);

      if (defaultCategories.length === 0) {
        console.log('CategoryService: 没有找到默认分类，跳过创建用户配置');
        return 0;
      }

      // 2. 检查用户是否已有这些分类的配置
      const existingConfigs = await this.userCategoryConfigRepository.findByUserId(userId);
      const existingCategoryIds = new Set(existingConfigs.map((config) => config.categoryId));
      console.log(`CategoryService: 用户已有 ${existingConfigs.length} 个分类配置`);

      // 3. 筛选出需要创建配置的默认分类
      const categoriesToConfig = defaultCategories.filter(
        (category) => !existingCategoryIds.has(category.id),
      );
      console.log(`CategoryService: 需要创建配置的分类数量: ${categoriesToConfig.length}`);

      if (categoriesToConfig.length === 0) {
        console.log('CategoryService: 用户已有所有默认分类的配置，无需创建');
        return 0;
      }

      // 4. 为这些分类创建用户配置，使用默认排序
      const configsToCreate = categoriesToConfig.map((category) => {
        const defaultOrder = defaultCategoryOrder[category.type]?.[category.name] || 9999;
        return {
          userId,
          categoryId: category.id,
          displayOrder: defaultOrder,
          isHidden: false,
        };
      });

      // 5. 批量创建配置
      const createdCount = await this.userCategoryConfigRepository.createMany(configsToCreate);
      console.log(`CategoryService: 成功为用户 ${userId} 创建了 ${createdCount} 个默认分类配置`);

      return createdCount;
    } catch (error) {
      console.error(`CategoryService: 为用户 ${userId} 创建默认分类配置时发生错误:`, error);
      throw error;
    }
  }

  /**
   * 创建分类
   */
  async createCategory(
    userId: string,
    categoryData: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    console.log(`服务层: 开始创建分类，用户ID: ${userId}, 分类名称: ${categoryData.name}`);

    // 创建分类
    const category = await this.categoryRepository.create(userId, categoryData);
    console.log(`服务层: 分类创建成功，分类ID: ${category.id}`);

    // 为新创建的分类自动创建用户配置（放在最后）
    try {
      await this.userCategoryConfigRepository.upsertCategoryConfig(
        userId,
        category.id,
        { displayOrder: 10000, isHidden: false }, // 新分类默认放在最后
      );
      console.log(`服务层: 为新分类 ${category.id} 创建用户配置成功`);
    } catch (error) {
      console.error(`服务层: 为新分类 ${category.id} 创建用户配置失败:`, error);
      // 不抛出错误，因为分类已经创建成功
    }

    return toCategoryResponseDto(category);
  }

  /**
   * 获取默认分类（使用缓存）
   */
  private async getDefaultCategories(): Promise<Category[]> {
    const now = Date.now();

    // 如果缓存有效，直接返回缓存数据
    if (
      this.cache.defaultCategories &&
      this.cache.lastFetched &&
      now - this.cache.lastFetched < this.CACHE_TTL
    ) {
      return this.cache.defaultCategories;
    }

    // 缓存无效，从数据库获取
    const defaultCategories = await this.categoryRepository.findDefaultCategories();

    // 更新缓存
    this.cache.defaultCategories = defaultCategories;
    this.cache.lastFetched = now;

    return defaultCategories;
  }

  /**
   * 获取分类列表（优化版本）
   */
  async getCategories(
    userId: string,
    type?: TransactionType,
    familyId?: string,
    includeHidden: boolean = false,
  ): Promise<CategoryResponseDto[]> {
    console.log(
      `CategoryService.getCategories: userId=${userId}, type=${type}, familyId=${familyId}, includeHidden=${includeHidden}`,
    );

    // 1. 获取默认分类（使用缓存）
    const defaultCategories = await this.getDefaultCategories();
    console.log(`获取到 ${defaultCategories.length} 个默认分类`);

    // 2. 按类型过滤默认分类
    const filteredDefaultCategories = defaultCategories
      .filter((cat) => !type || cat.type === type)
      .map((cat) => {
        const dto = toCategoryResponseDto(cat);
        // 添加默认排序
        const defaultOrder = defaultCategoryOrder[cat.type]?.[cat.name] || 9999;
        return {
          ...dto,
          displayOrder: defaultOrder,
        };
      });

    console.log(`过滤后的默认分类数量: ${filteredDefaultCategories.length}`);

    // 3. 获取用户的分类配置（只包含有调整的分类）
    const userConfigs = await this.userCategoryConfigRepository.findByUserId(userId);
    console.log(`用户分类配置数量: ${userConfigs.length}`);

    // 4. 获取用户自定义分类
    let userCustomCategories = [];
    if (familyId) {
      // 获取家庭自定义分类
      userCustomCategories = await this.categoryRepository.findByFamilyId(familyId, type);
    } else {
      // 获取用户自定义分类
      userCustomCategories = await this.categoryRepository.findByUserId(userId, type);
    }
    console.log(`用户自定义分类数量: ${userCustomCategories.length}`);

    const userCustomCategoryDtos = userCustomCategories.map((cat) => {
      const dto = toCategoryResponseDto(cat);
      // 自定义分类的排序从用户配置中获取，如果没有配置则使用默认值
      const userConfig = userConfigs.find((config) => config.categoryId === cat.id);
      return {
        ...dto,
        displayOrder: userConfig?.displayOrder || 10000, // 自定义分类默认排在最后
        isHidden: userConfig?.isHidden || false,
      };
    });

    // 5. 应用用户配置到默认分类
    const configuredDefaultCategories = filteredDefaultCategories.map((category) => {
      const userConfig = userConfigs.find((config) => config.categoryId === category.id);
      if (userConfig) {
        return {
          ...category,
          isHidden: userConfig.isHidden,
          displayOrder: userConfig.displayOrder,
        };
      }
      return category;
    });

    // 6. 合并所有分类
    const allCategories = [...configuredDefaultCategories, ...userCustomCategoryDtos];

    // 7. 根据includeHidden参数过滤分类
    const filteredCategories = includeHidden
      ? allCategories // 如果包含隐藏分类，返回所有分类
      : allCategories.filter((category) => !category.isHidden); // 否则只返回可见分类

    console.log(`${includeHidden ? '所有' : '可见'}分类数量: ${filteredCategories.length}`);

    // 8. 按显示顺序排序
    const sortedCategories = filteredCategories.sort((a, b) => {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    console.log(`最终返回分类数量: ${sortedCategories.length}`);
    return sortedCategories;
  }

  /**
   * 获取单个分类
   */
  async getCategoryById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new Error('分类不存在');
    }

    return toCategoryResponseDto(category);
  }

  /**
   * 更新分类
   */
  async updateCategory(
    id: string,
    userId: string,
    categoryData: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // 检查分类是否存在
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new Error('分类不存在');
    }

    // 检查权限
    if (category.isDefault) {
      throw new Error('默认分类不能修改');
    }

    if (category.userId !== userId && !category.familyId) {
      throw new Error('无权修改此分类');
    }

    // 更新分类
    const updatedCategory = await this.categoryRepository.update(id, categoryData);
    return toCategoryResponseDto(updatedCategory);
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string, userId: string): Promise<void> {
    // 检查分类是否存在
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new Error('分类不存在');
    }

    // 检查权限
    if (category.isDefault) {
      throw new Error('默认分类不能删除');
    }

    if (category.userId !== userId && !category.familyId) {
      throw new Error('无权删除此分类');
    }

    // 检查分类是否被交易使用
    const isUsed = await this.categoryRepository.isUsedByTransactions(id);
    if (isUsed) {
      throw new Error('该分类已被交易使用，无法删除');
    }

    // 删除分类
    await this.categoryRepository.delete(id);
  }

  /**
   * 更新分类排序（优化版本：只保存修改过的分类配置）
   */
  async updateCategoryOrder(
    userId: string,
    categoryIds: string[],
    type: TransactionType,
  ): Promise<void> {
    console.log(`服务层: 开始更新分类排序，用户ID: ${userId}, 分类类型: ${type}`);
    console.log(`服务层: 新的分类排序: ${categoryIds.join(', ')}`);

    // 验证所有分类ID是否有效
    const categories = await this.categoryRepository.findByIds(categoryIds);
    console.log(`服务层: 找到 ${categories.length} 个分类，期望 ${categoryIds.length} 个`);

    if (categories.length !== categoryIds.length) {
      console.log(`服务层: 部分分类ID无效，找到 ${categories.length}，期望 ${categoryIds.length}`);
      console.log(`服务层: 找到的分类IDs: ${categories.map((c) => c.id).join(', ')}`);
      throw new Error('部分分类ID无效');
    }

    // 验证所有分类类型是否匹配
    const invalidTypeCategory = categories.find((cat) => cat.type !== type);
    if (invalidTypeCategory) {
      console.log(
        `服务层: 分类类型不匹配，期望类型 ${type}，但分类 ${invalidTypeCategory.id} 的类型是 ${invalidTypeCategory.type}`,
      );
      throw new Error('分类类型不匹配');
    }

    // 获取当前该类型的所有分类的当前排序
    const currentCategories = await this.getCategories(userId, type, undefined, true);
    console.log(`服务层: 当前该类型分类数量: ${currentCategories.length}`);

    // 创建当前排序的映射（按照当前的displayOrder排序）
    const currentOrderedCategories = currentCategories.sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
    );

    console.log(
      `服务层: 当前排序:`,
      currentOrderedCategories.map((cat) => `${cat.name}(${cat.displayOrder})`).join(', '),
    );
    console.log(
      `服务层: 新的排序:`,
      categoryIds
        .map((id) => {
          const cat = categories.find((c) => c.id === id);
          return cat ? cat.name : id;
        })
        .join(', '),
    );

    // 检查排序是否真的发生了变化
    const currentOrder = currentOrderedCategories.map((cat) => cat.id);
    const hasOrderChanged = !categoryIds.every((id, index) => id === currentOrder[index]);

    if (!hasOrderChanged) {
      console.log(`服务层: 分类排序没有发生变化，无需更新`);
      return;
    }

    // 找出位置发生变化的分类，只为这些分类生成新的排序ID
    const changedCategories: Array<{ categoryId: string; newOrder: number }> = [];

    for (let newIndex = 0; newIndex < categoryIds.length; newIndex++) {
      const categoryId = categoryIds[newIndex];
      const oldIndex = currentOrder.indexOf(categoryId);

      // 如果位置发生了变化，计算新的排序ID
      if (oldIndex !== newIndex) {
        const category = categories.find((cat) => cat.id === categoryId);
        if (!category) continue;

        let newDisplayOrder: number;

        if (newIndex === 0) {
          // 移动到第一位：使用比第二个分类更小的排序ID
          const secondCategoryId = categoryIds[1];
          const secondCategory = categories.find((cat) => cat.id === secondCategoryId);

          if (secondCategory && secondCategory.isDefault) {
            const secondDefaultOrder =
              defaultCategoryOrder[secondCategory.type]?.[secondCategory.name] || 200;
            newDisplayOrder = secondDefaultOrder - 50;
          } else {
            newDisplayOrder = 50;
          }
        } else if (newIndex === categoryIds.length - 1) {
          // 移动到最后一位：使用比前一个分类更大的排序ID
          const prevCategoryId = categoryIds[newIndex - 1];
          const prevCategory = categories.find((cat) => cat.id === prevCategoryId);

          if (prevCategory && prevCategory.isDefault) {
            const prevDefaultOrder =
              defaultCategoryOrder[prevCategory.type]?.[prevCategory.name] || 2200;
            newDisplayOrder = prevDefaultOrder + 100;
          } else {
            newDisplayOrder = 2400;
          }
        } else {
          // 移动到中间位置：使用插入式排序ID（如1801）
          const prevCategoryId = categoryIds[newIndex - 1];
          const nextCategoryId = categoryIds[newIndex + 1];

          const prevCategory = categories.find((cat) => cat.id === prevCategoryId);
          const nextCategory = categories.find((cat) => cat.id === nextCategoryId);

          let prevOrder = 0;
          let nextOrder = 10000;

          if (prevCategory && prevCategory.isDefault) {
            prevOrder = defaultCategoryOrder[prevCategory.type]?.[prevCategory.name] || 0;
          }

          if (nextCategory && nextCategory.isDefault) {
            nextOrder = defaultCategoryOrder[nextCategory.type]?.[nextCategory.name] || 10000;
          }

          // 使用插入式排序ID，例如在1800和1900之间插入1801
          if (nextOrder - prevOrder > 1) {
            newDisplayOrder = prevOrder + 1;
          } else {
            // 如果空间不够，使用中间值
            newDisplayOrder = Math.floor((prevOrder + nextOrder) / 2);
          }
        }

        changedCategories.push({ categoryId, newOrder: newDisplayOrder });
        console.log(
          `服务层: 分类 ${category.name}(${categoryId}) 从位置 ${oldIndex} 移动到位置 ${newIndex}，新排序ID: ${newDisplayOrder}`,
        );
      }
    }

    console.log(`服务层: 需要更新排序的分类数量: ${changedCategories.length}`);

    // 只更新发生变化的分类配置
    if (changedCategories.length > 0) {
      console.log(`服务层: 开始更新变化的分类配置`);
      await this.userCategoryConfigRepository.updateChangedDisplayOrder(userId, changedCategories);
      console.log(`服务层: 分类排序更新完成`);
    } else {
      console.log(`服务层: 没有分类排序发生变化，无需更新`);
    }
  }
}
