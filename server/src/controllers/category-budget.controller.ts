import { Request, Response } from 'express';
import { CategoryBudgetService } from '../services/category-budget.service';
import { CreateCategoryBudgetDto, UpdateCategoryBudgetDto, CategoryBudgetQueryParams } from '../models/category-budget.model';

export class CategoryBudgetController {
  private categoryBudgetService: CategoryBudgetService;

  constructor() {
    this.categoryBudgetService = new CategoryBudgetService();
  }

  /**
   * 创建分类预算
   */
  async createCategoryBudget(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCategoryBudgetDto = {
        budgetId: req.body.budgetId,
        categoryId: req.body.categoryId,
        amount: req.body.amount
      };

      const categoryBudget = await this.categoryBudgetService.createCategoryBudget(data);
      res.status(201).json(categoryBudget);
    } catch (error: any) {
      console.error('创建分类预算失败:', error);
      res.status(400).json({ message: error.message || '创建分类预算失败' });
    }
  }

  /**
   * 获取分类预算列表
   */
  async getCategoryBudgets(req: Request, res: Response): Promise<void> {
    try {
      const params: CategoryBudgetQueryParams = {
        budgetId: req.query.budgetId as string,
        categoryId: req.query.categoryId as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const categoryBudgets = await this.categoryBudgetService.getCategoryBudgets(params);
      res.status(200).json(categoryBudgets);
    } catch (error: any) {
      console.error('获取分类预算列表失败:', error);
      res.status(400).json({ message: error.message || '获取分类预算列表失败' });
    }
  }

  /**
   * 根据预算ID获取分类预算列表
   */
  async getCategoryBudgetsByBudgetId(req: Request, res: Response): Promise<void> {
    try {
      const budgetId = req.params.budgetId;
      const categoryBudgets = await this.categoryBudgetService.getCategoryBudgetsByBudgetId(budgetId);
      res.status(200).json(categoryBudgets);
    } catch (error: any) {
      console.error('获取分类预算列表失败:', error);
      res.status(400).json({ message: error.message || '获取分类预算列表失败' });
    }
  }

  /**
   * 获取分类预算详情
   */
  async getCategoryBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const categoryBudget = await this.categoryBudgetService.getCategoryBudget(id);
      res.status(200).json(categoryBudget);
    } catch (error: any) {
      console.error('获取分类预算详情失败:', error);
      res.status(400).json({ message: error.message || '获取分类预算详情失败' });
    }
  }

  /**
   * 更新分类预算
   */
  async updateCategoryBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const data: UpdateCategoryBudgetDto = {
        amount: req.body.amount,
        spent: req.body.spent
      };

      const categoryBudget = await this.categoryBudgetService.updateCategoryBudget(id, data);
      res.status(200).json(categoryBudget);
    } catch (error: any) {
      console.error('更新分类预算失败:', error);
      res.status(400).json({ message: error.message || '更新分类预算失败' });
    }
  }

  /**
   * 删除分类预算
   */
  async deleteCategoryBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      await this.categoryBudgetService.deleteCategoryBudget(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('删除分类预算失败:', error);
      res.status(400).json({ message: error.message || '删除分类预算失败' });
    }
  }
}
