import { Request, Response } from 'express';
import { TagService } from '../services/tag.service';
import { TransactionTagService } from '../services/transaction-tag.service';
import {
  CreateTagDto,
  UpdateTagDto,
  TagQueryParams,
  AddTransactionTagsDto,
  BatchTransactionTagsDto,
  TagSuggestionsQuery,
} from '../models/tag.model';

export class TagController {
  private tagService = new TagService();
  private transactionTagService = new TransactionTagService();

  /**
   * 获取账本标签列表
   */
  async getTags(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const params: TagQueryParams = {
        accountBookId: req.query.accountBookId as string,
        search: req.query.search as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as 'name' | 'usage' | 'created',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      if (!params.accountBookId) {
        res.status(400).json({ success: false, message: '账本ID不能为空' });
        return;
      }

      const result = await this.tagService.getTagsByAccountBook(params);
      res.status(200).json(result);
    } catch (error) {
      console.error('获取标签列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取标签列表失败',
      });
    }
  }

  /**
   * 获取标签详情
   */
  async getTagById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const { tagId } = req.params;
      const result = await this.tagService.getTagById(tagId);
      res.status(200).json(result);
    } catch (error) {
      console.error('获取标签详情失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取标签详情失败',
      });
    }
  }

  /**
   * 创建标签
   */
  async createTag(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const data: CreateTagDto = req.body;

      // 基础验证
      if (!data.name || !data.accountBookId) {
        res.status(400).json({ success: false, message: '标签名称和账本ID不能为空' });
        return;
      }

      const tag = await this.tagService.createTag(userId, data);
      res.status(201).json({
        success: true,
        data: tag,
        message: '标签创建成功',
      });
    } catch (error) {
      console.error('创建标签失败:', error);
      const statusCode = error instanceof Error && error.message.includes('已存在') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '创建标签失败',
      });
    }
  }

  /**
   * 更新标签
   */
  async updateTag(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const { tagId } = req.params;
      const data: UpdateTagDto = req.body;

      const tag = await this.tagService.updateTag(userId, tagId, data);
      res.status(200).json({
        success: true,
        data: tag,
        message: '标签更新成功',
      });
    } catch (error) {
      console.error('更新标签失败:', error);
      let statusCode = 400;
      if (error instanceof Error) {
        if (error.message.includes('不存在')) statusCode = 404;
        if (error.message.includes('权限')) statusCode = 403;
        if (error.message.includes('已存在')) statusCode = 409;
      }
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '更新标签失败',
      });
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const { tagId } = req.params;
      await this.tagService.deleteTag(userId, tagId);
      res.status(200).json({
        success: true,
        message: '标签删除成功',
      });
    } catch (error) {
      console.error('删除标签失败:', error);
      let statusCode = 400;
      if (error instanceof Error) {
        if (error.message.includes('不存在')) statusCode = 404;
        if (error.message.includes('权限')) statusCode = 403;
        if (error.message.includes('使用中')) statusCode = 409;
      }
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除标签失败',
      });
    }
  }

  /**
   * 获取交易记录的标签
   */
  async getTransactionTags(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const { transactionId } = req.params;
      const tags = await this.transactionTagService.getTransactionTags(transactionId);
      res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (error) {
      console.error('获取交易标签失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取交易标签失败',
      });
    }
  }

  /**
   * 为交易记录添加标签
   */
  async addTransactionTags(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const { transactionId } = req.params;
      const data: AddTransactionTagsDto = req.body;

      if (!data.tagIds || data.tagIds.length === 0) {
        res.status(400).json({ success: false, message: '标签ID不能为空' });
        return;
      }

      const result = await this.transactionTagService.addTransactionTags(userId, transactionId, data);
      res.status(200).json({
        success: true,
        data: result,
        message: '标签添加成功',
      });
    } catch (error) {
      console.error('添加交易标签失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '添加交易标签失败',
      });
    }
  }

  /**
   * 移除交易记录的标签
   */
  async removeTransactionTag(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const { transactionId, tagId } = req.params;
      await this.transactionTagService.removeTransactionTag(userId, transactionId, tagId);
      res.status(200).json({
        success: true,
        message: '标签移除成功',
      });
    } catch (error) {
      console.error('移除交易标签失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '移除交易标签失败',
      });
    }
  }

  /**
   * 批量操作交易标签
   */
  async batchOperateTransactionTags(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const data: BatchTransactionTagsDto = req.body;

      if (!data.transactionIds || data.transactionIds.length === 0) {
        res.status(400).json({ success: false, message: '交易记录ID不能为空' });
        return;
      }

      if (!data.tagIds || data.tagIds.length === 0) {
        res.status(400).json({ success: false, message: '标签ID不能为空' });
        return;
      }

      const result = await this.transactionTagService.batchOperateTransactionTags(userId, data);
      res.status(200).json(result);
    } catch (error) {
      console.error('批量操作交易标签失败:', error);
      res.status(422).json({
        success: false,
        message: error instanceof Error ? error.message : '批量操作交易标签失败',
      });
    }
  }

  /**
   * 获取标签建议
   */
  async getTagSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
      }

      const params: TagSuggestionsQuery = {
        accountBookId: req.query.accountBookId as string,
        transactionId: req.query.transactionId as string,
        categoryId: req.query.categoryId as string,
        description: req.query.description as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5,
      };

      if (!params.accountBookId) {
        res.status(400).json({ success: false, message: '账本ID不能为空' });
        return;
      }

      const result = await this.tagService.getTagSuggestions(userId, params);
      res.status(200).json(result);
    } catch (error) {
      console.error('获取标签建议失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取标签建议失败',
      });
    }
  }
}
