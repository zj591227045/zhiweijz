import { Request, Response } from 'express';
import { SystemConfigService } from '../services/system-config.service';
import { TokenUsageService } from '../services/token-usage.service';

export class SystemConfigController {
  private systemConfigService: SystemConfigService;
  private tokenUsageService: TokenUsageService;

  constructor() {
    this.systemConfigService = new SystemConfigService();
    this.tokenUsageService = new TokenUsageService();
  }

  /**
   * 获取全局AI配置
   */
  async getGlobalAIConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.systemConfigService.getGlobalAIConfig();

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('获取全局AI配置错误:', error);
      res.status(500).json({
        success: false,
        message: '获取全局AI配置失败'
      });
    }
  }

  /**
   * 获取AI服务状态
   */
  async getAIServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.systemConfigService.getAIServiceStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('获取AI服务状态错误:', error);
      res.status(500).json({
        success: false,
        message: '获取AI服务状态失败'
      });
    }
  }

  /**
   * 获取当前用户TOKEN使用量统计
   */
  async getTokenUsage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const usage = await this.tokenUsageService.getUserTokenUsage(userId, {
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('获取TOKEN使用量错误:', error);
      res.status(500).json({
        success: false,
        message: '获取TOKEN使用量失败'
      });
    }
  }

  /**
   * 获取今日TOKEN使用量
   */
  async getTodayTokenUsage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const usage = await this.tokenUsageService.getTodayTokenUsage(userId);

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('获取今日TOKEN使用量错误:', error);
      res.status(500).json({
        success: false,
        message: '获取今日TOKEN使用量失败'
      });
    }
  }

  /**
   * 更新全局AI配置
   */
  async updateGlobalAIConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      const updatedConfig = await this.systemConfigService.updateGlobalAIConfig(config);

      res.json({
        success: true,
        data: updatedConfig
      });
    } catch (error) {
      console.error('更新全局AI配置错误:', error);
      res.status(500).json({
        success: false,
        message: '更新全局AI配置失败'
      });
    }
  }

  /**
   * 切换AI服务类型
   */
  async switchAIServiceType(req: Request, res: Response): Promise<void> {
    try {
      const { serviceType, serviceId, accountId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const result = await this.systemConfigService.switchAIServiceType(
        userId,
        serviceType,
        serviceId,
        accountId
      );

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('切换AI服务类型错误:', error);
      res.status(500).json({
        success: false,
        message: '切换AI服务类型失败'
      });
    }
  }

  /**
   * 测试AI服务连接
   */
  async testAIServiceConnection(req: Request, res: Response): Promise<void> {
    try {
      const { serviceType, serviceId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const startTime = Date.now();
      const result = await this.systemConfigService.testAIServiceConnection(
        userId,
        serviceType,
        serviceId
      );
      const responseTime = Date.now() - startTime;

      res.json({
        success: result.success,
        message: result.message,
        responseTime
      });
    } catch (error) {
      console.error('测试AI服务连接错误:', error);
      res.status(500).json({
        success: false,
        message: '测试AI服务连接失败'
      });
    }
  }
}
