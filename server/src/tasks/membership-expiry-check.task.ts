import { logger } from '../utils/logger';
import cron from 'node-cron';
import { MembershipService } from '../services/membership.service';

/**
 * 会员到期检查定时任务
 * 每小时检查一次会员到期状态，自动处理到期会员
 */
class MembershipExpiryCheckTask {
  private membershipService: MembershipService;

  constructor() {
    this.membershipService = new MembershipService();
  }

  /**
   * 启动定时检查任务
   */
  start(): void {
    // 如果会员系统未启用，不启动任务
    if (!this.membershipService.isEnabled()) {
      logger.info('🔒 会员系统未启用，跳过会员到期检查定时任务');
      return;
    }

    // 每小时的第30分钟执行检查任务（避免与其他任务冲突）
    cron.schedule('30 * * * *', async () => {
      try {
        logger.info('⏰ 开始执行会员到期检查...');
        await this.checkAllMemberships();
        logger.info('✅ 会员到期检查完成');
      } catch (error) {
        logger.error('❌ 会员到期检查失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai' // 使用北京时间
    });

    logger.info('🕐 会员到期检查定时任务已启动 (每小时第30分钟执行一次)');
  }

  /**
   * 检查所有会员的到期状态
   */
  async checkAllMemberships(): Promise<{
    checkedCount: number;
    expiredCount: number;
  }> {
    try {
      // 获取所有需要检查的会员（活跃且有到期时间的会员）
      const memberships = await this.membershipService.getActiveMembershipsForCheck();

      let checkedCount = 0;
      let expiredCount = 0;

      logger.info(`📊 [会员到期检查] 找到 ${memberships.length} 个需要检查的活跃会员`);

      for (const membership of memberships) {
        try {
          // 检查单个会员的到期状态
          await this.membershipService.checkAndUpdateMembershipStatus(membership.userId);
          checkedCount++;

          // 重新检查状态，确认是否已过期
          const updated = await this.membershipService.getMembershipStatus(membership.userId);

          if (updated && !updated.isActive) {
            expiredCount++;
            logger.info(`⚠️ [会员到期] 用户 ${membership.userId} 的 ${membership.memberType} 会员已到期`);
          }
        } catch (error) {
          logger.error(`❌ [会员到期检查] 检查用户 ${membership.userId} 失败:`, error);
        }
      }

      logger.info(`📈 [会员到期检查] 检查完成: 检查了 ${checkedCount} 个会员，其中 ${expiredCount} 个已到期`);

      return {
        checkedCount,
        expiredCount
      };
    } catch (error) {
      logger.error('❌ [会员到期检查] 批量检查失败:', error);
      throw error;
    }
  }

  /**
   * 手动执行会员到期检查（用于测试或管理员触发）
   */
  async executeCheck(): Promise<{
    checkedCount: number;
    expiredCount: number;
  }> {
    try {
      logger.info('🔍 手动执行会员到期检查...');
      const result = await this.checkAllMemberships();
      logger.info('✅ 手动检查完成');
      return result;
    } catch (error) {
      logger.error('❌ 手动检查失败:', error);
      throw error;
    }
  }
}

export default MembershipExpiryCheckTask;
