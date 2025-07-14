import { Request, Response } from 'express';
import { AICallLogAdminService, AICallLogListParams } from '../services/ai-call-log.admin.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AICallLogAdminController {
  private aiCallLogAdminService: AICallLogAdminService;

  constructor() {
    this.aiCallLogAdminService = new AICallLogAdminService();
  }

  /**
   * 获取统一的AI调用日志列表
   */
  async getAICallLogs(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 [AI调用日志控制器] 收到请求，查询参数:', JSON.stringify(req.query, null, 2));

      const {
        page,
        pageSize,
        userEmail,
        provider,
        model,
        isSuccess,
        accountBookId,
        aiServiceType,
        source,
        startDate,
        endDate,
        search,
      } = req.query;

      const params: AICallLogListParams = {
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
        userEmail: userEmail as string,
        provider: provider as string,
        model: model as string,
        isSuccess: isSuccess ? isSuccess === 'true' : undefined,
        accountBookId: accountBookId as string,
        aiServiceType: aiServiceType as 'llm' | 'speech' | 'vision',
        source: source as 'App' | 'WeChat' | 'API',
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      };

      const result = await this.aiCallLogAdminService.getAICallLogs(params);

      console.log('🔍 [AI调用日志控制器] 服务返回结果:', {
        logsCount: Array.isArray(result.logs) ? result.logs.length : 0,
        pagination: result.pagination,
        firstLogSample: Array.isArray(result.logs) && result.logs.length > 0 ? {
          id: (result.logs[0] as any).id,
          user_name: (result.logs[0] as any).user_name,
          user_email: (result.logs[0] as any).user_email,
          provider: (result.logs[0] as any).provider,
          model: (result.logs[0] as any).model
        } : null
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取AI调用日志列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取AI调用日志列表失败',
      });
    }
  }

  /**
   * 获取AI调用统计数据
   */
  async getAICallLogStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const statistics = await this.aiCallLogAdminService.getAICallLogStatistics({
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      console.error('获取AI调用统计错误:', error);
      res.status(500).json({
        success: false,
        message: '获取AI调用统计失败',
      });
    }
  }

  /**
   * 获取单个AI调用日志详情
   */
  async getAICallLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { logType } = req.query;

      if (!logType || (logType !== 'llm' && logType !== 'multimodal')) {
        res.status(400).json({
          success: false,
          message: '无效的日志类型，支持: llm, multimodal',
        });
        return;
      }

      const log = await this.aiCallLogAdminService.getAICallLogById(id, logType as 'llm' | 'multimodal');

      if (!log) {
        res.status(404).json({
          success: false,
          message: '日志记录不存在',
        });
        return;
      }

      res.json({
        success: true,
        data: { log },
      });
    } catch (error) {
      console.error('获取AI调用日志详情错误:', error);
      res.status(500).json({
        success: false,
        message: '获取AI调用日志详情失败',
      });
    }
  }

  /**
   * 导出AI调用日志
   */
  async exportAICallLogs(req: Request, res: Response): Promise<void> {
    try {
      const { userEmail, provider, model, isSuccess, accountBookId, aiServiceType, source, startDate, endDate, search } =
        req.query;

      const params: AICallLogListParams = {
        userEmail: userEmail as string,
        provider: provider as string,
        model: model as string,
        isSuccess: isSuccess ? isSuccess === 'true' : undefined,
        accountBookId: accountBookId as string,
        aiServiceType: aiServiceType as 'llm' | 'speech' | 'vision',
        source: source as 'App' | 'WeChat' | 'API',
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      };

      const result = await this.aiCallLogAdminService.getAICallLogs(params);

      // 设置响应头
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=ai-call-logs-${new Date().toISOString().split('T')[0]}.json`,
      );

      res.json({
        success: true,
        data: {
          logs: result.logs,
          exportedAt: new Date().toISOString(),
          totalRecords: result.pagination.total,
          filters: params,
        },
      });
    } catch (error) {
      console.error('导出AI调用日志错误:', error);
      res.status(500).json({
        success: false,
        message: '导出AI调用日志失败',
      });
    }
  }

  /**
   * 清理过期的AI调用日志
   */
  async cleanupAICallLogs(req: Request, res: Response): Promise<void> {
    try {
      const { days = 90 } = req.query;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days as string));

      const [llmDeleted, multimodalDeleted] = await Promise.all([
        prisma.llmCallLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
        prisma.multimodalAiCallLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          deletedLLMLogs: llmDeleted.count,
          deletedMultimodalLogs: multimodalDeleted.count,
          totalDeleted: llmDeleted.count + multimodalDeleted.count,
          cutoffDate: cutoffDate.toISOString(),
        },
      });
    } catch (error) {
      console.error('清理AI调用日志错误:', error);
      res.status(500).json({
        success: false,
        message: '清理AI调用日志失败',
      });
    }
  }
}
