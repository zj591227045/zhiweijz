import { TransactionType } from '@prisma/client';
import { BudgetRepository } from '../repositories/budget.repository';
import { CategoryBudgetRepository } from '../repositories/category-budget.repository';
import { CategoryRepository } from '../repositories/category.repository';

/**
 * 预算交易服务
 * 处理交易记录与预算的关联逻辑
 */
export class BudgetTransactionService {
  private budgetRepository: BudgetRepository;
  private categoryBudgetRepository: CategoryBudgetRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.categoryBudgetRepository = new CategoryBudgetRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * 记录交易并更新相关预算
   * @param accountBookId 账本ID
   * @param categoryId 分类ID
   * @param amount 交易金额
   * @param type 交易类型
   * @param date 交易日期
   */
  async recordTransaction(
    accountBookId: string,
    categoryId: string,
    amount: number,
    type: TransactionType,
    date: Date,
  ): Promise<void> {
    // 只处理支出类型的交易
    if (type !== 'EXPENSE') {
      return;
    }

    try {
      // 查找适用的总预算
      const budget = await this.budgetRepository.findActiveByAccountBookId(accountBookId, date);
      if (!budget) {
        return; // 没有找到适用的预算，不进行处理
      }

      // 如果启用了分类预算
      if (budget.enableCategoryBudget) {
        // 查找对应的分类预算
        const categoryBudget = await this.categoryBudgetRepository.findByBudgetAndCategory(
          budget.id,
          categoryId,
        );

        if (categoryBudget) {
          // 更新分类预算的已用金额
          const newSpent = Number(categoryBudget.spent) + amount;
          await this.categoryBudgetRepository.updateSpent(categoryBudget.id, newSpent);
        } else {
          // 如果没有对应的分类预算，查找或创建"其他"分类预算
          await this.getOrCreateOtherCategoryBudget(budget.id, amount);
        }
      }
    } catch (error) {
      console.error('更新预算失败:', error);
    }
  }

  /**
   * 获取或创建"其他"分类预算
   * @param budgetId 预算ID
   * @param additionalSpent 额外支出金额
   */
  private async getOrCreateOtherCategoryBudget(
    budgetId: string,
    additionalSpent: number = 0,
  ): Promise<void> {
    try {
      // 查找"其他"分类
      const otherCategory = await this.categoryRepository.findByName('其他');
      if (!otherCategory) {
        console.error('未找到"其他"分类');
        return;
      }

      // 查找"其他"分类预算
      let otherBudget = await this.categoryBudgetRepository.findByBudgetAndCategory(
        budgetId,
        otherCategory.id,
      );

      // 获取预算信息
      const budget = await this.budgetRepository.findById(budgetId);
      if (!budget) {
        console.error('未找到预算');
        return;
      }

      // 如果不存在，创建"其他"分类预算
      if (!otherBudget) {
        // 获取所有分类预算
        const categoryBudgets = await this.categoryBudgetRepository.findByBudgetId(budgetId);

        // 计算"其他"预算金额
        let otherAmount = 0;
        if (!budget.isAutoCalculated && Number(budget.amount) > 0) {
          // 如果总预算不是自动计算的且金额大于0，则其他预算金额为总预算减去所有分类预算
          const allocatedAmount = categoryBudgets.reduce((sum, cb) => sum + Number(cb.amount), 0);
          otherAmount = Math.max(0, Number(budget.amount) - allocatedAmount);
        }

        // 创建"其他"分类预算
        await this.categoryBudgetRepository.create({
          budgetId,
          categoryId: otherCategory.id,
          amount: otherAmount,
        });

        // 重新查询创建的预算
        otherBudget = await this.categoryBudgetRepository.findByBudgetAndCategory(
          budgetId,
          otherCategory.id,
        );
      }

      // 更新"其他"分类预算的已用金额
      if (otherBudget) {
        const newSpent = Number(otherBudget.spent) + additionalSpent;
        await this.categoryBudgetRepository.updateSpent(otherBudget.id, newSpent);
      }
    } catch (error) {
      console.error('获取或创建"其他"分类预算失败:', error);
    }
  }
}
