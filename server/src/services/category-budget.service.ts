import { CategoryBudgetRepository } from '../repositories/category-budget.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import { CategoryRepository } from '../repositories/category.repository';
import {
  CreateCategoryBudgetDto,
  UpdateCategoryBudgetDto,
  CategoryBudgetQueryParams,
  CategoryBudgetResponseDto,
  CategoryBudgetPaginatedResponseDto,
  toCategoryBudgetResponseDto,
} from '../models/category-budget.model';
import { toCategoryResponseDto } from '../models/category.model';

export class CategoryBudgetService {
  private categoryBudgetRepository: CategoryBudgetRepository;
  private budgetRepository: BudgetRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryBudgetRepository = new CategoryBudgetRepository();
    this.budgetRepository = new BudgetRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * 创建分类预算
   */
  async createCategoryBudget(data: CreateCategoryBudgetDto): Promise<CategoryBudgetResponseDto> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(data.budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 检查分类是否存在
    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new Error('分类不存在');
    }

    // 检查是否已启用分类预算
    if (!budget.enableCategoryBudget) {
      throw new Error('该预算未启用分类预算功能');
    }

    // 检查是否已存在该分类的预算
    const existingBudget = await this.categoryBudgetRepository.findByBudgetAndCategory(
      data.budgetId,
      data.categoryId,
    );
    if (existingBudget) {
      throw new Error('该分类已存在预算');
    }

    // 如果总预算不是自动计算的，检查分类预算总和是否超过总预算
    if (!budget.isAutoCalculated && Number(budget.amount) > 0) {
      const categoryBudgets = await this.categoryBudgetRepository.findByBudgetId(data.budgetId);
      const currentTotal = categoryBudgets.reduce((sum, cb) => sum + Number(cb.amount), 0);

      if (currentTotal + data.amount > Number(budget.amount)) {
        throw new Error('分类预算总和超过总预算金额');
      }
    }

    // 创建分类预算
    const categoryBudget = await this.categoryBudgetRepository.create(data);

    // 如果总预算是自动计算的，更新总预算金额
    if (budget.isAutoCalculated) {
      const totalAmount = await this.categoryBudgetRepository.calculateTotalAmount(data.budgetId);
      await this.budgetRepository.update(data.budgetId, {
        amount: totalAmount,
      });
    }

    return toCategoryBudgetResponseDto(
      categoryBudget,
      categoryBudget.category ? toCategoryResponseDto(categoryBudget.category) : undefined,
    );
  }

  /**
   * 获取分类预算列表
   */
  async getCategoryBudgets(
    params: CategoryBudgetQueryParams,
  ): Promise<CategoryBudgetPaginatedResponseDto> {
    const { categoryBudgets, total } = await this.categoryBudgetRepository.findAll(params);

    const data = categoryBudgets.map((categoryBudget) =>
      toCategoryBudgetResponseDto(
        categoryBudget,
        categoryBudget.category ? toCategoryResponseDto(categoryBudget.category) : undefined,
      ),
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data,
    };
  }

  /**
   * 根据预算ID获取分类预算列表
   */
  async getCategoryBudgetsByBudgetId(budgetId: string): Promise<CategoryBudgetResponseDto[]> {
    const categoryBudgets = await this.categoryBudgetRepository.findByBudgetId(budgetId);

    return categoryBudgets.map((categoryBudget) =>
      toCategoryBudgetResponseDto(
        categoryBudget,
        categoryBudget.category ? toCategoryResponseDto(categoryBudget.category) : undefined,
      ),
    );
  }

  /**
   * 获取分类预算详情
   */
  async getCategoryBudget(id: string): Promise<CategoryBudgetResponseDto> {
    const categoryBudget = await this.categoryBudgetRepository.findById(id);
    if (!categoryBudget) {
      throw new Error('分类预算不存在');
    }

    return toCategoryBudgetResponseDto(
      categoryBudget,
      categoryBudget.category ? toCategoryResponseDto(categoryBudget.category) : undefined,
    );
  }

  /**
   * 更新分类预算
   */
  async updateCategoryBudget(
    id: string,
    data: UpdateCategoryBudgetDto,
  ): Promise<CategoryBudgetResponseDto> {
    const categoryBudget = await this.categoryBudgetRepository.findById(id);
    if (!categoryBudget) {
      throw new Error('分类预算不存在');
    }

    // 如果更新金额，检查总预算限制
    if (data.amount !== undefined) {
      const budget = await this.budgetRepository.findById(categoryBudget.budgetId);
      if (!budget) {
        throw new Error('预算不存在');
      }

      // 如果总预算不是自动计算的，检查分类预算总和是否超过总预算
      if (!budget.isAutoCalculated && Number(budget.amount) > 0) {
        const categoryBudgets = await this.categoryBudgetRepository.findByBudgetId(
          categoryBudget.budgetId,
        );
        const currentTotal = categoryBudgets.reduce(
          (sum, cb) => sum + (cb.id === id ? 0 : Number(cb.amount)),
          0,
        );

        if (currentTotal + data.amount > Number(budget.amount)) {
          throw new Error('分类预算总和超过总预算金额');
        }
      }
    }

    const updatedCategoryBudget = await this.categoryBudgetRepository.update(id, data);

    // 如果总预算是自动计算的，更新总预算金额
    const budget = await this.budgetRepository.findById(categoryBudget.budgetId);
    if (budget && budget.isAutoCalculated && data.amount !== undefined) {
      const totalAmount = await this.categoryBudgetRepository.calculateTotalAmount(
        categoryBudget.budgetId,
      );
      await this.budgetRepository.update(categoryBudget.budgetId, {
        amount: totalAmount,
      });
    }

    return toCategoryBudgetResponseDto(
      updatedCategoryBudget,
      updatedCategoryBudget.category
        ? toCategoryResponseDto(updatedCategoryBudget.category)
        : undefined,
    );
  }

  /**
   * 删除分类预算
   */
  async deleteCategoryBudget(id: string): Promise<void> {
    const categoryBudget = await this.categoryBudgetRepository.findById(id);
    if (!categoryBudget) {
      throw new Error('分类预算不存在');
    }

    await this.categoryBudgetRepository.delete(id);

    // 如果总预算是自动计算的，更新总预算金额
    const budget = await this.budgetRepository.findById(categoryBudget.budgetId);
    if (budget && budget.isAutoCalculated) {
      const totalAmount = await this.categoryBudgetRepository.calculateTotalAmount(
        categoryBudget.budgetId,
      );
      await this.budgetRepository.update(categoryBudget.budgetId, {
        amount: totalAmount,
      });
    }
  }
}
