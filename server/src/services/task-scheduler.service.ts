import { performanceMonitoringService } from './performance-monitoring.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TaskSchedulerService {
  private cleanupIntervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor() {
    // 绑定方法以确保正确的this上下文
    this.startScheduler = this.startScheduler.bind(this);
    this.stopScheduler = this.stopScheduler.bind(this);
    this.performDataCleanup = this.performDataCleanup.bind(this);
  }

  /**
   * 启动任务调度器
   */
  async startScheduler() {
    if (this.isRunning) {
      console.log('任务调度器已在运行');
      return;
    }

    console.log('启动任务调度器...');
    this.isRunning = true;

    try {
      // 启动性能监控
      await performanceMonitoringService.startMonitoring();

      // 设置数据清理任务（每小时执行一次）
      this.cleanupIntervalId = setInterval(async () => {
        try {
          await this.performDataCleanup();
        } catch (error) {
          console.error('执行数据清理任务失败:', error);
        }
      }, 60 * 60 * 1000); // 1小时

      // 立即执行一次数据清理
      await this.performDataCleanup();

      console.log('任务调度器启动成功');
    } catch (error) {
      console.error('启动任务调度器失败:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 停止任务调度器
   */
  stopScheduler() {
    if (!this.isRunning) {
      console.log('任务调度器未在运行');
      return;
    }

    console.log('停止任务调度器...');

    // 停止性能监控
    performanceMonitoringService.stopMonitoring();

    // 停止数据清理任务
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }

    this.isRunning = false;
    console.log('任务调度器已停止');
  }

  /**
   * 执行数据清理任务
   */
  private async performDataCleanup() {
    try {
      console.log('开始执行数据清理任务...');

      // 清理过期的性能数据
      const deletedCount = await performanceMonitoringService.cleanupOldData();

      // 清理其他过期数据（如果需要）
      await this.cleanupOtherExpiredData();

      // 更新最后清理时间
      await this.updateLastCleanupTime();

      console.log(`数据清理任务完成，清理了 ${deletedCount} 条过期记录`);
    } catch (error) {
      console.error('数据清理任务执行失败:', error);
    }
  }

  /**
   * 清理其他过期数据
   */
  private async cleanupOtherExpiredData() {
    try {
      // 清理过期的日志记录（保留30天）
      await prisma.$executeRaw`
        DELETE FROM llm_call_logs 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `;

      // 清理过期的安全日志（保留90天）
      await prisma.$executeRaw`
        DELETE FROM security_logs 
        WHERE created_at < NOW() - INTERVAL '90 days'
      `;

      console.log('其他过期数据清理完成');
    } catch (error) {
      console.warn('清理其他过期数据时出现错误:', error);
    }
  }

  /**
   * 更新最后清理时间
   */
  private async updateLastCleanupTime() {
    try {
      await prisma.$executeRaw`
        INSERT INTO system_configs (key, value, description, category, updated_at)
        VALUES ('last_data_cleanup', ${new Date().toISOString()}, '最后一次数据清理时间', 'system', NOW())
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value, 
          updated_at = NOW()
      `;
    } catch (error) {
      console.warn('更新最后清理时间失败:', error);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasCleanupTask: !!this.cleanupIntervalId,
      performanceMonitoringEnabled: true, // 可以从配置中获取
    };
  }

  /**
   * 手动触发数据清理
   */
  async triggerManualCleanup() {
    console.log('手动触发数据清理任务...');
    await this.performDataCleanup();
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStats() {
    try {
      // 获取最后清理时间
      const lastCleanupResult = await prisma.$queryRaw<Array<{ value: string }>>`
        SELECT value FROM system_configs WHERE key = 'last_data_cleanup'
      `;

      const lastCleanupTime =
        lastCleanupResult.length > 0 ? new Date(lastCleanupResult[0].value) : null;

      // 获取当前数据量统计
      const performanceDataCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM system_performance_history
      `;

      const llmLogsCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM llm_call_logs
      `;

      const securityLogsCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM security_logs
      `;

      return {
        lastCleanupTime,
        dataCount: {
          performanceHistory: Number(performanceDataCount[0]?.count || 0),
          llmLogs: Number(llmLogsCount[0]?.count || 0),
          securityLogs: Number(securityLogsCount[0]?.count || 0),
        },
      };
    } catch (error) {
      console.error('获取清理统计信息失败:', error);
      return {
        lastCleanupTime: null,
        dataCount: {
          performanceHistory: 0,
          llmLogs: 0,
          securityLogs: 0,
        },
      };
    }
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown() {
    console.log('开始优雅关闭任务调度器...');

    this.stopScheduler();

    // 等待当前任务完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('任务调度器优雅关闭完成');
  }
}

// 导出单例实例
export const taskSchedulerService = new TaskSchedulerService();

// 处理进程退出信号
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭...');
  await taskSchedulerService.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，开始优雅关闭...');
  await taskSchedulerService.gracefulShutdown();
  process.exit(0);
});

// 处理未捕获的异常
process.on('uncaughtException', async (error) => {
  console.error('未捕获的异常:', error);
  await taskSchedulerService.gracefulShutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  await taskSchedulerService.gracefulShutdown();
  process.exit(1);
});
