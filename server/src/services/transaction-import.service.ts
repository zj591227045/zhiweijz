import { TransactionType } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from '../models/transaction.model';
import { parse as csvParse } from 'csv-parse/sync';

/**
 * 交易导入格式
 */
export enum ImportFormat {
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 交易导入结果
 */
export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 交易导入服务
 */
export class TransactionImportService {
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;
  private transactionService: TransactionService;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
    this.transactionService = new TransactionService();
  }

  /**
   * 导入交易记录
   * @param userId 用户ID
   * @param fileContent 文件内容
   * @param format 导入格式
   * @returns 导入结果
   */
  async importTransactions(
    userId: string,
    fileContent: string,
    format: ImportFormat,
  ): Promise<ImportResult> {
    // 解析文件内容
    const records =
      format === ImportFormat.CSV ? this.parseCsv(fileContent) : this.parseJson(fileContent);

    // 获取所有分类
    const categories = await this.categoryRepository.findByUserId(userId);
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

    // 导入结果
    const result: ImportResult = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    // 逐条导入交易记录
    for (const record of records) {
      try {
        // 验证必填字段
        if (!record.amount || !record.type || !record.category || !record.date) {
          throw new Error('缺少必填字段：金额、类型、分类或日期');
        }

        // 查找分类
        const categoryName = record.category.toLowerCase();
        const category = categoryMap.get(categoryName);
        if (!category) {
          throw new Error(`分类 "${record.category}" 不存在`);
        }

        // 验证交易类型
        const type = record.type.toUpperCase();
        if (type !== 'INCOME' && type !== 'EXPENSE') {
          throw new Error(`无效的交易类型: ${record.type}`);
        }

        // 验证交易类型与分类类型是否匹配
        if (category.type !== type) {
          throw new Error(`交易类型 ${type} 与分类类型 ${category.type} 不匹配`);
        }

        // 创建交易记录
        const transactionData: CreateTransactionDto = {
          amount: parseFloat(record.amount),
          type: type as TransactionType,
          categoryId: category.id,
          description: record.description || '',
          date: new Date(record.date),
        };

        // 保存交易记录 - 使用交易服务来确保正确设置家庭相关字段
        await this.transactionService.createTransaction(userId, transactionData);
        result.success++;
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        result.errors.push(`行 ${records.indexOf(record) + 1}: ${errorMessage}`);
      }
    }

    return result;
  }

  /**
   * 解析CSV文件内容
   * @param content CSV文件内容
   * @returns 解析后的记录
   */
  private parseCsv(content: string): any[] {
    // 解析CSV
    const records = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // 标准化字段名
    return records.map((record: any) => this.normalizeRecord(record));
  }

  /**
   * 解析JSON文件内容
   * @param content JSON文件内容
   * @returns 解析后的记录
   */
  private parseJson(content: string): any[] {
    try {
      // 解析JSON
      const records = JSON.parse(content);

      // 确保是数组
      if (!Array.isArray(records)) {
        throw new Error('JSON内容必须是数组');
      }

      // 标准化字段名
      return records.map((record: any) => this.normalizeRecord(record));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`JSON解析错误: ${errorMessage}`);
    }
  }

  /**
   * 标准化记录字段名
   * @param record 原始记录
   * @returns 标准化后的记录
   */
  private normalizeRecord(record: any): any {
    const normalized: any = {};

    // 遍历记录的所有字段
    for (const [key, value] of Object.entries(record)) {
      // 转换字段名为小写
      const lowerKey = key.toLowerCase();

      // 根据字段名映射
      if (lowerKey === 'amount' || lowerKey === '金额') {
        normalized.amount = value;
      } else if (lowerKey === 'type' || lowerKey === '类型') {
        normalized.type = value;
      } else if (lowerKey === 'category' || lowerKey === '分类') {
        normalized.category = value;
      } else if (lowerKey === 'description' || lowerKey === '描述') {
        normalized.description = value;
      } else if (lowerKey === 'date' || lowerKey === '日期') {
        normalized.date = value;
      } else {
        // 保留其他字段
        normalized[lowerKey] = value;
      }
    }

    return normalized;
  }
}
