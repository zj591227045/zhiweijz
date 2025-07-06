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
   * 创建交易记录
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
        res.status(500).json({ message: '创建交易记录时发生错误' });
      }
    }
  }

  /**
   * 获取交易记录列表
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
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

      const transactions = await this.transactionService.getTransactions(userId, params);
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: '获取交易记录列表时发生错误' });
    }
  }

  /**
   * 获取单个交易记录
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const transactionId = req.params.id;
      const transaction = await this.transactionService.getTransactionById(transactionId, userId);
      res.status(200).json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取交易记录时发生错误' });
      }
    }
  }

  /**
   * 更新交易记录
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
        res.status(500).json({ message: '更新交易记录时发生错误' });
      }
    }
  }

  /**
   * 删除交易记录
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
        res.status(500).json({ message: '删除交易记录时发生错误' });
      }
    }
  }

  /**
   * 获取交易统计
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
      res.status(500).json({ message: '获取交易统计时发生错误' });
    }
  }

  /**
   * 获取交易列表和统计信息
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

      // 获取交易列表和统计信息
      const result = await this.transactionService.getTransactionsWithStatistics(userId, params);
      res.status(200).json(result);
    } catch (error) {
      console.error('获取交易列表和统计信息时发生错误:', error);
      res.status(500).json({ message: '获取交易列表和统计信息时发生错误' });
    }
  }

  /**
   * 导出交易记录
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

      // 导出交易记录
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
        res.status(500).json({ message: '导出交易记录时发生错误' });
      }
    }
  }

  /**
   * 导入交易记录
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

      // 导入交易记录
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
        res.status(500).json({ message: '导入交易记录时发生错误' });
      }
    }
  }
}
