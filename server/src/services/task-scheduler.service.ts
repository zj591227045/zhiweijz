import * as cron from 'node-cron';
import AccountingPointsService from '../services/accounting-points.service';

/**
 * 定时任务调度器
 */
class TaskScheduler {
  /**
   * 启动所有定时任务
   */
  static start(): void {
    console.log('[定时任务] 启动定时任务调度器...');

    // 注释掉原有的定时赠送逻辑，改为基于用户首次访问的赠送
    // 每天0点执行每日记账点赠送
    // cron.schedule('0 0 * * *', async () => {
    //   console.log('[定时任务] 开始执行每日记账点赠送...');
    //   try {
    //     await AccountingPointsService.dailyGiftPoints();
    //     console.log('[定时任务] 每日记账点赠送完成');
    //   } catch (error) {
    //     console.error('[定时任务] 每日记账点赠送失败:', error);
    //   }
    // }, {
    //   timezone: 'Asia/Shanghai' // 使用北京时间
    // });

    console.log('[定时任务] 定时任务调度器启动完成（原定时赠送已禁用，改为基于用户首次访问）');
  }

  /**
   * 手动执行每日记账点赠送（用于测试）
   */
  static async runDailyGiftPoints(): Promise<void> {
    console.log('[手动任务] 开始执行每日记账点赠送...');
    try {
      await AccountingPointsService.dailyGiftPoints();
      console.log('[手动任务] 每日记账点赠送完成');
    } catch (error) {
      console.error('[手动任务] 每日记账点赠送失败:', error);
      throw error;
    }
  }
}

export default TaskScheduler;
