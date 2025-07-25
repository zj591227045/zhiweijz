import { Request, Response } from 'express';
import { BudgetPeriod, BudgetType } from '@prisma/client';
import { BudgetService } from '../services/budget.service';
import { CategoryBudgetService } from '../services/category-budget.service';
import { TransactionService } from '../services/transaction.service';
import { FamilyBudgetService } from '../services/family-budget.service';
import { CreateBudgetDto, UpdateBudgetDto, BudgetQueryParams } from '../models/budget.model';

export class BudgetController {
  private budgetService: BudgetService;
  private categoryBudgetService: CategoryBudgetService;
  private transactionService: TransactionService;
  private familyBudgetService: FamilyBudgetService;

  constructor() {
    this.budgetService = new BudgetService();
    this.categoryBudgetService = new CategoryBudgetService();
    this.transactionService = new TransactionService();
    this.familyBudgetService = new FamilyBudgetService();
  }

  /**
   * 创建预算
   */
  async createBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetData: CreateBudgetDto = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };

      const budget = await this.budgetService.createBudget(userId, budgetData);
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建预算时发生错误' });
      }
    }
  }

  /**
   * 获取预算列表
   */
  async getBudgets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 解析查询参数 - 只关注账本ID和预算类型
      const params: BudgetQueryParams = {
        accountBookId: req.query.accountBookId as string | undefined,
        budgetType: req.query.budgetType as BudgetType | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: 'startDate',
        sortOrder: 'desc',
      };

      console.log('BudgetController.getBudgets 请求参数:', {
        userId,
        accountBookId: params.accountBookId,
        budgetType: params.budgetType,
      });

      const budgets = await this.budgetService.getBudgets(userId, params);
      res.status(200).json(budgets);
    } catch (error) {
      res.status(500).json({ message: '获取预算列表时发生错误' });
    }
  }

  /**
   * 根据日期获取预算列表
   */
  async getBudgetsByDate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { date, accountBookId } = req.query;

      if (!date) {
        res.status(400).json({ message: '日期参数是必需的' });
        return;
      }

      if (!accountBookId) {
        res.status(400).json({ message: '账本ID参数是必需的' });
        return;
      }

      console.log('BudgetController.getBudgetsByDate 请求参数:', {
        userId,
        date,
        accountBookId,
      });

      const budgets = await this.budgetService.getBudgetsByDate(
        userId,
        date as string,
        accountBookId as string,
      );

      res.status(200).json(budgets);
    } catch (error) {
      console.error('获取日期预算列表时发生错误:', error);
      res.status(500).json({ message: '获取日期预算列表时发生错误' });
    }
  }

  /**
   * 获取单个预算
   */
  async getBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;

      // 检查是否为聚合预算ID
      if (budgetId.startsWith('aggregated_')) {
        console.log('检测到聚合预算ID，返回聚合预算信息');
        // 对于聚合预算，返回基本信息（实际上前端不应该调用这个API获取聚合预算详情）
        res.status(200).json({
          id: budgetId,
          name: '聚合预算',
          amount: 0,
          spent: 0,
          remaining: 0,
          budgetType: 'PERSONAL',
          isAggregated: true,
        });
        return;
      }

      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      res.status(200).json(budget);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取预算时发生错误' });
      }
    }
  }

  /**
   * 更新预算
   */
  async updateBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      const budgetData: UpdateBudgetDto = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };

      const budget = await this.budgetService.updateBudget(budgetId, userId, budgetData);
      res.status(200).json(budget);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新预算时发生错误' });
      }
    }
  }

  /**
   * 删除预算
   */
  async deleteBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      await this.budgetService.deleteBudget(budgetId, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '删除预算时发生错误' });
      }
    }
  }

  /**
   * 获取当前活跃的预算
   */
  async getActiveBudgets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 获取可选的账本ID参数
      const accountBookId = req.query.accountBookId as string | undefined;

      const budgets = await this.budgetService.getActiveBudgets(userId, accountBookId);
      res.status(200).json(budgets);
    } catch (error) {
      res.status(500).json({ message: '获取活跃预算时发生错误' });
    }
  }

  /**
   * 获取预算分类预算
   */
  async getBudgetCategories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      const categoryBudgets = await this.categoryBudgetService.getCategoryBudgetsByBudgetId(
        budgetId,
      );
      res.status(200).json(categoryBudgets);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取预算分类预算时发生错误' });
      }
    }
  }

  /**
   * 获取预算趋势
   */
  async getBudgetTrends(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      const viewMode = (req.query.viewMode as 'daily' | 'weekly' | 'monthly') || 'monthly';
      const familyMemberId = (req.query.familyMemberId as string) || undefined;

      console.log(
        `获取预算趋势，预算ID: ${budgetId}, 视图模式: ${viewMode}, 家庭成员ID: ${
          familyMemberId || '无'
        }`,
      );

      // 验证预算是否存在并且用户有权限访问
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        res.status(404).json({ message: '预算不存在' });
        return;
      }

      // 调用预算服务获取真实趋势数据
      const trendData = await this.budgetService.getBudgetTrends(
        budgetId,
        viewMode,
        familyMemberId,
      );
      console.log(`获取到预算趋势数据: ${trendData.length} 条记录`);
      res.status(200).json(trendData);
    } catch (error) {
      console.error('获取预算趋势数据失败:', error);
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取预算趋势时发生错误' });
      }
    }
  }

  /**
   * 获取预算结转历史（兼容旧版本）
   */
  async getRolloverHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      console.log(`获取预算结转历史，预算ID: ${budgetId}`);

      // 获取真实的预算结转历史
      const rolloverHistory = await this.budgetService.getBudgetRolloverHistoryByBudgetId(
        budgetId,
        userId,
      );
      console.log(`获取到预算结转历史: ${rolloverHistory.length} 条记录`);

      // 如果没有真实的结转历史，返回空数组而不是模拟数据
      res.status(200).json(rolloverHistory || []);
    } catch (error) {
      console.error('获取预算结转历史失败:', error);
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取预算结转历史时发生错误' });
      }
    }
  }

  /**
   * 获取预算相关记账
   */
  async getBudgetTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const familyMemberId = (req.query.familyMemberId as string) || null;
      const includeAttachments = req.query.includeAttachments === 'true';

      // 检查是否为聚合预算ID
      if (budgetId.startsWith('aggregated_')) {
        console.log('检测到聚合预算ID，使用聚合预算记账逻辑');
        // 对于聚合预算，返回空的记账记录（因为聚合预算是虚拟的）
        res.status(200).json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
        return;
      }

      // 验证预算是否存在并且用户有权限访问
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        res.status(404).json({ message: '预算不存在' });
        return;
      }

      // 获取与预算相关的记账
      const transactions = await this.transactionService.getTransactionsByBudget(
        budgetId,
        page,
        limit,
        familyMemberId,
      );

      // 如果需要包含附件信息，为每个记账获取附件
      if (includeAttachments && transactions.data) {
        for (const transaction of transactions.data) {
          try {
            const attachments = await this.transactionService.getTransactionAttachments(transaction.id, userId);
            (transaction as any).attachments = attachments;
            (transaction as any).attachmentCount = attachments.length;
          } catch (error) {
            // 如果附件获取失败，不影响主要数据，设置为空数组
            (transaction as any).attachments = [];
            (transaction as any).attachmentCount = 0;
          }
        }
      }

      console.log(
        `获取预算相关记账，预算ID: ${budgetId}, 家庭成员ID: ${familyMemberId || '无'}, 包含附件: ${includeAttachments}, 找到 ${
          transactions.data?.length || 0
        } 条记录`,
      );
      res.status(200).json(transactions);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取预算相关记账时发生错误' });
      }
    }
  }

  /**
   * 处理预算结转
   */
  async processBudgetRollover(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;

      // 验证预算是否存在并且用户有权限访问
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        res.status(404).json({ message: '预算不存在' });
        return;
      }

      // 处理预算结转
      await this.budgetService.processBudgetRollover(budgetId);

      // 创建下一个周期的预算
      const nextBudget = await this.budgetService.createNextPeriodBudget(budgetId);

      res.status(200).json({
        message: '预算结转处理成功',
        nextBudget,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '处理预算结转时发生错误' });
      }
    }
  }

  /**
   * 重新计算预算结转
   */
  async recalculateBudgetRollover(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      const recalculateChain = req.query.recalculateChain !== 'false'; // 默认true

      console.log(`重新计算预算结转，预算ID: ${budgetId}, 重新计算链条: ${recalculateChain}`);

      // 验证预算是否存在并且用户有权限访问
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        res.status(404).json({ message: '预算不存在' });
        return;
      }

      // 重新计算预算结转
      await this.budgetService.recalculateBudgetRollover(budgetId, recalculateChain);

      // 获取更新后的预算信息
      const updatedBudget = await this.budgetService.getBudgetById(budgetId, userId);

      // 获取更新后的结转历史
      const rolloverHistory = await this.budgetService.getBudgetRolloverHistoryByBudgetId(
        budgetId,
        userId,
      );

      res.status(200).json({
        message: '预算结转重新计算成功',
        budget: updatedBudget,
        rolloverHistory,
      });
    } catch (error) {
      console.error('重新计算预算结转失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '重新计算预算结转时发生错误' });
      }
    }
  }

  /**
   * 重新计算预算结转链条（用于修复历史记账影响）
   */
  async recalculateBudgetRolloverChain(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;

      console.log(`重新计算预算结转链条，起始预算ID: ${budgetId}`);

      // 验证预算是否存在并且用户有权限访问
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        res.status(404).json({ message: '预算不存在' });
        return;
      }

      // 强制重新计算整个链条
      await this.budgetService.recalculateBudgetRollover(budgetId, true);

      // 获取更新后的结转历史
      const rolloverHistory = await this.budgetService.getBudgetRolloverHistoryByBudgetId(
        budgetId,
        userId,
      );

      res.status(200).json({
        message: '预算结转链条重新计算成功',
        rolloverHistory,
        recalculatedFrom: budgetId,
      });
    } catch (error) {
      console.error('重新计算预算结转链条失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '重新计算预算结转链条时发生错误' });
      }
    }
  }

  /**
   * 获取家庭预算汇总
   */
  async getFamilyBudgetSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const budgetId = req.params.id;
      const familyId = req.query.familyId as string;

      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 验证预算是否存在并且用户有权限访问
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        res.status(404).json({ message: '预算不存在' });
        return;
      }

      // 验证预算是否属于指定家庭
      if (budget.familyId !== familyId) {
        res.status(400).json({ message: '预算不属于指定家庭' });
        return;
      }

      // 获取家庭预算汇总
      const summary = await this.familyBudgetService.getFamilyBudgetSummary(budgetId, familyId);
      res.status(200).json(summary);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取家庭预算汇总时发生错误' });
      }
    }
  }

  /**
   * 生成模拟记账数据
   */
  private generateMockTransactions(page: number, limit: number): any {
    const transactions = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categories = [
      { id: 'cat1', name: '餐饮', icon: 'utensils' },
      { id: 'cat2', name: '购物', icon: 'shopping-bag' },
      { id: 'cat3', name: '交通', icon: 'car' },
      { id: 'cat4', name: '娱乐', icon: 'film' },
    ];

    const titles = ['午餐', '晚餐', '超市购物', '打车', '电影票', '咖啡', '水果', '零食'];

    for (let i = 0; i < limit; i++) {
      const index = (page - 1) * limit + i;
      const daysAgo = index % 30;
      const date = new Date(currentYear, currentMonth, now.getDate() - daysAgo);

      const category = categories[Math.floor(Math.random() * categories.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const amount = Math.floor(Math.random() * 200) + 10;

      transactions.push({
        id: `trans-${index}`,
        title,
        amount,
        date: `${date.getMonth() + 1}月${date.getDate()}日`,
        time: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)
          .toString()
          .padStart(2, '0')}`,
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        budgetId: 'budget-id',
      });
    }

    return {
      data: transactions,
      total: 100,
      page,
      limit,
      hasMore: page * limit < 100,
      nextPage: page * limit < 100 ? page + 1 : null,
    };
  }
}
