import { logger } from '../../utils/logger';
import { Request, Response } from 'express';
import { TokenLimitService } from '../../services/token-limit.service';
import { AppError } from '../../errors/AppError';

/**
 * 管理员Token限额管理控制器
 */
export class TokenLimitAdminController {
  private tokenLimitService: TokenLimitService;

  constructor() {
    this.tokenLimitService = new TokenLimitService();
  }

  /**
   * 获取全局LLM限额配置
   */
  async getGlobalSettings(req: Request, res: Response): Promise<void> {
    try {
      const limit = await this.tokenLimitService.getGlobalLlmTokenLimit();
      const isEnabled = await this.tokenLimitService.isTokenLimitEnabled();

      res.json({
        success: true,
        data: {
          globalLlmTokenLimit: limit,
          tokenLimitEnabled: isEnabled,
        },
      });
    } catch (error) {
      logger.error('获取全局LLM设置失败:', error);
      throw new AppError('获取LLM设置失败', 500);
    }
  }

  /**
   * 更新全局LLM限额配置
   */
  async updateGlobalSettings(req: Request, res: Response): Promise<void> {
    try {
      const { globalLlmTokenLimit, tokenLimitEnabled } = req.body;

      // 验证输入
      if (typeof globalLlmTokenLimit !== 'number' || globalLlmTokenLimit < 0) {
        throw new AppError('Token限额必须是非负数', 400);
      }

      if (typeof tokenLimitEnabled !== 'boolean') {
        throw new AppError('Token限额启用状态必须是布尔值', 400);
      }

      // 更新配置
      await this.tokenLimitService.setGlobalLlmTokenLimit(globalLlmTokenLimit);
      await this.tokenLimitService.setTokenLimitEnabled(tokenLimitEnabled);

      res.json({
        success: true,
        message: '全局LLM设置更新成功',
        data: {
          globalLlmTokenLimit,
          tokenLimitEnabled,
        },
      });
    } catch (error) {
      logger.error('更新全局LLM设置失败:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      throw new AppError('更新LLM设置失败', 500);
    }
  }

  /**
   * 获取用户Token限额设置
   */
  async getUserTokenLimits(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search } = req.query;

      const result = await this.tokenLimitService.getUsersWithTokenLimits({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('获取用户Token限额失败:', error);
      throw new AppError('获取用户Token限额失败', 500);
    }
  }

  /**
   * 设置用户Token限额
   */
  async setUserTokenLimit(req: Request, res: Response): Promise<void> {
    try {
      const { userId, dailyTokenLimit } = req.body;

      if (!userId) {
        throw new AppError('用户ID不能为空', 400);
      }

      if (typeof dailyTokenLimit !== 'number' || dailyTokenLimit < 0) {
        throw new AppError('Token限额必须是非负数', 400);
      }

      await this.tokenLimitService.setUserTokenLimit(userId, dailyTokenLimit);

      res.json({
        success: true,
        message: '用户Token限额设置成功',
      });
    } catch (error) {
      logger.error('设置用户Token限额失败:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      throw new AppError('设置用户Token限额失败', 500);
    }
  }

  /**
   * 批量设置用户Token限额
   */
  async batchSetUserTokenLimits(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, dailyTokenLimit } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('用户ID列表不能为空', 400);
      }

      if (typeof dailyTokenLimit !== 'number' || dailyTokenLimit < 0) {
        throw new AppError('Token限额必须是非负数', 400);
      }

      const result = await this.tokenLimitService.batchSetUserTokenLimits(userIds, dailyTokenLimit);

      res.json({
        success: true,
        message: `批量设置成功，共更新${result.count}个用户`,
        data: { count: result.count },
      });
    } catch (error) {
      logger.error('批量设置用户Token限额失败:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      throw new AppError('批量设置用户Token限额失败', 500);
    }
  }

  /**
   * 获取Token使用量趋势
   */
  async getTokenUsageTrends(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7 } = req.query;
      const numDays = parseInt(days as string);

      if (numDays < 1 || numDays > 90) {
        throw new AppError('天数范围必须在1-90之间', 400);
      }

      const trends = await this.tokenLimitService.getTokenUsageTrends(numDays);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      logger.error('获取Token使用量趋势失败:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      throw new AppError('获取Token使用量趋势失败', 500);
    }
  }
}
