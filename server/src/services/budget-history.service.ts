import { RolloverType } from '@prisma/client';
import { BudgetHistoryRepository } from '../repositories/budget-history.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import {
  CreateBudgetHistoryDto,
  BudgetHistoryResponseDto,
  BudgetHistoryPaginatedResponseDto,
  BudgetHistoryQueryParams,
  UserBudgetHistoryQueryParams,
  toBudgetHistoryResponseDto
} from '../models/budget-history.model';

export class BudgetHistoryService {
  private budgetHistoryRepository: BudgetHistoryRepository;
  private budgetRepository: BudgetRepository;

  constructor() {
    this.budgetHistoryRepository = new BudgetHistoryRepository();
    this.budgetRepository = new BudgetRepository();
  }

  /**
   * 创建预算历史记录
   */
  async createBudgetHistory(data: CreateBudgetHistoryDto): Promise<BudgetHistoryResponseDto> {
    // 验证预算是否存在
    const budget = await this.budgetRepository.findById(data.budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 创建历史记录
    const history = await this.budgetHistoryRepository.create(data);
    return toBudgetHistoryResponseDto(history);
  }

  /**
   * 获取预算历史记录列表
   */
  async getBudgetHistories(params: BudgetHistoryQueryParams): Promise<BudgetHistoryPaginatedResponseDto> {
    const { histories, total } = await this.budgetHistoryRepository.findAll(params);

    const data = histories.map(history => toBudgetHistoryResponseDto(history));

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data,
    };
  }

  /**
   * 获取预算的历史记录
   */
  async getBudgetHistoriesByBudgetId(budgetId: string): Promise<BudgetHistoryResponseDto[]> {
    const histories = await this.budgetHistoryRepository.findByBudgetId(budgetId);
    return histories.map(history => toBudgetHistoryResponseDto(history));
  }

  /**
   * 获取用户级别的预算历史记录
   */
  async getUserBudgetHistories(params: UserBudgetHistoryQueryParams): Promise<BudgetHistoryResponseDto[]> {
    const histories = await this.budgetHistoryRepository.findByUserLevel(params);
    return histories.map(history => toBudgetHistoryResponseDto(history));
  }

  /**
   * 记录预算结转
   * @param budgetId 预算ID
   * @param period 期间（例如：2023年5月）
   * @param amount 结转金额
   * @param description 描述
   * @param budgetAmount 预算金额（可选）
   * @param spentAmount 已使用金额（可选）
   * @param previousRollover 上一期结转金额（可选）
   */
  async recordRollover(
    budgetId: string,
    period: string,
    amount: number,
    description?: string,
    budgetAmount?: number,
    spentAmount?: number,
    previousRollover?: number
  ): Promise<BudgetHistoryResponseDto> {
    // 确定结转类型
    const type = amount >= 0 ? RolloverType.SURPLUS : RolloverType.DEFICIT;

    // 获取预算信息以填充用户级别字段
    let userId: string | undefined;
    let accountBookId: string | undefined;
    let budgetType: string | undefined;

    try {
      const budget = await this.budgetRepository.findById(budgetId);
      if (budget) {
        userId = budget.userId || undefined;
        accountBookId = budget.accountBookId || undefined;
        budgetType = (budget as any).budgetType || 'PERSONAL';

        // 如果没有提供预算金额，从预算中获取
        if (budgetAmount === undefined) {
          budgetAmount = Number(budget.amount);
        }
      }
    } catch (error) {
      console.error('获取预算信息失败:', error);
    }

    // 创建历史记录
    const data: CreateBudgetHistoryDto = {
      budgetId,
      period,
      amount: Math.abs(amount), // 存储绝对值
      type,
      description,
      budgetAmount,
      spentAmount,
      previousRollover,
      userId,
      accountBookId,
      budgetType
    };

    return this.createBudgetHistory(data);
  }

  /**
   * 删除预算的所有历史记录
   */
  async deleteBudgetHistories(budgetId: string): Promise<void> {
    await this.budgetHistoryRepository.deleteByBudgetId(budgetId);
  }

  /**
   * 删除单条预算历史记录
   */
  async deleteBudgetHistory(historyId: string): Promise<void> {
    await this.budgetHistoryRepository.delete(historyId);
  }
}
