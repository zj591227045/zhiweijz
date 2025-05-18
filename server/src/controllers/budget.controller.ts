import { Request, Response } from 'express';
import { BudgetPeriod } from '@prisma/client';
import { BudgetService } from '../services/budget.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetQueryParams
} from '../models/budget.model';

export class BudgetController {
  private budgetService: BudgetService;

  constructor() {
    this.budgetService = new BudgetService();
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

      // 解析查询参数
      const params: BudgetQueryParams = {
        period: req.query.period as BudgetPeriod | undefined,
        categoryId: req.query.categoryId as string | undefined,
        familyId: req.query.familyId as string | undefined,
        accountBookId: req.query.accountBookId as string | undefined,
        active: req.query.active === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      console.log('BudgetController.getBudgets 请求参数:', {
        userId,
        queryParams: req.query,
        parsedParams: params
      });

      const budgets = await this.budgetService.getBudgets(userId, params);
      res.status(200).json(budgets);
    } catch (error) {
      res.status(500).json({ message: '获取预算列表时发生错误' });
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

      const budgets = await this.budgetService.getActiveBudgets(userId);
      res.status(200).json(budgets);
    } catch (error) {
      res.status(500).json({ message: '获取活跃预算时发生错误' });
    }
  }
}
