import { TransactionType } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionQueryParams } from '../models/transaction.model';
import { createObjectCsvStringifier } from 'csv-writer';

/**
 * 交易导出格式
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 交易导出服务
 */
export class TransactionExportService {
  private transactionRepository: TransactionRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  /**
   * 导出交易记录
   * @param userId 用户ID
   * @param params 查询参数
   * @param format 导出格式
   * @returns 导出的数据
   */
  async exportTransactions(
    userId: string,
    params: TransactionQueryParams,
    format: ExportFormat
  ): Promise<{ data: string; filename: string }> {
    // 获取交易记录（已包含分类信息）
    const { transactions } = await this.transactionRepository.findAll(userId, {
      ...params,
      page: 1,
      limit: 1000, // 限制导出数量
    });

    // 准备导出数据
    const exportData = transactions.map(transaction => {
      return {
        id: transaction.id,
        amount: Number(transaction.amount),
        type: transaction.type === 'INCOME' ? '收入' : '支出',
        category: transaction.category?.name || '未分类',
        description: transaction.description || '',
        date: transaction.date.toISOString().split('T')[0],
        createdAt: transaction.createdAt.toISOString().replace('T', ' ').split('.')[0],
      };
    });

    // 根据格式导出
    if (format === ExportFormat.CSV) {
      return this.exportToCsv(exportData);
    } else {
      return this.exportToJson(exportData);
    }
  }

  /**
   * 导出为CSV
   * @param data 数据
   * @returns CSV字符串和文件名
   */
  private exportToCsv(data: any[]): { data: string; filename: string } {
    // 创建CSV字符串生成器
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'amount', title: '金额' },
        { id: 'type', title: '类型' },
        { id: 'category', title: '分类' },
        { id: 'description', title: '描述' },
        { id: 'date', title: '日期' },
        { id: 'createdAt', title: '创建时间' },
      ],
    });

    // 生成CSV字符串
    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);

    // 添加BOM以支持中文编码
    const csvWithBOM = '\uFEFF' + csvString;

    // 生成文件名
    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;

    return { data: csvWithBOM, filename };
  }

  /**
   * 导出为JSON
   * @param data 数据
   * @returns JSON字符串和文件名
   */
  private exportToJson(data: any[]): { data: string; filename: string } {
    // 生成JSON字符串
    const jsonString = JSON.stringify(data, null, 2);

    // 生成文件名
    const filename = `transactions_${new Date().toISOString().split('T')[0]}.json`;

    return { data: jsonString, filename };
  }
}
