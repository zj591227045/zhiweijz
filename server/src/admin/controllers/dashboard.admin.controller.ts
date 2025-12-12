import { logger } from '../../utils/logger';
import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class AdminDashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * 获取仪表盘概览数据
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.dashboardService.getOverviewStats();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error('获取仪表盘概览数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取仪表盘数据失败',
      });
    }
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      const userStats = await this.dashboardService.getUserStats(period as string);

      res.json({
        success: true,
        data: userStats,
      });
    } catch (error) {
      logger.error('获取用户统计数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户统计数据失败',
      });
    }
  }

  /**
   * 获取记账统计数据
   */
  async getTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      const transactionStats = await this.dashboardService.getTransactionStats(period as string);

      res.json({
        success: true,
        data: transactionStats,
      });
    } catch (error) {
      logger.error('获取记账统计数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取记账统计数据失败',
      });
    }
  }

  /**
   * 获取系统资源使用情况
   */
  async getSystemResources(req: Request, res: Response): Promise<void> {
    try {
      const resources = await this.dashboardService.getSystemResources();

      res.json({
        success: true,
        data: resources,
      });
    } catch (error) {
      logger.error('获取系统资源数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取系统资源数据失败',
      });
    }
  }

  /**
   * 获取系统性能历史数据
   */
  async getPerformanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { metricType, timeRange } = req.query;

      // 验证参数
      if (!metricType || !['disk', 'cpu', 'memory'].includes(metricType as string)) {
        res.status(400).json({
          success: false,
          message: '无效的指标类型，必须是 disk、cpu 或 memory',
        });
        return;
      }

      if (!timeRange || !['hour', 'day', 'week', '30days'].includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: '无效的时间范围，必须是 hour、day、week 或 30days',
        });
        return;
      }

      const data = await this.dashboardService.getPerformanceHistory(
        metricType as 'disk' | 'cpu' | 'memory',
        timeRange as 'hour' | 'day' | 'week' | '30days',
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('获取性能历史数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取性能历史数据失败',
      });
    }
  }

  /**
   * 获取所有性能历史数据
   */
  async getAllPerformanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = 'day' } = req.query;

      if (!['hour', 'day', 'week', '30days'].includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: '无效的时间范围，必须是 hour、day、week 或 30days',
        });
        return;
      }

      const data = await this.dashboardService.getAllPerformanceHistory(
        timeRange as 'hour' | 'day' | 'week' | '30days',
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('获取所有性能历史数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取所有性能历史数据失败',
      });
    }
  }

  /**
   * 获取性能统计信息
   */
  async getPerformanceStats(req: Request, res: Response): Promise<void> {
    try {
      const { metricType, hours = '24' } = req.query;

      if (!metricType || !['disk', 'cpu', 'memory'].includes(metricType as string)) {
        res.status(400).json({
          success: false,
          message: '无效的指标类型，必须是 disk、cpu 或 memory',
        });
        return;
      }

      const hoursNum = parseInt(hours as string);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        res.status(400).json({
          success: false,
          message: '无效的小时数',
        });
        return;
      }

      const data = await this.dashboardService.getPerformanceStats(
        metricType as 'disk' | 'cpu' | 'memory',
        hoursNum,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('获取性能统计信息错误:', error);
      res.status(500).json({
        success: false,
        message: '获取性能统计信息失败',
      });
    }
  }

  /**
   * 获取图表数据
   * @param req
   * @param res
   */
  async getChartData(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d', metrics = 'users,transactions,visits' } = req.query;
      const metricsArray = (metrics as string).split(',');

      const chartData: any = {};

      // 根据请求的指标获取对应数据
      if (metricsArray.includes('users')) {
        const userStats = await this.dashboardService.getUserStats(period as string);
        chartData.users = userStats.dailyRegistrations.map((item) => ({
          date: item.date,
          value: item.count,
        }));
      }

      if (metricsArray.includes('transactions')) {
        const transactionStats = await this.dashboardService.getTransactionStats(period as string);
        chartData.transactions = transactionStats.dailyTransactions.map((item) => ({
          date: item.date,
          value: item.count,
        }));
      }

      if (metricsArray.includes('visits')) {
        // 这里可以添加访问统计数据的获取逻辑
        // 暂时返回模拟数据
        chartData.visits = [];
      }

      res.json({
        success: true,
        data: chartData,
      });
    } catch (error) {
      logger.error('获取图表数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取图表数据失败',
      });
    }
  }
}
