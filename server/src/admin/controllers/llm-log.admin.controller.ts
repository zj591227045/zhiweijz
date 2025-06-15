import { Request, Response } from 'express';
import { LLMLogAdminService, LLMLogListParams } from '../services/llm-log.admin.service';

export class LLMLogAdminController {
  private llmLogAdminService: LLMLogAdminService;

  constructor() {
    this.llmLogAdminService = new LLMLogAdminService();
  }

  /**
   * 获取LLM调用日志列表
   */
  async getLLMLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        pageSize,
        userEmail,
        provider,
        model,
        isSuccess,
        accountBookId,
        serviceType,
        startDate,
        endDate,
        search
      } = req.query;

      const params: LLMLogListParams = {
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
        userEmail: userEmail as string,
        provider: provider as string,
        model: model as string,
        isSuccess: isSuccess ? isSuccess === 'true' : undefined,
        accountBookId: accountBookId as string,
        serviceType: serviceType as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string
      };

      const result = await this.llmLogAdminService.getLLMLogs(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取LLM调用日志列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取LLM调用日志列表失败'
      });
    }
  }

  /**
   * 获取LLM调用统计数据
   */
  async getLLMLogStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const statistics = await this.llmLogAdminService.getLLMLogStatistics({
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        data: { statistics }
      });
    } catch (error) {
      console.error('获取LLM调用统计错误:', error);
      res.status(500).json({
        success: false,
        message: '获取LLM调用统计失败'
      });
    }
  }

  /**
   * 获取单个LLM调用日志详情
   */
  async getLLMLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const log = await this.llmLogAdminService.getLLMLogById(id);

      if (!log) {
        res.status(404).json({
          success: false,
          message: 'LLM调用日志不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: { log }
      });
    } catch (error) {
      console.error('获取LLM调用日志详情错误:', error);
      res.status(500).json({
        success: false,
        message: '获取LLM调用日志详情失败'
      });
    }
  }

  /**
   * 删除LLM调用日志
   */
  async deleteLLMLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.llmLogAdminService.deleteLLMLog(id);

      res.json({
        success: true,
        message: 'LLM调用日志删除成功'
      });
    } catch (error) {
      console.error('删除LLM调用日志错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '删除LLM调用日志失败'
        });
      }
    }
  }

  /**
   * 批量删除LLM调用日志
   */
  async batchDeleteLLMLogs(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'ID列表不能为空'
        });
        return;
      }

      const result = await this.llmLogAdminService.batchDeleteLLMLogs(ids);

      res.json({
        success: true,
        data: result,
        message: `成功删除 ${result.deletedCount} 条LLM调用日志`
      });
    } catch (error) {
      console.error('批量删除LLM调用日志错误:', error);
      res.status(500).json({
        success: false,
        message: '批量删除LLM调用日志失败'
      });
    }
  }

  /**
   * 清理过期的LLM调用日志
   */
  async cleanupExpiredLogs(req: Request, res: Response): Promise<void> {
    try {
      const { retentionDays } = req.body;
      const days = retentionDays ? parseInt(retentionDays) : 90;

      const result = await this.llmLogAdminService.cleanupExpiredLogs(days);

      res.json({
        success: true,
        data: result,
        message: `成功清理 ${result.deletedCount} 条过期的LLM调用日志`
      });
    } catch (error) {
      console.error('清理过期LLM调用日志错误:', error);
      res.status(500).json({
        success: false,
        message: '清理过期LLM调用日志失败'
      });
    }
  }

  /**
   * 导出LLM调用日志
   */
  async exportLLMLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        userEmail,
        provider,
        model,
        isSuccess,
        accountBookId,
        startDate,
        endDate,
        search
      } = req.query;

      const params: LLMLogListParams = {
        userEmail: userEmail as string,
        provider: provider as string,
        model: model as string,
        isSuccess: isSuccess ? isSuccess === 'true' : undefined,
        accountBookId: accountBookId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string
      };

      const logs = await this.llmLogAdminService.exportLLMLogs(params);

      // 设置响应头
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=llm-logs-${new Date().toISOString().split('T')[0]}.json`);

      res.json({
        success: true,
        data: {
          logs,
          exportedAt: new Date().toISOString(),
          totalCount: logs.length
        }
      });
    } catch (error) {
      console.error('导出LLM调用日志错误:', error);
      res.status(500).json({
        success: false,
        message: '导出LLM调用日志失败'
      });
    }
  }
}