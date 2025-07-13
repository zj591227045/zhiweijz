import cron from 'node-cron';
import { WechatMediaService } from '../services/wechat-media.service';

/**
 * 微信媒体文件清理定时任务
 * 每小时清理一次过期的临时文件
 */
class WechatMediaCleanupTask {
  private mediaService: WechatMediaService;

  constructor() {
    this.mediaService = new WechatMediaService();
  }

  /**
   * 启动定时清理任务
   */
  start(): void {
    // 每小时的第0分钟执行清理任务
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🗑️ 开始清理微信媒体临时文件...');
        await this.mediaService.cleanupExpiredFiles();
        console.log('✅ 微信媒体临时文件清理完成');
      } catch (error) {
        console.error('❌ 清理微信媒体临时文件失败:', error);
      }
    });

    console.log('🕐 微信媒体文件清理定时任务已启动 (每小时执行一次)');
  }

  /**
   * 手动执行清理
   */
  async executeCleanup(): Promise<void> {
    try {
      console.log('🗑️ 手动执行微信媒体临时文件清理...');
      await this.mediaService.cleanupExpiredFiles();
      console.log('✅ 手动清理完成');
    } catch (error) {
      console.error('❌ 手动清理失败:', error);
      throw error;
    }
  }
}

export default WechatMediaCleanupTask;