import { RolloverType } from '@prisma/client';
import { BudgetHistoryRepository } from '../repositories/budget-history.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import {
  CreateBudgetHistoryDto,
  BudgetHistoryResponseDto,
  BudgetHistoryPaginatedResponseDto,
  BudgetHistoryQueryParams,
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
   * 记录预算结转
   * @param budgetId 预算ID
   * @param period 期间（例如：2023年5月）
   * @param amount 结转金额
   * @param description 描述
   */
  async recordRollover(
    budgetId: string,
    period: string,
    amount: number,
    description?: string
  ): Promise<BudgetHistoryResponseDto> {
    // 确定结转类型
    const type = amount >= 0 ? RolloverType.SURPLUS : RolloverType.DEFICIT;
    
    // 创建历史记录
    const data: CreateBudgetHistoryDto = {
      budgetId,
      period,
      amount: Math.abs(amount), // 存储绝对值
      type,
      description
    };

    return this.createBudgetHistory(data);
  }

  /**
   * 删除预算的所有历史记录
   */
  async deleteBudgetHistories(budgetId: string): Promise<void> {
    await this.budgetHistoryRepository.deleteByBudgetId(budgetId);
  }
}
