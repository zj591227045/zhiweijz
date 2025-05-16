import { Request, Response } from 'express';
import { TransactionType } from '@prisma/client';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../models/category.model';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * 初始化默认分类
   */
  async initializeDefaultCategories(req: Request, res: Response): Promise<void> {
    try {
      const count = await this.categoryService.initializeDefaultCategories();
      res.status(200).json({ message: `成功初始化 ${count} 个默认分类` });
    } catch (error) {
      console.error('初始化默认分类时发生错误:', error);
      if (error instanceof Error) {
        res.status(500).json({ message: `初始化默认分类时发生错误: ${error.message}` });
      } else {
        res.status(500).json({ message: '初始化默认分类时发生错误' });
      }
    }
  }

  /**
   * 创建分类
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const categoryData: CreateCategoryDto = req.body;
      const category = await this.categoryService.createCategory(userId, categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建分类时发生错误' });
      }
    }
  }

  /**
   * 获取分类列表
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const type = req.query.type as TransactionType | undefined;
      const familyId = req.query.familyId as string | undefined;

      const categories = await this.categoryService.getCategories(userId, type, familyId);
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: '获取分类列表时发生错误' });
    }
  }

  /**
   * 获取单个分类
   */
  async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      const category = await this.categoryService.getCategoryById(categoryId);
      res.status(200).json(category);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取分类时发生错误' });
      }
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const categoryId = req.params.id;
      const categoryData: UpdateCategoryDto = req.body;

      const category = await this.categoryService.updateCategory(categoryId, userId, categoryData);
      res.status(200).json(category);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新分类时发生错误' });
      }
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const categoryId = req.params.id;
      await this.categoryService.deleteCategory(categoryId, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '删除分类时发生错误' });
      }
    }
  }
}
