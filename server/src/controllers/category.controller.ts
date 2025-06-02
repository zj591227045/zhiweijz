import { Request, Response } from 'express';
import { TransactionType, PrismaClient } from '@prisma/client';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../models/category.model';

const prisma = new PrismaClient();

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
      const accountBookId = req.query.accountBookId as string | undefined;
      const includeHidden = req.query.includeHidden === 'true';

      console.log('CategoryController.getCategories 参数:', {
        userId,
        type,
        familyId,
        accountBookId,
        includeHidden
      });

      // 如果指定了账本ID，需要获取该账本对应的家庭ID
      let effectiveFamilyId = familyId;
      if (accountBookId && !familyId) {
        // 查询账本信息获取家庭ID
        const accountBook = await prisma.accountBook.findFirst({
          where: {
            id: accountBookId,
            OR: [
              { userId: userId }, // 个人账本
              {
                family: {
                  members: {
                    some: { userId: userId } // 家庭账本成员
                  }
                }
              }
            ]
          },
          select: {
            familyId: true,
            type: true
          }
        });

        if (accountBook && accountBook.familyId) {
          effectiveFamilyId = accountBook.familyId;
          console.log(`从账本 ${accountBookId} 获取到家庭ID: ${effectiveFamilyId}`);
        }
      }

      const categories = await this.categoryService.getCategories(userId, type, effectiveFamilyId, includeHidden);
      res.status(200).json(categories);
    } catch (error) {
      console.error('获取分类列表失败:', error);
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

  /**
   * 更新分类排序
   */
  async updateCategoryOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      console.log('收到分类排序请求，请求体:', JSON.stringify(req.body));

      const { categoryIds, type } = req.body;

      if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
        console.log('分类ID列表不能为空:', categoryIds);
        res.status(400).json({ message: '分类ID列表不能为空' });
        return;
      }

      if (!type || !['EXPENSE', 'INCOME'].includes(type)) {
        console.log('分类类型必须为EXPENSE或INCOME:', type);
        res.status(400).json({ message: '分类类型必须为EXPENSE或INCOME' });
        return;
      }

      console.log(`开始更新分类排序，用户ID: ${userId}, 分类类型: ${type}, 分类IDs: ${categoryIds.join(', ')}`);

      await this.categoryService.updateCategoryOrder(userId, categoryIds, type);
      console.log('分类排序更新成功');
      res.status(200).json({ message: '分类排序更新成功' });
    } catch (error) {
      console.error('更新分类排序时发生错误:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新分类排序时发生错误' });
      }
    }
  }
}
