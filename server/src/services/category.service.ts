import { TransactionType, Category } from '@prisma/client';
import { CategoryRepository } from '../repositories/category.repository';
import { UserCategoryConfigService } from './user-category-config.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  toCategoryResponseDto,
  defaultCategories
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
   */
  async createUserDefaultCategories(userId: string): Promise<number> {
    // 检查系统默认分类是否已存在，如果不存在则先创建
    const defaultCategoriesExist = await this.categoryRepository.defaultCategoriesExist();
    if (!defaultCategoriesExist) {
      await this.initializeDefaultCategories();
    }

    // 获取所有默认分类
    const defaultCategories = await this.categoryRepository.findDefaultCategories();

    // 为用户创建默认分类配置
    const categoryIds = defaultCategories.map(category => category.id);
    return this.userCategoryConfigService.createDefaultUserCategoryConfigs(userId, categoryIds);
  }

  /**
   * 创建分类
   */
  async createCategory(userId: string, categoryData: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.create(userId, categoryData);
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
   * 获取分类列表
   */
  async getCategories(userId: string, type?: TransactionType, familyId?: string): Promise<CategoryResponseDto[]> {
    // 获取默认分类（使用缓存）
    const defaultCategories = await this.getDefaultCategories();
    const defaultCategoryDtos = defaultCategories
      .filter(cat => !type || cat.type === type)
      .map(toCategoryResponseDto);

    // 获取用户分类配置
    const userConfigs = await this.userCategoryConfigRepository.findByUserId(userId);

    // 获取用户自定义分类
    let userCategories = [];
    if (familyId) {
      // 获取家庭分类
      userCategories = await this.categoryRepository.findByFamilyId(familyId, type);
    } else {
      // 获取用户分类
      userCategories = await this.categoryRepository.findByUserId(userId, type);
    }
    const userCategoryDtos = userCategories.map(toCategoryResponseDto);

    // 应用用户配置到默认分类
    const configuredDefaultCategories = defaultCategoryDtos.map(category => {
      const userConfig = userConfigs.find(config => config.categoryId === category.id);
      if (userConfig) {
        return {
          ...category,
          isHidden: userConfig.isHidden,
          displayOrder: userConfig.displayOrder
        };
      }
      return category;
    });

    // 合并并按显示顺序排序
    const allCategories = [...configuredDefaultCategories, ...userCategoryDtos];

    // 过滤掉隐藏的分类
    const visibleCategories = allCategories.filter(category => {
      // 如果是默认分类，检查是否被隐藏
      if (category.isDefault) {
        const userConfig = userConfigs.find(config => config.categoryId === category.id);
        return !userConfig || !userConfig.isHidden;
      }
      // 用户自定义分类默认显示
      return true;
    });

    // 按显示顺序排序
    return visibleCategories.sort((a, b) => {
      const configA = userConfigs.find(config => config.categoryId === a.id);
      const configB = userConfigs.find(config => config.categoryId === b.id);
      const orderA = configA ? configA.displayOrder : 0;
      const orderB = configB ? configB.displayOrder : 0;
      return orderA - orderB;
    });
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
  async updateCategory(id: string, userId: string, categoryData: UpdateCategoryDto): Promise<CategoryResponseDto> {
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
}
