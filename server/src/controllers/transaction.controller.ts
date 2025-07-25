import { Request, Response } from 'express';
import { TransactionType } from '@prisma/client';
import { TransactionService } from '../services/transaction.service';
import { TransactionExportService, ExportFormat } from '../services/transaction-export.service';
import { TransactionImportService, ImportFormat } from '../services/transaction-import.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryParams,
  TransactionExportFormat,
  TransactionExportRequestDto,
  TransactionImportRequestDto,
} from '../models/transaction.model';

export class TransactionController {
  private transactionService: TransactionService;
  private transactionExportService: TransactionExportService;
  private transactionImportService: TransactionImportService;

  constructor() {
    this.transactionService = new TransactionService();
    this.transactionExportService = new TransactionExportService();
    this.transactionImportService = new TransactionImportService();
  }

  /**
   * 创建记账记录
   */
  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const transactionData: CreateTransactionDto = {
        ...req.body,
        date: new Date(req.body.date),
      };

      const transaction = await this.transactionService.createTransaction(userId, transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建记账记录时发生错误' });
      }
    }
  }

  /**
   * 获取记账记录列表
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 解析查询参数
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      // 处理日期参数，确保查询整天的数据
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        startDate.setHours(0, 0, 0, 0); // 设置为当天开始
      }
      
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999); // 设置为当天结束
      }

      const params: TransactionQueryParams = {
        type: req.query.type as TransactionType | undefined,
        startDate,
        endDate,
        categoryId: req.query.categoryId as string | undefined,
        categoryIds: req.query.categoryIds
          ? (req.query.categoryIds as string).split(',')
          : undefined,
        familyId: req.query.familyId as string | undefined,
        familyMemberId: req.query.familyMemberId as string | undefined,
        accountBookId: req.query.accountBookId as string | undefined,
        budgetId: req.query.budgetId as string | undefined,
        search: req.query.search as string | undefined, // 添加搜索参数解析
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const includeAttachments = req.query.includeAttachments === 'true';
      const result = await this.transactionService.getTransactions(userId, params);

      // 如果需要包含附件信息
      if (includeAttachments && result.data) {
        for (const transaction of result.data) {
          try {
            const attachments = await this.transactionService.getTransactionAttachments(transaction.id, userId);
            (transaction as any).attachments = attachments;
            (transaction as any).attachmentCount = attachments.length;
          } catch (error) {
            // 如果获取附件失败，不影响主要数据
            (transaction as any).attachments = [];
            (transaction as any).attachmentCount = 0;
          }
        }
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: '获取记账记录列表时发生错误' });
    }
  }

  /**
   * 获取单个记账记录
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const transactionId = req.params.id;
      const includeAttachments = req.query.includeAttachments === 'true';

      const transaction = await this.transactionService.getTransactionById(transactionId, userId);

      // 如果需要包含附件信息
      if (includeAttachments) {
        const attachments = await this.transactionService.getTransactionAttachments(transactionId, userId);
        (transaction as any).attachments = attachments;
        (transaction as any).attachmentCount = attachments.length;
      }

      res.status(200).json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取记账记录时发生错误' });
      }
    }
  }

  /**
   * 更新记账记录
   */
  async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const transactionId = req.params.id;
      const transactionData: UpdateTransactionDto = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };

      const transaction = await this.transactionService.updateTransaction(
        transactionId,
        userId,
        transactionData,
      );
      res.status(200).json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新记账记录时发生错误' });
      }
    }
  }

  /**
   * 删除记账记录
   */
  async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const transactionId = req.params.id;
      await this.transactionService.deleteTransaction(transactionId, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '删除记账记录时发生错误' });
      }
    }
  }

  /**
   * 获取按条件分组的记账记录
   */
  async getGroupedTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 解析查询参数
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      // 处理日期参数，确保查询整天的数据
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        startDate.setHours(0, 0, 0, 0); // 设置为当天开始
      }
      
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999); // 设置为当天结束
      }

      const params: TransactionQueryParams = {
        type: req.query.type as TransactionType | undefined,
        startDate,
        endDate,
        categoryId: req.query.categoryId as string | undefined,
        categoryIds: req.query.categoryIds
          ? (req.query.categoryIds as string).split(',')
          : undefined,
        familyId: req.query.familyId as string | undefined,
        familyMemberId: req.query.familyMemberId as string | undefined,
        accountBookId: req.query.accountBookId as string | undefined,
        budgetId: req.query.budgetId as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 1000, // 分组查询使用较大的限制
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      // 获取分组方式 - 当前只支持按日期分组
      const groupBy = req.query.groupBy as string || 'date';
      
      if (groupBy !== 'date') {
        res.status(400).json({ message: '目前只支持按日期分组' });
        return;
      }

      // 检查是否需要包含附件信息
      const includeAttachments = req.query.includeAttachments === 'true';

      // 获取记账记录
      const result = await this.transactionService.getTransactions(userId, params);
      
      // 按日期分组处理
      const transactions = result.data || [];

      // 如果需要包含附件信息
      if (includeAttachments && transactions.length > 0) {
        for (const transaction of transactions) {
          try {
            const attachments = await this.transactionService.getTransactionAttachments(transaction.id, userId);
            (transaction as any).attachments = attachments;
            (transaction as any).attachmentCount = attachments.length;
          } catch (error) {
            // 如果获取附件失败，不影响主要数据
            (transaction as any).attachments = [];
            (transaction as any).attachmentCount = 0;
          }
        }
      }
      
      // 返回分组后的记账数据
      res.status(200).json({
        data: transactions,
        total: result.total,
        page: result.page,
        limit: result.limit,
        groupBy: groupBy
      });
    } catch (error) {
      console.error('获取分组记账记录失败:', error);
      res.status(500).json({ message: '获取分组记账记录时发生错误' });
    }
  }

  /**
   * 获取记账统计
   */
  async getTransactionStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const type = (req.query.type as TransactionType) || TransactionType.EXPENSE;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const statistics = await this.transactionService.getTransactionStatistics(
        userId,
        type,
        startDate,
        endDate,
      );
      res.status(200).json(statistics);
    } catch (error) {
      res.status(500).json({ message: '获取记账统计时发生错误' });
    }
  }

  /**
   * 获取记账列表和统计信息
   * 支持根据时间、收入支出、分类进行过滤后再统计
   */
  async getTransactionsWithStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 解析查询参数
      const params: TransactionQueryParams = {
        type: req.query.type as TransactionType | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        categoryId: req.query.categoryId as string | undefined,
        categoryIds: req.query.categoryIds
          ? (req.query.categoryIds as string).split(',')
          : undefined,
        familyId: req.query.familyId as string | undefined,
        familyMemberId: req.query.familyMemberId as string | undefined,
        accountBookId: req.query.accountBookId as string | undefined,
        budgetId: req.query.budgetId as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      // 处理分类ID数组
      if (req.query.categoryIds) {
        const categoryIds = (req.query.categoryIds as string).split(',');
        if (categoryIds.length > 0) {
          // 如果有多个分类ID，使用OR条件
          params.categoryIds = categoryIds;
        }
      }

      // 检查是否需要包含附件信息
      const includeAttachments = req.query.includeAttachments === 'true';

      // 获取记账列表和统计信息
      const result = await this.transactionService.getTransactionsWithStatistics(userId, params);

      // 如果需要包含附件信息且有记账数据
      if (includeAttachments && result.transactions && result.transactions.data && result.transactions.data.length > 0) {
        for (const transaction of result.transactions.data) {
          try {
            const attachments = await this.transactionService.getTransactionAttachments(transaction.id, userId);
            (transaction as any).attachments = attachments;
            (transaction as any).attachmentCount = attachments.length;
          } catch (error) {
            // 如果获取附件失败，不影响主要数据
            (transaction as any).attachments = [];
            (transaction as any).attachmentCount = 0;
          }
        }
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('获取记账列表和统计信息时发生错误:', error);
      res.status(500).json({ message: '获取记账列表和统计信息时发生错误' });
    }
  }

  /**
   * 导出记账记录
   */
  async exportTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const exportData: TransactionExportRequestDto = req.body;

      // 验证导出格式
      if (!Object.values(TransactionExportFormat).includes(exportData.format)) {
        res.status(400).json({ message: '无效的导出格式' });
        return;
      }

      // 准备查询参数
      const params: TransactionQueryParams = {
        type: exportData.type,
        startDate: exportData.startDate ? new Date(exportData.startDate) : undefined,
        endDate: exportData.endDate ? new Date(exportData.endDate) : undefined,
        categoryId: exportData.categoryId,
        accountBookId: req.query.accountBookId as string | undefined,
      };

      // 导出记账记录
      const format =
        exportData.format === TransactionExportFormat.CSV ? ExportFormat.CSV : ExportFormat.JSON;
      const result = await this.transactionExportService.exportTransactions(userId, params, format);

      // 设置响应头
      res.setHeader('Content-Type', format === ExportFormat.CSV ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);

      // 返回导出数据
      res.status(200).send(result.data);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '导出记账记录时发生错误' });
      }
    }
  }

  /**
   * 导入记账记录
   */
  async importTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const importData: TransactionImportRequestDto = req.body;

      // 验证导入格式
      if (!Object.values(TransactionExportFormat).includes(importData.format)) {
        res.status(400).json({ message: '无效的导入格式' });
        return;
      }

      // 验证文件内容
      if (!importData.fileContent) {
        res.status(400).json({ message: '文件内容不能为空' });
        return;
      }

      // 导入记账记录
      const format =
        importData.format === TransactionExportFormat.CSV ? ImportFormat.CSV : ImportFormat.JSON;
      const result = await this.transactionImportService.importTransactions(
        userId,
        importData.fileContent,
        format,
      );

      // 返回导入结果
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '导入记账记录时发生错误' });
      }
    }
  }
}
