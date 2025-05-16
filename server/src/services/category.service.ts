import { TransactionType } from '@prisma/client';
import { CategoryRepository } from '../repositories/category.repository';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  toCategoryResponseDto,
  defaultCategories
} from '../models/category.model';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
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
    return this.categoryRepository.createDefaultCategories(defaultCategories);
  }

  /**
   * 创建分类
   */
  async createCategory(userId: string, categoryData: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.create(userId, categoryData);
    return toCategoryResponseDto(category);
  }

  /**
   * 获取分类列表
   */
  async getCategories(userId: string, type?: TransactionType, familyId?: string): Promise<CategoryResponseDto[]> {
    let categories;

    if (familyId) {
      // 获取家庭分类和默认分类
      categories = await this.categoryRepository.findByFamilyId(familyId, type);
    } else {
      // 获取用户分类和默认分类
      categories = await this.categoryRepository.findByUserId(userId, type);
    }

    return categories.map(toCategoryResponseDto);
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
