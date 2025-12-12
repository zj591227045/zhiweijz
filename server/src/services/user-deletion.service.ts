import { logger } from '../utils/logger';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';

export class UserDeletionService {
  private userRepository: UserRepository;
  private userService: UserService;

  constructor() {
    this.userRepository = new UserRepository();
    this.userService = new UserService();
  }

  /**
   * 处理过期的用户注销请求
   */
  async processExpiredDeletions(): Promise<void> {
    try {
      logger.info('[UserDeletion] 开始检查过期的注销请求...');

      // 获取需要删除的用户列表
      const usersToDelete = await this.userRepository.getUsersToDelete();

      if (usersToDelete.length === 0) {
        logger.info('[UserDeletion] 没有需要删除的用户');
        return;
      }

      logger.info(`[UserDeletion] 找到 ${usersToDelete.length} 个需要删除的用户`);

      // 逐个处理用户删除
      for (const user of usersToDelete) {
        try {
          logger.info(`[UserDeletion] 开始删除用户: ${user.email} (${user.id})`);

          // 执行用户数据删除
          await this.userService.executeUserDeletion(user.id);

          logger.info(`[UserDeletion] 用户删除成功: ${user.email}`);
        } catch (error) {
          logger.error(`[UserDeletion] 删除用户失败: ${user.email}`, error);
          // 继续处理其他用户，不因为一个用户失败而停止
        }
      }

      logger.info('[UserDeletion] 过期注销请求处理完成');
    } catch (error) {
      logger.error('[UserDeletion] 处理过期注销请求时发生错误:', error);
    }
  }

  /**
   * 启动定时任务
   */
  startScheduledDeletion(): void {
    // 每小时检查一次
    const intervalMs = 60 * 60 * 1000; // 1小时

    logger.info('[UserDeletion] 启动用户注销定时任务，检查间隔: 1小时');

    // 立即执行一次
    this.processExpiredDeletions();

    // 设置定时任务
    setInterval(() => {
      this.processExpiredDeletions();
    }, intervalMs);
  }

  /**
   * 获取注销统计信息
   */
  async getDeletionStats(): Promise<{
    pendingDeletions: number;
    totalProcessed: number;
  }> {
    try {
      const usersToDelete = await this.userRepository.getUsersToDelete();

      return {
        pendingDeletions: usersToDelete.length,
        totalProcessed: 0, // 这里可以从日志或统计表中获取
      };
    } catch (error) {
      logger.error('[UserDeletion] 获取注销统计信息失败:', error);
      return {
        pendingDeletions: 0,
        totalProcessed: 0,
      };
    }
  }
}
