import { logger } from '../../utils/logger';
import { Request, Response } from 'express';
import { ScheduledTaskAdminService } from '../services/scheduled-task.admin.service';

interface AdminRequest extends Request {
  admin?: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * 计划任务管理控制器
 */
export class ScheduledTaskAdminController {
  private scheduledTaskService: ScheduledTaskAdminService;

  constructor() {
    this.scheduledTaskService = new ScheduledTaskAdminService();
  }

  /**
   * 获取任务列表
   */
  async getTaskList(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, isEnabled, search } = req.query;

      const result = await this.scheduledTaskService.getTaskList({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        isEnabled: isEnabled === 'true' ? true : isEnabled === 'false' ? false : undefined,
        search: search as string
      });

      res.json({
        success: true,
        data: result.tasks,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (error) {
      logger.error('[计划任务控制器] 获取任务列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取任务列表失败'
      });
    }
  }

  /**
   * 获取任务详情
   */
  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await this.scheduledTaskService.getTaskById(id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: '任务不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('[计划任务控制器] 获取任务详情失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取任务详情失败'
      });
    }
  }

  /**
   * 创建任务
   */
  async createTask(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { name, description, scriptType, scriptPath, cronExpression, isEnabled } = req.body;

      if (!name || !scriptType || !scriptPath || !cronExpression) {
        res.status(400).json({
          success: false,
          message: '缺少必需参数'
        });
        return;
      }

      const task = await this.scheduledTaskService.createTask({
        name,
        description,
        scriptType,
        scriptPath,
        cronExpression,
        isEnabled
      }, req.admin?.id);

      res.status(201).json({
        success: true,
        data: task,
        message: '任务创建成功'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 创建任务失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建任务失败'
      });
    }
  }

  /**
   * 更新任务
   */
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, scriptType, scriptPath, cronExpression, isEnabled } = req.body;

      const task = await this.scheduledTaskService.updateTask(id, {
        name,
        description,
        scriptType,
        scriptPath,
        cronExpression,
        isEnabled
      });

      res.json({
        success: true,
        data: task,
        message: '任务更新成功'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 更新任务失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新任务失败'
      });
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.scheduledTaskService.deleteTask(id);

      res.json({
        success: true,
        message: '任务删除成功'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 删除任务失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除任务失败'
      });
    }
  }

  /**
   * 手动执行任务
   */
  async executeTask(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const logId = await this.scheduledTaskService.executeTask(
        id,
        'manual',
        req.admin?.id
      );

      res.json({
        success: true,
        data: { logId },
        message: '任务已开始执行'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 执行任务失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '执行任务失败'
      });
    }
  }

  /**
   * 启用/禁用任务
   */
  async toggleTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isEnabled } = req.body;

      if (typeof isEnabled !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isEnabled必须是布尔值'
        });
        return;
      }

      const task = await this.scheduledTaskService.updateTask(id, { isEnabled });

      res.json({
        success: true,
        data: task,
        message: isEnabled ? '任务已启用' : '任务已禁用'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 切换任务状态失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '切换任务状态失败'
      });
    }
  }

  /**
   * 获取执行日志列表
   */
  async getExecutionLogs(req: Request, res: Response): Promise<void> {
    try {
      const { taskId, taskName, status, page, limit, startDate, endDate } = req.query;

      const result = await this.scheduledTaskService.getExecutionLogs({
        taskId: taskId as string,
        taskName: taskName as string,
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        data: result.logs,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (error) {
      logger.error('[计划任务控制器] 获取执行日志失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取执行日志失败'
      });
    }
  }

  /**
   * 获取执行日志详情
   */
  async getExecutionLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const log = await this.scheduledTaskService.getExecutionLogById(id);

      if (!log) {
        res.status(404).json({
          success: false,
          message: '执行日志不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      logger.error('[计划任务控制器] 获取执行日志详情失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取执行日志详情失败'
      });
    }
  }

  /**
   * 获取任务配置
   */
  async getTaskConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const config = await this.scheduledTaskService.getTaskConfig(id);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('[计划任务控制器] 获取任务配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取任务配置失败'
      });
    }
  }

  /**
   * 更新任务配置
   */
  async updateTaskConfig(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const config = req.body;

      const task = await this.scheduledTaskService.updateTaskConfig(id, config);

      res.json({
        success: true,
        data: task,
        message: '配置更新成功'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 更新任务配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新任务配置失败'
      });
    }
  }

  /**
   * 测试WebDAV连接
   */
  async testWebDAVConnection(req: Request, res: Response): Promise<void> {
    try {
      const webdavConfig = req.body;

      if (!webdavConfig || !webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
        res.status(400).json({
          success: false,
          message: '缺少必需的WebDAV配置参数'
        });
        return;
      }

      const result = await this.scheduledTaskService.testWebDAVConnection(webdavConfig);

      res.json({
        success: true,
        data: result,
        message: result.success ? 'WebDAV连接测试成功' : 'WebDAV连接测试失败'
      });
    } catch (error) {
      logger.error('[计划任务控制器] 测试WebDAV连接失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '测试WebDAV连接失败'
      });
    }
  }
}

export default ScheduledTaskAdminController;

