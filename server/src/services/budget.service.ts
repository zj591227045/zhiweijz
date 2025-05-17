import { BudgetPeriod, Budget, Category } from '@prisma/client';
import { BudgetRepository, BudgetWithCategory } from '../repositories/budget.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryBudgetRepository } from '../repositories/category-budget.repository';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetResponseDto,
  BudgetPaginatedResponseDto,
  BudgetQueryParams,
  toBudgetResponseDto
} from '../models/budget.model';
import { toCategoryResponseDto } from '../models/category.model';
import { toCategoryBudgetResponseDto, CategoryBudgetResponseDto } from '../models/category-budget.model';

export class BudgetService {
  private budgetRepository: BudgetRepository;
  private categoryRepository: CategoryRepository;
  private categoryBudgetRepository: CategoryBudgetRepository;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.categoryRepository = new CategoryRepository();
    this.categoryBudgetRepository = new CategoryBudgetRepository();
  }

  /**
   * 创建预算
   */
  async createBudget(userId: string, budgetData: CreateBudgetDto): Promise<BudgetResponseDto> {
    // 验证分类是否存在
    if (budgetData.categoryId) {
      const category = await this.categoryRepository.findById(budgetData.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    // 如果启用分类预算且总预算金额为0，标记为自动计算
    if (budgetData.enableCategoryBudget && budgetData.amount === 0) {
      budgetData.isAutoCalculated = true;
    }

    // 创建预算
    const budget = await this.budgetRepository.create(userId, budgetData);

    return toBudgetResponseDto(
      budget,
      budget.category ? toCategoryResponseDto(budget.category) : undefined
    );
  }

  /**
   * 获取预算列表
   */
  async getBudgets(userId: string, params: BudgetQueryParams): Promise<BudgetPaginatedResponseDto> {
    const { budgets, total } = await this.budgetRepository.findAll(userId, params);

    // 获取每个预算的已使用金额
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.budgetRepository.calculateSpentAmount(budget.id);
        return toBudgetResponseDto(
          budget,
          budget.category ? toCategoryResponseDto(budget.category) : undefined,
          spent
        );
      })
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data: budgetsWithSpent,
    };
  }

  /**
   * 获取单个预算
   */
  async getBudgetById(id: string, userId: string): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findById(id);

    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
      throw new Error('无权访问此预算');
    }

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(id);

    // 获取分类预算
    let categoryBudgets: CategoryBudgetResponseDto[] = [];
    if (budget.enableCategoryBudget && budget.categoryBudgets) {
      categoryBudgets = budget.categoryBudgets.map(cb =>
        toCategoryBudgetResponseDto(
          cb,
          cb.category ? toCategoryResponseDto(cb.category) : undefined
        )
      );
    }

    const result = toBudgetResponseDto(
      budget,
      budget.category ? toCategoryResponseDto(budget.category) : undefined,
      spent
    );

    // 添加分类预算到响应
    result.categoryBudgets = categoryBudgets;

    return result;
  }

  /**
   * 更新预算
   */
  async updateBudget(id: string, userId: string, budgetData: UpdateBudgetDto): Promise<BudgetResponseDto> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(id);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
      throw new Error('无权修改此预算');
    }

    // 如果更新了分类，验证分类是否存在
    if (budgetData.categoryId) {
      const category = await this.categoryRepository.findById(budgetData.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    // 处理分类预算启用状态变更
    if (budgetData.enableCategoryBudget !== undefined &&
        budgetData.enableCategoryBudget !== budget.enableCategoryBudget) {

      // 如果启用分类预算且总预算金额为0，标记为自动计算
      if (budgetData.enableCategoryBudget && Number(budget.amount) === 0) {
        budgetData.isAutoCalculated = true;
      }

      // 如果禁用分类预算，删除所有分类预算
      if (!budgetData.enableCategoryBudget) {
        await this.categoryBudgetRepository.deleteByBudgetId(id);
      }
    }

    // 更新预算
    const updatedBudget = await this.budgetRepository.update(id, budgetData);

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(id);

    // 获取分类预算
    let categoryBudgets: CategoryBudgetResponseDto[] = [];
    if (updatedBudget.enableCategoryBudget && updatedBudget.categoryBudgets) {
      categoryBudgets = updatedBudget.categoryBudgets.map(cb =>
        toCategoryBudgetResponseDto(
          cb,
          cb.category ? toCategoryResponseDto(cb.category) : undefined
        )
      );
    }

    const result = toBudgetResponseDto(
      updatedBudget,
      updatedBudget.category ? toCategoryResponseDto(updatedBudget.category) : undefined,
      spent
    );

    // 添加分类预算到响应
    result.categoryBudgets = categoryBudgets;

    return result;
  }

  /**
   * 删除预算
   */
  async deleteBudget(id: string, userId: string): Promise<void> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(id);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
      throw new Error('无权删除此预算');
    }

    // 删除预算
    await this.budgetRepository.delete(id);
  }

  /**
   * 获取当前活跃的预算
   */
  async getActiveBudgets(userId: string): Promise<BudgetResponseDto[]> {
    const budgets = await this.budgetRepository.findActiveBudgets(userId);

    // 获取每个预算的已使用金额
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.budgetRepository.calculateSpentAmount(budget.id);
        return toBudgetResponseDto(
          budget,
          budget.category ? toCategoryResponseDto(budget.category) : undefined,
          spent
        );
      })
    );

    return budgetsWithSpent;
  }
}
