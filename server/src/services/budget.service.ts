import { BudgetPeriod, BudgetType, Budget, Category, RolloverType } from '@prisma/client';
import { BudgetRepository, BudgetWithCategory } from '../repositories/budget.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryBudgetRepository } from '../repositories/category-budget.repository';
import { BudgetHistoryRepository } from '../repositories/budget-history.repository';
import { BudgetHistoryService } from './budget-history.service';
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
  private budgetHistoryRepository: BudgetHistoryRepository;
  private budgetHistoryService: BudgetHistoryService;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.categoryRepository = new CategoryRepository();
    this.categoryBudgetRepository = new CategoryBudgetRepository();
    this.budgetHistoryRepository = new BudgetHistoryRepository();
    this.budgetHistoryService = new BudgetHistoryService();
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
    console.log('BudgetService.getBudgets 参数:', {
      userId,
      params
    });

    const { budgets, total } = await this.budgetRepository.findAll(userId, params);

    console.log('BudgetService.getBudgets 查询结果:', {
      total,
      budgetsCount: budgets.length
    });

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
   * 包括用户的个人预算和用户所属家庭的预算
   */
  async getActiveBudgets(userId: string): Promise<BudgetResponseDto[]> {
    console.log(`获取用户 ${userId} 的活跃预算`);
    const budgets = await this.budgetRepository.findActiveBudgets(userId);
    console.log(`找到 ${budgets.length} 个活跃预算`);

    // 获取每个预算的已使用金额
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.budgetRepository.calculateSpentAmount(budget.id);

        // 确保预算包含账本信息
        let accountBookType = 'PERSONAL';
        let accountBookName = '个人账本';
        let familyId = undefined;

        if (budget.accountBook) {
          accountBookType = budget.accountBook.type;
          accountBookName = budget.accountBook.name;
          familyId = budget.accountBook.familyId || undefined;
        }

        // 转换为响应DTO
        const budgetDto = toBudgetResponseDto(
          budget,
          budget.category ? toCategoryResponseDto(budget.category) : undefined,
          spent
        );

        // 添加账本信息
        budgetDto.accountBookType = accountBookType;
        budgetDto.accountBookName = accountBookName;
        budgetDto.familyId = familyId;

        return budgetDto;
      })
    );

    console.log(`处理完成，返回 ${budgetsWithSpent.length} 个预算`);
    return budgetsWithSpent;
  }

  /**
   * 获取预算结转历史
   */
  async getBudgetRolloverHistory(budgetId: string, userId: string): Promise<any[]> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
      throw new Error('无权访问此预算');
    }

    // 获取预算历史记录
    return this.budgetHistoryService.getBudgetHistoriesByBudgetId(budgetId);
  }

  /**
   * 处理预算结转
   * 在月度预算结束时调用，计算结转金额并创建历史记录
   */
  async processBudgetRollover(budgetId: string): Promise<void> {
    // 获取预算信息
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 只处理启用了结转的预算
    if (!budget.rollover) {
      return;
    }

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(budgetId);
    const amount = Number(budget.amount);
    const remaining = amount - spent;

    // 格式化期间（例如：2023年5月）
    const endDate = budget.endDate;
    const period = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`;

    // 记录结转历史
    await this.budgetHistoryService.recordRollover(
      budgetId,
      period,
      remaining,
      `${period}预算结转`
    );

    // 更新预算的结转金额
    await this.budgetRepository.update(budgetId, {
      rolloverAmount: remaining
    });
  }

  /**
   * 创建下一个周期的预算
   * 对于月度预算，创建下个月的预算
   */
  async createNextPeriodBudget(budgetId: string): Promise<BudgetResponseDto> {
    // 获取当前预算
    const currentBudget = await this.budgetRepository.findById(budgetId);
    if (!currentBudget) {
      throw new Error('预算不存在');
    }

    // 只处理个人预算
    if ((currentBudget as any).budgetType !== BudgetType.PERSONAL) {
      throw new Error('只能为个人预算创建下一周期');
    }

    // 计算下一周期的日期
    const startDate = new Date(currentBudget.endDate);
    startDate.setDate(startDate.getDate() + 1);

    const endDate = new Date(startDate);
    if (currentBudget.period === BudgetPeriod.MONTHLY) {
      // 设置为下个月的最后一天
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    } else {
      // 年度预算，加一年
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1);
    }

    // 创建新预算数据
    const newBudgetData: CreateBudgetDto = {
      name: currentBudget.name,
      amount: Number(currentBudget.amount),
      period: currentBudget.period,
      categoryId: currentBudget.categoryId || undefined,
      startDate,
      endDate,
      rollover: currentBudget.rollover,
      familyId: currentBudget.familyId || undefined,
      accountBookId: (currentBudget as any).accountBookId || undefined,
      enableCategoryBudget: (currentBudget as any).enableCategoryBudget || false,
      isAutoCalculated: (currentBudget as any).isAutoCalculated || false,
      budgetType: BudgetType.PERSONAL
    };

    // 创建新预算
    const userId = currentBudget.userId || '';
    return this.createBudget(userId, newBudgetData);
  }
}
