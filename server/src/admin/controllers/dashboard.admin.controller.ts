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
        data: overview
      });
    } catch (error) {
      console.error('获取仪表盘概览数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取仪表盘数据失败'
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
        data: userStats
      });
    } catch (error) {
      console.error('获取用户统计数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户统计数据失败'
      });
    }
  }

  /**
   * 获取交易统计数据
   */
  async getTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      const transactionStats = await this.dashboardService.getTransactionStats(period as string);

      res.json({
        success: true,
        data: transactionStats
      });
    } catch (error) {
      console.error('获取交易统计数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取交易统计数据失败'
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
        data: resources
      });
    } catch (error) {
      console.error('获取系统资源数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取系统资源数据失败'
      });
    }
  }
} 