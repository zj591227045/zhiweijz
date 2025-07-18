import { Request, Response } from 'express';
import { StatisticsService } from '../services/statistics.service';
import { validateDateRangeQuery, validateMonthQuery } from '../validators/statistics.validator';

/**
 * 统计控制器
 */
export class StatisticsController {
  private statisticsService: StatisticsService;

  constructor() {
    this.statisticsService = new StatisticsService();
  }

  /**
   * 获取支出统计
   */
  async getExpenseStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证查询参数
      const { error, value } = validateDateRangeQuery(req.query);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 解析查询参数
      const startDate = value.startDate
        ? new Date(value.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = value.endDate ? new Date(value.endDate) : new Date();
      const groupBy = (value.groupBy || 'day') as 'day' | 'week' | 'month' | 'category';
      const familyId = value.familyId;
      const accountBookId = value.accountBookId;

      // 获取支出统计
      try {
        const statistics = await this.statisticsService.getExpenseStatistics(
          userId,
          startDate,
          endDate,
          groupBy,
          familyId,
          accountBookId,
        );
        res.status(200).json(statistics);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭数据') {
          res.status(403).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('获取支出统计失败:', error);
      res.status(500).json({ message: '获取支出统计失败' });
    }
  }

  /**
   * 获取收入统计
   */
  async getIncomeStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证查询参数
      const { error, value } = validateDateRangeQuery(req.query);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 解析查询参数
      const startDate = value.startDate
        ? new Date(value.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = value.endDate ? new Date(value.endDate) : new Date();
      const groupBy = (value.groupBy || 'day') as 'day' | 'week' | 'month' | 'category';
      const familyId = value.familyId;
      const accountBookId = value.accountBookId;

      // 获取收入统计
      try {
        const statistics = await this.statisticsService.getIncomeStatistics(
          userId,
          startDate,
          endDate,
          groupBy,
          familyId,
          accountBookId,
        );
        res.status(200).json(statistics);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭数据') {
          res.status(403).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('获取收入统计失败:', error);
      res.status(500).json({ message: '获取收入统计失败' });
    }
  }

  /**
   * 获取预算执行情况
   */
  async getBudgetStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      console.log('预算统计请求参数:', {
        userId,
        query: req.query,
        headers: req.headers,
      });

      // 验证查询参数
      const { error, value } = validateMonthQuery(req.query);
      if (error) {
        console.error('预算统计参数验证失败:', error.details[0].message);
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 解析查询参数
      const month =
        value.month ||
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const familyId = value.familyId;
      const accountBookId = value.accountBookId;

      console.log('预算统计处理参数:', {
        userId,
        month,
        familyId,
        accountBookId,
      });

      // 获取预算执行情况
      try {
        const statistics = await this.statisticsService.getBudgetStatistics(
          userId,
          month,
          familyId,
          accountBookId,
        );
        console.log('预算统计成功返回');
        res.status(200).json(statistics);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭数据') {
          console.error('预算统计权限错误:', error.message);
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '无权访问此账本') {
          console.error('预算统计账本权限错误:', error.message);
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message.includes('无效的月份格式')) {
          console.error('预算统计月份格式错误:', error.message);
          res.status(400).json({ message: error.message });
        } else {
          console.error('预算统计未处理错误:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('获取预算执行情况失败:', error);
      res.status(500).json({ message: '获取预算执行情况失败' });
    }
  }

  /**
   * 获取财务概览
   */
  async getFinancialOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证查询参数
      const { error, value } = validateDateRangeQuery(req.query);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 解析查询参数
      const startDate = value.startDate
        ? new Date(value.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = value.endDate ? new Date(value.endDate) : new Date();
      const groupBy = (value.groupBy || 'day') as 'day' | 'week' | 'month' | 'category';
      const familyId = value.familyId;
      const accountBookId = value.accountBookId;
      const budgetId = value.budgetId;
      const budgetIds = value.budgetIds
        ? Array.isArray(value.budgetIds)
          ? value.budgetIds
          : [value.budgetIds]
        : undefined;
      const type = value.type;
      const categoryIds = value.categoryIds ? value.categoryIds.split(',') : undefined;
      const tagIds = value.tagIds
        ? Array.isArray(value.tagIds)
          ? value.tagIds
          : [value.tagIds]
        : undefined;

      // 获取财务概览
      try {
        const overview = await this.statisticsService.getFinancialOverview(
          userId,
          startDate,
          endDate,
          groupBy,
          familyId,
          accountBookId,
          budgetId,
          type,
          categoryIds,
          tagIds,
          budgetIds,
        );
        res.status(200).json(overview);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭数据') {
          res.status(403).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('获取财务概览失败:', error);
      res.status(500).json({ message: '获取财务概览失败' });
    }
  }

  /**
   * 获取按标签统计
   */
  async getTagStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证查询参数
      const { error, value } = validateDateRangeQuery(req.query);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 解析查询参数
      const startDate = value.startDate
        ? new Date(value.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = value.endDate ? new Date(value.endDate) : new Date();
      const accountBookId = value.accountBookId;
      const tagIds = value.tagIds
        ? Array.isArray(value.tagIds)
          ? value.tagIds
          : [value.tagIds]
        : undefined;
      const transactionType = value.type as 'income' | 'expense' | undefined;
      const categoryIds = value.categoryIds ? value.categoryIds.split(',') : undefined;

      if (!accountBookId) {
        res.status(400).json({ message: '账本ID是必需的' });
        return;
      }

      // 获取标签统计
      try {
        const statistics = await this.statisticsService.getTagStatistics(
          userId,
          accountBookId,
          startDate,
          endDate,
          tagIds,
          transactionType,
          categoryIds,
        );
        res.status(200).json(statistics);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此账本') {
          res.status(403).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('获取标签统计失败:', error);
      res.status(500).json({ message: '获取标签统计失败' });
    }
  }

  /**
   * 检查是否存在无预算交易
   */
  async checkUnbudgetedTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证查询参数
      const { error, value } = validateDateRangeQuery(req.query);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 解析查询参数
      const startDate = value.startDate
        ? new Date(value.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = value.endDate ? new Date(value.endDate) : new Date();
      const familyId = value.familyId;
      const accountBookId = value.accountBookId;

      // 检查是否存在无预算交易
      try {
        const hasUnbudgeted = await this.statisticsService.hasUnbudgetedTransactions(
          userId,
          startDate,
          endDate,
          familyId,
          accountBookId,
        );
        res.status(200).json({ hasUnbudgetedTransactions: hasUnbudgeted });
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭数据') {
          res.status(403).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('检查无预算交易失败:', error);
      res.status(500).json({ message: '检查无预算交易失败' });
    }
  }
}
