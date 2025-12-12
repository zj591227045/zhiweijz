import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据聚合服务
 * 负责定时聚合访问日志和API调用数据，生成统计报告
 */
export class DataAggregationService {
  private isRunning = false;

  /**
   * 启动定时任务
   */
  start() {
    logger.info('启动数据聚合定时任务...');

    // 每小时执行一次聚合任务
    setInterval(async () => {
      await this.aggregateHourlyData();
    }, 60 * 60 * 1000); // 1小时

    // 每日执行一次日统计
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 16) {
        // UTC晚上16点执行，对应北京时间凌晨0点
        await this.aggregateDailyData();
      }
    }, 60 * 60 * 1000); // 每小时检查一次

    logger.info('数据聚合定时任务已启动');
  }

  /**
   * 每小时数据聚合
   */
  private async aggregateHourlyData() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      logger.info('开始执行每小时数据聚合...');

      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      lastHour.setMinutes(0, 0, 0);

      const currentHour = new Date(lastHour.getTime() + 60 * 60 * 1000);

      // 聚合API调用数据
      await this.aggregateApiCalls(lastHour, currentHour);

      logger.info(`完成 ${lastHour.toISOString()} 的小时数据聚合`);
    } catch (error) {
      logger.error('每小时数据聚合失败:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 每日数据聚合
   */
  private async aggregateDailyData() {
    try {
      logger.info('开始执行每日数据聚合...');

      // 获取北京时间的昨日边界
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

      // 设置为北京时间昨日的0点0分0秒
      beijingTime.setUTCDate(beijingTime.getUTCDate() - 1);
      beijingTime.setUTCHours(0, 0, 0, 0);
      const yesterday = new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000); // 转换回UTC

      // 设置为北京时间今日的0点0分0秒
      const todayBeijing = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000);

      // 聚合昨日数据（按北京时间边界）
      await this.generateDailyStats(yesterday, todayBeijing);

      const yesterdayDateStr = new Date(yesterday.getTime() + 8 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      logger.info(`完成 ${yesterdayDateStr} 的每日数据聚合（北京时间）`);
    } catch (error) {
      logger.error('每日数据聚合失败:', error);
    }
  }

  /**
   * 聚合API调用数据
   */
  private async aggregateApiCalls(startTime: Date, endTime: Date) {
    try {
      // 停止API调用日志聚合 - 因为已经停止记录api_call_logs
      // // 按端点统计API调用次数
      // const apiStats = await prisma.$queryRaw`
      //   SELECT
      //     endpoint,
      //     method,
      //     COUNT(*) as total_calls,
      //     AVG(duration) as avg_duration,
      //     MIN(duration) as min_duration,
      //     MAX(duration) as max_duration,
      //     COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success_calls,
      //     COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_calls
      //   FROM api_call_logs
      //   WHERE created_at >= ${startTime} AND created_at < ${endTime}
      //   GROUP BY endpoint, method
      // ` as Array<{
      //   endpoint: string;
      //   method: string;
      //   total_calls: bigint;
      //   avg_duration: number;
      //   min_duration: number;
      //   max_duration: number;
      //   success_calls: bigint;
      //   error_calls: bigint;
      // }>;

      // logger.info(`聚合了 ${apiStats.length} 个API端点的数据`);
      logger.info('API调用数据聚合已禁用');
    } catch (error) {
      logger.error('聚合API调用数据失败:', error);
    }
  }

  /**
   * 生成每日统计
   */
  private async generateDailyStats(startDate: Date, endDate: Date) {
    try {
      // 用户相关统计
      const [newUsers, activeUsers, totalTransactions] = await Promise.all([
        // 新注册用户数
        prisma.user.count({
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        }),

        // 活跃用户数（有记账记录的用户）
        prisma.user.count({
          where: {
            transactions: {
              some: {
                createdAt: {
                  gte: startDate,
                  lt: endDate,
                },
              },
            },
          },
        }),

        // 记账记录数
        prisma.transaction.count({
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        }),
      ]);

      logger.info(
        `每日统计 - 新用户: ${newUsers}, 活跃用户: ${activeUsers}, 记账: ${totalTransactions}`,
      );
    } catch (error) {
      logger.error('生成每日统计失败:', error);
    }
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData() {
    try {
      logger.info('开始清理旧数据...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 删除30天前的详细访问日志（API调用日志清理已禁用）
      const deletedAccessLogs = await prisma.accessLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // API调用日志清理已禁用
      // const deletedApiLogs = await prisma.apiCallLog.deleteMany({
      //   where: {
      //     createdAt: {
      //       lt: thirtyDaysAgo
      //     }
      //   }
      // });

      logger.info(`清理完成: 访问日志 ${deletedAccessLogs.count} 条`);
    } catch (error) {
      logger.error('清理旧数据失败:', error);
    }
  }

  /**
   * 手动执行聚合任务
   */
  async runManualAggregation() {
    logger.info('手动执行数据聚合...');
    await this.aggregateHourlyData();
    await this.aggregateDailyData();
    logger.info('手动聚合完成');
  }
}

// 创建全局实例
export const dataAggregationService = new DataAggregationService();
