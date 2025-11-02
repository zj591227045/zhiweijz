import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { internalTaskRegistry } from './internal-task-registry';
import { WebDAVClientService } from '../../services/webdav-client.service';

const prisma = new PrismaClient();

interface CreateScheduledTaskDto {
  name: string;
  description?: string;
  scriptType: 'shell' | 'sql' | 'node' | 'internal';
  scriptPath: string;
  cronExpression: string;
  isEnabled?: boolean;
}

interface UpdateScheduledTaskDto {
  name?: string;
  description?: string;
  scriptType?: 'shell' | 'sql' | 'node' | 'internal';
  scriptPath?: string;
  cronExpression?: string;
  isEnabled?: boolean;
}

interface TaskListQuery {
  page?: number;
  limit?: number;
  isEnabled?: boolean;
  search?: string;
}

interface ExecutionLogQuery {
  taskId?: string;
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 计划任务管理服务
 */
export class ScheduledTaskAdminService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private projectRoot: string;

  constructor() {
    // 获取项目根目录
    this.projectRoot = path.resolve(__dirname, '../../../..');
    console.log('[计划任务服务] 项目根目录:', this.projectRoot);
  }

  /**
   * 初始化所有启用的计划任务
   */
  async initializeScheduledTasks(): Promise<void> {
    try {
      console.log('[计划任务服务] 开始初始化计划任务...');
      
      const enabledTasks = await prisma.scheduledTask.findMany({
        where: { isEnabled: true }
      });

      console.log(`[计划任务服务] 找到 ${enabledTasks.length} 个启用的任务`);

      for (const task of enabledTasks) {
        await this.scheduleTask(task.id);
      }

      console.log('[计划任务服务] 计划任务初始化完成');
    } catch (error) {
      console.error('[计划任务服务] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 调度单个任务
   */
  async scheduleTask(taskId: string): Promise<void> {
    try {
      const task = await prisma.scheduledTask.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      if (!task.isEnabled) {
        console.log(`[计划任务服务] 任务已禁用，跳过调度: ${task.name}`);
        return;
      }

      // 验证Cron表达式
      if (!cron.validate(task.cronExpression)) {
        throw new Error(`无效的Cron表达式: ${task.cronExpression}`);
      }

      // 如果已存在，先停止
      this.unscheduleTask(taskId);

      // 创建新的定时任务
      const cronJob = cron.schedule(task.cronExpression, async () => {
        console.log(`[计划任务服务] 定时触发任务: ${task.name}`);
        await this.executeTask(taskId, 'cron');
      }, {
        timezone: 'Asia/Shanghai'
      });

      this.cronJobs.set(taskId, cronJob);
      console.log(`[计划任务服务] 任务已调度: ${task.name} (${task.cronExpression})`);
    } catch (error) {
      console.error(`[计划任务服务] 调度任务失败 (${taskId}):`, error);
      throw error;
    }
  }

  /**
   * 取消调度任务
   */
  unscheduleTask(taskId: string): void {
    const cronJob = this.cronJobs.get(taskId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(taskId);
      console.log(`[计划任务服务] 任务已取消调度: ${taskId}`);
    }
  }

  /**
   * 执行任务
   */
  async executeTask(taskId: string, triggeredBy: 'cron' | 'manual', triggeredByUser?: string): Promise<string> {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 创建执行日志
    const log = await prisma.taskExecutionLog.create({
      data: {
        taskId,
        status: 'running',
        startTime: new Date(),
        triggeredBy,
        triggeredByUser
      }
    });

    console.log(`[计划任务服务] 开始执行任务: ${task.name} (日志ID: ${log.id})`);

    // 异步执行脚本
    this.runScript(task, log.id).catch(error => {
      console.error(`[计划任务服务] 任务执行异常: ${task.name}`, error);
    });

    return log.id;
  }

  /**
   * 运行脚本
   */
  private async runScript(task: any, logId: string): Promise<void> {
    const startTime = Date.now();
    let output = '';
    let error = '';
    let exitCode: number | null = null;

    try {
      // 处理内部任务类型
      if (task.scriptType === 'internal') {
        console.log(`[计划任务服务] 执行内部任务: ${task.scriptPath}`);

        try {
          // 传递任务配置给内部任务
          const taskConfig = task.config ? (typeof task.config === 'string' ? JSON.parse(task.config) : task.config) : undefined;
          await internalTaskRegistry.execute(task.scriptPath, taskConfig);

          // 更新执行日志为成功
          const duration = Date.now() - startTime;
          await prisma.taskExecutionLog.update({
            where: { id: logId },
            data: {
              status: 'success',
              endTime: new Date(),
              duration,
              output: `内部任务执行成功`,
              exitCode: 0
            }
          });
        } catch (internalError) {
          // 更新执行日志为失败
          const duration = Date.now() - startTime;
          await prisma.taskExecutionLog.update({
            where: { id: logId },
            data: {
              status: 'failed',
              endTime: new Date(),
              duration,
              error: internalError instanceof Error ? internalError.message : String(internalError),
              exitCode: 1
            }
          });
          throw internalError;
        }
        return;
      }

      // 处理外部脚本任务
      const scriptFullPath = path.resolve(this.projectRoot, task.scriptPath);

      // 检查脚本文件是否存在
      if (!fs.existsSync(scriptFullPath)) {
        throw new Error(`脚本文件不存在: ${scriptFullPath}`);
      }

      console.log(`[计划任务服务] 执行脚本: ${scriptFullPath}`);

      // 根据脚本类型选择执行方式
      let command: string;
      let args: string[] = [];

      if (task.scriptType === 'shell') {
        command = 'bash';
        // 对于预算修复脚本，自动添加 -a --yes 参数执行所有操作并跳过确认
        if (scriptFullPath.includes('fix_budget')) {
          args = [scriptFullPath, '-a', '--yes'];
        } else {
          args = [scriptFullPath];
        }
      } else if (task.scriptType === 'sql') {
        // SQL脚本需要通过psql执行
        command = 'psql';
        args = [
          '-h', process.env.DB_HOST || 'localhost',
          '-p', process.env.DB_PORT || '5432',
          '-U', process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
          '-d', process.env.POSTGRES_DB || process.env.DB_NAME || 'zhiweijz',
          '-f', scriptFullPath
        ];
      } else if (task.scriptType === 'node') {
        command = 'node';
        args = [scriptFullPath];
      } else {
        throw new Error(`不支持的脚本类型: ${task.scriptType}`);
      }

      // 准备环境变量
      // 从DATABASE_URL中提取数据库配置
      let dbHost, dbPort, dbName, dbUser, dbPassword;
      if (process.env.DATABASE_URL) {
        const match = process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?|$)/);
        if (match) {
          dbUser = match[1];
          dbPassword = match[2];
          dbHost = match[3];
          dbPort = match[4];
          dbName = match[5];
          console.log(`[计划任务服务] 从DATABASE_URL解析: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
        }
      }

      // 构建环境变量
      const taskEnv = {
        ...process.env,
        // 确保数据库配置环境变量正确传递
        POSTGRES_DB: dbName || process.env.POSTGRES_DB || process.env.DB_NAME || '',
        POSTGRES_USER: dbUser || process.env.POSTGRES_USER || process.env.DB_USER || '',
        POSTGRES_PASSWORD: dbPassword || process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || '',
        DB_HOST: dbHost || process.env.DB_HOST || '',
        DB_PORT: dbPort || process.env.DB_PORT || '',
        DB_NAME: dbName || process.env.DB_NAME || '',
        DB_USER: dbUser || process.env.DB_USER || '',
        DB_PASSWORD: dbPassword || process.env.DB_PASSWORD || '',
        PGPASSWORD: dbPassword || process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || ''
      };

      console.log(`[计划任务服务] 传递环境变量: POSTGRES_DB=${taskEnv.POSTGRES_DB}, DB_HOST=${taskEnv.DB_HOST}`);

      // 执行脚本
      const child = spawn(command, args, {
        cwd: this.projectRoot,
        env: taskEnv
      });

      // 捕获标准输出
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[任务输出] ${text.trim()}`);
      });

      // 捕获错误输出
      child.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        console.error(`[任务错误] ${text.trim()}`);
      });

      // 等待执行完成
      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          exitCode = code;
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`脚本执行失败，退出码: ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      });

      // 更新执行日志 - 成功
      const duration = Date.now() - startTime;
      await prisma.taskExecutionLog.update({
        where: { id: logId },
        data: {
          status: 'success',
          endTime: new Date(),
          duration,
          output: output.substring(0, 50000), // 限制输出长度
          error: error.substring(0, 50000),
          exitCode
        }
      });

      console.log(`[计划任务服务] 任务执行成功: ${task.name} (耗时: ${duration}ms)`);
    } catch (err) {
      // 更新执行日志 - 失败
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      await prisma.taskExecutionLog.update({
        where: { id: logId },
        data: {
          status: 'failed',
          endTime: new Date(),
          duration,
          output: output.substring(0, 50000),
          error: (error + '\n' + errorMessage).substring(0, 50000),
          exitCode
        }
      });

      console.error(`[计划任务服务] 任务执行失败: ${task.name}`, err);
    }
  }

  /**
   * 获取任务列表
   */
  async getTaskList(query: TaskListQuery) {
    const { page = 1, limit = 20, isEnabled, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (isEnabled !== undefined) {
      where.isEnabled = isEnabled;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.scheduledTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.scheduledTask.count({ where })
    ]);

    return { tasks, total, page, limit };
  }

  /**
   * 创建任务
   */
  async createTask(data: CreateScheduledTaskDto, createdBy?: string) {
    // 验证Cron表达式
    if (!cron.validate(data.cronExpression)) {
      throw new Error(`无效的Cron表达式: ${data.cronExpression}`);
    }

    // 验证脚本路径或内部任务key
    if (data.scriptType === 'internal') {
      // 对于内部任务，验证任务是否已注册
      if (!internalTaskRegistry.hasTask(data.scriptPath)) {
        throw new Error(`内部任务不存在: ${data.scriptPath}`);
      }
    } else {
      // 对于外部脚本，验证文件是否存在
      const scriptFullPath = path.resolve(this.projectRoot, data.scriptPath);
      if (!fs.existsSync(scriptFullPath)) {
        throw new Error(`脚本文件不存在: ${data.scriptPath}`);
      }
    }

    const task = await prisma.scheduledTask.create({
      data: {
        ...data,
        createdBy
      }
    });

    // 如果启用，立即调度
    if (task.isEnabled) {
      await this.scheduleTask(task.id);
    }

    return task;
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, data: UpdateScheduledTaskDto) {
    // 验证Cron表达式
    if (data.cronExpression && !cron.validate(data.cronExpression)) {
      throw new Error(`无效的Cron表达式: ${data.cronExpression}`);
    }

    // 验证脚本路径
    if (data.scriptPath) {
      const scriptFullPath = path.resolve(this.projectRoot, data.scriptPath);
      if (!fs.existsSync(scriptFullPath)) {
        throw new Error(`脚本文件不存在: ${data.scriptPath}`);
      }
    }

    const task = await prisma.scheduledTask.update({
      where: { id: taskId },
      data
    });

    // 重新调度
    this.unscheduleTask(taskId);
    if (task.isEnabled) {
      await this.scheduleTask(taskId);
    }

    return task;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string) {
    this.unscheduleTask(taskId);
    await prisma.taskExecutionLog.deleteMany({
      where: { taskId }
    });
    await prisma.scheduledTask.delete({
      where: { id: taskId }
    });
  }

  /**
   * 获取任务详情
   */
  async getTaskById(taskId: string) {
    return await prisma.scheduledTask.findUnique({
      where: { id: taskId }
    });
  }

  /**
   * 获取执行日志列表
   */
  async getExecutionLogs(query: ExecutionLogQuery) {
    const { taskId, status, page = 1, limit = 50, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (taskId) {
      where.taskId = taskId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.taskExecutionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          task: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.taskExecutionLog.count({ where })
    ]);

    return { logs, total, page, limit };
  }

  /**
   * 获取执行日志详情
   */
  async getExecutionLogById(logId: string) {
    return await prisma.taskExecutionLog.findUnique({
      where: { id: logId },
      include: {
        task: true
      }
    });
  }

  /**
   * 停止所有定时任务
   */
  stopAllTasks(): void {
    console.log('[计划任务服务] 停止所有定时任务...');
    this.cronJobs.forEach((job, taskId) => {
      job.stop();
      console.log(`[计划任务服务] 已停止任务: ${taskId}`);
    });
    this.cronJobs.clear();
  }

  /**
   * 获取任务配置
   */
  async getTaskConfig(taskId: string): Promise<any> {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: taskId },
      select: { config: true }
    });

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    return task.config || {};
  }

  /**
   * 更新任务配置
   */
  async updateTaskConfig(taskId: string, config: any) {
    const task = await prisma.scheduledTask.update({
      where: { id: taskId },
      data: { config: config }
    });

    return task;
  }

  /**
   * 测试WebDAV连接
   */
  async testWebDAVConnection(webdavConfig: any): Promise<{ success: boolean; message: string }> {
    try {
      // 创建一个新的WebDAV客户端实例用于测试
      const testClient = new WebDAVClientService();

      // 初始化WebDAV客户端
      await testClient.initialize({
        url: webdavConfig.url,
        username: webdavConfig.username,
        password: webdavConfig.password,
        basePath: webdavConfig.basePath || '/zhiweijz-backups',
      });

      // 尝试列出根目录
      await testClient.listFiles({
        remotePath: '/',
        deep: false,
      });

      return {
        success: true,
        message: 'WebDAV连接成功'
      };
    } catch (error) {
      console.error('[计划任务服务] 测试WebDAV连接失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接失败'
      };
    }
  }
}

export default ScheduledTaskAdminService;

